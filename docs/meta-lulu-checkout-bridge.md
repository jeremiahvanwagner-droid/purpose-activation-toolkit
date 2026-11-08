# Meta Shop checkout -> Lulu Direct: compatibility bridge

The 2026 Truth J Blue books catalog is **not** a WooCommerce store. The shop
retains catalog ID `2587898941296952` and ten published paperback retailer IDs.
Its USA checkout setting still points at a former WooCommerce URL that returned
404: `https://store.truthjblue.com/checkout-link/`.

## What the new URL does

A safe Vercel route at
`https://store.truthjblue.com/checkout-link` (trailing slash also resolves)
accepts Meta's standard `products=CONTENT_ID:QUANTITY,...` query parameter.
It maps only the ten currently published Meta book IDs to the authoritative
Lulu Buy Button IDs in `lib/store/lulu-books.data.json`, then issues a
temporary HTTP 307 redirect to Lulu's existing hosted checkout.

For example, if Meta passes:
`?products=901%3A2%2C1020%3A1`

The bridge constructs a Lulu URL for:
- 2 copies of **From Seeds to Success** (retailer ID `901`);
- 1 copy of **The Alchemy of Intention** (retailer ID `1020`).

Lulu's official **August 28, 2026** documentation confirms that its
Direct Checkout Links support `items=UUID:quantity&items=UUID` for multiple
products and quantities:
https://help.luludirect.lulu.com/en/support/solutions/articles/64000311968-can-the-direct-checkout-link-support-multiple-quantities-and-products-

Meta's external Shop checkout URL uses the form:
`?products=RETAILER_ID:QUANTITY,RETAILER_ID:QUANTITY`
(optionally with `coupon`), as documented by participating commerce platforms.

## Safeguards

- **No Printful restoration:** apparel, notebooks and retired bundle are excluded.
- **No hidden duplicate:** retired Alchemy ID `892` cannot be purchased.
- Only currently published, in-stock books in the reviewed Lulu manifest are eligible.
- Unknown IDs, invalid quantities, too many products, and malformed requests
  receive an explanation instead of the wrong cart.
- A non-empty `coupon` produces an explicit error. **Lulu Direct does not
  support Meta coupon redemption in this integration.** Do not enable Shop
  coupon checkout or advertise a coupon without a supported redemption system.
- A bare `/checkout-link` without Meta's `products` parameter displays
  a book-selection page instead of a 404; it does **not** falsely start an order.
- No payment is processed on Vercel; Lulu collects payment and handles tax,
  shipping and fulfillment. No artificial Meta Purchase events are emitted.
- No external URL supplied by the visitor is used as a redirect destination.
- Redirects are temporary (307), no-store and no-referrer.

## What the owner should check in Commerce Manager

1. Open the **Truth J Blue — Books in Print** catalog and the connected Shop.
2. Under Shop details / Checkout URL (labels vary), enter or confirm the URL
   `https://store.truthjblue.com/checkout-link` (without the trailing slash
   if possible). The old trailing-slash URL also canonicalizes to it.
3. Choose website checkout and tell Meta that product parameters are supported.
   Do **not** claim support for optional coupons.
4. Use Meta's **test checkout URL** preview, first with *From Seeds to Success*,
   then with a 2-book cart. Verify **exact editions, quantities, prices and
   Lulu checkout** before finalizing the Shop configuration.
5. Repeat from an actual Facebook or Instagram product tag. If Meta sends a
   different identifier from the existing numeric retailer ID, stop and
   review the preview URL; never guess a product or modify unrelated IDs.
6. Check that Meta accepts Lulu as the checkout destination. Meta may enforce
   additional domain/Shop eligibility validation beyond the application's
   routing. If the validation fails, record the exact message and do not
   claim approval.

The earlier shop inventory cleanup remains complete: 10 published paperbacks,
365 hidden/retired records. The old WooCommerce feeds have no schedules and
must not be reactivated.

## Engineering verification

`tests/meta-shop-checkout.test.ts` exercises exact item mapping, quantities,
mixed carts, discontinued SKUs, coupon rejection, no-products display and
safe redirect behavior. No test purchases anything.

The original link-monitor workflow continues independently to test the live
book pages and historical tag redirects.
