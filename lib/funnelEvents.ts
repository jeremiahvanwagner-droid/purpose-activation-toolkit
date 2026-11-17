// First-party funnel counter for the public /created-to-serve pages.
//
// GA4 and the Meta pixel already receive view_item / begin_checkout and
// ViewContent / InitiateCheckout, but neither can be read by the team without
// dashboard access. This keeps a plain count in Supabase (public.funnel_events)
// that can be queried directly. Only the fields below are kept; contact data,
// IP address and user agent are never stored.

export const FUNNEL_PAGES = ["created-to-serve", "toolkit", "audit", "resource", "access", "purchase-support", "community"] as const;
export const FUNNEL_EVENTS = ["view", "checkout_click"] as const;
const PRODUCTS = ["toolkit", "audit"] as const;
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const UTM_PATTERN = /^[a-zA-Z0-9 _.-]{1,100}$/;
const HOST_PATTERN = /^[a-z0-9.-]{1,255}$/;
export const FUNNEL_ORIGINS = new Set(["https://www.truthjblue.com", "https://truthjblue.com"]);

export type FunnelEventRow = {
  event: (typeof FUNNEL_EVENTS)[number];
  page: (typeof FUNNEL_PAGES)[number];
  product?: (typeof PRODUCTS)[number];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_host?: string;
  device: "mobile" | "desktop";
};

function oneOf<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Validates a beacon body. Returns null for anything that is not a known event. */
export function parseFunnelEvent(raw: string, userAgent: string | null): FunnelEventRow | null {
  if (!raw || raw.length > 2000) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const event = oneOf(FUNNEL_EVENTS, source.event);
  const page = oneOf(FUNNEL_PAGES, source.page);
  if (!event || !page) return null;
  const row: FunnelEventRow = { event, page, device: /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent ?? "") ? "mobile" : "desktop" };
  if (event === "checkout_click") {
    const product = oneOf(PRODUCTS, source.product);
    if (!product) return null;
    row.product = product;
  }
  for (const field of UTM_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && UTM_PATTERN.test(value)) row[field] = value;
  }
  const host = typeof source.referrer_host === "string" ? source.referrer_host.toLowerCase() : "";
  if (HOST_PATTERN.test(host)) row.referrer_host = host;
  return row;
}
