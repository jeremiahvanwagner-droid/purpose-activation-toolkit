/**
 * The Meta product feed for the print books — and only the print books.
 *
 * /api/meta-feed is the ads-only catalog of digital products and the Kindle
 * library; it must never be attached to a Shop and it does not change. This
 * is a second, separate feed that carries nothing but physical paperbacks, so
 * that a physical-goods catalog can exist beside it.
 *
 * A book reaches this feed only when its record says inMetaFeed, which is how
 * the one-book pilot and the later expansion are both expressed: as a
 * reviewed change to the manifest, not a setting somewhere else.
 *
 * What it will not do is answer 200 with nothing in it. A scheduled fetch
 * that receives an empty, successful file can be read as "every item is
 * gone"; a broken manifest or an empty selection is reported as an error
 * instead, and the catalog keeps what it last had.
 */

import {
  PrintBookManifestError,
  coverUrl,
  isbn13Digits,
  minorToDecimal,
  parsePrintBooks,
  printBookUrl,
  publishedOf,
  type PublishedPrintBook,
} from "./lulu-books";

export const PRINT_FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "gtin",
  "product_type",
  "google_product_category",
  "custom_label_0",
] as const;

const BRAND = "Truth J Blue";
/** Google product taxonomy 543543 — the category for printed books. */
const GOOGLE_CATEGORY = "Media > Books > Print Books";
const PRODUCT_TYPE = "Books > Books in Print";
const LABEL = "lulu_print";

/** One CSV field. Quotes, commas and line breaks survive a round trip. */
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function printBookFeedRow(book: PublishedPrintBook): string[] {
  return [
    book.sku,
    `${book.title} (${book.formatLabel})`,
    book.description,
    book.availability === "in_stock" ? "in stock" : "out of stock",
    "new",
    `${minorToDecimal(book.priceMinor)} ${book.currency}`,
    printBookUrl(book),
    coverUrl(book),
    BRAND,
    (book.isbn13 && isbn13Digits(book.isbn13)) || "",
    PRODUCT_TYPE,
    GOOGLE_CATEGORY,
    LABEL,
  ];
}

export function buildPrintBooksCsv(books: PublishedPrintBook[]): string {
  return [[...PRINT_FEED_COLUMNS], ...books.map(printBookFeedRow)].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export type PrintFeedResult =
  | { ok: true; csv: string; count: number }
  | { ok: false; status: 500 | 503; message: string };

/**
 * The feed for a manifest, or the reason there is none.
 *  - 500: the manifest is invalid. Nothing is published from a file that
 *    cannot be trusted, including the records that happened to be fine.
 *  - 503: the manifest is sound but no edition is released to the feed.
 */
export function printBooksFeed(raw: unknown): PrintFeedResult {
  let selected: PublishedPrintBook[];
  try {
    selected = publishedOf(parsePrintBooks(raw)).filter((b) => b.inMetaFeed === true);
  } catch (err) {
    const detail = err instanceof PrintBookManifestError ? err.message : "The print-book manifest could not be read.";
    return { ok: false, status: 500, message: detail };
  }
  if (!selected.length) {
    return { ok: false, status: 503, message: "No print edition is released to this feed yet." };
  }
  return { ok: true, csv: buildPrintBooksCsv(selected), count: selected.length };
}

/**
 * The same books for Google Merchant Center.
 *
 * Google reads the same facts under the same attribute names, so a row is the
 * Meta row with two differences in form: availability is spelled in_stock /
 * out_of_stock, and the file is tab-separated — the one delimited format
 * Google documents without qualification. A tab or line break inside a value
 * would break a tab-separated row, so those become spaces.
 *
 * Every published edition is listed, not only the Meta pilot: the two are
 * different catalogs with different owners' decisions behind them. Shipping is
 * deliberately not in the file. Lulu works out shipping at its checkout by
 * destination, so the rates belong in Merchant Center's own shipping settings,
 * where they can be kept at or above what Lulu charges.
 */
export function tsvCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

export function googleBookFeedRow(book: PublishedPrintBook): string[] {
  const row = printBookFeedRow(book);
  row[PRINT_FEED_COLUMNS.indexOf("availability")] = book.availability;
  return row;
}

export function buildGoogleBooksTsv(books: PublishedPrintBook[]): string {
  return [[...PRINT_FEED_COLUMNS], ...books.map(googleBookFeedRow)].map((row) => row.map(tsvCell).join("\t")).join("\n") + "\n";
}

export type GoogleFeedResult =
  | { ok: true; tsv: string; count: number }
  | { ok: false; status: 500 | 503; message: string };

/** Same refusals as the Meta feed: 500 for a manifest that cannot be trusted,
 *  503 when there is nothing to list — never an empty file that fetches fine. */
export function googleBooksFeed(raw: unknown): GoogleFeedResult {
  let published: PublishedPrintBook[];
  try {
    published = publishedOf(parsePrintBooks(raw));
  } catch (err) {
    const detail = err instanceof PrintBookManifestError ? err.message : "The print-book manifest could not be read.";
    return { ok: false, status: 500, message: detail };
  }
  if (!published.length) {
    return { ok: false, status: 503, message: "No print edition is published." };
  }
  return { ok: true, tsv: buildGoogleBooksTsv(published), count: published.length };
}
