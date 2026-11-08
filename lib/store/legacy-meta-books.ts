/**
 * Compatibility feed for the RETIRED WooCommerce Meta catalog.
 *
 * Its existing product tags refer to numerical retailer IDs (881, 893, ...),
 * not the Lulu edition SKUs in the modern print-only feed. Updating those
 * exact IDs with current book destinations preserves historical Facebook
 * tags. NEVER use this feed for the "Truth J Blue" ads-only catalog.
 *
 * Add only as a SUPPLEMENTARY feed bound to the original physical-goods catalog;
 * a second primary feed with overlapping IDs may conflict, and replacement imports\n * can remove other (non-book) items in that catalog.
 */
import { parsePrintBooks, publishedOf, type PublishedPrintBook } from "./lulu-books";
import { PRINT_FEED_COLUMNS, printBookFeedRow, csvCell } from "./lulu-feed";

/** A supplementary feed should override only the fields we are repairing. */
export const LEGACY_UPDATE_COLUMNS = ["id", "link", "price", "availability"] as const;

/** Verified against existing Commerce Manager retailer IDs on 2026-11-08. */
export const LEGACY_BOOK_RETAILER_IDS = [
  ["881", "living-abundantly"],
  ["892", "the-alchemy-of-intention"], // retired/hidden duplicate; preserve history
  ["893", "emotional-alchemy"],
  ["894", "empower-yourself"],
  ["895", "empower-and-prosper"],
  ["897", "unlocking-success"],
  ["898", "mastering-mental-clarity"],
  ["899", "a-voyage-into-ancient-wisdom-and-inner-empowerment"],
  ["900", "we-are-without-excuse"],
  ["901", "from-seeds-to-success"],
  ["1020", "the-alchemy-of-intention"], // active book listing
] as const;

export type LegacyBookFeedResult =
  | { ok: true; csv: string; count: number }
  | { ok: false; status: 500 | 503; message: string };

export function legacyBookFeed(raw: unknown): LegacyBookFeedResult {
  let published: PublishedPrintBook[];
  try {
    published = publishedOf(parsePrintBooks(raw));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid print book manifest";
    return { ok: false, status: 500, message: detail };
  }
  const bySlug = new Map(published.map((b) => [b.slug, b]));
  const rows: string[][] = [];
  for (const [retailerId, slug] of LEGACY_BOOK_RETAILER_IDS) {
    const book = bySlug.get(slug);
    if (!book) {
      // Reject incomplete uploads rather than let Meta update a partial catalog.
      return { ok: false, status: 503, message: `Book not currently published: ${slug}` };
    }
    // Original Meta item ID remains the same; every other field comes from
    // the store's authoritative, validated Lulu manifest.
    const fields = printBookFeedRow(book);
    const column = (name: (typeof PRINT_FEED_COLUMNS)[number]) =>
      fields[PRINT_FEED_COLUMNS.indexOf(name)];
    rows.push([retailerId, column("link"), column("price"), column("availability")]);
  }
  const csv = [[...LEGACY_UPDATE_COLUMNS], ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n") + "\r\n";
  return { ok: true, csv, count: rows.length };
}
