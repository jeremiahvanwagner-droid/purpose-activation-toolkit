/**
 * Stripe charge.refunded -> revoke Toolkit access.
 *
 * HighLevel charges the Toolkit payment link through the TJB Stripe account
 * (acct_1SnoinQ5Ji82xb2j). Each charge carries HighLevel metadata
 * { altId, altType, contactId, orderId }, and the HighLevel transaction for it
 * has entityId = orderId and chargeId = the charge's payment_intent.
 *
 * Rules:
 *   - The Stripe signature must verify (STRIPE_WEBHOOK_SECRET_TOOLKIT).
 *   - Live mode, TJB location only.
 *   - Full refund only. A partial refund is logged and changes nothing.
 *   - The charge must map to a HighLevel transaction on a Toolkit payment link;
 *     anything else (Audit, BTV, wallet recharges, other locations) is ignored.
 *   - The refund status comes from the signed Stripe event, so revocation does
 *     not wait for HighLevel to mark the transaction refunded.
 *
 * Responses: 400 bad signature/body, 503 not configured, 500 when a lookup or
 * write failed (Stripe retries), 200 otherwise.
 */

import { verifyStripeSignature } from "../eosMeasurement";
import type { GhlTransaction } from "../entitlementMatch";
import { rowsFromTransactionsBody } from "../entitlementMatch";
import { TOOLKIT_PAYMENT_LINK_ID } from "../links";
import { lostAccess, removeBuyerTag, revokeForTransaction, TOOLKIT_PRODUCT_ID } from "./revoke";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type StripeCharge = {
  id?: string;
  object?: string;
  amount?: number;
  amount_refunded?: number;
  refunded?: boolean;
  livemode?: boolean;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
};

type GhlTx = GhlTransaction & { chargeId?: string; entityId?: string; altId?: string };

const TOOLKIT_SOURCES = new Set([TOOLKIT_PAYMENT_LINK_ID]);

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function paymentIntentId(charge: StripeCharge): string | null {
  const pi = charge.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof pi === "object" && typeof pi.id === "string") return pi.id;
  return null;
}

/** Which HighLevel transaction is this Stripe charge? Only Toolkit payment-link transactions count. */
export async function findToolkitTransaction(
  charge: StripeCharge,
  fetchImpl: FetchLike
): Promise<{ status: "found"; tx: GhlTx } | { status: "not-toolkit" } | { status: "unavailable"; reason: string }> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  const version = process.env.GHL_API_VERSION_TJB?.trim() || "2021-07-28";
  if (!token || !locationId) return { status: "unavailable", reason: "ghl-not-configured" };

  const orderId = charge.metadata?.orderId?.trim();
  const contactId = charge.metadata?.contactId?.trim();
  if (!orderId && !contactId) return { status: "not-toolkit" };

  const qs = new URLSearchParams({ altId: locationId, altType: "location", paymentMode: "live", limit: "100", offset: "0" });
  if (orderId) qs.set("entityId", orderId);
  else if (contactId) qs.set("contactId", contactId);

  let rows: GhlTx[];
  try {
    const res = await fetchImpl(`https://services.leadconnectorhq.com/payments/transactions?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Version: version, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { status: "unavailable", reason: `ghl-http-${res.status}` };
    const page = rowsFromTransactionsBody(await res.json());
    if (!page.ok) return { status: "unavailable", reason: page.reason };
    rows = page.rows as GhlTx[];
  } catch {
    return { status: "unavailable", reason: "ghl-error" };
  }

  const pi = paymentIntentId(charge);
  const match = rows.find((tx) => {
    if (!tx.entitySourceId || !TOOLKIT_SOURCES.has(tx.entitySourceId)) return false;
    if (tx.altId && tx.altId !== locationId) return false;
    if (tx.liveMode !== true) return false;
    const sameCharge = (!!pi && tx.chargeId === pi) || (!!charge.id && tx.chargeId === charge.id);
    const sameOrder = !!orderId && tx.entityId === orderId;
    // With an order id, the order must agree; the charge id must agree when HighLevel recorded one.
    if (orderId) return sameOrder && (!tx.chargeId || sameCharge);
    return sameCharge;
  });
  return match ? { status: "found", tx: match } : { status: "not-toolkit" };
}

export async function handleStripeToolkitRefund(req: Request, fetchImpl: FetchLike = fetch): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_TOOLKIT?.trim();
  if (!secret) {
    console.error("[toolkit-refund] STRIPE_WEBHOOK_SECRET_TOOLKIT is not set; refusing to process.");
    return json({ ok: false, error: "Webhook not configured." }, 503);
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ ok: false, error: "Unreadable body." }, 400);
  }

  const verdict = await verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret);
  if (!verdict.ok) {
    console.error("[toolkit-refund] rejected delivery:", verdict.reason);
    return json({ ok: false, error: "Invalid signature." }, 400);
  }

  let event: { id?: string; type?: string; data?: { object?: StripeCharge } };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Malformed JSON." }, 400);
  }
  const charge = event.data?.object;
  if (!event.id || !event.type || !charge) return json({ ok: false, error: "Not a Stripe event." }, 400);

  if (event.type !== "charge.refunded") return json({ ok: true, ignored: event.type });
  if (charge.object && charge.object !== "charge") return json({ ok: true, ignored: "not-a-charge" });
  if (charge.livemode !== true) return json({ ok: true, ignored: "test-mode" });

  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  if (!locationId || charge.metadata?.altId !== locationId) return json({ ok: true, ignored: "other-location" });

  const amount = typeof charge.amount === "number" ? charge.amount : null;
  const refundedAmount = typeof charge.amount_refunded === "number" ? charge.amount_refunded : 0;
  const full = charge.refunded === true || (amount !== null && amount > 0 && refundedAmount >= amount);

  const found = await findToolkitTransaction(charge, fetchImpl);
  if (found.status === "unavailable") {
    console.error(`[toolkit-refund] ${event.id} ${charge.id}: HighLevel lookup failed (${found.reason}); Stripe will retry.`);
    return json({ ok: false, error: "Lookup unavailable." }, 500);
  }
  if (found.status === "not-toolkit") return json({ ok: true, ignored: "not-toolkit" });

  if (!full) {
    console.log(
      `[toolkit-refund] ${event.id} ${charge.id}: partial refund ${refundedAmount}/${amount ?? "?"} on HighLevel transaction ${found.tx._id}; access unchanged.`
    );
    return json({ ok: true, action: "partial-refund-logged" });
  }

  const email = (found.tx.contactEmail ?? "").trim().toLowerCase();
  if (!email) {
    console.error(`[toolkit-refund] ${event.id}: HighLevel transaction ${found.tx._id} has no contact email.`);
    return json({ ok: false, error: "Transaction has no email." }, 500);
  }

  const result = await revokeForTransaction({
    email,
    productId: TOOLKIT_PRODUCT_ID,
    transaction: found.tx,
    reason: `stripe:charge.refunded:${charge.id ?? event.id}`,
    fetchImpl,
  });
  if (result.outcome === "failed") {
    console.error(`[toolkit-refund] ${event.id}: entitlement write failed for transaction ${found.tx._id}; Stripe will retry.`);
    return json({ ok: false, error: "Revoke failed." }, 500);
  }

  let tag: "removed" | "skipped" | "failed" = "skipped";
  if (lostAccess(result.outcome)) {
    tag = await removeBuyerTag(result.contactId ?? found.tx.contactId ?? charge.metadata?.contactId ?? null, fetchImpl);
    if (tag === "failed") console.error(`[toolkit-refund] ${event.id}: toolkit-buyer tag removal failed for transaction ${found.tx._id}.`);
  }
  console.log(`[toolkit-refund] ${event.id} ${charge.id}: transaction ${found.tx._id} -> ${result.outcome}, tag ${tag}.`);
  return json({ ok: true, action: result.outcome, tag });
}
