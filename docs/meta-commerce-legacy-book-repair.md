# Commerce Manager repair — historical book tags

The historical Meta catalog **Jeremiah Van Wagner - WooCommerce**
(ID `2587898941296952`) was fed by WooCommerce before its retirement.
The current storefront is the Vercel Next.js project
`purpose-activation-toolkit`. Its canonical physical book URLs are
`https://store.truthjblue.com/books/<slug>` and Lulu fulfills the print orders.

## Canonical sources

- `lib/store/lulu-books.data.json`: verified print-book title, price, availability, ISBN and cover.
- `app/api/meta-books-feed/route.ts`: future stand-alone print-only catalog pilot; currently includes one explicitly approved edition.
- `app/api/meta-feed/route.ts`: digital products / Kindle ads catalog `Truth J Blue` (`1082546560800029`). **Never attach this feed to a physical shop.**
- `app/api/meta-legacy-books-feed/route.ts`: compatibility feed for the eleven existing book retailer IDs (ten distinct printed editions) in the old WooCommerce catalog. This does not add merchandise or replace existing IDs.

## Safely update the historical catalog

1. Verify each current Lulu print price against the checkout before publishing an update; the manifest was verified on 2026-10-11.
2. In Commerce Manager, select catalog `2587898941296952` (NOT the `Truth J Blue` ads-only catalog).
3. Create a **supplementary feed** named **Truth J Blue — Legacy Book Corrections (Vercel)** linked to the existing WooCommerce primary feed. Do not create a second primary feed with overlapping IDs, and do not replace or delete either historical source or the catalog.
4. Set feed URL `https://www.truthjblue.com/api/meta-legacy-books-feed`, CSV, UTF-8, USD.
5. Configure the supplementary feed for daily fetches. A supplementary feed updates existing item fields without creating or deleting product IDs; do not use a REPLACE-mode primary feed. The compatibility file covers only existing book IDs.
6. Import and review the 11 records. If Commerce Manager cannot match the historical items to a primary feed, stop and inspect its data-source ownership before making changes. Existing published items (including ID `901` for *From Seeds to Success* and `1020` for *The Alchemy of Intention*) must now point to `/books/<slug>` with the same price and availability as the current Vercel store.
7. Re-test a Facebook post product tag and the `fbclid` appended link. Confirm the browser opens the matching book page and Lulu buy button. Never treat a successful import alone as a passed end-to-end checkout test.

## Current limits

There is a duplicate *Alchemy* record (`892`, hidden; `1020`, published). The compatibility feed updates its destination and price but does **not** unhide the duplicate, delete records, change any shop association, or revive the retired WooCommerce integration. Four out-of-stock variants in the old catalog are apparel, not books. The new digital ads catalog has a separate hourly feed and is intentionally left unchanged.

The Vercel middleware has exact 301 redirects for old WooCommerce book URLs, preserving UTM and Facebook tracking parameters. Redirects protect historical tags and search indexing even before a Meta feed import completes.
