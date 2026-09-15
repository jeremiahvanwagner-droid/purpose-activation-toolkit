"use client";

/** Where a reader came from — captured once, on arrival, and handed to the CRM
 *  when they claim their Audit result.
 *
 *  Why this exists: the free Audit is now the acquisition step for channels we
 *  cannot wire natively (a TikTok LIVE, a link in bio, a DM). The only thing
 *  those channels can carry is a link, and the only thing a link can carry is
 *  its query string. So the query string is the attribution: `utm_source`,
 *  `utm_medium`, `utm_campaign` (+ content/term and the TikTok/Meta click ids).
 *
 *  First touch wins. A reader who arrives from the LIVE, leaves, and comes back
 *  from the follow-up email keeps the LIVE attribution — that is the question
 *  we are actually asking ("did the LIVE produce this person?").
 *
 *  Stored in localStorage, same as the claim itself, so it survives the reader
 *  answering 28 statements across several sessions before they give an email.
 */

export const ATTRIBUTION_KEY = "pat:attribution:v1";

export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ttclid",
  "fbclid",
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

export type Attribution = Partial<Record<AttributionParam, string>> & {
  /** Path the reader landed on when the attribution was captured. */
  landing?: string;
  /** ISO timestamp of the capture — the session date for a LIVE. */
  captured_at?: string;
};

export function readAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Attribution) : null;
  } catch {
    return null; // private browsing, or a value we did not write
  }
}

/** Read the current URL and remember any attribution it carries. Safe to call
 *  on every page load; it only writes when the URL has something to say and
 *  nothing with a source is already stored. Never throws. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const query = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const key of ATTRIBUTION_PARAMS) {
      const value = query.get(key);
      if (value && value.trim()) found[key] = value.trim().slice(0, 200);
    }
    if (Object.keys(found).length === 0) return;

    const existing = readAttribution();
    if (existing?.utm_source) return; // first touch wins

    found.landing = window.location.pathname.slice(0, 200);
    found.captured_at = new Date().toISOString();
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    /* analytics must never break a page */
  }
}
