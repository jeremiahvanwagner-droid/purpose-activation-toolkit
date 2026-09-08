import { NextResponse } from "next/server";
import { getStore, type StoreBook, type StoreItem } from "@/lib/store/catalog";
import { SITE_URL, STORE_URL } from "@/lib/store/base";
import { SERIES_TITLE } from "@/lib/store/overlay";

/**
 * Meta product feed — what Commerce Manager fetches on a schedule to keep the
 * "Truth J Blue" catalog current.
 *
 * One row per sellable thing, built from the same getStore() the storefront
 * renders from, so a price or name change in HighLevel reaches the catalog on
 * the next fetch with nothing re-uploaded by hand. Columns follow Meta's
 * product feed spec; the required set is id/title/description/availability/
 * condition/price/link/image_link, the rest lets ads be grouped into product
 * sets by collection.
 *
 * Two things this feed decides on its own:
 *  - Artwork. Where the store shows a typographic plate instead of the image on
 *    the HighLevel record, the feed does the same — a plate rendered to PNG in
 *    public/store/feed by scripts/meta-feed-art. Advertising the stock mockup
 *    the store deliberately hides would put generic imagery on the brand.
 *  - Books. The Palace of Excellence series sells on Amazon, so a book's link
 *    is the store's Library page (the catalog must point at our own domain,
 *    never straight at Amazon) and its price is the Kindle list price, which
 *    HighLevel does not know. A book with no verified price is left out
 *    rather than advertised at a guess.
 *
 * The catalog this feeds is for ads only. Meta's commerce policies bar
 * downloadable digital content from Shops and Marketplace, so it must never
 * be attached to a Shop.
 */

export const runtime = "nodejs";
export const revalidate = 1800;

const BRAND = "Truth J Blue";
const FEED_ART_URL = `${SITE_URL}/store/feed`;

/**
 * Kindle list price per ASIN, in USD. Read from amazon.com/dp/<ASIN> on
 * 2026-09-08: every one of the twelve pages priced the Kindle edition at $9.99
 * (the $0.00 alongside it is Kindle Unlimited, not a price). Re-check when a
 * book is repriced; a missing ASIN drops that book from the feed until it is
 * filled in.
 */
const KINDLE_PRICE_USD: Record<string, number> = {
  B0DBNRCZ6W: 9.99,
  B0DBR6FMD1: 9.99,
  B0DBR5HCV7: 9.99,
  B0DBTV7Z41: 9.99,
  B0DBTT4XTS: 9.99,
  B0DBZ49GYY: 9.99,
  B0DC8J2875: 9.99,
  B0DC98MVQB: 9.99,
  B0DD5TL3TZ: 9.99,
  B0DD6NBWBS: 9.99,
  B0DD6MJHLK: 9.99,
  B0DD9ZGPHZ: 9.99,
};

const COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "product_type",
  "google_product_category",
  "custom_label_0",
] as const;

/** HighLevel descriptions are rich text; the feed wants plain prose. */
function plain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|h[1-6]|div|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function cell(value: string): string {
  const flat = value.replace(/\r?\n/g, " ");
  return /[",]/.test(flat) ? `"${flat.replace(/"/g, '""')}"` : flat;
}

function money(amount: number): string {
  return `${amount.toFixed(2)} USD`;
}

function itemRow(item: StoreItem): string[] | null {
  if (item.amount === null) return null;
  const image = item.art.kind === "plate" ? `${FEED_ART_URL}/${item.slug}.png` : item.image;
  if (!image) return null;
  return [
    item.id,
    item.name,
    plain(item.descriptionHtml) || item.meta.tagline,
    "in stock",
    "new",
    money(item.amount),
    `${STORE_URL}/product/${item.slug}`,
    image,
    BRAND,
    item.collection.title,
    "",
    item.collection.key,
  ];
}

function bookRow(book: StoreBook): string[] | null {
  const price = KINDLE_PRICE_USD[book.asin];
  if (!price || !book.image) return null;
  return [
    book.id,
    `${SERIES_TITLE} — Book ${book.n}: ${book.title}`,
    plain(book.descriptionHtml) ||
      `Book ${book.n} of ${SERIES_TITLE}, by Jeremiah Van Wagner. Kindle edition, read on Amazon.`,
    "in stock",
    "new",
    money(price),
    `${STORE_URL}/library?b=${book.n}`,
    book.image,
    BRAND,
    `The Library > ${SERIES_TITLE}`,
    "Media > Books",
    "library",
  ];
}

export async function GET() {
  const store = await getStore();
  const rows = [...store.items.map(itemRow), ...store.books.map(bookRow)].filter(
    (row): row is string[] => row !== null
  );
  const csv = [[...COLUMNS], ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="truth-j-blue-meta-feed.csv"',
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
