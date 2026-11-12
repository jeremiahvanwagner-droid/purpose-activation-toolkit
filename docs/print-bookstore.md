# Books in Print — how the Lulu shelf works

The store sells ten paperbacks that Lulu prints and ships. This page is for
whoever changes them next: what lives where, and the order to do things in.

## What is where

| Thing | File |
| --- | --- |
| The books themselves (title, price, cover, checkout link) | `lib/store/lulu-books.data.json` |
| Types, validation, page data | `lib/store/lulu-books.ts` |
| The shelf and each book's page | `app/store/books/` |
| Lulu's Buy Button on a book page | `components/store/LuluPurchase.tsx` |
| The print-only Meta feed | `lib/store/lulu-feed.ts`, `app/api/meta-books-feed/route.ts` |
| Tests | `tests/lulu-books.test.ts` |

Public addresses: `store.truthjblue.com/books` and
`store.truthjblue.com/books/<slug>`. On `www` and on preview deployments the
same pages are under `/store/books`.

## Who is the authority on what

Lulu is. It sets the price, takes the payment, prints the copy and ships it.
The manifest in this repo is a **reviewed snapshot** of what Lulu's checkout
showed for each Buy Button on the date in `metadataVerifiedAt` — it is not a
live sync, and nothing on the site fetches Lulu at request time.

HighLevel is not involved in a print sale. These books do not pass through
`getStore()`, do not appear in `/api/meta-feed`, and a print order grants no
access to the Toolkit, the Audit or anything else.

## Changing a price, a cover or a description

A price shown here that differs from Lulu's checkout is the one thing this
shelf must never do. So, in this order:

1. Note the current values (manifest and Lulu).
2. Prepare the manifest change on a branch: `priceMinor` is whole cents
   (`2499`, never `24.99`); set `metadataVerifiedAt` to the day you read the
   new value from Lulu. `npm test` must pass.
3. Make the change in Lulu and release the branch together.
4. Read back all four: Lulu's checkout, the book's page, the Buy Button's cart,
   and — if the book is in the Meta feed — the imported item in Meta.

If the two cannot change together, set the book's `availability` to
`out_of_stock` for the gap. The page stays up and says the edition is not
available to order; it does not show a price it cannot honour.

A replaced cover gets a **new file name**, so caches and Meta see a new image.

## Adding a book, or a new edition

One record per saleable edition. Copy an existing record and fill it from
Lulu's product: `channelProductId`, `buyButtonId` and `checkoutUrl` come from
the Lulu sheet; `sku` is always `tjb-lulu-<channelProductId>`. Leave it as
`"publication": "draft"` until every field is confirmed — a draft is valid with
only its mapping and never appears on the site. A record marked `published`
with anything missing fails the tests and the build.

Leave `isbn13` out until the ISBN of *this printed edition* is confirmed. An
ISBN from another edition, or a Kindle ASIN, is worse than none. The ten here
were read from the barcode on the back of each book's Lulu print cover, and
are written as thirteen digits with no hyphens.

## Covers

Each cover in `public/store/books/` is the front panel of that book's Lulu
print cover, cut at the trim line and saved 1200px wide. It was checked against
the cover Lulu shows at checkout for the same Buy Button, so the picture on the
page is the book that arrives. `coverWidth` and `coverHeight` in the manifest
must be the file's real size — a test reads the file and compares.

Do not reuse an old edition's `sku` or slug for a different format. A hardcover
is a new record with its own Lulu product.

## The Meta feed

`/api/meta-books-feed` is separate from `/api/meta-feed` and reads only the
print manifest. A book is in it only when its record says `"inMetaFeed": true`,
which the validator allows only for a published book whose cover is at least
500px on its short side (Meta's minimum for a catalog image).

One book is released to it today — *The Alchemy of Intention*, the pilot — so
the feed is a header and one row. The other nine wait for the pilot's result in
Meta. Releasing one is a one-line change, `inMetaFeed: true`, and every cover is
already large enough.

If no book were released the feed would answer **503** rather than an empty
file — an empty, successful feed can be read by a scheduled fetch as "every
item is gone". An invalid manifest answers **500**. Neither is cached.

In Meta the feed belongs in its own catalog of physical books, on an **update**
schedule (add and change), not a replace schedule (which also deletes). It must
never be added to the existing "Truth J Blue" catalog, which is ads-only.

Removing a book from the feed does not remove it from a catalog on an
update-only schedule. Mark it `out_of_stock` first; retirement inside Meta is
its own reviewed step.

## The Google feed

`/api/google-books-feed` is the same books for Google Merchant Center: every
published edition, tab-separated, from the print manifest alone. Merchant
Center fetches it as a file data source on a schedule. It answers 500 for an
invalid manifest and 503 when nothing is published, never an empty file.

Every Google row carries `shipping_label=lulu_print`,
`return_policy_label=print_final_sale`, and
`excluded_destination=Shopping_ads`. Configure the matching shipping service
and return exception before attaching the feed. The shipping service must
target `lulu_print`, not all products or `digital_free_shipping`.
Shipping rates are not in the file: verify Lulu's destination-dependent rates
and delivery times, then configure Merchant Center without understating them.
The labels select policies; they do not create those policies.

This is separate from the `leadconnector` source. As verified on 2026-11-12,
Merchant account 5681706436 has one approved Toolkit free listing and three
archived digital offers. Preserve that approved listing. Google permits an
eBook exception for free listings under its unsupported-content policy;
eligibility depends on the actual offer. Coaching, services and memberships
must not be added by a broad catalog sync. The old WooCommerce connection
was removed; the print feed is not yet attached to Merchant Center.

## Returns

Printed books are final sale: each copy is printed for the reader who ordered
it, and Lulu does not take one back. A copy that arrives damaged, misprinted or
wrong is replaced or refunded — Lulu covers verified print defects, and the
reader writes to support@truthjblue.com, not to Lulu.

The policy itself is published at `truthjblue.com/legal#returns` ("Printed
books"). That page is built in the `truthjblue-website` repository and copied
into `public/legal/` here; change the policy there, rebuild, and re-copy. The
one-sentence version on the book pages is `PRINT_RETURNS_NOTE` in
`lib/store/lulu-books.ts`, and a test fails if the two stop agreeing.

## Measurement boundaries

`BookPixelEvents` already handles Meta ViewContent, observed cart additions,
and Lulu's trusted on-page completion message. Its Meta IDs and behavior are
preserved. Google receives `view_item`, observed `add_to_cart`, and
`begin_checkout` when the direct checkout link is followed, using the Google
feed SKU rather than Meta's numeric retailer ID.

Google purchase reporting is not implemented by these browser events. A Lulu
completion message has no verified receipt/transaction ID in the current
mapping; purchases completed in a separate tab also do not report back.
See `docs/google-commerce-measurement.md` for the payment-reporting dependencies.

## If Lulu's script does not load

The book page still shows the title, cover, price and description, and the
"Open Lulu checkout" link under the button is plain server HTML that goes to
the same book. The button area says so plainly; nothing redirects on its own
and nothing retries.

## Undoing a release

Reverting the release commit removes the shelf, the pages and the feed route
and touches nothing else. A code rollback is not a financial one: orders
already placed with Lulu are unaffected and must not be cancelled because the
site changed. If a book is already in a Meta catalog, mark it unavailable there
before its page goes away.
