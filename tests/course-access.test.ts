import { test } from "node:test";
import assert from "node:assert/strict";
import { courseAccessHref, getCourseAccessHelp } from "../lib/store/course-access.ts";
import { PRODUCTS } from "../lib/store/overlay.ts";
import { NextRequest } from "next/server";
import { middleware } from "../middleware.ts";

test("both LMS products have a returning-buyer route without changing checkout", () => {
  for (const [key, id, paymentLink] of [
    ["inner-work", "699f939f4346b061ac834235", "69909e6c35e5ef228f37e300"],
    ["first-step", "6a4eb9eb6630447c7bd80f0d", "6a9bf241a7f78e147447f113"],
  ] as const) {
    const product = PRODUCTS.find(p => p.id === id)!;
    assert.equal(product.access?.href, courseAccessHref(key));
    assert.equal(product.checkout.kind, "buy");
    assert.equal("href" in product.checkout && product.checkout.href, `https://site.truthjblue.com/payment-link/${paymentLink}`);
    const help = getCourseAccessHelp(key)!;
    assert.equal(help.productId, id);
    const mail = new URL(help.supportHref);
    assert.equal(mail.protocol, "mailto:");
    assert.equal(mail.pathname, "support@truthjblue.com");
    assert.equal(mail.searchParams.get("subject"), `Course access: ${help.title}`);
  }
});

test("untrusted course values cannot supply an external or admin destination", () => {
  for (const value of [undefined, "", "__proto__", "constructor", "https://example.com", "inner-work\r\nBcc:other@example.com", ["inner-work", "first-step"]]) {
    assert.equal(getCourseAccessHelp(value), null);
  }
});

test("Blueprint keeps its private report route rather than the LMS help route", () => {
  assert.equal(PRODUCTS.find(p => p.id === "699fa003a14ffb50139b4b55")?.access?.href, "/store/blueprint");
});

test("course recovery route works on the store host and www without losing selection", () => {
  const store = middleware(new NextRequest("https://store.truthjblue.com/course-access?course=inner-work", { headers: { host: "store.truthjblue.com" } }));
  assert.equal(store.headers.get("x-middleware-rewrite"), "https://store.truthjblue.com/store/course-access?course=inner-work");
  const www = middleware(new NextRequest(courseAccessHref("first-step"), { headers: { host: "www.truthjblue.com" } }));
  assert.equal(www.headers.get("x-middleware-next"), "1");
});
