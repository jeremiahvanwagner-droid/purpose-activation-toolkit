import type { MetadataRoute } from "next";
import { STORE_URL } from "@/lib/links";
import { printBookUrl, publishedPrintBooks } from "@/lib/store/lulu-books";

const WWW = "https://www.truthjblue.com";

/**
 * One sitemap, two hosts, every page at its canonical address.
 *
 * The brand pages and the free Audit are canonical on www. The paid Audit
 * and Blueprint (/store/audit, /store/blueprint) are a buyer's own documents
 * and declare noindex, so they are not listed — a sitemap entry for a noindex
 * page is a contradiction Search Console reports as an error. The
 * storefront declares canonical on store.truthjblue.com (app/store/page.tsx,
 * product/[slug]/page.tsx, [collection]/page.tsx), so its pages are listed
 * there — listing them under www would have Google discard every one as a
 * duplicate of a URL it never got told about. A mixed-host sitemap is valid
 * here because truthjblue.com is verified as a Search Console Domain property,
 * which covers every subdomain: submit this file under that property, not a
 * URL-prefix one.
 *
 * Slugs are pinned rather than read from the catalog so the sitemap stays a
 * static file and never depends on HighLevel answering at build time. When a
 * product is added or retired, update the list. Every URL below returned 200
 * on its canonical host when this was written (2026-09-06).
 */
const BRAND_PAGES = ["/", "/audit", "/about", "/books", "/start", "/connect", "/legal"];

const STORE_COLLECTIONS = [
  "start-here",
  "courses-workbooks",
  "programs-mentorship",
  "work-with-jeremiah",
  "library",
];

const STORE_PRODUCTS = [
  "purpose-activation-toolkit",
  "inner-alignment-audit",
  "divine-alignment-blueprint",
  "inner-work-integration-course-47",
  "first-step-through-the-veil",
  "deep-dive-call",
  "ascension-intensive",
  "high-level-spiritual-mentorship",
  "beyond-the-veil-mentorship",
  "inner-circle-for-kingdom-visionaries",
  "truth-j-blue-strategic-partnership",
];

/**
 * The print books come from their own committed manifest rather than a pinned
 * list: it is a file in this repo, so reading it keeps the sitemap static and
 * asks nothing of HighLevel or Lulu at build time. Only published editions are
 * listed, and an invalid manifest stops the build here rather than shipping a
 * sitemap that disagrees with the shelf.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const printBooks = publishedPrintBooks();
  return [
    ...BRAND_PAGES.map((p) => ({ url: `${WWW}${p}` })),
    { url: `${STORE_URL}/` },
    ...STORE_COLLECTIONS.map((c) => ({ url: `${STORE_URL}/${c}` })),
    ...STORE_PRODUCTS.map((s) => ({ url: `${STORE_URL}/product/${s}` })),
    ...(printBooks.length ? [{ url: `${STORE_URL}/books` }] : []),
    ...printBooks.map((b) => ({ url: printBookUrl(b) })),
  ];
}
