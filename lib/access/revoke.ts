/**
 * Refund revocation for payment-backed entitlements.
 *
 * A full refund marks the entitlement row revoked (revoked_at, revoked_reason).
 * Rows are never deleted: the row stays as history, and because the table is
 * UNIQUE (email, product_id) and the sign-in sync inserts with
 * ignore-duplicates, a revoked row also stops the sync from writing a fresh
 * grant for the refunded payment.
 *
 * Only a payment-backed row (`ghl-payments-sync` / `ghl:*`) whose
 * raw.transaction_id is the refunded HighLevel transaction is ever revoked.
 * Complimentary, owner and manual rows never match that predicate.
 *
 * Callers: app/api/stripe/toolkit-refund (Stripe charge.refunded) and
 * reconcileEntitlement (HighLevel shows the stored transaction refunded).
 */

import type { GhlTransaction } from "../entitlementMatch";

export const TOOLKIT_PRODUCT_ID = "purpose-activation-toolkit";
/** HighLevel tag added on a Toolkit order (pipeline tracking, workflow e7a4e4fa). */
export const TOOLKIT_BUYER_TAG = "toolkit-buyer";

const GHL_BASE = "https://services.leadconnectorhq.com";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type RevokeOutcome =
  /** The row for this payment was active and is now revoked. */
  | "revoked"
  /** The row for this payment was already revoked (Stripe retry, or both paths ran). */
  | "already-revoked"
  /** No row existed yet (buyer never signed in); a revoked placeholder now blocks a grant. */
  | "tombstoned"
  /** The email's row is not this payment (complimentary, or a different purchase). Untouched. */
  | "kept-other-access"
  | "failed";

function service(): { url: string; headers: Headers } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    url,
    headers: new Headers({ apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }),
  };
}

type StoredRow = {
  source: string | null;
  transaction_id: string | null;
  revoked_at: string | null;
  contact_id: string | null;
};

async function readRowForRevoke(email: string, productId: string, fetchImpl: FetchLike): Promise<StoredRow | null | "error"> {
  const svc = service();
  if (!svc) return "error";
  const qs = new URLSearchParams({
    email: `eq.${email}`,
    product_id: `eq.${productId}`,
    select: "source,raw,revoked_at,contact_id",
  });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return "error";
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const raw = row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : {};
    return {
      source: typeof row.source === "string" ? row.source : null,
      transaction_id: typeof raw.transaction_id === "string" ? raw.transaction_id : null,
      revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
      contact_id: typeof row.contact_id === "string" ? row.contact_id : null,
    };
  } catch {
    return "error";
  }
}

function isPaymentBacked(source: string | null): boolean {
  return !!source && (source === "ghl-payments-sync" || source.startsWith("ghl:"));
}

/**
 * Revoke the entitlement that this exact HighLevel transaction granted.
 * Idempotent. Never deletes, never touches a row that names another payment.
 */
export async function revokeForTransaction(args: {
  email: string;
  productId: string;
  transaction: GhlTransaction;
  reason: string;
  fetchImpl?: FetchLike;
  now?: () => Date;
}): Promise<{ outcome: RevokeOutcome; contactId: string | null }> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const email = args.email.trim().toLowerCase();
  const txId = args.transaction._id;
  const svc = service();
  if (!svc || !txId || !email) return { outcome: "failed", contactId: null };
  const revokedAt = (args.now ?? (() => new Date()))().toISOString();

  // 1. Revoke the active row for this payment, if there is one.
  const qs = new URLSearchParams({
    email: `eq.${email}`,
    product_id: `eq.${args.productId}`,
    "raw->>transaction_id": `eq.${txId}`,
    or: '(source.eq.ghl-payments-sync,source.like."ghl:*")',
    revoked_at: "is.null",
  });
  try {
    const headers = new Headers(svc.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Prefer", "return=representation");
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ revoked_at: revokedAt, revoked_reason: args.reason }),
    });
    if (!res.ok) return { outcome: "failed", contactId: null };
    const updated = (await res.json()) as unknown;
    if (Array.isArray(updated) && updated.length > 0) {
      const first = updated[0] as { contact_id?: unknown };
      const contactId = typeof first.contact_id === "string" ? first.contact_id : args.transaction.contactId ?? null;
      return { outcome: "revoked", contactId };
    }
  } catch {
    return { outcome: "failed", contactId: null };
  }

  // 2. Nothing active matched. Find out why.
  const row = await readRowForRevoke(email, args.productId, fetchImpl);
  if (row === "error") return { outcome: "failed", contactId: null };
  if (row) {
    if (isPaymentBacked(row.source) && row.transaction_id === txId && row.revoked_at) {
      return { outcome: "already-revoked", contactId: row.contact_id ?? args.transaction.contactId ?? null };
    }
    return { outcome: "kept-other-access", contactId: row.contact_id ?? args.transaction.contactId ?? null };
  }

  // 3. No row: the buyer never signed in. Write a revoked placeholder so a
  //    later sign-in cannot grant this payment, even if HighLevel still lags.
  try {
    const headers = new Headers(svc.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Prefer", "resolution=ignore-duplicates,return=minimal");
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?on_conflict=email,product_id`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        product_id: args.productId,
        purchased_at: args.transaction.createdAt ?? revokedAt,
        source: "ghl-payments-sync",
        gross_amount: args.transaction.amount ?? null,
        contact_id: args.transaction.contactId ?? null,
        raw: {
          transaction_id: txId,
          entity_source_id: args.transaction.entitySourceId ?? null,
          entity_source_name: args.transaction.entitySourceName ?? null,
          live_mode: args.transaction.liveMode ?? null,
          written_by: "refund-revocation",
        },
        revoked_at: revokedAt,
        revoked_reason: args.reason,
      }),
    });
    if (!res.ok) return { outcome: "failed", contactId: null };
  } catch {
    return { outcome: "failed", contactId: null };
  }
  const after = await readRowForRevoke(email, args.productId, fetchImpl);
  if (after === "error" || !after) return { outcome: "failed", contactId: null };
  if (after.transaction_id === txId && after.revoked_at) {
    return { outcome: "tombstoned", contactId: after.contact_id ?? args.transaction.contactId ?? null };
  }
  return { outcome: "kept-other-access", contactId: after.contact_id ?? args.transaction.contactId ?? null };
}

/** Remove the toolkit-buyer tag from a HighLevel contact in the TJB location. Best effort. */
export async function removeBuyerTag(contactId: string | null, fetchImpl: FetchLike = fetch): Promise<"removed" | "skipped" | "failed"> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const version = process.env.GHL_API_VERSION_TJB?.trim() || "2021-07-28";
  if (!contactId || !token) return "skipped";
  try {
    const res = await fetchImpl(`${GHL_BASE}/contacts/${encodeURIComponent(contactId)}/tags`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: version,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: [TOOLKIT_BUYER_TAG] }),
    });
    return res.ok ? "removed" : "failed";
  } catch {
    return "failed";
  }
}

/** Outcomes after which the buyer no longer holds Toolkit access through this payment. */
export function lostAccess(outcome: RevokeOutcome): boolean {
  return outcome === "revoked" || outcome === "already-revoked" || outcome === "tombstoned";
}
