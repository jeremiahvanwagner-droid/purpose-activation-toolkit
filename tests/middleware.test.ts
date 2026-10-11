/**
 * Host routing and redirects (middleware.ts).
 *
 * Requests are built in memory; nothing is fetched. The cases are the ones a
 * wrong rule has broken before, or would break a buyer's way in: the store
 * host's clean paths, the printed shop.truthjblue.com address, the old
 * WooCommerce and HighLevel product links, and the paid Audit's home on www.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware.ts";

const STORE = "store.truthjblue.com";
const WWW = "www.truthjblue.com";

function visit(host: string, path: string) {
  const res = middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
  return {
    status: res.status,
    location: res.headers.get("location"),
    // How Next marks "serve a different path" and "carry on unchanged".
    rewrite: res.headers.get("x-middleware-rewrite"),
    passes: res.headers.get("x-middleware-next") === "1",
  };
}

test("a HighLevel store product link lands on that product's page in the store", () => {
  const toolkit = "696d7f574f705f240b0875fd";
  for (const host of [STORE, WWW, "shop.truthjblue.com"]) {
    const r = visit(host, `/product-details/product/${toolkit}?variant=696d7f574f705f3755087612`);
    assert.equal(r.status, 301, host);
    assert.equal(r.location, `https://store.truthjblue.com/product/${toolkit}`, host);
  }
  assert.equal(visit(STORE, `/product-details/product/${toolkit}/`).location, `https://store.truthjblue.com/product/${toolkit}`);
});

test("only a HighLevel product id is redirected from that shape, never an arbitrary path", () => {
  // On the store host anything else is rewritten onto /store and 404s there, as before.
  for (const path of [
    "/product-details/product/not-an-id",
    "/product-details/product/696d7f574f705f240b0875fd/extra",
    "/product-details/product/",
    "/product-details/product/..%2f..%2faudit",
    "/product-details",
  ]) {
    const r = visit(STORE, path);
    assert.equal(r.location, null, path);
    assert.ok(r.rewrite?.includes("/store/product-details"), path);
  }
  assert.equal(visit(WWW, "/product-details/product/not-an-id").passes, true);
});

test("the store host serves clean paths, and sends the prefixed form to the clean one", () => {
  assert.ok(visit(STORE, "/").rewrite?.endsWith("/store"));
  assert.ok(visit(STORE, "/books").rewrite?.endsWith("/store/books"));
  assert.ok(visit(STORE, "/books/emotional-alchemy").rewrite?.endsWith("/store/books/emotional-alchemy"));
  assert.ok(visit(STORE, "/product/purpose-activation-toolkit").rewrite?.endsWith("/store/product/purpose-activation-toolkit"));

  const prefixed = visit(STORE, "/store/books/emotional-alchemy");
  assert.equal(prefixed.status, 308);
  assert.equal(prefixed.location, "https://store.truthjblue.com/books/emotional-alchemy");
});

test("www is left alone: the brand pages, the app and the /store tree answer as themselves", () => {
  for (const path of ["/", "/books", "/audit", "/store", "/store/books", "/store/product/purpose-activation-toolkit", "/toolkit"]) {
    const r = visit(WWW, path);
    assert.equal(r.passes, true, path);
    assert.equal(r.location, null, path);
  }
});

test("the address printed in the books goes to the store with its path intact", () => {
  const r = visit("shop.truthjblue.com", "/books/living-abundantly?ref=imprint");
  assert.equal(r.status, 308);
  assert.equal(r.location, "https://store.truthjblue.com/books/living-abundantly?ref=imprint");
});

test("the paid Audit and Blueprint are always opened on www", () => {
  assert.deepEqual(
    [visit(STORE, "/audit").status, visit(STORE, "/audit").location],
    [307, "https://www.truthjblue.com/store/audit"]
  );
  assert.equal(visit(STORE, "/blueprint").location, "https://www.truthjblue.com/store/blueprint");
});

test("old WooCommerce addresses still go where they went, and live products are not caught by them", () => {
  assert.deepEqual(
    [visit(STORE, "/product/mastering-mental-clarity").status, visit(STORE, "/product/mastering-mental-clarity").location],
    [301, "https://store.truthjblue.com/"]
  );
  assert.equal(visit(WWW, "/product-tag/personal-growth/feed/").status, 301);
  assert.equal(visit(WWW, "/inner-alignment-audit").location, "https://www.truthjblue.com/store/audit");
  // A current product, and a product opened by its HighLevel id, are served, not redirected.
  assert.equal(visit(STORE, "/product/inner-alignment-audit").location, null);
  assert.ok(visit(STORE, "/product/696d7f574f705f240b0875fd").rewrite?.endsWith("/store/product/696d7f574f705f240b0875fd"));
});
