/**
 * Meta Pixel catalog events for the printed books — the pure part.
 *
 * Commerce Manager matches pixel events to catalog 2587898941296952 by
 * content_ids, and that catalog keys the ten paperbacks by their historic
 * numeric retailer IDs (881, 893, …, 1020) — not by Lulu SKU, ISBN or Meta's
 * own item IDs. Every event built here uses those retailer IDs, from the same
 * table the Meta Shop checkout bridge uses, so the two can never disagree.
 *
 * What each event means, and why it is true:
 *
 *   ViewContent  a reader opened that book's page.
 *   AddToCart    a book went into a Lulu cart from this site: either Lulu's
 *                own Buy Button added it (Lulu announces every cart change on
 *                the page with a `lulu-cart-changed` event, and only an
 *                increase counts), or the reader followed the direct Lulu
 *                checkout link, which opens Lulu's cart holding that book.
 *   Purchase     Lulu's checkout, running in Lulu's modal on this page,
 *                posted CHECKOUT_COMPLETED from https://svc.lulu.com. The
 *                contents are the Lulu cart as it stood when that message
 *                arrived. The value is the books' list price × quantity —
 *                the merchandise subtotal, not including Lulu's shipping or
 *                tax, which this app never sees. A purchase finished in a
 *                separate Lulu tab (the direct link, or Meta Shop's checkout
 *                bridge) sends nothing back here and is not reported.
 *
 * Nothing in this file touches window or the pixel; the client component
 * (components/store/BookPixelEvents.tsx) wires it to the page.
 */

import { publishedPrintBooks, type PublishedPrintBook } from "./lulu-books";
import { META_BOOK_RETAILER_SLUGS } from "./meta-shop-checkout";

/** The only origin whose CHECKOUT_COMPLETED message is believed. */
export const LULU_CHECKOUT_ORIGIN = "https://svc.lulu.com";

/** One sellable book, as the pixel needs to describe it. */
export type BookEventItem = {
  /** The catalog's retailer ID — what content_ids must carry. */
  retailerId: string;
  buyButtonId: string;
  name: string;
  /** List price in major units, e.g. 21.99. */
  price: number;
  currency: "USD";
};

/** Pixel parameters for one event. */
export type PixelParams = {
  content_ids: string[];
  content_type: "product";
  contents: { id: string; quantity: number; item_price: number }[];
  value: number;
  currency: "USD";
  num_items?: number;
  content_name?: string;
  content_category?: string;
};

const CATEGORY = "Books in Print";

const retailerIdBySlug: ReadonlyMap<string, string> = new Map(
  Object.entries(META_BOOK_RETAILER_SLUGS).map(([id, slug]) => [slug, id])
);

/** Cents to dollars without floating-point drift. */
function money(minor: number): number {
  return Math.round(minor) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The pixel description of one published book, or null if Meta's catalog doesn't carry it. */
export function bookEventItem(book: PublishedPrintBook): BookEventItem | null {
  const retailerId = retailerIdBySlug.get(book.slug);
  if (!retailerId || book.availability !== "in_stock") return null;
  return {
    retailerId,
    buyButtonId: book.buyButtonId,
    name: book.title,
    price: money(book.priceMinor),
    currency: "USD",
  };
}

/** Every book the pixel may report on, from the reviewed manifest. */
export function bookEventCatalog(books: PublishedPrintBook[] = publishedPrintBooks()): BookEventItem[] {
  return books.map(bookEventItem).filter((b): b is BookEventItem => b !== null);
}

export function viewContentParams(item: BookEventItem): PixelParams {
  return {
    content_ids: [item.retailerId],
    content_type: "product",
    contents: [{ id: item.retailerId, quantity: 1, item_price: item.price }],
    content_name: item.name,
    content_category: CATEGORY,
    value: item.price,
    currency: item.currency,
  };
}

export function addToCartParams(item: BookEventItem, quantity: number): PixelParams {
  const qty = Math.max(1, Math.floor(quantity));
  return {
    content_ids: [item.retailerId],
    content_type: "product",
    contents: [{ id: item.retailerId, quantity: qty, item_price: item.price }],
    content_name: item.name,
    content_category: CATEGORY,
    num_items: qty,
    value: round2(item.price * qty),
    currency: item.currency,
  };
}

/** A Lulu cart line, as lulu-buy.js stores it: { config: { id }, quantity }. */
export type LuluCartLine = { buyButtonId: string; quantity: number };

/**
 * Read Lulu's cart payload defensively. Anything that isn't a positive-integer
 * line with a string id is dropped: the payload comes from a third-party
 * script and is never trusted for shape.
 */
export function parseLuluCart(cart: unknown): LuluCartLine[] {
  const items = (cart as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  const lines: LuluCartLine[] = [];
  for (const raw of items) {
    const id = (raw as { config?: { id?: unknown } })?.config?.id;
    const quantity = (raw as { quantity?: unknown })?.quantity;
    if (typeof id !== "string" || !id) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) continue;
    lines.push({ buyButtonId: id, quantity });
  }
  return lines;
}

/**
 * What was added between two cart states: each line whose quantity rose,
 * with the increase. Removals and decreases are not add-to-carts and yield
 * nothing. Unknown Buy Buttons (not one of our ten books) are ignored.
 */
export function cartAdditions(
  before: LuluCartLine[],
  after: LuluCartLine[],
  catalog: BookEventItem[]
): { item: BookEventItem; quantity: number }[] {
  const byButton = new Map(catalog.map((b) => [b.buyButtonId, b]));
  const prior = new Map<string, number>();
  for (const line of before) prior.set(line.buyButtonId, (prior.get(line.buyButtonId) ?? 0) + line.quantity);
  const now = new Map<string, number>();
  for (const line of after) now.set(line.buyButtonId, (now.get(line.buyButtonId) ?? 0) + line.quantity);

  const added: { item: BookEventItem; quantity: number }[] = [];
  for (const [id, qty] of now) {
    const item = byButton.get(id);
    const delta = qty - (prior.get(id) ?? 0);
    if (item && delta > 0) added.push({ item, quantity: delta });
  }
  return added;
}

/**
 * Purchase parameters for the books in a completed Lulu cart, or null when
 * none of the lines is one of ours (nothing to report).
 */
export function purchaseParams(lines: LuluCartLine[], catalog: BookEventItem[]): PixelParams | null {
  const byButton = new Map(catalog.map((b) => [b.buyButtonId, b]));
  const merged = new Map<string, { item: BookEventItem; quantity: number }>();
  for (const line of lines) {
    const item = byButton.get(line.buyButtonId);
    if (!item) continue;
    const prev = merged.get(item.retailerId);
    merged.set(item.retailerId, { item, quantity: (prev?.quantity ?? 0) + line.quantity });
  }
  if (merged.size === 0) return null;

  const contents = [...merged.values()].map(({ item, quantity }) => ({
    id: item.retailerId,
    quantity,
    item_price: item.price,
  }));
  const value = round2(contents.reduce((sum, c) => sum + c.item_price * c.quantity, 0));
  return {
    content_ids: contents.map((c) => c.id),
    content_type: "product",
    contents,
    num_items: contents.reduce((n, c) => n + c.quantity, 0),
    value,
    currency: "USD",
  };
}

/** The message Lulu's checkout posts when an order is placed, or null if this isn't one we trust. */
export function luluCheckoutCompleted(
  origin: string,
  data: unknown
): { buyButtonId: string; timestamp: number } | null {
  if (origin !== LULU_CHECKOUT_ORIGIN) return null;
  const d = data as { type?: unknown; buyButtonId?: unknown; timestamp?: unknown } | null;
  if (!d || d.type !== "CHECKOUT_COMPLETED" || typeof d.buyButtonId !== "string") return null;
  const timestamp = typeof d.timestamp === "number" && Number.isFinite(d.timestamp) ? d.timestamp : 0;
  return { buyButtonId: d.buyButtonId, timestamp };
}
