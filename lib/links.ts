/**
 * Every outbound destination, in one place.
 *
 * These URLs each appear on more than one page. While they lived inline, they
 * drifted: the community link pointed at Beyond the Veil on /audit and in the
 * gift claim, when it should have gone to the Skool community. Anything that
 * sends a reader off this app belongs here, so one edit fixes every surface.
 */

/** Divine Path Walkers on Skool — 7-day access ships with the free eBook. */
export const COMMUNITY_URL = "https://www.skool.com/divine-path-walkers-8031";

/** Beyond the Veil — the property the Inner Alignment Audit comes from.
 *  Deliberately NOT the community link; these are two different places. */
export const BEYOND_THE_VEIL_URL = "https://beyondtheveil.support";

/** The GHL payment link the $247 Toolkit is sold through. This id is also how
 *  a transaction is recognised as a Toolkit purchase (it arrives on the payment
 *  record as `entitySourceId`), so the checkout URL and the entitlement matcher
 *  in /api/entitlement-sync can never drift apart. */
export const TOOLKIT_PAYMENT_LINK_ID = "696ec80453f21b434dfae38d";

/** GHL payment link for the $247 Purpose Activation Toolkit. */
export const CHECKOUT_URL = `https://site.truthjblue.com/payment-link/${TOOLKIT_PAYMENT_LINK_ID}`;

/** The GHL payment link the $97 Inner Alignment Audit is sold through in the
 *  store. Like the Toolkit's, this id is how a transaction is recognised as an
 *  Audit purchase (`entitySourceId`) by /api/entitlement-sync. */
export const AUDIT_PAYMENT_LINK_ID = "696e9d90b112a056c6a3f6c5";
export const AUDIT_CHECKOUT_URL = `https://site.truthjblue.com/payment-link/${AUDIT_PAYMENT_LINK_ID}`;

/** Where a purchased Audit is taken. Always on www: sign-in sessions and saved
 *  answers live per origin, so store.truthjblue.com/audit redirects here. */
export const PAID_AUDIT_PATH = "/store/audit";
export const PAID_AUDIT_URL = `https://www.truthjblue.com${PAID_AUDIT_PATH}`;

/** The complimentary 20-minute review call included with the paid Audit
 *  (HighLevel calendar "Complimentary Audit Review"). */
export const AUDIT_REVIEW_CALENDAR_URL = "https://site.truthjblue.com/widget/booking/JtOmJzP6DeLtF4XqRK2Q";

/** The eBook lives in Supabase public storage, which turns a `download`
 *  parameter into a Content-Disposition: attachment with that filename. Without
 *  it the browser decides what to do with an EPUB — on 5 Sep that was a
 *  save-as dialog hidden behind the window, which read as a frozen site. */
export function ebookDownloadUrl(url: string): string {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}download=You-Were-Created-to-Serve.epub`;
}

/** The storefront's own hostname (served by this app; see middleware.ts). */
export const STORE_URL = "https://store.truthjblue.com";

/** The Audit as sold in the store. A same-host path on purpose: it resolves
 *  from www.truthjblue.com whether or not the store hostname has moved yet. */
export const STORE_AUDIT_PATH = "/store/product/inner-alignment-audit";
