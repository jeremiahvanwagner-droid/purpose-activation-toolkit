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

/** The storefront's own hostname (served by this app; see middleware.ts). */
export const STORE_URL = "https://store.truthjblue.com";

/** The Audit as sold in the store. A same-host path on purpose: it resolves
 *  from www.truthjblue.com whether or not the store hostname has moved yet. */
export const STORE_AUDIT_PATH = "/store/product/inner-alignment-audit";
