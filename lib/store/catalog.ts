/**
 * The storefront's view of the catalog: GHL products merged with the overlay.
 *
 * Pages only ever see StoreItem / StoreBook. Everything about where a price
 * comes from, which slug is current, and what to do when GHL has no image is
 * settled here, once.
 */

import type { ArtSpec } from "@/components/store/ProductArt";
import { getCatalog, sanitizeHtml, type StorePrice, type StoreProduct } from "./ghl";
import {
  BOOKS,
  COLLECTIONS,
  PRODUCTS,
  amazonUrl,
  type BookMeta,
  type Collection,
  type CollectionKey,
  type ProductMeta,
} from "./overlay";

export type StoreItem = {
  id: string;
  name: string;
  slug: string;
  collection: Collection;
  meta: ProductMeta;
  price: StorePrice | null;
  amount: number | null;
  descriptionHtml: string;
  art: ArtSpec;
  image: string | null;
};

export type StoreBook = BookMeta & {
  image: string | null;
  descriptionHtml: string;
  href: string;
};

export type StoreData = {
  items: StoreItem[];
  books: StoreBook[];
  collections: Collection[];
  inCollection: (key: CollectionKey) => StoreItem[];
  bySlug: (slug: string) => StoreItem | null;
};

const RETIRED_NAME = /scorecard/i;

function pickPrice(product: StoreProduct, meta: ProductMeta): StorePrice | null {
  if (meta.priceId) {
    const chosen = product.prices.find((p) => p.id === meta.priceId);
    if (chosen) return chosen;
  }
  // Default: the full one-time price. A product with a payment plan carries
  // that plan as a second, smaller price; the card must never lead with it.
  const oneTime = product.prices.filter((p) => p.type === "one_time");
  if (!oneTime.length) return product.prices[0] ?? null;
  return oneTime.reduce((best, p) => (p.amount > best.amount ? p : best), oneTime[0]);
}

function resolveArt(product: StoreProduct, meta: ProductMeta, collection: Collection): ArtSpec {
  if (meta.art.kind === "photo" && product.image) {
    return { kind: "photo", src: product.image, alt: product.name, position: meta.art.position };
  }
  if (meta.art.kind === "plate") {
    return { kind: "plate", kicker: collection.short, title: meta.art.title, accent: meta.art.accent, variant: meta.art.variant };
  }
  // A photo was expected but GHL has none: never ship a blank.
  return { kind: "plate", kicker: collection.short, title: product.name, variant: 1 };
}

function resolveDescription(product: StoreProduct, meta: ProductMeta): string {
  if (meta.description) return sanitizeHtml(meta.description);
  const ghl = product.description?.trim() ?? "";
  if (!ghl || RETIRED_NAME.test(ghl)) return `<p>${meta.tagline}</p>`;
  return sanitizeHtml(ghl);
}

function toItem(product: StoreProduct, meta: ProductMeta): StoreItem | null {
  const collection = COLLECTIONS.find((c) => c.key === meta.collection);
  if (!collection) return null;
  const price = pickPrice(product, meta);
  return {
    id: product.id,
    name: product.name,
    slug: meta.slug ?? product.slug ?? product.id,
    collection,
    meta,
    price,
    amount: price?.amount ?? null,
    descriptionHtml: resolveDescription(product, meta),
    art: resolveArt(product, meta, collection),
    image: product.image,
  };
}

export async function getStore(): Promise<StoreData> {
  const catalog = await getCatalog();
  const byId = new Map(catalog.map((p) => [p.id, p]));

  const items = PRODUCTS.map((meta) => {
    const product = byId.get(meta.id);
    if (!product || !product.availableInStore) return null;
    return toItem(product, meta);
  })
    .filter((x): x is StoreItem => x !== null)
    .sort((a, b) => a.meta.order - b.meta.order);

  const books: StoreBook[] = BOOKS.map((b) => {
    const product = byId.get(b.id);
    return {
      ...b,
      image: product?.image ?? null,
      descriptionHtml: product?.description ? sanitizeHtml(product.description) : "",
      href: amazonUrl(b.asin),
    };
  });

  return {
    items,
    books,
    collections: COLLECTIONS,
    inCollection: (key) => items.filter((i) => i.collection.key === key),
    bySlug: (slug) => items.find((i) => i.slug === slug || i.id === slug) ?? items.find((i) => byId.get(i.id)?.slug === slug) ?? null,
  };
}

export function formatPrice(amount: number | null): string {
  if (amount === null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** A one-word label for how a product is obtained, for cards. */
export function actionWord(item: StoreItem): string {
  switch (item.meta.checkout.kind) {
    case "buy":
      return "Instant access";
    case "book":
    case "apply":
      return item.meta.checkout.label;
    case "pending":
      return "Coming shortly";
  }
}

export function findCollection(key: string): Collection | null {
  return COLLECTIONS.find((c) => c.key === key) ?? null;
}
