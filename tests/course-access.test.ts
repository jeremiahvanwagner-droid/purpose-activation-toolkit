import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { courseAccessHref, getCourseAccessHelp } from "../lib/store/course-access.ts";
import { PRODUCTS } from "../lib/store/overlay.ts";
import { NextRequest } from "next/server";
import { middleware } from "../middleware.ts";

test("paused courses stay off the shelf, and a returning buyer can still ask for access help", () => {
  const page = readFileSync("app/store/course-access/page.tsx", "utf8");
  assert.equal(page.includes("payment-link"), false);
  assert.equal(page.includes("overlay"), false);

  for (const [key, id, paymentLink] of [
    ["inner-work", "699f939f4346b061ac834235", "69909e6c35e5ef228f37e300"],
    ["first-step", "6a4eb9eb6630447c7bd80f0d", "6a9bf241a7f78e147447f113"],
  ] as const) {
    assert.equal(PRODUCTS.find(p => p.id === id), undefined);
    assert.equal(
      PRODUCTS.some(p => p.checkout.kind === "buy" && "href" in p.checkout && p.checkout.href.includes(paymentLink)),
      false,
    );
    assert.equal(courseAccessHref(key), `https://www.truthjblue.com/store/course-access?course=${key}`);
    const help = getCourseAccessHelp(key)!;
    assert.equal(help.productId, id);
    const mail = new URL(help.supportHref);
    assert.equal(mail.protocol, "mailto:");
    assert.equal(mail.pathname, "support@truthjblue.com");
    assert.equal(mail.searchParams.get("subject"), `Course access: ${help.title}`);

    const store = middleware(new NextRequest(`https://store.truthjblue.com/course-access?course=${key}`, { headers: { host: "store.truthjblue.com" } }));
    assert.equal(store.headers.get("x-middleware-rewrite"), `https://store.truthjblue.com/store/course-access?course=${key}`);
    const www = middleware(new NextRequest(courseAccessHref(key), { headers: { host: "www.truthjblue.com" } }));
    assert.equal(www.headers.get("x-middleware-next"), "1");
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
