import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { publishedPrintBooks } from "../lib/store/lulu-books.ts";
import {
  META_BOOK_RETAILER_SLUGS,
  resolveMetaBookCart,
} from "../lib/store/meta-shop-checkout.ts";
import { GET } from "../app/store/checkout-link/route.ts";

const bySlug = new Map(publishedPrintBooks().map((book) => [book.slug, book]));
const params = (query: string) => new URLSearchParams(query);
const item = (slug: string, qty = 1) => {
  const book = bySlug.get(slug)!;
  return "items=" + book.buyButtonId + (qty === 1 ? "" : ":" + qty);
};

test("Meta checkout mapping contains exactly the ten current published books and no retired SKUs", () => {
  const entries = Object.entries(META_BOOK_RETAILER_SLUGS);
  assert.equal(entries.length, 10);
  assert.equal(new Set(entries.map(([, slug]) => slug)).size, 10);
  for (const [id, slug] of entries) {
    assert.match(id, /^[0-9]+$/);
    assert.ok(bySlug.has(slug), slug);
  }
  for (const retired of ["892", "902", "1088", "1091", "93", "409"]) {
    assert.equal(META_BOOK_RETAILER_SLUGS[retired], undefined, retired);
  }
});

test("a single historic Meta book ID enters the correct Lulu cart", () => {
  const result = resolveMetaBookCart(params("products=901%3A1&cart_origin=facebook&fbclid=abc"));
  assert.deepEqual(result, {
    kind: "ready",
    checkoutUrl: "https://svc.lulu.com/?" + item("from-seeds-to-success"),
    itemCount: 1,
    units: 1,
  });
});

test("Meta quantities and multiple distinct books produce Lulu's documented cart format", () => {
  const result = resolveMetaBookCart(params("products=901%3A2%2C1020%3A3&utm_source=instagram"));
  assert.deepEqual(result, {
    kind: "ready",
    checkoutUrl: "https://svc.lulu.com/?" +
      item("from-seeds-to-success", 2) + "&" + item("the-alchemy-of-intention", 3),
    itemCount: 2,
    units: 5,
  });
});

test("duplicate IDs combine their quantities rather than generating duplicate cart lines", () => {
  const result = resolveMetaBookCart(params("products=901%3A2%2C901%3A3"));
  assert.deepEqual(result, {
    kind: "ready",
    checkoutUrl: "https://svc.lulu.com/?" + item("from-seeds-to-success", 5),
    itemCount: 1,
    units: 5,
  });
});

test("optional WooCommerce-prefixed retailer IDs resolve to the same book, not arbitrary products", () => {
  const result = resolveMetaBookCart(params("products=wc_post_id_893%3A2"));
  assert.deepEqual(result, {
    kind: "ready",
    checkoutUrl: "https://svc.lulu.com/?" + item("emotional-alchemy", 2),
    itemCount: 1,
    units: 2,
  });
});

test("missing, unrecognized and invalid products fail closed without a cart", () => {
  assert.deepEqual(resolveMetaBookCart(params("")), { kind: "missing" });
  assert.deepEqual(resolveMetaBookCart(params("products=")), { kind: "missing" });
  for (const bad of [
    "902:1", "892:1", "207:1", "123456789999:1",
    "901:0", "901:-1", "901:100", "901:1.5", "901:01",
    "https://example.org:1", "901:1,,1020:1",
  ]) {
    const actual = resolveMetaBookCart(params("products=" + encodeURIComponent(bad)));
    assert.notEqual(actual.kind, "ready", bad);
  }
  assert.deepEqual(
    resolveMetaBookCart(params("products=901%3A1&products=1020%3A1")),
    { kind: "invalid" }
  );
  assert.deepEqual(
    resolveMetaBookCart(params("products=901%3A99%2C901%3A1")),
    { kind: "invalid" }
  );
});

test("an unsupported coupon is explicitly rejected instead of silently increasing the bill", () => {
  assert.deepEqual(resolveMetaBookCart(params("products=901%3A1&coupon=SAVE20")), {
    kind: "unsupported_coupon",
  });
});

test("the Next route redirects valid Meta carts to the precise Lulu checkout without user-controlled destinations", async () => {
  const req = new NextRequest(
    "https://store.truthjblue.com/store/checkout-link?products=901%3A2%2C1020%3A1&fbclid=private",
  );
  const response = await GET(req);
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://svc.lulu.com/?" + item("from-seeds-to-success", 2) + "&" + item("the-alchemy-of-intention"),
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.ok(!response.headers.get("location")!.includes("fbclid"));
});

test("plain old checkout URL shows a non-purchasing book choice instead of 404", async () => {
  const response = await GET(new NextRequest("https://store.truthjblue.com/store/checkout-link"));
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Choose a book/);
  assert.match(text, /https:\/\/store\.truthjblue\.com\/books/);
  assert.doesNotMatch(text, /Payment complete|Order confirmed/);
});

test("unavailable products and coupon attempts render an explicit safe failure", async () => {
  for (const q of ["products=892%3A1", "products=901%3A1&coupon=SAVE20"]) {
    const response = await GET(
      new NextRequest("https://store.truthjblue.com/store/checkout-link?" + q),
    );
    assert.equal(response.status, 422);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("location"), null);
    assert.match(await response.text(), /Nothing has been added|No purchase has been started/);
  }
});
