"use client";

/**
 * The one action on a product page.
 *
 * Money never changes hands on this app: "Buy" opens the product's HighLevel
 * payment link, "Book" its HighLevel calendar, "Apply" its HighLevel form.
 * Each of those creates the contact, the order, and the tags that drive
 * follow-up — which is the whole reason checkout stays on HighLevel.
 *
 * This is the last moment the app can observe, so it reports the intent to
 * the Meta Pixel here: InitiateCheckout for purchases, Schedule for calls and
 * applications. Purchases themselves are recorded by HighLevel.
 */

import { CURRENCY, track } from "@/lib/metaPixel";
import { trackGoogleEcommerce } from "@/lib/ga4Ecommerce";

export type CheckoutAction =
  | { kind: "buy"; href: string; label: string }
  | { kind: "book"; href: string; label: string }
  | { kind: "apply"; href: string; label: string }
  | { kind: "pending"; label: string };

export default function CheckoutButton({
  action,
  productId,
  productName,
  category,
  amount,
  note,
  className = "st-btn st-btn-primary",
}: {
  action: CheckoutAction;
  productId: string;
  productName: string;
  category: string;
  amount: number | null;
  note?: string;
  className?: string;
}) {
  if (action.kind === "pending") {
    return (
      <span className={`${className} st-btn-disabled`} aria-disabled="true">
        {action.label}
        {note ? <span className="st-btn-note">{note}</span> : null}
      </span>
    );
  }

  const onClick = () => {
    const params = {
      content_name: productName,
      content_ids: [productId],
      content_type: "product",
      value: amount ?? undefined,
      currency: CURRENCY,
    };
    track(action.kind === "buy" ? "InitiateCheckout" : "Schedule", params);
    if (action.kind === "buy") {
      trackGoogleEcommerce("begin_checkout", {
        id: productId, name: productName, category, amount,
      });
    }
  };

  return (
    <a className={className} href={action.href} target="_blank" rel="noreferrer" onClick={onClick}>
      {action.label}
      {note ? <span className="st-btn-note">{note}</span> : null}
    </a>
  );
}
