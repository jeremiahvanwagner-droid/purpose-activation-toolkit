/** Pre-purchase ecommerce events for the existing Google tags. */
export const GA4_BRAND = "G-4TF57DLDBH";
export const GA4_STORE = "G-JP0HS6X4S8";

const STORE_HOSTS = new Set(["store.truthjblue.com", "shop.truthjblue.com"]);
const BRAND_HOSTS = new Set([
  "truthjblue.com", "www.truthjblue.com", "toolkit.truthjblue.com", "media.truthjblue.com",
]);

/** Match app/layout.tsx. Preview and local traffic do not get these events. */
export function ecommerceMeasurementId(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (STORE_HOSTS.has(host)) return GA4_STORE;
  return BRAND_HOSTS.has(host) ? GA4_BRAND : null;
}

/** Merchant Center uses the Toolkit's price/offer ID, not its GHL product ID. */
export function googleItemId(productId: string): string {
  return productId === "696d7f574f705f240b0875fd" ? "696d7f574f705f3755087612" : productId;
}

export type EcommerceProduct = {
  id: string;
  name: string;
  category: string;
  amount?: number | null;
};

export type EcommerceParams = {
  currency: "USD";
  value?: number;
  items: {
    item_id: string;
    item_name: string;
    item_brand: "Truth J Blue";
    item_category: string;
    price?: number;
    quantity: number;
  }[];
};

export function ecommerceParams(product: EcommerceProduct, quantity = 1): EcommerceParams | null {
  if (!product.id.trim() || !product.name.trim()) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return null;
  const priced = typeof product.amount === "number" && product.amount >= 0
    && Number.isSafeInteger(Math.round(product.amount * 100));
  const price = priced ? Math.round(product.amount! * 100) / 100 : undefined;
  return {
    currency: "USD",
    ...(price === undefined ? {} : { value: Math.round(price * quantity * 100) / 100 }),
    items: [{
      item_id: googleItemId(product.id),
      item_name: product.name,
      item_brand: "Truth J Blue",
      item_category: product.category,
      ...(price === undefined ? {} : { price }),
      quantity,
    }],
  };
}

/** A click, cart change, or completion message must never invent a purchase. */
export type PrePurchaseEvent = "view_item" | "add_to_cart" | "begin_checkout";
const EVENTS = new Set<string>(["view_item", "add_to_cart", "begin_checkout"]);
type GoogleWindow = Window & {
  gtag?: (command: "event", event: PrePurchaseEvent, params: EcommerceParams & { send_to: string }) => void;
};

/**
 * Use the already installed tag, waiting at most five seconds for its bootstrap.
 * Cancel on unmount; never load another tag, write identifiers, or block checkout.
 */
export function trackGoogleEcommerce(
  event: PrePurchaseEvent,
  product: EcommerceProduct,
  quantity = 1
): () => void {
  const params = ecommerceParams(product, quantity);
  if (typeof window === "undefined" || !EVENTS.has(event) || !params) return () => {};
  const target = ecommerceMeasurementId(window.location.hostname);
  if (!target) return () => {};
  const googleWindow = window as GoogleWindow;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout>;
  const send = () => {
    if (typeof googleWindow.gtag === "function") {
      try { googleWindow.gtag("event", event, { ...params, send_to: target }); } catch { /* analytics cannot break buying */ }
    } else if (++attempts < 20) {
      timer = setTimeout(send, 250);
    }
  };
  // Deferred so React's development mount/unmount does not double-count a view.
  timer = setTimeout(send, 0);
  return () => clearTimeout(timer);
}
