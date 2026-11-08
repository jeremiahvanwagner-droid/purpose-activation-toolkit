import { test } from "node:test";
import assert from "node:assert/strict";
import { RAW_PRINT_BOOKS, publishedPrintBooks, printBookUrl, minorToDecimal } from "../lib/store/lulu-books.ts";
import { legacyBookFeed, LEGACY_BOOK_RETAILER_IDS } from "../lib/store/legacy-meta-books.ts";
import { PRINT_FEED_COLUMNS } from "../lib/store/lulu-feed.ts";

test("every old Meta retailer ID is unique, known and mapped to an actual current print book", () => {
  const ids = LEGACY_BOOK_RETAILER_IDS.map(([id]) => id);
  assert.equal(new Set(ids).size, ids.length);
  const slugs = new Set(publishedPrintBooks().map((book) => book.slug));
  for (const [id, slug] of LEGACY_BOOK_RETAILER_IDS) {
    assert.match(id, /^[0-9]+$/);
    assert.ok(slugs.has(slug), slug);
  }
  assert.equal(new Set(LEGACY_BOOK_RETAILER_IDS.map(([, slug]) => slug)).size, 10);
});

test("compatibility feed updates historical IDs without sending buyers to retired WooCommerce routes", () => {
  const result = legacyBookFeed(RAW_PRINT_BOOKS);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.count, 11);
  const lines = result.csv.trimEnd().split("\r\n");
  assert.equal(lines.length, 12);
  assert.equal(lines[0], PRINT_FEED_COLUMNS.join(","));
  const ids = LEGACY_BOOK_RETAILER_IDS.map(([id]) => id);
  for (let i = 0; i < LEGACY_BOOK_RETAILER_IDS.length; i++) {
    const [id, slug] = LEGACY_BOOK_RETAILER_IDS[i];
    const book = publishedPrintBooks().find((b) => b.slug === slug)!;
    const line = lines[i + 1];
    assert.equal(line.split(",")[0], id);
    assert.ok(line.includes(printBookUrl(book)), slug);
    assert.ok(line.includes(`${minorToDecimal(book.priceMinor)} USD`), slug);
    assert.ok(line.includes("in stock"), slug);
    assert.ok(!line.includes("/product/"), slug);
  }
  assert.deepEqual(lines.slice(1).map((line) => line.split(",")[0]), ids);
});

test("feed rejects incomplete and invalid manifests instead of silently unlisting books", () => {
  assert.equal(legacyBookFeed(null).ok, false);
  const truncated = (RAW_PRINT_BOOKS as Array<{ slug: string }>).filter((b) => b.slug !== "from-seeds-to-success");
  const result = legacyBookFeed(truncated);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 503);
});
