/**
 * Read-only check: has any list on the Amazon storefront changed since
 * lib/store/amazon-picks.data.json was written?
 *
 *   node scripts/check-amazon-picks.mjs
 *
 * For each list in the manifest it fetches the list's public page on Amazon
 * and compares the ASINs there with the ASINs here — added, removed, or
 * reordered — and reports any idea list on the storefront that the manifest
 * does not have. It changes nothing: a difference is something to bring into
 * the manifest by hand (with a short name and detail line, as the others
 * have), then bump verifiedAt.
 *
 * Amazon sometimes answers automated requests with a 503 or a robot check.
 * That is reported as "could not read", never as "list is empty". Exit code 1
 * if anything differs or could not be read.
 */
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../lib/store/amazon-picks.data.json", import.meta.url), "utf8"));
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
  accept: "text/html,application/xhtml+xml",
};

let problems = 0;
const report = (line) => {
  problems += 1;
  console.log(line);
};

async function page(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  const html = await res.text();
  if (!res.ok || /captcha|Robot Check/i.test(html.slice(0, 20000))) return null;
  return html;
}

/** ASINs in the order the list shows them. A deal adds ":amzn1.deal…" after one. */
function listAsins(html) {
  const start = html.indexOf('id="list-item-container"');
  if (start < 0) return null;
  const seen = [];
  for (const m of html.slice(start).matchAll(/class="single-list-item"[^>]*data-asin="amzn1\.asin\.([A-Z0-9]{10})[":]/g)) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

const home = await page(manifest.storefrontUrl);
if (!home) {
  report(`could not read the storefront at ${manifest.storefrontUrl}`);
} else {
  const ids = [...new Set([...home.matchAll(/\/shop\/[a-z0-9-]+\/list\/([A-Z0-9]+)/g)].map((m) => m[1]))];
  const known = new Set(manifest.lists.map((l) => l.id));
  for (const id of ids) if (!known.has(id)) report(`NEW LIST on Amazon, not in the manifest: ${manifest.storefrontUrl}/list/${id}`);
  for (const id of known) if (!ids.includes(id)) report(`GONE from the storefront page: list ${id}`);
}

for (const list of manifest.lists) {
  const html = await page(`${manifest.storefrontUrl}/list/${list.id}`);
  const there = html && listAsins(html);
  if (!there) {
    report(`${list.title}: could not read the list on Amazon`);
    continue;
  }
  const here = list.items.map((i) => i.asin);
  const added = there.filter((a) => !here.includes(a));
  const removed = here.filter((a) => !there.includes(a));
  if (added.length) report(`${list.title}: on Amazon, not here: ${added.join(", ")}`);
  if (removed.length) report(`${list.title}: here, no longer on Amazon: ${removed.join(", ")}`);
  if (!added.length && !removed.length && there.join() !== here.join()) report(`${list.title}: same items, new order on Amazon`);
  if (!added.length && !removed.length) console.log(`ok  ${list.title} (${here.length})`);
  await new Promise((r) => setTimeout(r, 800));
}

if (problems) {
  console.log(`\n${problems} difference(s). Manifest verifiedAt is ${manifest.verifiedAt}.`);
  process.exit(1);
}
console.log(`\nEvery list matches. You can set verifiedAt to today.`);
