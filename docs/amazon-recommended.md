# Recommended — the Amazon storefront in the store

`store.truthjblue.com/recommended` (on www: `/store/recommended`) shows the
idea lists from Truth J Blue's Amazon storefront,
<https://www.amazon.com/shop/influencer-74ca0298>, in the store's own design.
Amazon sells every item on it; Truth J Blue earns as an Amazon Associate.

| Piece | Where |
| --- | --- |
| Lists and items (a reviewed snapshot) | `lib/store/amazon-picks.data.json` |
| Validator, URL builders, which lists show today | `lib/store/amazon-picks.ts` |
| The page | `app/store/recommended/page.tsx` |
| One product card / one series cover | `components/store/AmazonPickCard.tsx` |
| Click measurement (GA4 `affiliate_click`) | `components/store/AffiliateClicks.tsx` |
| Pointer on the store home | `app/store/page.tsx`, section `#recommended` |
| Tests | `tests/amazon-picks.test.ts` |
| Drift check against Amazon | `node scripts/check-amazon-picks.mjs` |

## Rules this page keeps

These come from the Amazon Associates Operating Agreement and program
policies, and from Google's guidance on paid links. The validator and tests
enforce the ones code can enforce.

- **No prices, ratings, deal or "Best Seller" badges.** Amazon changes them
  daily; a copy here would be wrong within hours. The manifest rejects those
  fields.
- **Product images stay Amazon's.** They load from `m.media-amazon.com`,
  only inside a link to that product, as a plain `<img>`. Never download
  them into `public/`, and never switch to `next/image`, which would copy and
  re-encode them through our server.
- **The disclosure sits above the first link**: "As an Amazon Associate, we
  earn from qualifying purchases." It is also in the store footer.
- **Every Amazon link is `rel="sponsored noopener"`.** No `noreferrer`:
  Associates checks look at the page a click came from.
- **Every link carries the storefront's tag**, `julianvanwagn-20` — the tag
  Amazon itself puts on the storefront's links.

## Before it goes live

- In Associates Central, under Account Settings → Website and Mobile App
  List, add `https://store.truthjblue.com` and `https://www.truthjblue.com`.
  Amazon expects every site that carries the tag to be listed there.
- Confirm that `julianvanwagn-20` is the tracking ID you want credited.

## Keeping it current

The storefront's lists change ("Updated today"). To bring the page up to date:

1. `node scripts/check-amazon-picks.mjs` lists what changed on Amazon.
2. Edit the manifest by hand: for a new item, add its ASIN, `kind`, `byline`,
   a short `name`, an optional `detail` (taken from Amazon's own title, saying
   no more than it does) and the `image` URL from the list page. Keep
   Amazon's order.
3. Set `verifiedAt` to the day you checked, then run `npm test`.

A list with `showUntil` (the holiday list) leads the page through that day,
in Kansas City time, and is not shown after it. To run it again next year,
set a new date.

To keep an item off the page without taking it off the Amazon list, set
`"hidden": true` on it with a `hiddenReason`. `B088Y42FLG` in Prayer &
Reflection Journals was launched that way (its Amazon title embeds the ISBN
of the Shannon Roberts journal) and shown from 2026-11-21 at Truth's say-so.

## Measurement

Each click out to Amazon sends one GA4 event, `affiliate_click`, with
`list_id`, `asin` and `pick_name`, to the store's property on
the store host (`G-JP0HS6X4S8`). Preview and local hosts send nothing.
Register `list_id`, `asin` and `pick_name` as event-scoped custom
dimensions in GA4 to report on them. Sales and commission are reported only in
Associates Central.
