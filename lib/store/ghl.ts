/**
 * Storefront catalog — read from the HighLevel Products API.
 *
 * GHL is the source of truth for what is sold, at what price, with which image
 * and copy; the storefront never carries a price of its own. Reads are cached
 * by Next's fetch cache and revalidated every 30 minutes, so a price change in
 * GHL reaches the store without a deploy and the API is not hit per visitor.
 *
 * If GHL is unreachable, or the credentials are missing on a preview build, the
 * store falls back to the last snapshot committed alongside this file rather
 * than rendering empty — a storefront with no products is worse than one that
 * is thirty minutes stale.
 *
 * Server-only: the private integration token must never reach the browser, so
 * nothing in here may be imported from a client component.
 */

import snapshot from "./snapshot.json";

export type StorePrice = {
  id: string;
  name: string;
  amount: number;
  type: "one_time" | "recurring";
  /** GHL's "compare at" anchor. Read but deliberately never rendered — a
   *  struck-through $2,997 next to a $97 item reads as a trick, not a gift. */
  compareAt: number | null;
};

export type StoreProduct = {
  id: string;
  name: string;
  slug: string | null;
  /** HTML from GHL's editor. Rendered through sanitizeHtml() only. */
  description: string;
  image: string | null;
  availableInStore: boolean;
  productType: string;
  prices: StorePrice[];
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const REVALIDATE_SECONDS = 1800;
export const CATALOG_TAG = "store-catalog";

/** Cloudflare in front of GHL rejects non-browser user agents (error 1010). */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

type RawPrice = {
  _id: string;
  name?: string;
  amount?: number;
  type?: string;
  compareAtPrice?: number | null;
  deleted?: boolean;
};

type RawProduct = {
  _id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  image?: string | null;
  availableInStore?: boolean | null;
  productType?: string;
};

function credentials(): { token: string; locationId: string } | null {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  if (!token || !locationId) return null;
  return { token, locationId };
}

async function ghlGet<T>(path: string, params: Record<string, string>, token: string): Promise<T | null> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${GHL_BASE}${path}?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        Accept: "application/json",
        "User-Agent": UA,
      },
      next: { revalidate: REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
    });
    if (!res.ok) {
      console.error("[store] GHL", path, res.status, (await res.text()).slice(0, 200));
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[store] GHL request failed:", path, err);
    return null;
  }
}

/** The twelve Palace of Excellence books are staged in GHL but sold on Amazon;
 *  they are part of the catalog even though availableInStore is false. */
function isBook(p: RawProduct): boolean {
  return (p.slug ?? "").startsWith("palace-");
}

function normalisePrice(x: RawPrice): StorePrice | null {
  if (x.deleted) return null;
  if (typeof x.amount !== "number") return null;
  return {
    id: x._id,
    name: x.name ?? "",
    amount: x.amount,
    type: x.type === "recurring" ? "recurring" : "one_time",
    compareAt: typeof x.compareAtPrice === "number" ? x.compareAtPrice : null,
  };
}

async function fetchLiveCatalog(): Promise<StoreProduct[] | null> {
  const creds = credentials();
  if (!creds) return null;

  const list = await ghlGet<{ products?: RawProduct[] }>("/products/", { locationId: creds.locationId, limit: "100" }, creds.token);
  const raw = list?.products;
  if (!Array.isArray(raw)) return null;

  const wanted = raw.filter((p) => p.availableInStore === true || isBook(p));

  const products = await Promise.all(
    wanted.map(async (p): Promise<StoreProduct> => {
      let prices: StorePrice[] = [];
      if (p.availableInStore === true) {
        const pr = await ghlGet<{ prices?: RawPrice[] }>(`/products/${p._id}/price`, { locationId: creds.locationId, limit: "50" }, creds.token);
        prices = (pr?.prices ?? []).map(normalisePrice).filter((x): x is StorePrice => x !== null);
      }
      return {
        id: p._id,
        name: p.name,
        slug: p.slug ?? null,
        description: p.description ?? "",
        image: p.image ?? null,
        availableInStore: p.availableInStore === true,
        productType: p.productType ?? "DIGITAL",
        prices,
      };
    })
  );

  return products.length ? products : null;
}

function snapshotCatalog(): StoreProduct[] {
  return (snapshot as unknown as StoreProduct[]).map((p) => ({ ...p, prices: p.prices ?? [] }));
}

/** Every product the storefront may show: live from GHL, else the snapshot. */
export async function getCatalog(): Promise<StoreProduct[]> {
  const live = await fetchLiveCatalog();
  return live ?? snapshotCatalog();
}

/**
 * Minimal sanitiser for GHL's rich-text descriptions. The copy is first-party
 * (written in his own GHL), but a description is still HTML from a remote
 * system, so scripts, styles, event handlers and javascript: URLs are removed
 * before it is rendered. Everything structural (p, ul, strong, a, br) is kept.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "");
}
