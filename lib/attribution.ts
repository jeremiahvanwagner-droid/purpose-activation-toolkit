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
 *  `am_id` is the same kind of first-party note for a partner link
 *  (`/?am_id=`). The first value wins, and it can be remembered on a later
 *  visit without replacing a utm source already stored. The audit claim route
 *  only forwards its own key list, so this id is not sent on to the CRM.
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
  /** First HighLevel affiliate id seen on `?am_id=`. */
  am_id?: string;
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
function boundedParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 200);
  return trimmed ? trimmed : null;
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const query = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const key of ATTRIBUTION_PARAMS) {
      const value = boundedParam(query.get(key));
      if (value) found[key] = value;
    }
    const amId = boundedParam(query.get("am_id"));
    if (amId) found.am_id = amId;

    const hasCampaign = ATTRIBUTION_PARAMS.some((key) => found[key]);
    if (!hasCampaign && !amId) return;

    const existing = readAttribution();
    if (existing?.utm_source) {
      if (amId && !existing.am_id) {
        localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...existing, am_id: amId }));
      }
      return;
    }

    if (!hasCampaign) {
      if (existing?.am_id) return;
      found.landing = window.location.pathname.slice(0, 200);
      found.captured_at = new Date().toISOString();
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
      return;
    }

    // First campaign touch. Same overwrite as before, keeping the first am_id
    // and the landing page of the partner visit when that was earlier.
    if (existing?.am_id) found.am_id = existing.am_id;
    if (existing?.am_id && existing.landing) {
      found.landing = existing.landing;
      found.captured_at = existing.captured_at;
    } else {
      found.landing = window.location.pathname.slice(0, 200);
      found.captured_at = new Date().toISOString();
    }
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    /* analytics must never break a page */
  }
}
