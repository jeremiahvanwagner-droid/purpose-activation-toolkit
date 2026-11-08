/**
 * Public, read-only health check for Truth J Blue's ten printed books.
 *
 * This runs from GitHub Actions without credentials. It checks live Vercel
 * product pages, visible Lulu checkout links, and legacy WooCommerce
 * redirects used by historical Facebook product tags. No orders are placed.
 *
 * It deliberately does not count Meta Purchase events: Lulu takes payment
 * off-site, and the print-book pages intentionally don't fabricate purchase
 * attribution.
 */
import { readFileSync } from "node:fs";

const STORE_ORIGIN = "https://store.truthjblue.com";
const manifest = JSON.parse(
  readFileSync(new URL("../lib/store/lulu-books.data.json", import.meta.url), "utf8")
);
const books = manifest.filter((book) => book.publication === "published");

// These are the exact historical paths; do not use a wildcard /product redirect.
const legacyBookAliases = [
  ["living_abundantly_unleashing_the_power_within", "living-abundantly"],
  ["the-alchemy-of-intention-mastering-thought-word-and-action", "the-alchemy-of-intention"],
  ["emotional-alchemy-transforming-inner-barriers-into-bridges-of-growth", "emotional-alchemy"],
  ["empower-yourself-mastering-the-art-of-personal-growth", "empower-yourself"],
  ["empower-and-prosper-a-guide-to-entrepreneurship", "empower-and-prosper"],
  ["unlocking-success-mastering-effective-communication-and-social-skills", "unlocking-success"],
  ["mastering-mental-clarity", "mastering-mental-clarity"],
  ["a-voyage-into-ancient-wisdom", "a-voyage-into-ancient-wisdom-and-inner-empowerment"],
  ["a-voyage-into-ancient-wisdom-and-inner-empowerment", "a-voyage-into-ancient-wisdom-and-inner-empowerment"],
  ["we-are-without-excuse-succeeding-as-children-of-god", "we-are-without-excuse"],
  ["from-seeds-to-success-the-divine-guide-to-cultivating-your-best-life", "from-seeds-to-success"],
];

const errors = [];
function reportError(label, message) {
  const line = label + ": " + message;
  errors.push(line);
  console.error("FAIL " + line);
}

async function request(url, redirect = "follow") {
  return fetch(url, {
    redirect,
    signal: AbortSignal.timeout(25_000),
    headers: { "user-agent": "TruthJBlue-PublicBookLinkCheck/1.0" },
  });
}

async function checkBook(book) {
  const label = "book " + book.slug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug)) {
    reportError(label, "Invalid slug in committed book manifest");
    return;
  }
  const expected = STORE_ORIGIN + "/books/" + book.slug;
  try {
    const response = await request(expected);
    const final = new URL(response.url);
    if (response.status !== 200 ||
        final.origin !== STORE_ORIGIN ||
        final.pathname !== "/books/" + book.slug) {
      reportError(label, "Unexpected destination or response: " + response.status + " " + response.url);
      return;
    }
    const html = await response.text();
    if (!html.includes("Open Lulu checkout")) {
      reportError(label, "The page is missing its direct Lulu checkout control");
      return;
    }
    if (!book.checkoutUrl?.startsWith("https://svc.lulu.com/?items=") ||
        !html.includes(book.checkoutUrl.replace(/&/g, "&amp;")) &&
        !html.includes(book.checkoutUrl)) {
      reportError(label, "The page does not link to its committed Lulu checkout URL");
      return;
    }
    console.log("PASS " + label + ": 200 and direct Lulu checkout link present");
  } catch (error) {
    reportError(label, String(error));
  }
}

async function checkLegacy([legacy, slug]) {
  const label = "legacy " + legacy;
  const expected = new URL("/books/" + slug, STORE_ORIGIN);
  const oldUrl = new URL("/product/" + legacy + "/", STORE_ORIGIN);
  oldUrl.searchParams.set("utm_source", "facebook");
  oldUrl.searchParams.set("fbclid", "link-monitor");
  try {
    const response = await request(oldUrl, "manual");
    const location = response.headers.get("location");
    if (response.status !== 301 || !location) {
      reportError(label, "Expected 301 redirect, found " + response.status);
      return;
    }
    const destination = new URL(location, STORE_ORIGIN);
    if (destination.origin !== expected.origin ||
        destination.pathname !== expected.pathname ||
        destination.searchParams.get("utm_source") !== "facebook" ||
        destination.searchParams.get("fbclid") !== "link-monitor") {
      reportError(label, "Wrong redirect destination or lost campaign parameters: " + destination);
      return;
    }
    console.log("PASS " + label + ": 301, canonical book URL, campaign parameters preserved");
  } catch (error) {
    reportError(label, String(error));
  }
}

if (books.length !== 10) {
  reportError("manifest", "Expected ten released print books; found " + books.length);
}
for (const book of books) await checkBook(book);
for (const alias of legacyBookAliases) await checkLegacy(alias);
if (errors.length) {
  console.error("\n" + errors.length + " live link check(s) failed.");
  process.exitCode = 1;
} else {
  console.log("\nAll " + books.length + " live print pages and " + legacyBookAliases.length + " legacy redirects passed.");
}
