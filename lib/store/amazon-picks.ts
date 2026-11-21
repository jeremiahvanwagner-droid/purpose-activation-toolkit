/**
 * Recommended — the books and tools on Truth J Blue's Amazon storefront,
 * shown in the store at /recommended.
 *
 * Amazon sells these, not us. A reader chooses one here and buys it on
 * Amazon, and Truth J Blue may earn a commission as an Amazon Associate. So,
 * like the Lulu print shelf, they live in their own manifest
 * (amazon-picks.data.json) and never pass through getStore(), HighLevel, the
 * product feeds or the GA4 ecommerce events — nothing here is a product this
 * store sells.
 *
 * The manifest mirrors the idea lists on the storefront
 * (amazon.com/shop/influencer-74ca0298) as read on `verifiedAt`: the same
 * lists, the same items, in Amazon's order. The words are ours: Amazon's
 * titles are written for its search ("…Journal for Women & Men, 160 Pages,
 * College Ruled…"), so each item carries a short name and a plain detail line
 * taken from that title. Nothing in the manifest says more about a product
 * than its own Amazon title does. `node scripts/check-amazon-picks.mjs`
 * reports any list that has changed on Amazon since.
 *
 * What the Amazon Associates agreement asks of a page like this, and how it
 * is met here:
 *   - No prices, ratings, deal or "Best Seller" badges. They change daily on
 *     Amazon, and a copy shown here would soon be wrong; the manifest has no
 *     field for them, and the validator rejects one if it is added.
 *   - Product images are Amazon's own, loaded from Amazon's image host and
 *     shown only inside a link to that product. They are never downloaded,
 *     re-hosted or re-encoded, which is why the page uses a plain <img> and
 *     not next/image (that would copy each one through this server).
 *   - The Associate disclosure is on the page above the first link, and
 *     every link is marked rel="sponsored".
 *   - Every link carries the storefront's own tracking tag, so a purchase is
 *     credited to the same Associates account the storefront uses.
 */

import manifest from "./amazon-picks.data.json" with { type: "json" };

/** The disclosure Amazon requires, word for word, wherever its links appear. */
export const AMAZON_DISCLOSURE = "As an Amazon Associate, we earn from qualifying purchases.";

/** The same, said plainly for a reader. */
export const AMAZON_DISCLOSURE_PLAIN =
  "When you buy through a link on this page, Truth J Blue may earn a small commission. The price you pay is the same. Amazon sets every price and handles every order.";

/** The Palace of Excellence books are Jeremiah's own; this says so beside them. */
export const OWN_BOOKS_NOTE = "These are Jeremiah Van Wagner’s own books; he earns author royalties on them.";

export const RECOMMENDED_TITLE = "Recommended";

export type PickKind = "book" | "tool";

export type AmazonPick = {
  asin: string;
  kind: PickKind;
  byline: string;
  name: string;
  detail?: string;
  image: string;
  /** Kept in the manifest because it is on the Amazon list, but not shown. */
  hidden?: boolean;
  hiddenReason?: string;
};

export type AmazonList = {
  /** Amazon's idea-list id: the part after /list/ in the list's URL. */
  id: string;
  /** The section's anchor on /recommended. */
  slug: string;
  kicker: string;
  title: string;
  description: string;
  /** Jeremiah's own books. Shown as a series, with the royalties note. */
  own?: boolean;
  /** YYYY-MM-DD. A seasonal list leads the page through this day, then is
   *  not shown at all (it stays on Amazon). */
  showUntil?: string;
  items: AmazonPick[];
};

export type AmazonPicks = {
  storefrontUrl: string;
  associateTag: string;
  verifiedAt: string;
  lists: AmazonList[];
};

const ASIN = /^[A-Z0-9]{10}$/;
const LIST_ID = /^[A-Z0-9]{10,16}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TAG = /^[a-z0-9-]+-20$/;
const IMAGE_PREFIX = "https://m.media-amazon.com/images/I/";
const STOREFRONT = /^https:\/\/www\.amazon\.com\/shop\/[a-z0-9-]+$/;

const LIST_KEYS = new Set(["id", "slug", "kicker", "title", "description", "own", "showUntil", "items"]);
const ITEM_KEYS = new Set(["asin", "kind", "byline", "name", "detail", "image", "hidden", "hiddenReason"]);

const text = (v: unknown, max: number) => typeof v === "string" && v.trim() === v && v.length > 0 && v.length <= max;

/**
 * Every problem with the manifest, as readable lines. An empty array means it
 * is sound. Unknown keys are errors, so a price or rating cannot be slipped in
 * and quietly rendered later.
 */
export function validateAmazonPicks(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["manifest: not an object"];
  const m = raw as Record<string, unknown>;
  if (typeof m.storefrontUrl !== "string" || !STOREFRONT.test(m.storefrontUrl)) errors.push("storefrontUrl: not an amazon.com/shop URL");
  if (typeof m.associateTag !== "string" || !TAG.test(m.associateTag)) errors.push("associateTag: not an Associates tracking id");
  if (typeof m.verifiedAt !== "string" || !DAY.test(m.verifiedAt)) errors.push("verifiedAt: not YYYY-MM-DD");
  if (!Array.isArray(m.lists) || m.lists.length === 0) return [...errors, "lists: none"];

  const ids = new Set<string>();
  const slugs = new Set<string>();
  m.lists.forEach((l, li) => {
    const at = `lists[${li}]`;
    if (!l || typeof l !== "object" || Array.isArray(l)) return void errors.push(`${at}: not an object`);
    const list = l as Record<string, unknown>;
    for (const k of Object.keys(list)) if (!LIST_KEYS.has(k)) errors.push(`${at}: unknown key "${k}"`);
    if (typeof list.id !== "string" || !LIST_ID.test(list.id)) errors.push(`${at}.id: not an idea-list id`);
    else if (ids.has(list.id)) errors.push(`${at}.id: duplicate ${list.id}`);
    else ids.add(list.id);
    if (typeof list.slug !== "string" || !SLUG.test(list.slug)) errors.push(`${at}.slug: not a slug`);
    else if (slugs.has(list.slug)) errors.push(`${at}.slug: duplicate ${list.slug}`);
    else slugs.add(list.slug);
    if (!text(list.kicker, 40)) errors.push(`${at}.kicker: missing or too long`);
    if (!text(list.title, 80)) errors.push(`${at}.title: missing or too long`);
    if (!text(list.description, 400)) errors.push(`${at}.description: missing or too long`);
    if (list.own !== undefined && typeof list.own !== "boolean") errors.push(`${at}.own: not a boolean`);
    if (list.showUntil !== undefined && (typeof list.showUntil !== "string" || !DAY.test(list.showUntil)))
      errors.push(`${at}.showUntil: not YYYY-MM-DD`);
    if (!Array.isArray(list.items) || list.items.length === 0) return void errors.push(`${at}.items: none`);

    const seen = new Set<string>();
    list.items.forEach((it, ii) => {
      const iat = `${at}.items[${ii}]`;
      if (!it || typeof it !== "object" || Array.isArray(it)) return void errors.push(`${iat}: not an object`);
      const item = it as Record<string, unknown>;
      for (const k of Object.keys(item)) if (!ITEM_KEYS.has(k)) errors.push(`${iat}: unknown key "${k}"`);
      if (typeof item.asin !== "string" || !ASIN.test(item.asin)) errors.push(`${iat}.asin: not an ASIN`);
      else if (seen.has(item.asin)) errors.push(`${iat}.asin: ${item.asin} twice in one list`);
      else seen.add(item.asin);
      if (item.kind !== "book" && item.kind !== "tool") errors.push(`${iat}.kind: not book or tool`);
      if (!text(item.byline, 60)) errors.push(`${iat}.byline: missing or too long`);
      if (!text(item.name, 60)) errors.push(`${iat}.name: missing or too long`);
      if (item.detail !== undefined && !text(item.detail, 110)) errors.push(`${iat}.detail: empty or too long`);
      if (typeof item.image !== "string" || !item.image.startsWith(IMAGE_PREFIX) || /[\s"'<>]/.test(item.image))
        errors.push(`${iat}.image: not on Amazon's image host`);
      if (item.hidden !== undefined && typeof item.hidden !== "boolean") errors.push(`${iat}.hidden: not a boolean`);
      if (item.hidden === true && !text(item.hiddenReason, 400)) errors.push(`${iat}.hiddenReason: a hidden item says why`);
    });
  });
  return errors;
}

export class AmazonPicksManifestError extends Error {}

function load(): AmazonPicks {
  const errors = validateAmazonPicks(manifest);
  if (errors.length) throw new AmazonPicksManifestError(`amazon-picks.data.json:\n  ${errors.join("\n  ")}`);
  return manifest as AmazonPicks;
}

/** The checked manifest. Throws at import if it is unsound, so a bad edit
 *  fails the build and the tests rather than rendering. */
export const AMAZON_PICKS: AmazonPicks = load();

/** A product's page on Amazon, credited to the storefront's tag. */
export function amazonProductUrl(asin: string, tag = AMAZON_PICKS.associateTag): string {
  return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

/** One idea list on the storefront, the way Amazon itself links to it. */
export function amazonListUrl(listId: string, picks = AMAZON_PICKS): string {
  return `${picks.storefrontUrl}/list/${listId}?tag=${picks.associateTag}`;
}

export function amazonStorefrontUrl(picks = AMAZON_PICKS): string {
  return `${picks.storefrontUrl}?tag=${picks.associateTag}`;
}

/** Today in Kansas City, as YYYY-MM-DD — the day a seasonal list ends on. */
export function storeDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type ShownList = AmazonList & { seasonal: boolean; shown: AmazonPick[] };

/**
 * The lists the page shows on a given day, in the order it shows them: a
 * seasonal list first while its season lasts, then the rest in manifest
 * order. A list whose season has passed is left out, and so is any list left
 * with nothing to show.
 */
export function shownLists(now: Date, picks = AMAZON_PICKS): ShownList[] {
  const today = storeDay(now);
  const lists = picks.lists
    .filter((l) => !l.showUntil || today <= l.showUntil)
    .map((l) => ({ ...l, seasonal: Boolean(l.showUntil), shown: l.items.filter((i) => !i.hidden) }))
    .filter((l) => l.shown.length > 0);
  return [...lists.filter((l) => l.seasonal), ...lists.filter((l) => !l.seasonal)];
}

/** How many different things the shown lists hold — an item in two lists counts once. */
export function distinctPickCount(lists: ShownList[]): number {
  return new Set(lists.flatMap((l) => l.shown.map((i) => i.asin))).size;
}

/** "November 21, 2026", for the line saying when the lists were last checked. */
export function formatVerified(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}
