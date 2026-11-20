/**
 * Toolkit access from a signed HighLevel order webhook (Nov 20, 2026).
 *
 * The payload is never trusted for access. It only supplies the buyer's
 * email; reconcileEntitlement then runs the same HighLevel transaction lookup
 * as /api/entitlement-sync (live mode only, Toolkit payment link only, $0 live
 * coupon orders qualify, a refunded charge revokes) and writes the row. A
 * forged or mistaken email therefore grants nothing without a real purchase.
 */

import { reconcileEntitlement } from "./entitlementSync";
import { TOOLKIT_PRODUCT_ID } from "./revoke";
import { normalizeEmail } from "./signinAccount";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type OrderAccessOutcome = "granted" | "not-entitled" | "unavailable" | "no-email";

export async function toolkitAccessFromOrder(rawEmail: string | null, fetchImpl: FetchLike = fetch): Promise<OrderAccessOutcome> {
  const email = normalizeEmail(rawEmail);
  if (!email) return "no-email";
  try {
    const r = await reconcileEntitlement(email, TOOLKIT_PRODUCT_ID, fetchImpl);
    if (r.entitled === true) return "granted";
    if (r.reason === "lookup-unavailable" || r.reason === "grant-failed") return "unavailable";
    return "not-entitled";
  } catch {
    return "unavailable";
  }
}
