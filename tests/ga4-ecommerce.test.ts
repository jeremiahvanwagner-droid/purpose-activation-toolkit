import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ecommerceMeasurementId, ecommerceParams, googleItemId, trackGoogleEcommerce,
} from "../lib/ga4Ecommerce.ts";
import { bookEventCatalog } from "../lib/store/meta-book-events.ts";
import { publishedPrintBooks } from "../lib/store/lulu-books.ts";

const toolkit = {
  id: "696d7f574f705f240b0875fd", name: "Purpose Activation Toolkit", category: "Start Here", amount: 247,
};

test("Google events use the existing host's property and exclude unknown and preview hosts", () => {
  assert.equal(ecommerceMeasurementId("store.truthjblue.com"), "G-JP0HS6X4S8");
  assert.equal(ecommerceMeasurementId("SHOP.TRUTHJBLUE.COM"), "G-JP0HS6X4S8");
  assert.equal(ecommerceMeasurementId("www.truthjblue.com"), "G-4TF57DLDBH");
  for (const host of ["localhost", "purpose-activation-toolkit.vercel.app", "store.truthjblue.com.example.org"])
    assert.equal(ecommerceMeasurementId(host), null);
});

test("Toolkit analytics match the actual Merchant offer, while every book matches its Google feed SKU", () => {
  assert.equal(googleItemId(toolkit.id), "696d7f574f705f3755087612");
  const byButton = new Map(publishedPrintBooks().map((b) => [b.buyButtonId, b]));
  for (const b of bookEventCatalog()) {
    const sku = byButton.get(b.buyButtonId)!.sku;
    assert.equal(b.googleItemId, sku);
    const p = ecommerceParams({ id: b.googleItemId, name: b.name, category: "Books in Print", amount: b.price }, 3)!;
    assert.equal(p.items[0].item_id, sku);
    assert.notEqual(p.items[0].item_id, b.retailerId);
    assert.equal(p.value, Math.round(b.price * 3 * 100) / 100);
    assert.equal(p.items[0].quantity, 3);
    assert.equal(p.currency, "USD");
  }
});

test("amounts and quantities distinguish a free item from an unknown price", () => {
  const p = ecommerceParams(toolkit)!;
  assert.equal(p.value, 247);
  assert.equal(p.items[0].price, 247);
  assert.equal(ecommerceParams({ ...toolkit, amount: 0 })!.value, 0);
  for (const amount of [null, undefined, NaN, Infinity, Number.MAX_VALUE, -1]) {
    const unknown = ecommerceParams({ ...toolkit, amount })!;
    assert.equal("value" in unknown, false);
    assert.equal("price" in unknown.items[0], false);
  }
  for (const quantity of [0, -1, 1.5, 1000, NaN]) assert.equal(ecommerceParams(toolkit, quantity), null);
  assert.equal(ecommerceParams({ ...toolkit, id: "" }), null);
});

test("dispatch waits for the existing tag, sends once to the right property, and cancels a discarded view", async () => {
  const calls: unknown[][] = [];
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  const fakeWindow: { location: { hostname: string }; gtag?: (...args: unknown[]) => void } = {
    location: { hostname: "store.truthjblue.com" },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  try {
    const cancel = trackGoogleEcommerce("view_item", toolkit);
    cancel();
    trackGoogleEcommerce("begin_checkout", toolkit);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls.length, 0);
    fakeWindow.gtag = (...args) => { calls.push(args); };
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "event");
    assert.equal(calls[0][1], "begin_checkout");
    const sent = calls[0][2] as { send_to: string; items: { item_id: string }[] };
    assert.equal(sent.send_to, "G-JP0HS6X4S8");
    assert.equal(sent.items[0].item_id, "696d7f574f705f3755087612");
    // Even an untyped caller cannot turn this pre-purchase lane into revenue.
    // @ts-expect-error purchase is deliberately not an accepted event
    trackGoogleEcommerce("purchase", toolkit);
    fakeWindow.location.hostname = "localhost";
    trackGoogleEcommerce("view_item", toolkit);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls.length, 1);
  } finally {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
