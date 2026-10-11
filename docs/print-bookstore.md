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

Today no book is released to it, and the feed answers **503** rather than an
empty file — an empty, successful feed can be read by a scheduled fetch as
"every item is gone". An invalid manifest answers **500**. Neither is cached.

To run the one-book pilot: set that book's `inMetaFeed` to `true` and release.
Every cover is already large enough. Expanding to the other books is the same
one-line change, repeated.

Removing a book from the feed does not remove it from a catalog on an
update-only schedule. Mark it `out_of_stock` first; retirement inside Meta is
its own reviewed step.

## What is deliberately not measured

Book pages send no `ViewContent`, `InitiateCheckout` or `Purchase` to the Meta
Pixel. The sale happens on Lulu, where this app can observe nothing, and a
click on a link is not a purchase. The only thing these pages inherit is the
sitewide `PageView`.

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
