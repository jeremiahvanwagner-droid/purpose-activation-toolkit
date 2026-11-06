/**
 * Whether a stored entitlement may still open a paid product.
 *
 * Payment-backed rows are rechecked. Not seeing a charge in the global
 * transaction window is not proof that the stored charge was refunded, so
 * that absence never deletes a row. Deletion is allowed only when the scan
 * finishes and the stored transaction id is itself status "refunded".
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
};

export type AccessDecision =
  | { action: "grant"; transaction: GhlTransaction }
  | { action: "keep"; access: "preserved" | "unavailable" }
  | { action: "revoke" }
  | { action: "deny"; reason: "not-found" | "lookup-unavailable" };

/** Charges recorded by /api/entitlement-sync or the documented `ghl:` snippet. */
export function paymentBackedSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return source === "ghl-payments-sync" || source.startsWith("ghl:");
}

export function decideAccess(row: EntitlementRow | null, lookup: PurchaseLookup | null): AccessDecision {
  if (row && !paymentBackedSource(row.source)) return { action: "keep", access: "preserved" };

  if (!lookup || lookup.status === "unavailable") {
    if (row && paymentBackedSource(row.source)) return { action: "keep", access: "unavailable" };
    return { action: "deny", reason: "lookup-unavailable" };
  }
  if (lookup.status === "found") return { action: "grant", transaction: lookup.transaction };
  if (lookup.status === "refund-observed") {
    const sameCharge =
      row &&
      paymentBackedSource(row.source) &&
      row.transaction_id &&
      lookup.transaction._id === row.transaction_id;
    if (sameCharge) return { action: "revoke" };
    if (row && paymentBackedSource(row.source)) return { action: "keep", access: "unavailable" };
  }
  if (lookup.status === "not-found" && row && paymentBackedSource(row.source)) {
    return { action: "keep", access: "unavailable" };
  }
  return { action: "deny", reason: "not-found" };
}
