/**
 * Meta Pixel — the id and the event helper, in one place.
 *
 * A pixel id is public by design; it ships in the page source of every request.
 * So this carries a literal default rather than failing closed when the env var
 * is missing — a deploy that never got NEXT_PUBLIC_META_PIXEL_ID set in Vercel
 * still tracks, instead of going quietly dark for a week before anyone notices.
 * Set the env var only to point a preview build at a different dataset.
 */

/** Dataset "Truth J Blue" (815130848255492), owned by the Jeremiah VanWagner
 *  business portfolio. Renamed from "Scorecard-Audit-Toolkit" — the Scorecard
 *  is a retired lead magnet and is not part of this funnel. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "815130848255492";

/** The $247 Purpose Activation Toolkit — the one and only core offer. The Audit,
 *  the eBook and the Divine Path Walkers trial are gifts and are never valued. */
export const TOOLKIT_PRICE = 247;
export const CURRENCY = "USD";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/**
 * Fire a standard Meta event.
 *
 * No-ops on the server, before the pixel script has loaded, and wherever an ad
 * blocker got there first. Analytics must never be able to break a page — a
 * reader losing the eBook because a tracker threw would be a bad trade.
 */
export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", event, params);
  } catch {
    /* blocked or not yet loaded — nothing to recover, and nothing to report */
  }
}
