# Meta Commerce Manager — Books in Print (November 8, 2026)

## Current production state

**This is no longer a WooCommerce storefront.** Vercel project
`purpose-activation-toolkit` powers `store.truthjblue.com`.
All ten published paperback pages live at `/books/<slug>`, with Lulu
performing printing, payment, shipping and checkout.

**Meta catalog:** `2587898941296952`, now named **Truth J Blue — Books in Print**.
Its historical identity, retailer IDs and existing Facebook product tags are preserved.

- **10 published books** — current Vercel `/books/<slug>` URLs, verified Lulu prices and in-stock status.
- **361 retired apparel variants** — `visibility=hidden` and `availability=discontinued`. The Printful account was deleted, so the products cannot be fulfilled.
- **2 spiral notebooks** and **1 obsolete book bundle** — hidden and discontinued.
- **1 older duplicate of The Alchemy of Intention** (retailer ID 892) — hidden. Active paperback ID 1020 is published at $24.99.
- **375 catalog records total:** 10 published, 365 hidden. Do not mass-publish retired merchandise.

**Existing book product set:** `25192972080391025`, now called **Truth J Blue — 10 Books in Print (Active)**.
Its filter selects only published, in-stock library paperbacks, including active Alchemy ID 1020.
It excludes retired records and is verified to contain 10 items.

## Existing infrastructure

- `lib/store/lulu-books.data.json` — published physical book SKU, price, checkout URL and availability. This is a reviewed snapshot, not a real-time Lulu sync.
- `app/api/meta-legacy-books-feed/route.ts` — optional update-only CSV for 11 historical book retailer IDs (10 editions plus hidden duplicate). **It was not imported to Commerce Manager.** The published records were corrected directly in Meta.
- `app/api/meta-books-feed/route.ts` — separate print catalog pilot feed, still release-gated; one approved edition.
- `app/api/meta-feed/route.ts` — ads-only digital product catalog. **Never attach this to the physical Books in Print Shop.**
- `middleware.ts` — targeted 301 redirects from 11 old WooCommerce book URLs to their matching Vercel pages. Preserves `utm_source`, `fbclid` and other query parameters.
- `scripts/check-meta-book-links.mjs` and `.github/workflows/book-links.yml` — read-only link monitor of 10 live Vercel pages and 11 historical redirects. Runs nightly, on PRs affecting links, and by manual GitHub Actions dispatch. It does not place orders.

## Checkout bridge — deployed on Vercel

The historical Shop-level USA checkout URL in Commerce Manager was:
`https://store.truthjblue.com/checkout-link/` (previously 404).

PR #32 provides a safe Vercel route on that same address. When Meta adds
`products=901:2,1020:1`, it maps the existing numeric book IDs to the
verified Lulu Buy Button identifiers and sends the buyer to Lulu's cart with
the exact editions and quantities. Unknown or retired IDs and unsupported
coupons are rejected instead of placing incorrect orders.

A bare checkout URL now presents a safe choice of the ten current books.
Full usage and safety details: `docs/meta-lulu-checkout-bridge.md`.

**Owner handoff (native Meta Commerce Manager still required):**

1. In Commerce Manager, find catalog `2587898941296952` and its Shop checkout
   settings. Verify the URL is `https://store.truthjblue.com/checkout-link`
   (the historical trailing-slash path also redirects to it).
2. Use Meta's own **test checkout** for one book and a multi-book selection.
   Make sure Meta includes the `products=RETAILER_ID:QUANTITY` parameter;
   the bridge will not infer a selection.
3. Confirm Lulu cart shows correct books, quantities and prices and that Meta
   permits this off-site checkout arrangement. Do **not** enable Meta coupon
   checkout because Lulu's direct links do not support that redemption.
4. From an actual Facebook and Instagram post tag, test the product destination
   and the handoff to Lulu; stop before payment. Verify Shop eligibility.
5. The two old WooCommerce feeds have no current schedules; don't reactivate.
   Disconnect old WooCommerce partner integration only if Meta confirms this
   will preserve the ten current item IDs and existing product tags.

Issue #30 tracks native Shop configuration/validation. This connector cannot
write global Shop checkout URLs or partner integration settings.

## Privacy and measurement

Meta Pixel `815130848255492` is configured in the live Vercel code and is attached
to the historical book catalog. The app intentionally emits only sitewide
`PageView` on printed-book pages. It does **not** fabricate
`ViewContent`, `AddToCart`, or `Purchase` for off-site Lulu transactions.
Catalog product-event match rates therefore show no matching events.
This is not evidence that ordinary Facebook or Instagram product tagging fails.
Dynamic product ads require a separate, truthful tracking plan if ever pursued.

## Operational rule

Only actual, purchasable **physical** items with working destination pages
belong in the published Shop catalog. If a Lulu book is retired or temporarily
unavailable, update the reviewed manifest and the corresponding Meta catalog
retailer ID, then verify both sides. Do not add digital products, the non-restorable
Printful apparel, or generic links merely to inflate the catalog.
