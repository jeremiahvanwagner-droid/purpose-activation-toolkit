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

## What cannot be completed via the current Meta catalog connector

The catalog's USA-level `checkout_urls` still contains:
`https://store.truthjblue.com/checkout-link/`.
The destination returns **404 Not Found**. The connector permits product URLs
but does not expose settings for the Shop checkout model or global checkout URL.

**Owner handoff for Commerce Manager:**

1. Open catalog `2587898941296952` in Commerce Manager and locate the **Shop checkout / website checkout** setting. The location and labels may vary by interface.
2. Remove the obsolete `/checkout-link/` checkout destination. Configure website checkout to use **each book's canonical Vercel product page**, not a generic page or invented global Lulu cart. Lulu checkout then starts from the product page.
3. Inspect the old WooCommerce partner integration and two legacy feeds. Neither feed has a current schedule; they are dormant. Do not reactivate them. Disconnect only if doing so will **not** delete the 10 current retailer IDs, Shop associations or old tags.
4. Open a real Facebook and Instagram post tag for *From Seeds to Success* and *The Alchemy of Intention*. Verify the tap opens the exact Vercel product page, the price agrees with Lulu's cart, and the `Open Lulu checkout` control opens the matching Lulu cart. Stop before payment.
5. Check Shop eligibility and diagnostics. The hundreds of hidden/out-of-stock warnings largely represent intentionally discontinued products; do not mark them in stock to clear warnings.

Tracked manual Commerce Manager work: GitHub issue #30. Completed retirement of Printful products: issue #29.

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
