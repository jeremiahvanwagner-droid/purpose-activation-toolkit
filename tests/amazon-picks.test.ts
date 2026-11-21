/**
 * The Recommended page's manifest and the rules it is held to
 * (lib/store/amazon-picks.ts, app/store/recommended/page.tsx).
 *
 * The manifest is the storefront as read on 2026-11-21; every other fixture
 * is synthetic. Nothing here contacts Amazon.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AMAZON_DISCLOSURE,
  AMAZON_PICKS,
  amazonListUrl,
  amazonProductUrl,
  amazonStorefrontUrl,
  distinctPickCount,
  formatVerified,
  shownLists,
  storeDay,
  validateAmazonPicks,
} from "../lib/store/amazon-picks.ts";
import sitemap from "../app/sitemap.ts";

const raw = JSON.parse(readFileSync(new URL("../lib/store/amazon-picks.data.json", import.meta.url), "utf8"));
const clone = () => JSON.parse(JSON.stringify(raw));

test("the committed manifest is sound", () => {
  assert.deepEqual(validateAmazonPicks(raw), []);
  assert.equal(AMAZON_PICKS.lists.length, 9);
});

test("the disclosure is Amazon's required sentence, word for word", () => {
  assert.equal(AMAZON_DISCLOSURE, "As an Amazon Associate, we earn from qualifying purchases.");
});

test("every link is a plain amazon.com link carrying the storefront's tag", () => {
  assert.equal(amazonProductUrl("0310347556"), "https://www.amazon.com/dp/0310347556?tag=julianvanwagn-20");
  assert.equal(
    amazonListUrl("Q0LPJCBWZX7I"),
    "https://www.amazon.com/shop/influencer-74ca0298/list/Q0LPJCBWZX7I?tag=julianvanwagn-20"
  );
  assert.equal(amazonStorefrontUrl(), "https://www.amazon.com/shop/influencer-74ca0298?tag=julianvanwagn-20");
});

test("no price, rating or badge can be added to the manifest", () => {
  for (const key of ["price", "rating", "badge", "listPrice"]) {
    const m = clone();
    m.lists[0].items[0][key] = "$9.98";
    assert.ok(
      validateAmazonPicks(m).some((e) => e.includes(`unknown key "${key}"`)),
      `${key} was accepted`
    );
  }
});

test("images must come from Amazon's own image host", () => {
  const m = clone();
  m.lists[0].items[0].image = "https://www.truthjblue.com/copied.jpg";
  assert.ok(validateAmazonPicks(m).some((e) => e.endsWith("image: not on Amazon's image host")));
});

test("a hidden item must say why, and is never shown", () => {
  const m = clone();
  m.lists[1].items[0].hidden = true;
  assert.ok(validateAmazonPicks(m).some((e) => e.endsWith("hiddenReason: a hidden item says why")));

  const prayer = shownLists(new Date("2026-11-21T18:00:00Z")).find((l) => l.slug === "prayer-journals");
  assert.ok(prayer);
  assert.ok(!prayer.shown.some((i) => i.asin === "B088Y42FLG"));
  assert.equal(prayer.shown.length, prayer.items.length - 1);
});

test("the same ASIN twice in one list, or a duplicate slug, is rejected", () => {
  const m = clone();
  m.lists[0].items.push({ ...m.lists[0].items[0] });
  m.lists[2].slug = m.lists[1].slug;
  const errors = validateAmazonPicks(m);
  assert.ok(errors.some((e) => e.includes("twice in one list")));
  assert.ok(errors.some((e) => e.includes("slug: duplicate")));
});

test("the holiday list leads through Christmas Day in Kansas City, then is not shown", () => {
  const during = shownLists(new Date("2026-11-21T18:00:00Z"));
  assert.equal(during[0].slug, "gift-picks");
  assert.equal(during[0].seasonal, true);

  // 11pm on the 25th in Kansas City is already the 26th in UTC.
  assert.equal(storeDay(new Date("2026-12-26T05:00:00Z")), "2026-12-25");
  assert.equal(shownLists(new Date("2026-12-26T05:00:00Z"))[0].slug, "gift-picks");

  const after = shownLists(new Date("2026-12-26T07:00:00Z"));
  assert.ok(!after.some((l) => l.slug === "gift-picks"));
  assert.equal(after[0].slug, "start-here");
});

test("an item that is in two lists is counted once", () => {
  const lists = shownLists(new Date("2026-11-21T18:00:00Z"));
  const total = lists.reduce((n, l) => n + l.shown.length, 0);
  const distinct = distinctPickCount(lists);
  assert.ok(distinct < total);
  assert.equal(distinct, new Set(lists.flatMap((l) => l.shown.map((i) => i.asin))).size);
});

test("the verified date reads as a date", () => {
  assert.equal(formatVerified("2026-11-21"), "November 21, 2026");
});

test("every outbound link on the page and its card is marked sponsored", () => {
  for (const file of ["../app/store/recommended/page.tsx", "../components/store/AmazonPickCard.tsx"]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    const blank = src.match(/target="_blank"/g)?.length ?? 0;
    const sponsored = src.match(/target="_blank"\s+rel="sponsored noopener"/g)?.length ?? 0;
    assert.ok(blank > 0, `${file} has no outbound links`);
    assert.equal(sponsored, blank, `${file}: an outbound link is not rel="sponsored"`);
  }
});

test("the sitemap lists the page on the store host", () => {
  assert.ok(sitemap().some((e) => e.url === "https://store.truthjblue.com/recommended"));
});
