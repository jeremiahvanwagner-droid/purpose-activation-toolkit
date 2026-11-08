/**
 * Translates Meta Shop checkout requests into Lulu Direct carts.
 *
 * Meta appends ?products=RETAILER_ID:QTY,RETAILER_ID:QTY to the catalog's
 * website-checkout URL. Lulu supports ?items=BUY_BUTTON_UUID:QTY&items=...
 * for multi-book, multi-quantity carts (Lulu Direct documentation, 2026-08-28).
 *
 * ONLY the ten currently published paperback retailer IDs are accepted.
 * Historic Printful merchandise, notebooks, the old bundle and the hidden
 * duplicate Alchemy listing must not be checkout-eligible.
 *
 * Never accept a URL/host from untrusted input. Coupons are not supported by
 * Lulu's direct links, so reject rather than silently charge full price.
 */
import { publishedPrintBooks } from "./lulu-books";

export const META_BOOK_RETAILER_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  "881": "living-abundantly",
  "893": "emotional-alchemy",
  "894": "empower-yourself",
  "895": "empower-and-prosper",
  "897": "unlocking-success",
  "898": "mastering-mental-clarity",
  "899": "a-voyage-into-ancient-wisdom-and-inner-empowerment",
  "900": "we-are-without-excuse",
  "901": "from-seeds-to-success",
  "1020": "the-alchemy-of-intention",
});

export type MetaBookCartResult =
  | { kind: "ready"; checkoutUrl: string; itemCount: number; units: number }
  | { kind: "missing" | "invalid" | "unavailable" | "unsupported_coupon" };

const PRODUCT_TOKEN = /^(?:wc_post_id_)?([0-9]+):([1-9][0-9]?)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function resolveMetaBookCart(params: URLSearchParams): MetaBookCartResult {
  const supplied = params.getAll("products");
  if (supplied.length === 0 || (supplied.length === 1 && supplied[0] === "")) {
    return { kind: "missing" };
  }
  if (supplied.length !== 1 || supplied[0].length > 1200) {
    return { kind: "invalid" };
  }
  if ((params.get("coupon") ?? "").trim() !== "") {
    return { kind: "unsupported_coupon" };
  }

  const tokens = supplied[0].split(",");
  if (!tokens.length || tokens.length > 20) return { kind: "invalid" };
  const quantities = new Map<string, number>();
  let units = 0;

  for (const token of tokens) {
    const match = PRODUCT_TOKEN.exec(token.trim());
    if (!match) return { kind: "invalid" };
    const retailerId = match[1];
    const quantity = Number(match[2]);
    const slug = META_BOOK_RETAILER_SLUGS[retailerId];
    if (!slug) return { kind: "unavailable" };

    const subtotal = (quantities.get(retailerId) ?? 0) + quantity;
    units += quantity;
    if (subtotal > 99 || units > 100 || quantities.size >= 10 && !quantities.has(retailerId)) {
      return { kind: "invalid" };
    }
    quantities.set(retailerId, subtotal);
  }

  const published = new Map(publishedPrintBooks().map((book) => [book.slug, book]));
  const cartItems: string[] = [];

  for (const [retailerId, quantity] of quantities) {
    const slug = META_BOOK_RETAILER_SLUGS[retailerId];
    const book = published.get(slug);
    if (!book || book.availability !== "in_stock") return { kind: "unavailable" };

    // The manifest is validated elsewhere; enforce the Lulu endpoint boundary
    // here too so no catalogue field can become an open redirect.
    if (!UUID.test(book.buyButtonId) ||
        book.checkoutUrl !== "https://svc.lulu.com/?items=" + book.buyButtonId) {
      return { kind: "unavailable" };
    }
    cartItems.push("items=" + book.buyButtonId + (quantity === 1 ? "" : ":" + quantity));
  }

  return {
    kind: "ready",
    checkoutUrl: "https://svc.lulu.com/?" + cartItems.join("&"),
    itemCount: cartItems.length,
    units,
  };
}
