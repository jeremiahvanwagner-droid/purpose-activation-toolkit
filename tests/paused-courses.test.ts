/**
 * The two courses paused on 2026-11-01 must stay out of every path that does
 * not ask HighLevel: the committed catalog snapshot, the store overlay, and
 * the static sitemap. /api/meta-feed is built from the same join as the
 * storefront (getStore), so a product that join drops cannot appear in the feed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sitemap from "../app/sitemap.ts";
import { COLLECTIONS, PRODUCTS } from "../lib/store/overlay.ts";

const PAUSED = [
  {
    id: "699f939f4346b061ac834235",
    slug: "inner-work-integration-course-47",
    name: "Inner-Work Integration Course",
    amount: 47,
    paymentLink: "69909e6c35e5ef228f37e300",
  },
  {
    id: "6a4eb9eb6630447c7bd80f0d",
    slug: "first-step-through-the-veil",
    name: "First Step Through the Veil",
    amount: 247,
    paymentLink: "6a9bf241a7f78e147447f113",
  },
] as const;

type SnapPrice = { amount: number };
type Snap = {
  id: string;
  name: string;
  slug: string | null;
  availableInStore: boolean;
  prices?: SnapPrice[];
};

function snapshotCatalog(): Snap[] {
  return JSON.parse(readFileSync("lib/store/snapshot.json", "utf8")) as Snap[];
}

/** The same join getStore uses when the live catalog is missing. */
function fallbackShelf(catalog: Snap[]) {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  return PRODUCTS.flatMap((meta) => {
    const product = byId.get(meta.id);
    if (!product || !product.availableInStore) return [];
    return [{ id: product.id, name: product.name, slug: meta.slug ?? product.slug ?? product.id }];
  });
}

test("the snapshot fallback cannot show or sell the paused courses", () => {
  const catalog = snapshotCatalog();
  const shelf = fallbackShelf(catalog);
  const overlay = readFileSync("lib/store/overlay.ts", "utf8");

  for (const course of PAUSED) {
    const row = catalog.find((p) => p.id === course.id);
    assert.ok(row, course.id);
    assert.equal(row.availableInStore, false, course.name);
    assert.equal(row.prices?.[0]?.amount, course.amount, `${course.name} price`);
    assert.equal(PRODUCTS.some((p) => p.id === course.id), false, course.name);
    assert.equal(overlay.includes(course.paymentLink), false, course.paymentLink);
    assert.equal(
      shelf.some((item) => item.id === course.id || item.slug === course.slug || item.name === course.name),
      false,
      course.name,
    );
  }

  assert.ok(shelf.some((item) => item.id === "696d7f574f705f240b0875fd"), "Purpose Activation Toolkit stays on the fallback shelf");
  assert.equal(
    catalog.find((p) => p.id === "696d7f574f705f240b0875fd")?.prices?.[0]?.amount,
    247,
  );
  assert.ok(shelf.some((item) => item.id === "699fa003a14ffb50139b4b55"), "Divine Alignment Blueprint stays on the fallback shelf");
});

test("the sitemap does not list the paused course pages on either host", () => {
  const urls = sitemap().map((entry) => entry.url);
  for (const course of PAUSED) {
    assert.equal(urls.some((url) => url.includes(course.slug)), false, course.slug);
  }
  assert.ok(urls.includes("https://store.truthjblue.com/product/purpose-activation-toolkit"));
  assert.ok(urls.includes("https://store.truthjblue.com/courses-workbooks"));
  assert.ok(urls.includes("https://www.truthjblue.com/"));
});

test("the courses-workbooks description is unchanged", () => {
  const courses = COLLECTIONS.find((c) => c.key === "courses-workbooks");
  assert.ok(courses);
  assert.equal(
    courses.seo,
    "Self-paced courses and written workbooks from Truth J Blue: the Inner-Work Integration Course, the Divine Alignment Blueprint, and First Step Through the Veil.",
  );
  assert.equal(
    courses.blurb,
    "Self-paced work you can begin this week — short, guided, and built to be lived rather than read.",
  );
});
