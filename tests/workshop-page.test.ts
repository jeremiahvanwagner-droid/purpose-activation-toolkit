import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sitemap from "../app/sitemap.ts";

const html = readFileSync("public/workshop/index.html", "utf8");
const pageview = readFileSync("public/workshop/pageview.js", "utf8");

test("the workshop page uses the approved copy, form embed, and noindex", () => {
  assert.match(html, /<title>Purpose Activation: a free live workshop<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /alt="Purpose Activation\. Free live workshop\. Tue Dec 8, 7 PM CT"/);
  assert.match(html, /<h1>Purpose Activation: a free live workshop<\/h1>/);
  assert.match(html, /Tuesday, December 8, 7:00 PM CT, live on Microsoft Teams\. For readers of <em>You Were Created to Serve<\/em>\./);
  assert.match(html, /<h2>What we'll do together:<\/h2>/);
  assert.match(html, /Work through the eBook's three movements together: identity before activity, recognizing our gifts, and serving through love\./);
  assert.match(html, /Pause for short reflection prompts\. Bring a pen and paper; nothing is shared unless you choose to\./);
  assert.match(html, /Name one ordinary place this week where what we've been given can serve someone\./);
  assert.match(html, /Bring your questions to the live chat and Q&amp;A\./);
  assert.match(html, /Free\. No purchase required\. Your join link arrives by email when you register\./);
  assert.match(html, /<!-- CONDITIONAL: MIC\/CAM -->Attendee cameras and mics stay off; chat is open\.<!-- \/CONDITIONAL -->/);
  assert.match(html, /<!-- CONDITIONAL: LOBBY -->You'll wait briefly in the lobby until we let everyone in\.<!-- \/CONDITIONAL -->/);
  assert.match(html, /<!-- CONDITIONAL: TOOLKIT -->At the end we'll mention one optional next step, the Purpose Activation Toolkit \(\$247 USD, one-time\)\. You don't need to buy anything to attend\.<!-- \/CONDITIONAL -->/);
  assert.match(html, /Truth J Blue LLC, 8301 State Line Rd Ste 220 #3245, Kansas City, MO 64114/);
  assert.match(html, /support@truthjblue\.com/);
  assert.match(html, /href="\/legal#privacy"/);
  assert.match(html, /href="\/legal#terms"/);
  assert.match(html, /src="https:\/\/site\.truthjblue\.com\/widget\/form\/1deY8dv83PTjzioMz723"/);
  assert.match(html, /id="inline-1deY8dv83PTjzioMz723"/);
  assert.match(html, /data-form-id="1deY8dv83PTjzioMz723"/);
  assert.match(html, /data-height="540"/);
  assert.match(html, /title="Workshop Dec 8 — Registration"/);
  assert.match(html, /src="https:\/\/site\.truthjblue\.com\/js\/form_embed\.js"/);
  assert.match(html, /href="\/created-to-serve\/funnel\.css"/);
  assert.match(html, /src="\/workshop\/pageview\.js"/);
  assert.equal(html.includes("journey"), false);
  assert.equal(html.toLowerCase().includes("christian"), false);
  assert.equal(html.includes("fbq"), false);
  assert.equal(html.includes("Lead"), false);
  assert.equal((html.match(/Kansas City/g) ?? []).length, 1);
});

test("workshop page_view does not add a pixel or Lead event", () => {
  assert.match(pageview, /gtag\('config', GA, gaConfig\)/);
  assert.equal(pageview.includes("fbq"), false);
  assert.equal(pageview.includes("fbevents"), false);
  assert.equal(pageview.includes("oaiq"), false);
  assert.equal(/generate_lead|track\(\s*['"]Lead['"]/.test(pageview), false);
});

test("the workshop route is a rewrite and is absent from the sitemap", async () => {
  const { default: nextConfig } = await import("../next.config.mjs");
  const rewrites = nextConfig.rewrites;
  if (!rewrites) throw new Error("rewrites missing");
  const rules = await rewrites();
  if (Array.isArray(rules)) throw new Error("expected beforeFiles rewrites");
  const before = rules.beforeFiles ?? [];
  assert.equal(before.find((rule) => rule.source === "/workshop")?.destination, "/workshop/index.html");
  assert.equal(sitemap().some((entry) => entry.url.includes("/workshop")), false);
});
