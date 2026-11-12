"use client";

/**
 * Meta Pixel catalog events for one printed-book page.
 *
 * Owner decision, 2026-11-10: Commerce Manager must receive ViewContent,
 * AddToCart and Purchase for the ten paperbacks so catalog
 * 2587898941296952 matches pixel 815130848255492. What each event means — and
 * the limits of what this page can see — is spelled out in
 * lib/store/meta-book-events.ts. In short: every event reports something that
 * actually happened on this page, with the catalog's own retailer IDs, and
 * nothing is inferred.
 *
 *   ViewContent  once, when the page mounts.
 *   AddToCart    when Lulu's own cart (announced on the document as
 *                `lulu-cart-changed`) gains one of our books, or when the
 *                reader follows the direct "Open Lulu checkout" link, which
 *                opens Lulu's cart holding this book.
 *   Purchase     when Lulu's checkout modal on this page posts
 *                CHECKOUT_COMPLETED from https://svc.lulu.com. Sent once per
 *                completion (eventID guards against a repeated message).
 *
 * Renders nothing. If the pixel or Lulu's script is blocked, nothing is sent
 * and the page works exactly as before.
 */

import { useEffect } from "react";
import { track, trackWhenReady } from "@/lib/metaPixel";
import { trackGoogleEcommerce } from "@/lib/ga4Ecommerce";
import {
  addToCartParams,
  cartAdditions,
  luluCheckoutCompleted,
  parseLuluCart,
  purchaseParams,
  viewContentParams,
  type BookEventItem,
  type LuluCartLine,
} from "@/lib/store/meta-book-events";

/** Where lulu-buy.js keeps its cart (same browser, every page of this site). */
const LULU_CART_KEY = "lulu-cart";
/** Remembers completions already reported in this tab. */
const SENT_KEY = "tjb-lulu-purchases-sent";

const googleProduct = (item: BookEventItem) => ({
  id: item.googleItemId, name: item.name, category: "Books in Print", amount: item.price,
});

function readStoredCart(): LuluCartLine[] {
  try {
    const raw = window.localStorage.getItem(LULU_CART_KEY);
    return raw ? parseLuluCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function alreadySent(id: string): boolean {
  try {
    const list: string[] = JSON.parse(window.sessionStorage.getItem(SENT_KEY) || "[]");
    if (list.includes(id)) return true;
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify([...list, id].slice(-20)));
  } catch {
    /* storage unavailable: fall through and send once for this page view */
  }
  return false;
}

export default function BookPixelEvents({
  book,
  catalog,
}: {
  /** This page's book. */
  book: BookEventItem;
  /** All ten books — a cart can hold any of them. */
  catalog: BookEventItem[];
}) {
  // ViewContent, once per page view. Deferred a tick so a mount that is
  // immediately torn down (React's development double-mount) sends nothing.
  useEffect(() => {
    let cancel: (() => void) | undefined;
    let cancelGoogle: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      cancel = trackWhenReady("ViewContent", viewContentParams(book));
      cancelGoogle = trackGoogleEcommerce("view_item", googleProduct(book));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancel?.();
      cancelGoogle?.();
    };
  }, [book]);

  useEffect(() => {
    // The cart as last seen; seeded from Lulu's storage so a book already in
    // the cart from an earlier page isn't counted again.
    let cart: LuluCartLine[] = readStoredCart();
    // The last non-empty cart, in case Lulu clears it before we read it.
    let lastFull: LuluCartLine[] = cart;
    const sentThisView = new Set<string>();

    const onCartChanged = (event: Event) => {
      const next = parseLuluCart((event as CustomEvent<{ cart?: unknown }>).detail?.cart);
      for (const { item, quantity } of cartAdditions(cart, next, catalog)) {
        track("AddToCart", addToCartParams(item, quantity));
        trackGoogleEcommerce("add_to_cart", googleProduct(item), quantity);
      }
      cart = next;
      if (next.length) lastFull = next;
    };

    const onMessage = (event: MessageEvent) => {
      const done = luluCheckoutCompleted(event.origin, event.data);
      if (!done) return;
      const eventID = `lulu:${done.buyButtonId}:${done.timestamp || Date.now()}`;
      if (sentThisView.has(eventID) || alreadySent(eventID)) return;
      sentThisView.add(eventID);
      const params = purchaseParams(cart.length ? cart : lastFull, catalog);
      if (params) track("Purchase", params, { eventID });
    };

    // The direct link opens Lulu's cart with this book already in it.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[data-lulu-direct]");
      if (!link) return;
      const item = catalog.find((b) => b.buyButtonId === link.getAttribute("data-lulu-direct"));
      if (item) {
        track("AddToCart", addToCartParams(item, 1));
        trackGoogleEcommerce("add_to_cart", googleProduct(item));
        trackGoogleEcommerce("begin_checkout", googleProduct(item));
      }
    };

    document.addEventListener("lulu-cart-changed", onCartChanged);
    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("lulu-cart-changed", onCartChanged);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, [catalog]);

  return null;
}
