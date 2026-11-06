/**
 * Whether a stored entitlement may still open a paid product.
 *
 * Payment-backed rows are the ones this app or the documented HighLevel
 * snippet wrote after a charge. Those are rechecked. A full refund, in the
 * only shape this repo defines, moves the charge off status "succeeded", so
 * the lookup comes back not-found and the row is revoked.
 *
 * `manual:` rows are the documented complimentary grant. Any other source is
 * preserved: this code does not guess which legacy values are comps.
 * A lookup that cannot finish never revokes a row.
 */

import type { GhlTransaction, PurchaseLookup } from "../entitlementMatch";

export type EntitlementRow = {
  source: string | null;
  purchased_at: string | null;
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
  if (row && paymentBackedSource(row.source)) return { action: "revoke" };
  return { action: "deny", reason: "not-found" };
}
