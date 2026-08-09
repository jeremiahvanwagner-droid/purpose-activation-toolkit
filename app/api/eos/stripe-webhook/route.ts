// Empowerment OS — Stripe webhook. Layer 0 of the acquisition build.
//
// This is the whole measurement system. The pricing page can see a click and
// nothing after it: the trial starts on buy.stripe.com, converts to paid
// fourteen days later with nobody's browser open, and cancels months after
// that. None of those three moments is reachable from a pixel. They arrive
// here, or they are not measured at all.
//
// What it does with each one:
//   checkout.session.completed  -> trial started. Carries client_reference_id,
//                                  the token that links this subscription back
//                                  to the campaign that produced it. Fires
//                                  StartTrial / trial_start.
//   customer.subscription.*     -> plan facts, trial dates, status, churn.
//   invoice.paid                -> money. The FIRST paid invoice is the
//                                  trial->paid conversion and fires Purchase.
//                                  Every later one is a renewal and fires
//                                  nothing, because reporting each renewal as a
//                                  Purchase would tell Meta one customer was
//                                  twelve.
//
// Three rules this route will not break:
//   1. An unsigned request is never processed. Anyone who could post here
//      unverified could invent revenue, and every downstream number — CAC, LTV,
//      the decision to spend money on ads — is derived from this table.
//   2. A downstream failure never returns non-2xx. Stripe retries non-2xx for
//      days; a broken Meta token must not turn into a redelivery storm that
//      double-counts once the token is fixed.
//   3. Nothing fires twice. The event id is claimed in Postgres before any
//      send, and Stripe delivers at-least-once by design.
//
// IMPORTANT: this endpoint is *additional* to the one HighLevel already has on
// this Stripe account for SaaS provisioning. Never consolidate or replace that
// one — deleting it stops client sub-accounts being created.

import {
  callRpc,
  intervalFromStripe,
  isoFromEpoch,
  sendGa4Event,
  sendMetaEvent,
  sha256Hex,
  tierFromCents,
  tierFromProduct,
  verifyStripeSignature,
  type BillingInterval,
  type ClickRecord,
  type SinkOutcome,
  type Tier,
} from "@/lib/eosMeasurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: Record<string, unknown> };
};

type IngestResult = {
  claimed: boolean;
  event_id?: string;
  funnel_event?: string;
  is_first_payment?: boolean;
  subscription?: Record<string, unknown> | null;
  click?: ClickRecord | null;
};

/** Fields we merge into revenue.eos_subscriptions. All optional — Stripe does
 *  not order deliveries, so each event contributes only what it knows. */
type SubscriptionFacts = {
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  click_token?: string;
  tier?: Tier;
  billing_interval?: BillingInterval;
  plan_amount_usd?: string;
  email_sha256?: string;
  status?: string;
  trial_started_at?: string;
  trial_ends_at?: string;
  canceled_at?: string;
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Stripe expands some references and leaves others as bare ids depending on
 *  the API version and the call that produced them. */
function idOf(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (value && typeof value === "object") return str((value as Record<string, unknown>).id);
  return undefined;
}

/**
 * Where an invoice's subscription lives, across Stripe API versions.
 *
 * Older versions put it at `invoice.subscription`. The 2025 Invoice rework moved
 * it to `invoice.parent.subscription_details.subscription`. The webhook payload
 * is rendered at whatever version the endpoint is pinned to, which is a
 * dashboard setting nobody should have to remember — so read both, then fall
 * back to the line item.
 */
function subscriptionIdFromInvoice(invoice: Record<string, unknown>): string | undefined {
  const direct = idOf(invoice.subscription);
  if (direct) return direct;

  const parent = invoice.parent as Record<string, unknown> | undefined;
  const details = parent?.subscription_details as Record<string, unknown> | undefined;
  const fromParent = idOf(details?.subscription);
  if (fromParent) return fromParent;

  const lines = invoice.lines as { data?: Record<string, unknown>[] } | undefined;
  for (const line of lines?.data ?? []) {
    const fromLine =
      idOf(line.subscription) ??
      idOf((line.parent as Record<string, unknown> | undefined)?.subscription_item_details);
    if (fromLine) return fromLine;
  }
  return undefined;
}

/** Tier and interval off a subscription's first line item, by product id where
 *  we recognise it and by price otherwise. */
function planFromSubscription(subscription: Record<string, unknown>): {
  tier?: Tier;
  interval?: BillingInterval;
  amountUsd?: number;
} {
  const items = subscription.items as { data?: Record<string, unknown>[] } | undefined;
  const price = items?.data?.[0]?.price as Record<string, unknown> | undefined;
  if (!price) return {};

  const cents = num(price.unit_amount);
  const recurring = price.recurring as Record<string, unknown> | undefined;

  return {
    tier: tierFromProduct(idOf(price.product)) ?? tierFromCents(cents) ?? undefined,
    interval: intervalFromStripe(str(recurring?.interval)) ?? undefined,
    amountUsd: cents === undefined ? undefined : cents / 100,
  };
}

/** What this Stripe event means for the funnel, and what to merge. `payment` is
 *  deliberately unresolved here — only Postgres can decide atomically whether a
 *  paid invoice is the conversion or a renewal. */
async function interpret(
  type: string,
  object: Record<string, unknown>,
): Promise<{ funnelEvent: string; facts: SubscriptionFacts; amountUsd?: number } | null> {
  switch (type) {
    case "checkout.session.completed": {
      // Only subscription checkouts belong to Empowerment OS. The same Stripe
      // account also sells one-off products.
      if (str(object.mode) !== "subscription") return null;

      const details = object.customer_details as Record<string, unknown> | undefined;
      const email = str(details?.email) ?? str(object.customer_email);
      const subscriptionId = idOf(object.subscription);
      if (!subscriptionId) return null;

      return {
        funnelEvent: "trial_started",
        facts: {
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: idOf(object.customer),
          click_token: str(object.client_reference_id),
          email_sha256: email ? await sha256Hex(email) : undefined,
          status: "trialing",
        },
        amountUsd: 0,
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.trial_will_end": {
      const subscriptionId = str(object.id);
      if (!subscriptionId) return null;

      const plan = planFromSubscription(object);
      const deleted = type === "customer.subscription.deleted";

      return {
        funnelEvent:
          type === "customer.subscription.created"
            ? "trial_details"
            : type === "customer.subscription.trial_will_end"
              ? "trial_will_end"
              : deleted
                ? "canceled"
                : "subscription_updated",
        facts: {
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: idOf(object.customer),
          tier: plan.tier,
          billing_interval: plan.interval,
          plan_amount_usd: plan.amountUsd === undefined ? undefined : String(plan.amountUsd),
          status: deleted ? "canceled" : str(object.status),
          trial_started_at: isoFromEpoch(num(object.trial_start)) ?? undefined,
          trial_ends_at: isoFromEpoch(num(object.trial_end)) ?? undefined,
          // cancel_at_period_end is not a cancellation — they are still paying
          // and still a customer until the period actually ends.
          canceled_at:
            isoFromEpoch(num(object.canceled_at)) ??
            isoFromEpoch(num(object.ended_at)) ??
            undefined,
        },
      };
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const subscriptionId = subscriptionIdFromInvoice(object);
      if (!subscriptionId) return null;

      const cents = num(object.amount_paid) ?? 0;
      const email = str(object.customer_email);

      // The $0 invoice Stripe issues when a trial begins is not revenue and
      // must not be able to look like the trial->paid conversion.
      if (cents <= 0) {
        return {
          funnelEvent: "zero_invoice",
          facts: { stripe_subscription_id: subscriptionId, stripe_customer_id: idOf(object.customer) },
          amountUsd: 0,
        };
      }

      return {
        funnelEvent: "payment",
        facts: {
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: idOf(object.customer),
          email_sha256: email ? await sha256Hex(email) : undefined,
          status: "active",
        },
        amountUsd: cents / 100,
      };
    }

    case "invoice.payment_failed": {
      const subscriptionId = subscriptionIdFromInvoice(object);
      if (!subscriptionId) return null;
      return {
        funnelEvent: "payment_failed",
        facts: { stripe_subscription_id: subscriptionId, status: "past_due" },
        amountUsd: (num(object.amount_due) ?? 0) / 100,
      };
    }

    // Everything else is recorded by Stripe and of no use to the funnel. Not an
    // error — the endpoint should be allowed to subscribe to extra events
    // without this route needing a change.
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_EOS?.trim();
  if (!secret) {
    // Refuse rather than accept unverified events. An open endpoint here could
    // be used to invent revenue, and every acquisition decision reads this data.
    console.error("[eos-stripe] STRIPE_WEBHOOK_SECRET_EOS is not set; refusing to process.");
    return Response.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  // Raw text, not req.json(): re-serialising the body changes the bytes and
  // every signature then fails.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return Response.json({ ok: false, error: "Unreadable body." }, { status: 400 });
  }

  const verdict = await verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret);
  if (!verdict.ok) {
    console.error("[eos-stripe] rejected delivery:", verdict.reason);
    return Response.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return Response.json({ ok: false, error: "Malformed JSON." }, { status: 400 });
  }

  const eventId = str(event.id);
  const eventType = str(event.type);
  const object = event.data?.object;
  if (!eventId || !eventType || !object) {
    return Response.json({ ok: false, error: "Not a Stripe event." }, { status: 400 });
  }

  const occurredAtSeconds = num(event.created) ?? Math.floor(Date.now() / 1000);
  const occurredAt = new Date(occurredAtSeconds * 1000).toISOString();

  const reading = await interpret(eventType, object);
  if (!reading) {
    // Acknowledged and ignored. Returning 200 stops Stripe retrying an event we
    // will never care about.
    return Response.json({ ok: true, ignored: eventType });
  }

  const result = await callRpc<IngestResult>(
    "eos_ingest_stripe_event",
    {
      p_stripe_event_id: eventId,
      p_event_type: eventType,
      p_funnel_event: reading.funnelEvent,
      p_occurred_at: occurredAt,
      p_amount_usd: reading.amountUsd ?? null,
      p_subscription: reading.facts,
      // Kept small on purpose: this table is a funnel ledger, not a copy of
      // Stripe. Stripe remains the system of record for the full object.
      p_payload: { livemode: object.livemode ?? null, billing_reason: object.billing_reason ?? null },
    },
    "eos-stripe",
  );

  if (!result) {
    // The database write failed. Return 200 anyway: a 500 makes Stripe retry,
    // and if Supabase is down the retry fails too — but the retry storm would
    // then land all at once when it recovers. The gap is visible as a missing
    // row, and the log line says which event.
    console.error("[eos-stripe] could not record event", eventId, eventType);
    return Response.json({ ok: true, recorded: false });
  }

  if (!result.claimed) {
    // Stripe redelivered something already processed. This is the guard that
    // stops a retry becoming a second Purchase.
    return Response.json({ ok: true, duplicate: true });
  }

  const subscription = result.subscription ?? {};
  const click = result.click ?? null;
  const tier = (str(subscription.tier) ?? str(click?.tier ?? undefined)) as Tier | undefined;
  const interval = (str(subscription.billing_interval) ??
    str(click?.billing_interval ?? undefined)) as BillingInterval | undefined;
  const emailSha256 = str(subscription.email_sha256);
  const subscriptionId = str(reading.facts.stripe_subscription_id);
  const planAmount = Number(subscription.plan_amount_usd ?? 0) || null;

  let sinks: Record<string, SinkOutcome> | null = null;

  if (result.funnel_event === "trial_started") {
    const [meta, ga4] = await Promise.all([
      sendMetaEvent({
        eventName: "StartTrial",
        eventId,
        eventTimeSeconds: occurredAtSeconds,
        emailSha256,
        // $0 changes hands today. The trial's worth is what it becomes, and
        // that lives in predicted_ltv.
        valueUsd: 0,
        predictedLtvUsd: planAmount,
        tier: tier ?? null,
        billingInterval: interval ?? null,
        subscriptionId,
        click,
      }),
      sendGa4Event({
        eventName: "trial_start",
        transactionId: subscriptionId ?? eventId,
        eventTimeSeconds: occurredAtSeconds,
        valueUsd: 0,
        tier: tier ?? null,
        billingInterval: interval ?? null,
        click,
        fallbackClientId: subscriptionId ?? eventId,
      }),
    ]);
    sinks = { meta, ga4 };
  }

  if (result.funnel_event === "first_payment") {
    const value = reading.amountUsd ?? 0;
    const [meta, ga4] = await Promise.all([
      sendMetaEvent({
        eventName: "Purchase",
        eventId,
        eventTimeSeconds: occurredAtSeconds,
        emailSha256,
        valueUsd: value,
        tier: tier ?? null,
        billingInterval: interval ?? null,
        subscriptionId,
        click,
      }),
      sendGa4Event({
        eventName: "purchase",
        transactionId: str(object.id) ?? eventId,
        eventTimeSeconds: occurredAtSeconds,
        valueUsd: value,
        tier: tier ?? null,
        billingInterval: interval ?? null,
        click,
        fallbackClientId: subscriptionId ?? eventId,
      }),
    ]);
    sinks = { meta, ga4 };
  }

  if (sinks && result.event_id) {
    await callRpc<null>("eos_record_sinks", { p_event_id: result.event_id, p_sinks: sinks }, "eos-stripe");
  }

  return Response.json({
    ok: true,
    funnel_event: result.funnel_event,
    attributed: Boolean(click?.token),
    sinks: sinks ?? "none-for-this-event",
  });
}
