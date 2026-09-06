// Truth J Blue store — HighLevel order webhook -> Meta Purchase (Conversions API).
//
// The store's checkout opens HighLevel in a new tab (CheckoutButton uses
// target="_blank"), so the buyer never comes back to this site and the browser
// pixel cannot see the sale. Purchase has to be reported server-side, from the
// moment HighLevel knows the money moved. That moment arrives here.
//
// Wiring (the two halves outside this file):
//   HighLevel  -> Automation -> trigger on the order/payment event
//              -> Custom Webhook action -> POST this URL
//              -> header  x-tjb-webhook-secret: <GHL_ORDER_WEBHOOK_SECRET>
//                 (or, if custom headers are unavailable, a top-level body
//                  field "secret" with the same value)
//   Vercel     -> META_CAPI_ACCESS_TOKEN (Events Manager -> Settings ->
//                 Conversions API -> Generate access token)
//              -> GHL_ORDER_WEBHOOK_SECRET (any long random string, same value
//                 pasted into the HighLevel action)
//
// Decisions, and why:
//   1. First payment only. A subscription's renewals are skipped. Reporting
//      each renewal would tell Meta one customer was twelve, and the bidding
//      algorithm would scale spend against revenue that is one person paying
//      on time. (Jeremiah, 2026-09-05: "first payment only, ignore renewals".)
//   2. No database. Meta deduplicates on event_id for 48 hours, and the event
//      id here is the HighLevel order id, so a redelivery cannot double-count.
//      This keeps the store lane out of the EOS Supabase tables entirely.
//   3. Unsigned requests are never processed. Anyone who could post here could
//      invent revenue, and ad spend decisions are downstream of this number.
//   4. A downstream failure still returns 2xx. A bad Meta token must not turn
//      into a HighLevel retry storm that double-reports once the token is fixed.
//   5. Not lib/eosMeasurement.sendMetaEvent. That helper labels every event
//      "Empowerment OS" with empowerment.software as the source URL; sending
//      store purchases through it would file Truth J Blue revenue under the
//      wrong brand in Events Manager.
//
// The HighLevel payload shape is not documented well enough to trust a single
// field name, so extraction below is tolerant. The first real order should be
// checked in Vercel's logs (every accepted event is logged with its mapping)
// and the field list tightened once the actual shape is known.

import { sha256Hex } from "@/lib/eosMeasurement";
import { META_PIXEL_ID } from "@/lib/metaPixel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const STORE_URL = "https://store.truthjblue.com/";

type Json = Record<string, unknown>;

/** Length-independent comparison so a forged secret cannot be guessed a
 *  character at a time from response timing. Same shape as the Stripe route's. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function asObject(v: unknown): Json | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null;
}

function firstString(obj: Json | null, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function firstNumber(obj: Json | null, keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/** HighLevel nests the buyer under `contact` on most webhooks, but flattens it
 *  on some. Look in both places. */
function buyer(body: Json): Json | null {
  return asObject(body.contact) ?? asObject(body.customer) ?? body;
}

/** True when the payload says this charge is a renewal rather than the first
 *  payment. Any positive signal wins; absence of all signals means first. */
function isRenewal(body: Json): boolean {
  const sub = asObject(body.subscription);
  const flags = [body.isRenewal, body.renewal, body.is_renewal, sub?.isRenewal, sub?.renewal];
  if (flags.some((f) => f === true || f === "true")) return true;

  const idx = firstNumber(body, ["chargeNumber", "paymentNumber", "invoiceNumber", "cycle"])
    ?? firstNumber(sub, ["chargeNumber", "paymentNumber", "cycle"]);
  if (idx !== null && idx > 1) return true;

  const kind = (firstString(body, ["paymentType", "type", "eventType", "event"]) ?? "").toLowerCase();
  return kind.includes("renew") || kind.includes("recurring_payment") || kind.includes("invoice.paid.recurring");
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.GHL_ORDER_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return Response.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  let body: Json;
  try {
    const parsed: unknown = await req.json();
    const obj = asObject(parsed);
    if (!obj) throw new Error("not an object");
    body = obj;
  } catch {
    return Response.json({ ok: false, error: "Malformed JSON." }, { status: 400 });
  }

  const presented = req.headers.get("x-tjb-webhook-secret")?.trim() || firstString(body, ["secret"]) || "";
  if (!timingSafeEqual(presented, secret)) {
    return Response.json({ ok: false, error: "Invalid secret." }, { status: 401 });
  }

  // --- first payment only ---------------------------------------------------
  if (isRenewal(body)) {
    return Response.json({ ok: true, ignored: "renewal" });
  }

  // --- extract the order ----------------------------------------------------
  const order = asObject(body.order) ?? asObject(body.transaction) ?? asObject(body.payment) ?? body;
  const orderId = firstString(order, ["id", "orderId", "order_id", "transactionId", "transaction_id", "invoiceId", "paymentId", "chargeId"])
    ?? firstString(body, ["id", "orderId", "order_id", "transactionId", "transaction_id"]);
  if (!orderId) {
    // Without a stable id there is no dedupe key, and an undeduplicated
    // Purchase is worse than none. Log it so the mapping can be fixed.
    console.error("[ghl-order-webhook] no order id in payload; keys:", Object.keys(body).join(","));
    return Response.json({ ok: false, error: "No order id." }, { status: 400 });
  }

  let amount = firstNumber(order, ["amount", "total", "totalAmount", "value", "price", "grandTotal"])
    ?? firstNumber(body, ["amount", "total", "totalAmount", "value"]);
  const cents = firstNumber(order, ["amountInCents", "amount_cents", "totalInCents"]);
  if (amount === null && cents !== null) amount = cents / 100;
  if (amount === null || amount <= 0) {
    console.error("[ghl-order-webhook] no positive amount for order", orderId);
    return Response.json({ ok: false, error: "No amount." }, { status: 400 });
  }

  const currency = (firstString(order, ["currency", "currencyCode"]) ?? firstString(body, ["currency"]) ?? "USD").toUpperCase();
  const productName = firstString(order, ["productName", "product_name", "name", "title", "description"])
    ?? firstString(body, ["productName", "product_name"]) ?? "Truth J Blue Store";
  const productId = firstString(order, ["productId", "product_id", "priceId", "price_id"]) ?? undefined;

  const who = buyer(body);
  const email = firstString(who, ["email", "emailAddress", "email_address"]);
  const firstName = firstString(who, ["firstName", "first_name", "firstname"]);
  const lastName = firstString(who, ["lastName", "last_name", "lastname"]);
  const phone = firstString(who, ["phone", "phoneNumber", "phone_number"]);

  const eventId = `ghl:${orderId}`;
  const eventTime = Math.floor(Date.now() / 1000);

  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn("[ghl-order-webhook] META_CAPI_ACCESS_TOKEN not set; Purchase not sent", { eventId, amount, currency });
    return Response.json({ ok: true, sent: false, reason: "meta-not-configured", eventId });
  }

  // --- build the Purchase --------------------------------------------------
  const userData: Record<string, unknown> = {};
  if (email) userData.em = [await sha256Hex(email)];
  if (firstName) userData.fn = [await sha256Hex(firstName)];
  if (lastName) userData.ln = [await sha256Hex(lastName)];
  if (phone) userData.ph = [await sha256Hex(phone.replace(/[^0-9]/g, ""))];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        event_source_url: STORE_URL,
        user_data: userData,
        custom_data: {
          value: amount,
          currency,
          content_name: productName,
          content_type: "product",
          content_category: "Truth J Blue Store",
          order_id: orderId,
          ...(productId ? { content_ids: [productId] } : {}),
        },
      },
    ],
    access_token: token,
  };

  // Present only while validating in Events Manager -> Test Events. With it
  // set, Meta routes the event to that tab instead of counting it.
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) payload.test_event_code = testCode;

  let outcome: string;
  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (res.ok) {
      outcome = "sent";
    } else {
      const detail = (await res.text()).slice(0, 300);
      console.error("[ghl-order-webhook] Meta CAPI failed:", res.status, detail);
      outcome = `error:meta-${res.status}`;
    }
  } catch (err) {
    console.error("[ghl-order-webhook] Meta CAPI network error:", err);
    outcome = "error:meta-network";
  }

  console.log("[ghl-order-webhook] Purchase", {
    eventId, amount, currency, productName, productId: productId ?? null,
    hasEmail: !!email, test: !!testCode, outcome,
  });

  // Always 2xx from here: the order is real regardless of whether Meta accepted
  // the report, and a non-2xx would only make HighLevel resend it.
  return Response.json({ ok: true, sent: outcome === "sent", outcome, eventId });
}
