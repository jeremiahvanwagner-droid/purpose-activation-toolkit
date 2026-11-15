import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { accessPageHtml } from "../lib/ebook/accessPage.ts";
import { signEbookCookie, verifyEbookCookie } from "../lib/ebook/cookie.ts";
import {
  EBOOK_FORM_ID,
  EBOOK_LOCATION_ID,
  ebookGateEnforced,
  grantsEbook,
  normalizeEbookEmail,
  submissionIncludesContact,
} from "../lib/ebook/grant.ts";
import { gateResourceHtml } from "../lib/ebook/resourceHtml.ts";
import { downloadEbook, lookupAccess, openFromEmail, serveAccessPage, serveResource } from "../lib/ebook/serve.ts";

const SECRET = "test-secret";
const CONTACT = "4H3ApkzZKUfp9eLb3KeC";
const NOW = Date.parse("2026-11-15T17:00:00Z");
const YEAR = 60 * 60 * 24 * 365;

const resourceHtml = readFileSync("public/created-to-serve/resource/index.html", "utf8");

function deps(extra: Record<string, unknown> = {}) {
  return { secret: SECRET, now: () => NOW, minDelayMs: 0, ...extra };
}

test("the cookie is an HMAC of the contact id and expiry", async () => {
  const exp = Math.floor(NOW / 1000) + YEAR;
  const value = await signEbookCookie(CONTACT, SECRET, exp);
  assert.ok(value);
  const proof = await verifyEbookCookie(value, SECRET, Math.floor(NOW / 1000), YEAR);
  assert.equal(proof?.contactId, CONTACT);
  assert.equal(await verifyEbookCookie(value, "other-secret", Math.floor(NOW / 1000), YEAR), null);
  assert.equal(await verifyEbookCookie(value!.replace(CONTACT, "zzzzzzzzzzzzzzzzzzzz"), SECRET, Math.floor(NOW / 1000), YEAR), null);
  assert.equal(await verifyEbookCookie(value, SECRET, exp + 5, YEAR), null);
});

test("the TJB location plus either access tag or this form's submission opens the book", () => {
  const tags = ["source:ebook", "consent-source:form-checkbox"];
  assert.equal(grantsEbook({ id: CONTACT, locationId: EBOOK_LOCATION_ID, tags }, CONTACT), true);
  assert.equal(grantsEbook({ id: CONTACT, locationId: EBOOK_LOCATION_ID, tags: ["source:ebook"] }, CONTACT), true);
  assert.equal(grantsEbook({ id: CONTACT, locationId: EBOOK_LOCATION_ID, tags: ["ywcts-resource-send-attempted"] }, CONTACT), true);
  assert.equal(grantsEbook({ id: CONTACT, locationId: EBOOK_LOCATION_ID, tags: ["consent-source:form-checkbox"] }, CONTACT), false);
  assert.equal(grantsEbook({ id: CONTACT, locationId: EBOOK_LOCATION_ID, tags: ["toolkit-buyer", "audit-completed"] }, CONTACT), false);
  assert.equal(submissionIncludesContact({ submissions: [{ contactId: CONTACT, formId: EBOOK_FORM_ID }] }, CONTACT), true);
  assert.equal(submissionIncludesContact({ submissions: [{ contactId: "someoneelse000000000", formId: EBOOK_FORM_ID }] }, CONTACT), false);
  assert.equal(submissionIncludesContact({ submissions: [{ contactId: CONTACT, formId: "other-form" }] }, CONTACT), false);
  assert.equal(grantsEbook({ id: CONTACT, locationId: "other-location-id-value", tags }, CONTACT), false);
  assert.equal(grantsEbook({ id: "someoneelse000000000", locationId: EBOOK_LOCATION_ID, tags }, CONTACT), false);
  assert.equal(ebookGateEnforced(undefined), false);
  assert.equal(ebookGateEnforced(""), false);
  assert.equal(ebookGateEnforced("true"), true);
  assert.equal(ebookGateEnforced("off"), false);
  assert.equal(normalizeEbookEmail("  Reader@Example.com "), "reader@example.com");
  assert.equal(normalizeEbookEmail("not-an-email"), null);
});

test("a bogus contact id is sent back to the request page with no cookie", async () => {
  for (const url of [
    `https://www.truthjblue.com/api/ebook?c=not-a-real-id&f=pdf`,
    `https://www.truthjblue.com/api/ebook?c=${CONTACT}&f=exe`,
    "https://www.truthjblue.com/api/ebook?f=pdf",
  ]) {
    const response = await downloadEbook(new Request(url), deps({ contactAllowed: async () => false }));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://www.truthjblue.com/created-to-serve");
    assert.equal(response.headers.get("set-cookie"), null);
  }
  const fromEmail = await openFromEmail(
    new Request(`https://www.truthjblue.com/created-to-serve/get?c=not-a-real-id`),
    deps({ contactAllowed: async () => false }),
  );
  assert.equal(fromEmail.headers.get("location"), "https://www.truthjblue.com/created-to-serve");
  assert.equal(fromEmail.headers.get("set-cookie"), null);
});

test("a tagged contact gets a cookie and a signed url, and the id stays off the resource url", async () => {
  const signed = "https://aagqvfwuixpxtdcrdxmv.supabase.co/storage/v1/object/sign/ebook-private/file?token=short";
  const download = await downloadEbook(
    new Request(`https://www.truthjblue.com/api/ebook?c=${CONTACT}&f=pdf`),
    deps({ contactAllowed: async (id: string) => id === CONTACT, signUrl: async () => signed }),
  );
  assert.equal(download.status, 302);
  assert.equal(download.headers.get("location"), signed);
  const cookie = download.headers.get("set-cookie") ?? "";
  assert.match(cookie, /tjb_ebook=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(cookie.includes(CONTACT) === false || cookie.includes(`tjb_ebook=v1.${CONTACT}.`), true);

  const fromEmail = await openFromEmail(
    new Request(`https://www.truthjblue.com/created-to-serve/get?c=${CONTACT}&utm_source=email`),
    deps({ contactAllowed: async () => true }),
  );
  assert.equal(fromEmail.status, 302);
  assert.equal(fromEmail.headers.get("location"), "https://www.truthjblue.com/created-to-serve/resource");
  const saved = (fromEmail.headers.get("set-cookie") ?? "").split(";")[0]?.slice("tjb_ebook=".length);
  const again = await downloadEbook(new Request("https://www.truthjblue.com/api/ebook?f=epub", {
    headers: { cookie: `tjb_ebook=${saved}` },
  }), deps({ signUrl: async () => signed, contactAllowed: async () => { throw new Error("cookie path must not call HighLevel"); } }));
  assert.equal(again.headers.get("location"), signed);
});

test("the resource page stays open until the gate is enforced, including index.html", async () => {
  const open = await serveResource(new Request("https://www.truthjblue.com/created-to-serve/resource/index.html"), deps({
    enforce: false,
    html: resourceHtml,
  }));
  assert.equal(open.status, 200);
  assert.equal(open.headers.get("x-ebook-gate"), "open");
  const body = await open.text();
  assert.match(body, /href="\/downloads\/You-Were-Created-to-Serve\.pdf"/);
  assert.equal(resourceHtml.includes('href="/downloads/You-Were-Created-to-Serve.pdf"'), true);

  const blocked = await serveResource(new Request("https://www.truthjblue.com/created-to-serve/resource"), deps({
    enforce: true,
    html: resourceHtml,
  }));
  assert.equal(blocked.status, 302);
  assert.equal(blocked.headers.get("location"), "https://www.truthjblue.com/created-to-serve/access");

  const exp = Math.floor(NOW / 1000) + YEAR;
  const value = await signEbookCookie(CONTACT, SECRET, exp);
  const allowed = await serveResource(new Request("https://www.truthjblue.com/created-to-serve/resource", {
    headers: { cookie: `tjb_ebook=${value}` },
  }), deps({ enforce: true, html: resourceHtml }));
  assert.equal(allowed.status, 200);
  const gated = await allowed.text();
  assert.match(gated, /href="\/api\/ebook\?f=pdf"/);
  assert.match(gated, /href="\/api\/ebook\?f=epub"/);
  assert.equal(gated.includes("/downloads/You-Were-Created-to-Serve.pdf"), false);
  assert.equal(gated.includes("project-assets/truth-j-blue/you-were-created-to-serve.epub"), false);
});

test("the access page uses the approved words and does not reveal which emails exist", async () => {
  const page = await (await serveAccessPage()).text();
  for (const line of [
    "Your free eBook.",
    "Enter the email you used to request You Were Created to Serve and we'll open your copy.",
    "Open my copy",
    "Haven't requested it yet?",
    "Request your free copy.",
    "Need help?",
    "support@truthjblue.com",
  ]) {
    assert.equal(page.includes(line), true, line);
  }
  assert.match(page, /href="\/created-to-serve"/);
  assert.match(page, /href="mailto:support@truthjblue.com"/);
  assert.equal(accessPageHtml(), page);

  let lookups = 0;
  const miss = await lookupAccess(new Request("https://www.truthjblue.com/created-to-serve/access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.truthjblue.com" },
    body: "email=missing%40example.com",
  }), deps({
    rateTake: async () => "allow",
    emailToContact: async () => { lookups += 1; return null; },
  }));
  const hit = await lookupAccess(new Request("https://www.truthjblue.com/created-to-serve/access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.truthjblue.com" },
    body: "email=reader%40example.com",
  }), deps({
    rateTake: async () => "allow",
    emailToContact: async () => CONTACT,
  }));
  assert.equal(miss.status, 200);
  assert.equal(hit.status, 303);
  const refused = await miss.text();
  assert.match(refused, /Your free eBook\./);
  assert.match(refused, /Open my copy/);
  assert.equal(hit.headers.get("location"), "https://www.truthjblue.com/created-to-serve/resource");
  assert.equal(miss.headers.get("set-cookie"), null);
  assert.match(hit.headers.get("set-cookie") ?? "", /tjb_ebook=/);
  assert.equal(lookups, 1);

  let rated = 0;
  const limited = await lookupAccess(new Request("https://www.truthjblue.com/created-to-serve/access", {
    method: "POST",
    headers: { origin: "https://evil.example" },
    body: "email=reader@example.com",
  }), deps({
    rateTake: async () => { rated += 1; return "allow"; },
    emailToContact: async () => CONTACT,
  }));
  assert.equal(limited.status, 200);
  assert.equal(limited.headers.get("set-cookie"), null);
  assert.match(await limited.text(), /Open my copy/);
  assert.equal(rated, 0);
});

test("the resource rewrite covers the static file and leaves the other funnel pages alone", async () => {
  const { default: nextConfig } = await import("../next.config.mjs");
  const rewrites = nextConfig.rewrites;
  if (!rewrites) throw new Error("rewrites missing");
  const rules = await rewrites();
  if (Array.isArray(rules)) throw new Error("expected beforeFiles rewrites");
  const before = rules.beforeFiles ?? [];
  assert.equal(before.find((rule) => rule.source === "/created-to-serve/resource")?.destination, "/api/ebook-resource");
  assert.equal(before.find((rule) => rule.source === "/created-to-serve/resource/index.html")?.destination, "/api/ebook-resource");
  assert.equal(before.find((rule) => rule.source === "/created-to-serve")?.destination, "/created-to-serve/index.html");
  assert.equal(before.find((rule) => rule.source === "/created-to-serve/toolkit")?.destination, "/created-to-serve/toolkit/index.html");
});
