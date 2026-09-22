/**
 * What the storefront's pages say about themselves to a crawler.
 *
 * Until 2026-09-21 every store page carried only the sitewide Organization,
 * so an AI engine asked "what does Truth J Blue sell, and for how much" had
 * nothing to quote. These blocks name each item, its price and who sells it,
 * in the vocabulary search engines and answer engines already read.
 */

import { ORGANIZATION_ID, PERSON_REF } from "@/lib/seo";
import { STORE_URL } from "./base";
import type { StoreBook, StoreItem } from "./catalog";
import { SERIES_TITLE } from "./overlay";

/**
 * Digital goods (checkout kind "buy") are Products. Sessions, programs and
 * mentorship are booked or applied for — the page sells a person's time, not
 * a file — so they are Services with the same Offer shape.
 *
 * The price is the GHL figure the page renders beside the button, so the
 * markup can never disagree with what a visitor sees. No Offer is emitted
 * when GHL gave no price or the checkout is still being connected, and
 * compareAt stays out of it, as it does everywhere in the store.
 */
export function productSchema(item: StoreItem) {
  const url = `${STORE_URL}/product/${item.slug}`;
  const kind = item.meta.checkout.kind;
  const isService = kind === "book" || kind === "apply";
  const offers =
    item.amount !== null && kind !== "pending"
      ? {
          "@type": "Offer",
          url,
          price: item.amount,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          seller: { "@id": ORGANIZATION_ID },
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": isService ? "Service" : "Product",
    "@id": `${url}#${isService ? "service" : "product"}`,
    name: item.name,
    description: item.meta.tagline,
    url,
    ...(item.image ? { image: item.image } : {}),
    ...(isService ? { provider: { "@id": ORGANIZATION_ID } } : { brand: { "@id": ORGANIZATION_ID } }),
    category: item.collection.title,
    ...(offers ? { offers } : {}),
  };
}

/** The twelve-book series on /library: one BookSeries, each Book a part of
 *  it, each pointing at its Amazon page — the only place they are sold. */
export function librarySchema(books: StoreBook[]) {
  const seriesId = `${STORE_URL}/library#series`;
  return {
    "@context": "https://schema.org",
    "@type": "BookSeries",
    "@id": seriesId,
    name: SERIES_TITLE,
    url: `${STORE_URL}/library`,
    author: PERSON_REF,
    hasPart: books.map((b) => ({
      "@type": "Book",
      name: b.title,
      position: b.n,
      author: PERSON_REF,
      url: b.href,
      ...(b.image ? { image: b.image } : {}),
      isPartOf: { "@id": seriesId },
    })),
  };
}
