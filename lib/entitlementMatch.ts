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
  | { status: "refund-observed"; transaction: GhlTransaction; pagesRead: number }
  | { status: "not-found"; pagesRead: number }
  | { status: "unavailable"; reason: string; pagesRead: number };

/** A 200 body is a completed page only when `data` is an array. null, objects, and other shapes are not an empty history. */
export function rowsFromTransactionsBody(body: unknown): PageResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, reason: "lookup-malformed" };
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return { ok: false, reason: "lookup-malformed" };
  return { ok: true, rows: data as GhlTransaction[] };
}

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

function isStoredRefund(
  tx: GhlTransaction,
  email: string,
  sourceIds: ReadonlySet<string>,
  storedTransactionId: string,
  requireLive: boolean
): boolean {
  if (tx._id !== storedTransactionId) return false;
  if (tx.status !== "refunded") return false;
  if (requireLive && tx.liveMode !== true) return false;
  if (!tx.entitySourceId || !sourceIds.has(tx.entitySourceId)) return false;
  return (tx.contactEmail ?? "").trim().toLowerCase() === email.trim().toLowerCase();
}

export async function lookupPurchase(
  fetchPage: (offset: number, limit: number) => Promise<PageResult>,
  email: string,
  sourceIds: ReadonlySet<string>,
  opts: { requireLive?: boolean; pageSize?: number; maxPages?: number; storedTransactionId?: string } = {}
): Promise<PurchaseLookup> {
  const requireLive = opts.requireLive ?? true;
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 10;
  let refunded: GhlTransaction | undefined;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(page * pageSize, pageSize);
    if (!result.ok) return { status: "unavailable", reason: result.reason, pagesRead: page };
    const match = result.rows.find((tx) => isQualifyingPurchase(tx, email, sourceIds, requireLive));
    if (match) return { status: "found", transaction: match, pagesRead: page + 1 };
    if (opts.storedTransactionId) {
      const seen = result.rows.find((tx) =>
        isStoredRefund(tx, email, sourceIds, opts.storedTransactionId!, requireLive)
      );
      if (seen) refunded = seen;
    }
    // A short page is the last page. (GHL reports totalCount 0 for an offset
    // past the end, so the page length is the reliable signal.)
    if (result.rows.length < pageSize) {
      if (refunded) return { status: "refund-observed", transaction: refunded, pagesRead: page + 1 };
      return { status: "not-found", pagesRead: page + 1 };
    }
  }
  // The cap is not a complete history. A refund seen inside the window is not
  // used: a later qualifying charge may sit past the page we stopped on.
  return { status: "unavailable", reason: "lookup-page-limit", pagesRead: maxPages };
}
