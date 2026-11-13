/**
 * Whether a stored entitlement may still open a paid product.
 *
 * Payment-backed rows are rechecked for a new grant. This module never
 * deletes. A full refund of the exact transaction stored on a payment-backed
 * row (raw.transaction_id) revokes it: the row is marked revoked_at and denies
 * access from then on. A revoked row opens again only for a different,
 * qualifying purchase (a genuine re-buy), never for the refunded payment.
 *
 * `manual:` rows are the documented complimentary grant. Any other source is
 * preserved: this code does not guess which legacy values are comps.
 * A lookup that cannot finish never revokes a row.
 */

import type { GhlTransaction, PurchaseLookup } from "../entitlementMatch";

export type EntitlementRow = {
  source: string | null;
  purchased_at: string | null;
  transaction_id: string | null;
  /** Set when the backing payment was fully refunded. Optional for older callers. */
  revoked_at?: string | null;
};

export type AccessDecision =
  | { action: "grant"; transaction: GhlTransaction }
  | { action: "keep"; access: "preserved" | "unavailable" }
  /** The stored payment is refunded in HighLevel and nothing else qualifies: mark the row revoked. */
  | { action: "revoke"; transaction: GhlTransaction }
  /** The row was revoked, and a different qualifying purchase exists: reopen it on that purchase. */
  | { action: "regrant"; transaction: GhlTransaction }
  | { action: "deny"; reason: "not-found" | "lookup-unavailable" | "revoked" };

/** Charges recorded by /api/entitlement-sync or the documented `ghl:` snippet. */
export function paymentBackedSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return source === "ghl-payments-sync" || source.startsWith("ghl:");
}

export function decideAccess(row: EntitlementRow | null, lookup: PurchaseLookup | null): AccessDecision {
  if (row?.revoked_at) {
    if (lookup?.status === "found" && lookup.transaction._id && lookup.transaction._id !== row.transaction_id) {
      return { action: "regrant", transaction: lookup.transaction };
    }
    // Includes a failed lookup and HighLevel still reporting the refunded charge as succeeded.
    return { action: "deny", reason: "revoked" };
  }

  if (row && !paymentBackedSource(row.source)) return { action: "keep", access: "preserved" };

  if (!lookup || lookup.status === "unavailable") {
    if (row && paymentBackedSource(row.source)) return { action: "keep", access: "unavailable" };
    return { action: "deny", reason: "lookup-unavailable" };
  }
  if (lookup.status === "found") return { action: "grant", transaction: lookup.transaction };
  if (lookup.status === "refund-observed") {
    if (row && paymentBackedSource(row.source) && row.transaction_id && lookup.transaction._id === row.transaction_id) {
      return { action: "revoke", transaction: lookup.transaction };
    }
    if (row && paymentBackedSource(row.source)) return { action: "keep", access: "unavailable" };
  }
  if (lookup.status === "not-found" && row && paymentBackedSource(row.source)) {
    return { action: "keep", access: "unavailable" };
  }
  return { action: "deny", reason: "not-found" };
}
