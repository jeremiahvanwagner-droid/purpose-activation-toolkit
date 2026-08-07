"use client";

/**
 * The "$247 Toolkit" button.
 *
 * Exists so the two surfaces that sell the Toolkit — the marketing landing and
 * the paywall — report InitiateCheckout identically and can't drift apart, the
 * same reason the URL itself lives in lib/links.
 *
 * Checkout completes off-site on the GHL payment link, so this is the last
 * moment this app can observe. The matching Purchase has to come from GHL or
 * from the Conversions API in /api/entitlement-sync, which already sees the
 * payment record.
 */

import { CHECKOUT_URL, TOOLKIT_PAYMENT_LINK_ID } from "@/lib/links";
import { CURRENCY, TOOLKIT_PRICE, track } from "@/lib/metaPixel";

export default function CheckoutLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className={className}
      href={CHECKOUT_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        track("InitiateCheckout", {
          content_name: "Purpose Activation Toolkit",
          content_ids: [TOOLKIT_PAYMENT_LINK_ID],
          content_type: "product",
          value: TOOLKIT_PRICE,
          currency: CURRENCY,
        })
      }
    >
      {children}
    </a>
  );
}
