import { test } from "node:test";
import assert from "node:assert/strict";
import { publishedPrintBooks } from "../lib/store/lulu-books.ts";
import { META_BOOK_RETAILER_SLUGS } from "../lib/store/meta-shop-checkout.ts";
import {
  addToCartParams,
  bookEventCatalog,
  cartAdditions,
  luluCheckoutCompleted,
  parseLuluCart,
  purchaseParams,
  viewContentParams,
} from "../lib/store/meta-book-events.ts";

const catalog = bookEventCatalog();
const bySlug = new Map(publishedPrintBooks().map((b) => [b.slug, b]));
const button = (slug: string) => bySlug.get(slug)!.buyButtonId;
const event = (retailerId: string) => catalog.find((b) => b.retailerId === retailerId)!;

test("pixel catalog covers exactly the ten Meta retailer IDs, never Lulu SKUs or retired IDs", () => {
  assert.equal(catalog.length, 10);
  assert.deepEqual(
    catalog.map((b) => b.retailerId).sort(),
    Object.keys(META_BOOK_RETAILER_SLUGS).sort()
  );
  for (const b of catalog) {
    assert.match(b.retailerId, /^[0-9]+$/);
    assert.equal(b.buyButtonId, button(META_BOOK_RETAILER_SLUGS[b.retailerId]));
    assert.ok(b.price > 0);
  }
  assert.equal(catalog.some((b) => b.retailerId === "892" || b.retailerId === "902"), false);
});

test("ViewContent uses the catalog retailer ID and the book's list price", () => {
  const p = viewContentParams(event("901"));
  assert.deepEqual(p.content_ids, ["901"]);
  assert.equal(p.content_type, "product");
  assert.equal(p.value, 21.99);
  assert.equal(p.currency, "USD");
  assert.deepEqual(p.contents, [{ id: "901", quantity: 1, item_price: 21.99 }]);
  assert.equal(viewContentParams(event("1020")).value, 24.99);
});

test("AddToCart reports only increases, per book, with exact value", () => {
  const fs = button("from-seeds-to-success");
  const ai = button("the-alchemy-of-intention");
  assert.deepEqual(
    cartAdditions([], [{ buyButtonId: fs, quantity: 1 }], catalog).map((a) => [a.item.retailerId, a.quantity]),
    [["901", 1]]
  );
  // 1 → 3 copies, and a new book added: two events.
  const added = cartAdditions(
    [{ buyButtonId: fs, quantity: 1 }],
    [
      { buyButtonId: fs, quantity: 3 },
      { buyButtonId: ai, quantity: 1 },
    ],
    catalog
  ).map((a) => [a.item.retailerId, a.quantity]);
  assert.deepEqual(added, [
    ["901", 2],
    ["1020", 1],
  ]);
  // Removals and decreases are not add-to-carts.
  assert.deepEqual(cartAdditions([{ buyButtonId: fs, quantity: 3 }], [{ buyButtonId: fs, quantity: 1 }], catalog), []);
  assert.deepEqual(cartAdditions([{ buyButtonId: fs, quantity: 1 }], [], catalog), []);
  // Someone else's Lulu product is ignored.
  assert.deepEqual(cartAdditions([], [{ buyButtonId: "00000000-0000-4000-8000-000000000000", quantity: 1 }], catalog), []);

  const p = addToCartParams(event("901"), 2);
  assert.equal(p.value, 43.98);
  assert.equal(p.num_items, 2);
  assert.deepEqual(p.content_ids, ["901"]);
});

test("Lulu's cart payload is parsed defensively", () => {
  const fs = button("from-seeds-to-success");
  assert.deepEqual(
    parseLuluCart({
      items: [
        { config: { id: fs }, quantity: 2, addedAt: 1 },
        { config: { id: 5 }, quantity: 1 },
        { config: { id: "x" }, quantity: 0 },
        { config: { id: "y" }, quantity: 1.5 },
        null,
        "junk",
      ],
      updatedAt: 1,
    }),
    [{ buyButtonId: fs, quantity: 2 }]
  );
  assert.deepEqual(parseLuluCart(null), []);
  assert.deepEqual(parseLuluCart({ items: "no" }), []);
});

test("Purchase totals our books only, merchandise subtotal, retailer IDs", () => {
  const p = purchaseParams(
    [
      { buyButtonId: button("emotional-alchemy"), quantity: 3 },
      { buyButtonId: button("the-alchemy-of-intention"), quantity: 2 },
      { buyButtonId: "00000000-0000-4000-8000-000000000000", quantity: 9 },
    ],
    catalog
  )!;
  assert.deepEqual(p.content_ids, ["893", "1020"]);
  assert.equal(p.value, 115.95); // matches Lulu's cart subtotal for this order
  assert.equal(p.num_items, 5);
  assert.equal(p.currency, "USD");
  assert.equal(purchaseParams([], catalog), null);
  assert.equal(purchaseParams([{ buyButtonId: "nope", quantity: 1 }], catalog), null);
});

test("only Lulu's own origin can report a completed checkout", () => {
  const msg = { type: "CHECKOUT_COMPLETED", buyButtonId: "abc", sellerId: "s", timestamp: 42 };
  assert.deepEqual(luluCheckoutCompleted("https://svc.lulu.com", msg), { buyButtonId: "abc", timestamp: 42 });
  assert.equal(luluCheckoutCompleted("https://evil.example", msg), null);
  assert.equal(luluCheckoutCompleted("https://svc.lulu.com.evil.example", msg), null);
  assert.equal(luluCheckoutCompleted("https://svc.lulu.com", { ...msg, type: "CART_REQUEST" }), null);
  assert.equal(luluCheckoutCompleted("https://svc.lulu.com", "CHECKOUT_COMPLETED"), null);
});
