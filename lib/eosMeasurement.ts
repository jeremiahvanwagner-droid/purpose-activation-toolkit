// Empowerment OS — Layer 0 measurement primitives.
//
// Why any of this exists: empowerment.software is a HighLevel funnel and its
// checkout is a Stripe-hosted Payment Link. From the moment someone clicks
// "Start 14-day free trial" they are on buy.stripe.com, a domain we do not
// control and cannot put a pixel on. So every event that actually matters —
// trial started, trial converted to paid, subscription cancelled — is invisible
// to client-side tracking by construction. The only honest source is Stripe's
// server-side webhook, and the only way to attribute those server-side events
// back to a campaign is to carry a token across the handoff.
//
// Nothing here throws. A measurement layer that can break a webhook is worse
// than no measurement layer: Stripe would retry a failed delivery for days
// while the funnel data silently diverged from reality.

/** The three Stripe products behind the SaaS plans, from DEPLOYMENT-AUDIT §2. */
const TIER_BY_PRODUCT: Record<string, Tier> = {
  prod_V1cSQhBpdBU0LB: "foundation",
  prod_V1cciRjAWnpZAf: "growth",
  prod_V1cgVHcN39sQy5: "kingdom",
};

/** Fallback when a payload carries an amount but not a product we recognise —
 *  a re-created product, or a Stripe API version that shapes prices
 *  differently. Amounts are in cents and unambiguous across all six links. */
const TIER_BY_CENTS: Record<number, Tier> = {
  9700: "foundation",
  97000: "foundation",
  19700: "growth",
  197000: "growth",
  39700: "kingdom",
  397000: "kingdom",
};

export type Tier = "foundation" | "growth" | "kingdom";
export type BillingInterval = "monthly" | "annual";

export const TIER_LABEL: Record<Tier, string> = {
  foundation: "Foundation",
  growth: "Growth",
  kingdom: "Kingdom",
};

/** Public by design — it ships in the page source of every pricing-page hit.
 *  Same dataset as the live pixel (see lib/metaPixel.ts). */
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "815130848255492";

/** Overridable so a Graph API deprecation is an env change, not a redeploy.
 *  v23.0 confirmed live Aug 8 2026 (v19–v25 all answer; v99 does not). */
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

export function tierFromProduct(productId?: string | null): Tier | null {
  if (!productId) return null;
  return TIER_BY_PRODUCT[productId] ?? null;
}

export function tierFromCents(cents?: number | null): Tier | null {
  if (typeof cents !== "number") return null;
  return TIER_BY_CENTS[cents] ?? null;
}

/** Stripe says "month"/"year"; the rest of the system says monthly/annual. */
export function intervalFromStripe(interval?: string | null): BillingInterval | null {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return null;
}

/** Epoch seconds to ISO, tolerating the nulls Stripe uses for "not yet". */
export function isoFromEpoch(seconds?: number | null): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Meta requires emails hashed, normalised, and lowercase. Also what we persist
 *  instead of the address itself — Stripe is the system of record for identity,
 *  so our funnel tables have no reason to hold the buyer's email. */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent comparison. Signature checks must not leak, via timing,
 *  how much of a forged signature was correct. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type SignatureResult = { ok: true } | { ok: false; reason: string };

/**
 * Verify a `Stripe-Signature` header against the raw request body.
 *
 * Implemented by hand rather than pulling in the Stripe SDK: this app has three
 * runtime dependencies and the whole check is fifteen lines of HMAC. The SDK
 * would also want an API key, which this route has no other use for.
 *
 * The raw body matters — parsing and re-serialising the JSON changes the bytes
 * and every signature then fails.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<SignatureResult> {
  if (!header) return { ok: false, reason: "missing Stripe-Signature header" };

  let timestamp = "";
  const candidates: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "t") timestamp = value?.trim() ?? "";
    // v1 can appear more than once while a webhook secret is being rotated;
    // any one of them matching is a valid delivery.
    if (key?.trim() === "v1" && value) candidates.push(value.trim());
  }
  if (!timestamp || candidates.length === 0) return { ok: false, reason: "malformed Stripe-Signature header" };

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: `timestamp outside ${toleranceSeconds}s tolerance` };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return candidates.some((c) => timingSafeEqual(c, expected))
    ? { ok: true }
    : { ok: false, reason: "signature mismatch" };
}

// ---------------------------------------------------------------------------
// Supabase RPC. Both writes go through SECURITY DEFINER functions in `public`
// because the funnel tables live in the `revenue` schema, which PostgREST does
// not expose — and because the idempotency claim has to be atomic with the
// upsert it guards.
// ---------------------------------------------------------------------------

export async function callRpc<T>(fn: string, args: Record<string, unknown>, tag: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(`[${tag}] Supabase service role not configured; nothing recorded.`);
    return null;
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[${tag}] ${fn} failed:`, res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[${tag}] ${fn} error:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Downstream ad platforms. Both are optional: with no credentials set they
// report "skipped" and the funnel tables are still complete. That ordering is
// deliberate — our own numbers should never depend on a token pasted into a
// dashboard by hand.
// ---------------------------------------------------------------------------

/** What the click beacon captured, and the only reason a server-side conversion
 *  can be matched to a person or a campaign at all. */
export type ClickRecord = {
  token?: string | null;
  tier?: string | null;
  billing_interval?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  ga_client_id?: string | null;
  ga_session_id?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  landing_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
};

export type SinkOutcome = "sent" | "skipped:not-configured" | `error:${string}`;

export type MetaEventInput = {
  eventName: "StartTrial" | "Purchase";
  /** Stripe's event id. Reused as Meta's event_id so a redelivery we chose to
   *  re-send is deduplicated on their side as well as ours. */
  eventId: string;
  eventTimeSeconds: number;
  emailSha256?: string | null;
  valueUsd: number;
  /** One billing period, not a modelled lifetime value. Churn is unmeasured, so
   *  anything larger would be an invented number feeding a bidding algorithm. */
  predictedLtvUsd?: number | null;
  tier?: Tier | null;
  billingInterval?: BillingInterval | null;
  subscriptionId?: string | null;
  click?: ClickRecord | null;
};

export async function sendMetaEvent(input: MetaEventInput): Promise<SinkOutcome> {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!token) return "skipped:not-configured";

  const contentName = input.tier
    ? `Empowerment OS - ${TIER_LABEL[input.tier]}${input.billingInterval ? ` (${input.billingInterval})` : ""}`
    : "Empowerment OS";

  const userData: Record<string, unknown> = {};
  if (input.emailSha256) userData.em = [input.emailSha256];
  if (input.click?.fbp) userData.fbp = input.click.fbp;
  if (input.click?.fbc) userData.fbc = input.click.fbc;
  if (input.click?.client_ip) userData.client_ip_address = input.click.client_ip;
  if (input.click?.user_agent) userData.client_user_agent = input.click.user_agent;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTimeSeconds,
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.click?.landing_url || "https://empowerment.software/",
        user_data: userData,
        custom_data: {
          currency: "USD",
          value: input.valueUsd,
          content_name: contentName,
          content_category: "Empowerment OS",
          ...(input.predictedLtvUsd ? { predicted_ltv: input.predictedLtvUsd } : {}),
          ...(input.subscriptionId ? { order_id: input.subscriptionId } : {}),
        },
      },
    ],
    access_token: token,
  };

  // Set only while validating in Events Manager — with it present Meta routes
  // the event to the Test Events tab instead of counting it for real.
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("[eos-measurement] Meta CAPI failed:", res.status, detail);
      return `error:meta-${res.status}`;
    }
    return "sent";
  } catch (err) {
    console.error("[eos-measurement] Meta CAPI error:", err);
    return "error:meta-network";
  }
}

export type Ga4EventInput = {
  eventName: "trial_start" | "purchase";
  transactionId: string;
  eventTimeSeconds: number;
  valueUsd: number;
  tier?: Tier | null;
  billingInterval?: BillingInterval | null;
  click?: ClickRecord | null;
  /** Falls back to a stable synthetic id so the event still lands. It will not
   *  join to a web session, which is exactly why the beacon captures `_ga`. */
  fallbackClientId: string;
};

export async function sendGa4Event(input: Ga4EventInput): Promise<SinkOutcome> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return "skipped:not-configured";

  const itemId = input.tier
    ? `eos-${input.tier}-${input.billingInterval ?? "monthly"}`
    : "eos-unknown";

  const params: Record<string, unknown> = {
    currency: "USD",
    value: input.valueUsd,
    transaction_id: input.transactionId,
    tier: input.tier ?? "unknown",
    billing_interval: input.billingInterval ?? "unknown",
    items: [
      {
        item_id: itemId,
        item_name: `Empowerment OS ${input.tier ? TIER_LABEL[input.tier] : ""}`.trim(),
        item_category: "Empowerment OS",
        price: input.valueUsd,
        quantity: 1,
      },
    ],
  };
  // Without session_id GA4 files the conversion under (direct) rather than the
  // campaign that earned it — the single most common way server-side purchase
  // tracking ends up useless.
  if (input.click?.ga_session_id) params.session_id = input.click.ga_session_id;
  if (input.click?.utm_source) params.source = input.click.utm_source;
  if (input.click?.utm_medium) params.medium = input.click.utm_medium;
  if (input.click?.utm_campaign) params.campaign = input.click.utm_campaign;

  const body = {
    client_id: input.click?.ga_client_id || input.fallbackClientId,
    timestamp_micros: input.eventTimeSeconds * 1_000_000,
    non_personalized_ads: false,
    events: [{ name: input.eventName, params }],
  };

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    // The Measurement Protocol answers 204 on success and, unhelpfully, also
    // swallows malformed events with a 2xx. /debug/mp/collect is the only way
    // to see validation errors — see output/layer-0-measurement.md.
    if (!res.ok) {
      console.error("[eos-measurement] GA4 MP failed:", res.status);
      return `error:ga4-${res.status}`;
    }
    return "sent";
  } catch (err) {
    console.error("[eos-measurement] GA4 MP error:", err);
    return "error:ga4-network";
  }
}

export type GhlTrialTagInput = {
  email: string;
  name?: string | null;
};

/**
 * The sink that starts the customer's onboarding. The 9-email "EOS Trial
 * Activation" workflow in the TJB sub-account triggers on the
 * `eos-trial-started` contact tag — but SaaS checkouts happen on
 * buy.stripe.com and never create a TJB contact by themselves, so without
 * this handoff the sequence can never fire for a real buyer (found the hard
 * way on Aug 11: the first real customer received a wrong-brand email and
 * none of ours).
 *
 * The raw email exists only in the Stripe payload at delivery time — the
 * funnel ledger stores a hash — so this is called from the webhook route,
 * the one place that has it.
 *
 * Two calls, not one: upsert-with-tags can REPLACE a contact's existing tag
 * set, while POST /contacts/{id}/tags is additive. Slower, deterministic.
 */
export async function sendGhlTrialTag(input: GhlTrialTagInput): Promise<SinkOutcome> {
  const token = process.env.GHL_TJB_PIT?.trim();
  const locationId = process.env.GHL_TJB_LOCATION_ID?.trim();
  if (!token || !locationId) return "skipped:not-configured";

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const upsertRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationId,
        email: input.email,
        ...(input.name ? { name: input.name } : {}),
        source: "empowerment-os-trial",
      }),
      cache: "no-store",
    });
    if (!upsertRes.ok) {
      const detail = (await upsertRes.text()).slice(0, 300);
      console.error("[eos-measurement] GHL upsert failed:", upsertRes.status, detail);
      return `error:ghl-upsert-${upsertRes.status}`;
    }
    const upsert = (await upsertRes.json()) as { contact?: { id?: string } };
    const contactId = upsert.contact?.id;
    if (!contactId) {
      console.error("[eos-measurement] GHL upsert returned no contact id");
      return "error:ghl-no-contact-id";
    }

    const tagRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags: ["eos-trial-started"] }),
      cache: "no-store",
    });
    if (!tagRes.ok) {
      const detail = (await tagRes.text()).slice(0, 300);
      console.error("[eos-measurement] GHL tag failed:", tagRes.status, detail);
      return `error:ghl-tag-${tagRes.status}`;
    }
    return "sent";
  } catch (err) {
    console.error("[eos-measurement] GHL error:", err);
    return "error:ghl-network";
  }
}
