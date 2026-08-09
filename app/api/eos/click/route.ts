// Empowerment OS — the attribution bridge, browser side.
//
// This is the only moment in the funnel where we can see who someone is and
// where they came from. The pricing page lives on empowerment.software (a
// HighLevel funnel) and the checkout lives on buy.stripe.com. Neither can hand
// the other a cookie. So the page beacons what it knows here, keyed by a random
// token, and stamps that same token onto the Stripe link as client_reference_id.
// When Stripe reports a trial or a payment days later, that token is the only
// thread back to the campaign, the Meta cookies and the GA4 session.
//
// Called by navigator.sendBeacon with a text/plain body. That is deliberate:
// text/plain is a CORS "simple request", so there is no preflight to fail, and
// a beacon survives the page unloading as the browser navigates to Stripe.
//
// Contract: always 204, always fast, never trusted. Nothing here can fail in a
// way the visitor notices, and nothing in the body is believed except as
// strings — the IP and user agent come from request headers instead.

import { callRpc } from "@/lib/eosMeasurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the pricing page has any business calling this. Not a security boundary
 *  — a beacon can be forged by anyone — but it keeps stray traffic out of the
 *  funnel numbers. */
const ALLOWED_ORIGINS = new Set([
  "https://empowerment.software",
  "https://www.empowerment.software",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://empowerment.software",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

/** Fields the page is allowed to contribute, each clamped. Anything else in the
 *  body is dropped rather than stored. */
const STRING_FIELDS = [
  "token",
  "event",
  "tier",
  "billing_interval",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landing_url",
  "fbp",
  "fbc",
  "ga_client_id",
  "ga_session_id",
  "gclid",
] as const;

/** Tokens ride through Stripe as client_reference_id, which accepts only
 *  alphanumerics, dashes and underscores. Rejecting anything else here stops a
 *  malformed token from silently breaking attribution later. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function clean(value: unknown, max = 400): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Vercel puts the real client address first in x-forwarded-for. */
function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  // 204 on every path below. The visitor is mid-navigation to Stripe; there is
  // no failure here worth telling anyone about, and a beacon reads no response.
  const done = () => new Response(null, { status: 204, headers: CORS_HEADERS });

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return done();

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return done();
  }
  if (!raw || raw.length > 4000) return done();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return done();
  }
  if (!parsed || typeof parsed !== "object") return done();

  const source = parsed as Record<string, unknown>;
  const payload: Record<string, string> = {};
  for (const field of STRING_FIELDS) {
    const value = clean(source[field], field === "landing_url" || field === "referrer" ? 800 : 400);
    if (value) payload[field] = value;
  }

  if (!payload.token || !TOKEN_PATTERN.test(payload.token)) return done();
  if (payload.event !== "view" && payload.event !== "click") payload.event = "view";

  await callRpc<null>(
    "eos_record_click",
    {
      p: payload,
      p_client_ip: clientIp(req),
      p_user_agent: clean(req.headers.get("user-agent"), 400),
    },
    "eos-click",
  );

  return done();
}
