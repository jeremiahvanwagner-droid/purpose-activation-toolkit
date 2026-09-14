/**
 * Does HighLevel record a qualifying purchase for this reader? Pure logic,
 * shared by app/api/entitlement-sync/route.ts and tests/entitlement.test.ts.
 *
 * A transaction qualifies only when all of these hold:
 *   - status "succeeded" (a refunded charge moves to "refunded"; failed and
 *     pending charges never qualify)
 *   - liveMode true, when live mode is required (test-mode charges never open
 *     a paid product)
 *   - entitySourceId is one of the product's payment links (so one product
 *     can never unlock another)
 *   - contactEmail matches the signed-in email, case-insensitively
 *
 * The lookup pages through GHL's documented limit/offset pagination with a
 * hard page cap. It distinguishes "looked everywhere, no purchase" from "could
 * not look" — a failed or truncated lookup must never be presented to a buyer
 * as proof they haven't paid.
 */

export type GhlTransaction = {
  _id?: string;
  amount?: number;
  status?: string;
  liveMode?: boolean;
  contactId?: string;
  contactEmail?: string | null;
  entitySourceId?: string;
  entitySourceName?: string;
  createdAt?: string;
};

export type PageResult =
  | { ok: true; rows: GhlTransaction[] }
  | { ok: false; reason: string };

export type PurchaseLookup =
  | { status: "found"; transaction: GhlTransaction; pagesRead: number }
  | { status: "not-found"; pagesRead: number }
  | { status: "unavailable"; reason: string; pagesRead: number };

export function isQualifyingPurchase(
  tx: GhlTransaction,
  email: string,
  sourceIds: ReadonlySet<string>,
  requireLive = true
): boolean {
  if (tx.status !== "succeeded") return false;
  if (requireLive && tx.liveMode !== true) return false;
  if (!tx.entitySourceId || !sourceIds.has(tx.entitySourceId)) return false;
  return (tx.contactEmail ?? "").trim().toLowerCase() === email.trim().toLowerCase();
}

export async function lookupPurchase(
  fetchPage: (offset: number, limit: number) => Promise<PageResult>,
  email: string,
  sourceIds: ReadonlySet<string>,
  opts: { requireLive?: boolean; pageSize?: number; maxPages?: number } = {}
): Promise<PurchaseLookup> {
  const requireLive = opts.requireLive ?? true;
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 10;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(page * pageSize, pageSize);
    if (!result.ok) return { status: "unavailable", reason: result.reason, pagesRead: page };
    const match = result.rows.find((tx) => isQualifyingPurchase(tx, email, sourceIds, requireLive));
    if (match) return { status: "found", transaction: match, pagesRead: page + 1 };
    // A short page is the last page. (GHL reports totalCount 0 for an offset
    // past the end, so the page length is the reliable signal.)
    if (result.rows.length < pageSize) return { status: "not-found", pagesRead: page + 1 };
  }
  return { status: "unavailable", reason: "lookup-page-limit", pagesRead: maxPages };
}
