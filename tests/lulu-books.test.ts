/**
 * The print-book manifest, its validator, and the print-only Meta feed
 * (lib/store/lulu-books.ts, lib/store/lulu-feed.ts).
 *
 * The mapping table is Lulu's own product sheet as read on 2026-10-11; every
 * other fixture is synthetic. Nothing here contacts Lulu, Meta or HighLevel,
 * and no order is placed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RAW_PRINT_BOOKS,
  PrintBookManifestError,
  allPrintBooks,
  formatMinor,
  isbn13Digits,
  minorToDecimal,
  parsePrintBooks,
  printBookBySlug,
  printBookSchema,
  printBookUrl,
  publishedOf,
  publishedPrintBooks,
  validatePrintBooks,
  type PublishedPrintBook,
} from "../lib/store/lulu-books.ts";
import { PRINT_FEED_COLUMNS, buildPrintBooksCsv, csvCell, printBookFeedRow, printBooksFeed } from "../lib/store/lulu-feed.ts";
import sitemap from "../app/sitemap.ts";
import { COLLECTIONS } from "../lib/store/overlay.ts";

/** Title, channel product id and Buy Button id — "Lulu_Products_Fall_2026", Sheet1 A2:C11. */
const SHEET: [string, string, string][] = [
  ["The Alchemy of Intention", "155747", "71896f68-7f7a-4052-beb9-06cd8d46639b"],
  ["Emotional Alchemy", "155746", "a5d9a868-f4a5-4f19-ab94-1cf469b542e5"],
  ["Unlocking Success", "155745", "e182872c-18de-461e-bf67-5890fa80f542"],
  ["Empower Yourself", "155744", "4ac54ed7-2d11-4e51-bf00-dec73d123274"],
  ["Empower & Prosper", "155743", "a35ae3a9-8f0e-4e73-bc23-d5d2aa617056"],
  ["Mastering Mental Clarity", "155742", "3df1633d-2a04-4bc7-8107-f844d8f35f44"],
  ["A Voyage into Ancient Wisdom and Inner Empowerment", "155741", "986795d5-8f4d-4216-80ec-49d7cc176508"],
  ["From Seeds to Success", "155740", "0767a05a-d21e-432f-b97b-5c4ef6599ef9"],
  ["We Are Without Excuse", "155739", "30e040b0-6ac3-4594-8437-9573cdb95fac"],
  ["Living Abundantly", "155737", "6e5d0c4f-5a61-4d34-9652-902c6cf96572"],
];

const UUID_A = "11111111-2222-4333-8444-555555555555";
const UUID_B = "aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee";

/** A complete, valid, published record that is not a real book. */
const book = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  sku: "tjb-lulu-900001",
  slug: "a-test-book",
  channelProductId: "900001",
  buyButtonId: UUID_A,
  checkoutUrl: `https://svc.lulu.com/?items=${UUID_A}`,
  title: "A Test Book",
  publication: "published",
  author: "Test Author",
  description: "A synthetic description.",
  formatLabel: "Paperback",
  coverPath: "/store/books/a-test-book.jpg",
  coverWidth: 1200,
  coverHeight: 1700,
  priceMinor: 1999,
  currency: "USD",
  availability: "in_stock",
  metadataVerifiedAt: "2026-10-11",
  inMetaFeed: true,
  ...over,
});

const second = (over: Record<string, unknown> = {}) =>
  book({
    sku: "tjb-lulu-900002",
    slug: "another-test-book",
    channelProductId: "900002",
    buyButtonId: UUID_B,
    checkoutUrl: `https://svc.lulu.com/?items=${UUID_B}`,
    title: "Another Test Book",
    coverPath: "/store/books/another-test-book.jpg",
    ...over,
  });

const errorsFor = (records: unknown) => validatePrintBooks(records).errors;
const without = (key: string) => {
  const b = book();
  delete b[key];
  return b;
};

/** RFC 4180: quoted fields, doubled quotes, and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ── D01 ─────────────────────────────────────────────────────────────────────

test("the committed manifest carries Lulu's ten mappings exactly, in the sheet's order", () => {
  const books = allPrintBooks();
  assert.equal(books.length, SHEET.length);
  SHEET.forEach(([title, productId, buttonId], i) => {
    assert.equal(books[i].title, title);
    assert.equal(books[i].channelProductId, productId);
    assert.equal(books[i].buyButtonId, buttonId);
    assert.equal(books[i].checkoutUrl, `https://svc.lulu.com/?items=${buttonId}`);
    assert.equal(books[i].sku, `tjb-lulu-${productId}`);
  });
});

/** The EAN-13 printed on the back of each edition's Lulu print wrap, read 2026-10-11. */
const PRINTED_ISBN: Record<string, string> = {
  "155747": "9781387859566",
  "155746": "9781257023332",
  "155745": "9781257023042",
  "155744": "9781105922107",
  "155743": "9781105926273",
  "155742": "9781257014156",
  "155741": "9781105921599",
  "155740": "9781105921483",
  "155739": "9781105921513",
  "155737": "9798274233415",
};

test("each edition carries the ISBN printed on its own cover, and no other", () => {
  for (const b of allPrintBooks()) {
    assert.equal(b.isbn13, PRINTED_ISBN[b.channelProductId], b.slug);
    assert.equal(isbn13Digits(b.isbn13 ?? ""), b.isbn13, b.slug);
  }
});

/** Width and height from a JPEG's frame header — enough to check a cover file. */
function jpegSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  assert.equal(buf.readUInt16BE(0), 0xffd8, `${file} is not a JPEG`);
  let at = 2;
  while (at < buf.length) {
    assert.equal(buf[at], 0xff, `${file}: bad marker`);
    const marker = buf[at + 1];
    const length = buf.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(at + 5), width: buf.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error(`${file}: no frame header`);
}

test("every published cover is a real file of the size the manifest says, large enough for a catalog", () => {
  for (const b of publishedPrintBooks()) {
    assert.match(b.coverPath, /^\/store\/books\/[a-z0-9-]+\.jpg$/, b.slug);
    assert.deepEqual(jpegSize(`public${b.coverPath}`), { width: b.coverWidth, height: b.coverHeight }, b.slug);
    assert.ok(Math.min(b.coverWidth, b.coverHeight) >= 500, b.slug);
  }
});

test("the committed manifest is valid, and every published edition is findable by its slug", () => {
  assert.deepEqual(errorsFor(RAW_PRINT_BOOKS), []);
  for (const b of publishedPrintBooks()) assert.equal(printBookBySlug(b.slug)?.sku, b.sku);
  assert.equal(printBookBySlug("not-a-book"), null);
});

// ── D02 ─────────────────────────────────────────────────────────────────────

test("two records may not share a SKU, slug, channel product or Buy Button", () => {
  assert.deepEqual(errorsFor([book(), second()]), []);
  assert.match(errorsFor([book(), second({ slug: "a-test-book" })]).join("\n"), /slug "a-test-book" is already used/);
  assert.match(
    errorsFor([book(), second({ buyButtonId: UUID_A, checkoutUrl: `https://svc.lulu.com/?items=${UUID_A}` })]).join("\n"),
    /buyButtonId .* is already used/
  );
  assert.match(
    errorsFor([book(), second({ sku: "tjb-lulu-900001", channelProductId: "900001" })]).join("\n"),
    /sku "tjb-lulu-900001" is already used/
  );
});

test("an SKU must be the channel product's own id, so one edition has one identity", () => {
  assert.match(errorsFor([book({ sku: "tjb-lulu-123" })]).join("\n"), /sku must be tjb-lulu-900001/);
});

// ── D03 ─────────────────────────────────────────────────────────────────────

test("a draft needs only its mapping, and stays off the shelf", () => {
  const draft = {
    sku: "tjb-lulu-900003",
    slug: "a-draft",
    channelProductId: "900003",
    buyButtonId: UUID_B,
    checkoutUrl: `https://svc.lulu.com/?items=${UUID_B}`,
    title: "A Draft",
    publication: "draft",
  };
  const books = parsePrintBooks([book(), draft]);
  assert.equal(books.length, 2);
  assert.deepEqual(
    publishedOf(books).map((b) => b.slug),
    ["a-test-book"]
  );
});

test("a published record missing any required field fails the whole manifest", () => {
  for (const key of ["author", "description", "formatLabel", "coverPath", "coverWidth", "coverHeight", "priceMinor", "currency", "availability", "metadataVerifiedAt"]) {
    assert.match(errorsFor([without(key)]).join("\n"), new RegExp(`is published but ${key} is missing`), key);
    assert.throws(() => parsePrintBooks([second(), without(key)]), PrintBookManifestError, key);
  }
});

test("retired and unknown publication states never publish", () => {
  assert.deepEqual(publishedOf(parsePrintBooks([book({ publication: "retired", inMetaFeed: false })])), []);
  assert.match(errorsFor([book({ publication: "live" })]).join("\n"), /not draft, published or retired/);
});

// ── D04 ─────────────────────────────────────────────────────────────────────

test("a price is a whole, positive number of cents in USD — never zero, a float, a string or missing", () => {
  for (const bad of [0, -1999, 19.99, "1999", null, Number.NaN]) {
    assert.match(errorsFor([book({ priceMinor: bad })]).join("\n"), /priceMinor must be a whole number of cents/, String(bad));
  }
  assert.match(errorsFor([book({ currency: "EUR" })]).join("\n"), /currency must be USD/);
  assert.equal(minorToDecimal(1999), "19.99");
  assert.equal(minorToDecimal(2400), "24.00");
  assert.equal(minorToDecimal(5), "0.05");
  assert.equal(formatMinor(2499), "$24.99");
});

// ── D05 ─────────────────────────────────────────────────────────────────────

test("an ISBN must be a real ISBN-13, and a Kindle identifier is not one", () => {
  assert.equal(isbn13Digits("978-0-306-40615-7"), "9780306406157");
  assert.equal(isbn13Digits("978-0-306-40615-8"), null);
  assert.equal(isbn13Digits("B0DBNRCZ6W"), null);
  assert.deepEqual(errorsFor([book({ isbn13: "978-0-306-40615-7" })]), []);
  assert.match(errorsFor([book({ isbn13: "B0DBNRCZ6W" })]).join("\n"), /not a valid ISBN-13/);
  assert.match(
    errorsFor([book({ isbn13: "978-0-306-40615-7" }), second({ isbn13: "9780306406157" })]).join("\n"),
    /isbn13 "9780306406157" is already used/
  );
});

test("an unverified ISBN is left out of the page data and the feed, not guessed", () => {
  const b = parsePrintBooks([book()])[0] as PublishedPrintBook;
  const schema = printBookSchema(b) as Record<string, unknown>;
  assert.equal("isbn" in schema, false);
  assert.equal("gtin13" in schema, false);
  assert.equal(printBookFeedRow(b)[PRINT_FEED_COLUMNS.indexOf("gtin")], "");

  const withIsbn = parsePrintBooks([book({ isbn13: "978-0-306-40615-7" })])[0] as PublishedPrintBook;
  assert.equal((printBookSchema(withIsbn) as Record<string, unknown>).isbn, "9780306406157");
  assert.equal(printBookFeedRow(withIsbn)[PRINT_FEED_COLUMNS.indexOf("gtin")], "9780306406157");
});

// ── D06 ─────────────────────────────────────────────────────────────────────

test("a checkout link is Lulu's HTTPS checkout for that Buy Button and nothing else", () => {
  for (const bad of [
    `http://svc.lulu.com/?items=${UUID_A}`,
    `https://svc.lulu.com.example.test/?items=${UUID_A}`,
    `https://example.test/?items=${UUID_A}`,
    `https://svc.lulu.com/?items=${UUID_B}`,
    `https://svc.lulu.com/?items=${UUID_A}&next=https://example.test`,
    `https://svc.lulu.com/account?items=${UUID_A}`,
    `https://svc.lulu.com/?items=${UUID_A}#x`,
    `https://user@svc.lulu.com/?items=${UUID_A}`,
    `javascript:alert(1)`,
  ]) {
    assert.match(errorsFor([book({ checkoutUrl: bad })]).join("\n"), /checkoutUrl must be exactly/, bad);
  }
  assert.match(errorsFor([book({ buyButtonId: "not-a-uuid", checkoutUrl: "https://svc.lulu.com/?items=not-a-uuid" })]).join("\n"), /not a Buy Button UUID/);
  assert.match(
    errorsFor([book({ buyButtonId: UUID_B.toUpperCase(), checkoutUrl: `https://svc.lulu.com/?items=${UUID_B.toUpperCase()}` })]).join("\n"),
    /not a Buy Button UUID/
  );
});

test("a cover is a file under /store/books or Lulu's own cover image", () => {
  assert.deepEqual(errorsFor([book({ coverPath: "https://assets.lulu.com/cover_thumbs/a/b/abc-front-shortedge-384.jpg", inMetaFeed: false })]), []);
  for (const bad of ["https://example.test/cover.jpg", "http://assets.lulu.com/cover_thumbs/a.jpg", "/store/books/../secret.jpg", "/private/cover.jpg", "https://assets.lulu.com/cover_thumbs/a.jpg?sig=1"]) {
    assert.match(errorsFor([book({ coverPath: bad })]).join("\n"), /coverPath must be/, bad);
  }
});

// ── D07 ─────────────────────────────────────────────────────────────────────

test("a field that is not a public product field cannot enter the manifest", () => {
  for (const key of ["printCost", "evidencePath", "customerEmail", "notes"]) {
    assert.match(errorsFor([book({ [key]: "x" })]).join("\n"), new RegExp(`unknown field "${key}"`), key);
  }
});

test("the page data and the feed expose only what a reader is shown", () => {
  const b = parsePrintBooks([book()])[0] as PublishedPrintBook;
  const schema = JSON.stringify(printBookSchema(b));
  for (const hidden of ["channelProductId", "buyButtonId", "metadataVerifiedAt", "inMetaFeed", "svc.lulu.com"]) {
    assert.equal(schema.includes(hidden), false, hidden);
  }
  assert.deepEqual([...PRINT_FEED_COLUMNS], [
    "id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "gtin",
    "product_type", "google_product_category", "custom_label_0",
  ]);
  assert.equal(printBookFeedRow(b).length, PRINT_FEED_COLUMNS.length);
});

// ── F01 ─────────────────────────────────────────────────────────────────────

test("the feed is CSV a real parser reads back unchanged — quotes, commas, line breaks, Unicode", () => {
  const awkward = 'She said "begin", then paused.\r\nA second line, with a comma & an ampersand — and “curly” quotes, é, 中文.';
  const books = publishedOf(parsePrintBooks([book({ description: awkward, title: 'Faith, "Hope" & Love' }), second()]));
  const csv = buildPrintBooksCsv(books);
  assert.ok(csv.endsWith("\r\n"));
  const rows = parseCsv(csv);
  assert.deepEqual(rows[0], [...PRINT_FEED_COLUMNS]);
  assert.deepEqual(rows.slice(1), books.map(printBookFeedRow));
  assert.equal(rows[1][PRINT_FEED_COLUMNS.indexOf("description")], awkward);
  assert.equal(rows[1][PRINT_FEED_COLUMNS.indexOf("title")], 'Faith, "Hope" & Love (Paperback)');
  assert.equal(csvCell("plain"), "plain");
});

// ── F02 / F03 ───────────────────────────────────────────────────────────────

test("the feed carries only published print editions that were released to it", () => {
  const feed = printBooksFeed([
    book(),
    second({ inMetaFeed: false }),
    { sku: "tjb-lulu-900003", slug: "a-draft", channelProductId: "900003", buyButtonId: "99999999-8888-4777-8666-555555555555", checkoutUrl: "https://svc.lulu.com/?items=99999999-8888-4777-8666-555555555555", title: "A Draft", publication: "draft" },
  ]);
  assert.equal(feed.ok, true);
  if (!feed.ok) return;
  assert.equal(feed.count, 1);
  const rows = parseCsv(feed.csv);
  assert.deepEqual(rows.slice(1).map((r) => r[0]), ["tjb-lulu-900001"]);
  const row = rows[1];
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("availability")], "in stock");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("condition")], "new");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("price")], "19.99 USD");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("link")], "https://store.truthjblue.com/books/a-test-book");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("image_link")], "https://www.truthjblue.com/store/books/a-test-book.jpg");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("google_product_category")], "Media > Books > Print Books");
  assert.equal(row[PRINT_FEED_COLUMNS.indexOf("custom_label_0")], "lulu_print");
});

test("an unavailable edition says so in the feed's own words", () => {
  const b = parsePrintBooks([book({ availability: "out_of_stock" })])[0] as PublishedPrintBook;
  assert.equal(printBookFeedRow(b)[PRINT_FEED_COLUMNS.indexOf("availability")], "out of stock");
  assert.equal((printBookSchema(b).offers as { availability: string }).availability, "https://schema.org/OutOfStock");
});

test("a book cannot be released to the feed unpublished, or with a cover too small for a catalog", () => {
  assert.match(errorsFor([book({ publication: "draft" })]).join("\n"), /in the Meta feed but not published/);
  assert.match(errorsFor([book({ coverWidth: 384, coverHeight: 544 })]).join("\n"), /a catalog image needs 500px/);
});

test("every committed edition agrees with itself: page data, feed row and link carry one price and one address", () => {
  for (const b of publishedPrintBooks()) {
    const schema = printBookSchema(b);
    const row = printBookFeedRow(b);
    assert.equal(schema.offers.price, minorToDecimal(b.priceMinor), b.slug);
    assert.equal(schema.offers.priceCurrency, "USD", b.slug);
    assert.equal(row[PRINT_FEED_COLUMNS.indexOf("price")], `${minorToDecimal(b.priceMinor)} USD`, b.slug);
    assert.equal(row[PRINT_FEED_COLUMNS.indexOf("link")], printBookUrl(b), b.slug);
    assert.equal(schema.url, printBookUrl(b), b.slug);
    assert.equal(schema.offers.url, printBookUrl(b), b.slug);
    assert.equal(row[PRINT_FEED_COLUMNS.indexOf("id")], b.sku, b.slug);
    assert.ok(row[PRINT_FEED_COLUMNS.indexOf("title")].startsWith(b.title), b.slug);
  }
});

// ── F04 ─────────────────────────────────────────────────────────────────────

test("a broken manifest is an error, never an empty feed that fetches successfully", () => {
  const broken = printBooksFeed([book(), without("priceMinor")]);
  assert.equal(broken.ok, false);
  assert.equal(!broken.ok && broken.status, 500);

  for (const notAManifest of [null, {}, "books", undefined]) {
    const r = printBooksFeed(notAManifest);
    assert.equal(!r.ok && r.status, 500, String(notAManifest));
  }

  const nothingReleased = printBooksFeed([book({ inMetaFeed: false })]);
  assert.equal(!nothingReleased.ok && nothingReleased.status, 503);
  const emptyManifest = printBooksFeed([]);
  assert.equal(!emptyManifest.ok && emptyManifest.status, 503);
});

test("the committed feed is either withheld or made only of released, published print editions", () => {
  const feed = printBooksFeed(RAW_PRINT_BOOKS);
  if (!feed.ok) {
    assert.equal(feed.status, 503);
    return;
  }
  const released = publishedPrintBooks().filter((b) => b.inMetaFeed === true);
  assert.ok(feed.count > 0);
  assert.deepEqual(parseCsv(feed.csv).slice(1), released.map(printBookFeedRow));
});

// ── F05 ─────────────────────────────────────────────────────────────────────

test("the existing ads feed and the HighLevel catalog know nothing about the print books", () => {
  for (const file of ["app/api/meta-feed/route.ts", "lib/store/catalog.ts", "lib/store/overlay.ts", "lib/store/ghl.ts"]) {
    assert.equal(/lulu/i.test(readFileSync(file, "utf8")), false, file);
  }
  const printFeed = readFileSync("app/api/meta-books-feed/route.ts", "utf8");
  assert.equal(/getStore|getCatalog|@\/lib\/store\/(catalog|ghl|overlay)/.test(printFeed), false);
});

// ── W-series: routes ────────────────────────────────────────────────────────

test("no book slug can be mistaken for a store collection or another store route", () => {
  const taken = new Set<string>([...COLLECTIONS.map((c) => c.key), "books", "product", "audit", "blueprint", "store", "api"]);
  for (const b of allPrintBooks()) assert.equal(taken.has(b.slug), false, b.slug);
});

test("the sitemap lists the print shelf and each published edition, and still lists everything it did", () => {
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.includes("https://store.truthjblue.com/books"));
  for (const b of publishedPrintBooks()) assert.ok(urls.includes(`https://store.truthjblue.com/books/${b.slug}`), b.slug);
  for (const kept of [
    "https://www.truthjblue.com/books",
    "https://store.truthjblue.com/",
    "https://store.truthjblue.com/library",
    "https://store.truthjblue.com/product/purpose-activation-toolkit",
    "https://store.truthjblue.com/product/inner-alignment-audit",
  ]) {
    assert.ok(urls.includes(kept), kept);
  }
  assert.equal(new Set(urls).size, urls.length);
});

// ── P01 / P03 ───────────────────────────────────────────────────────────────

test("the pixel still switches automatic configuration off before it initialises", () => {
  const pixel = readFileSync("components/MetaPixel.tsx", "utf8");
  const off = pixel.indexOf("fbq('set', 'autoConfig', false");
  const init = pixel.indexOf("fbq('init'");
  assert.ok(off > -1 && init > -1 && off < init);
  assert.ok(pixel.includes("snippetAlreadySentOne"));
});

test("the Buy Button is Lulu's own script, loaded under one id", async () => {
  const { LULU_SCRIPT_ID, LULU_SCRIPT_SRC } = await import("../lib/store/lulu-script.ts");
  assert.equal(LULU_SCRIPT_SRC, "https://js.lulu.com/lulu-buy.js");
  for (const file of ["components/store/LuluPurchase.tsx", "app/store/books/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes("id={LULU_SCRIPT_ID}") && source.includes("src={LULU_SCRIPT_SRC}"), file);
  }
  assert.ok(LULU_SCRIPT_ID.length > 0);
  // The purchase control never renders stored HTML, and never ships the manifest to the browser.
  const purchase = readFileSync("components/store/LuluPurchase.tsx", "utf8");
  assert.equal(/dangerouslySetInnerHTML/.test(purchase), false);
  assert.equal(/from\s+["']@\/lib\/store\/lulu-books["']/.test(purchase), false);
});

test("the print pages send no product or checkout event to the pixel", () => {
  for (const file of [
    "components/store/LuluPurchase.tsx",
    "components/store/PrintBookCard.tsx",
    "app/store/books/page.tsx",
    "app/store/books/[slug]/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.equal(/from\s+["']@\/(lib\/metaPixel|components\/store\/(ViewContent|CheckoutButton))["']/.test(source), false, file);
    assert.equal(/\bfbq\s*\(|\btrack(WhenReady)?\s*\(/.test(source), false, file);
  }
});
