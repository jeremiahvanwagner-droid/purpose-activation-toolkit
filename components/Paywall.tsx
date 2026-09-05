"use client";

import Link from "next/link";
import AccountWidget from "@/components/AccountWidget";
import { PAT_PRODUCT_ID, useEntitlement } from "@/lib/entitlements";
import { CHECKOUT_URL, TOOLKIT_PAYMENT_LINK_ID } from "@/lib/links";
import { CURRENCY, TOOLKIT_PRICE, track } from "@/lib/metaPixel";

/**
 * What a paywall says about the thing it guards. The Toolkit is the default;
 * other paid products (the store's Audit) pass their own.
 */
export type PaywallProduct = {
  /** Entitlement product id — see lib/entitlements.ts. */
  id: string;
  eyebrow: string;
  signedOutTitle: string;
  unentitledTitle: string;
  signedOutLede: React.ReactNode;
  unentitledLede: React.ReactNode;
  /** The buy button: a HighLevel payment link. `contentId` is what the pixel
   *  reports, and is the same id the entitlement matcher keys on. */
  cta: { href: string; label: string; productName: string; amount: number; contentId: string };
  secondary?: { href: string; label: string };
  inclusions: string[];
  /** Where the magic link lands — the page being guarded. */
  signInRedirect: string;
};

export const TOOLKIT_PAYWALL: PaywallProduct = {
  id: PAT_PRODUCT_ID,
  eyebrow: "Purpose Activation Toolkit",
  signedOutTitle: "Sign in to continue your work.",
  unentitledTitle: "Unlock the full Toolkit.",
  signedOutLede: (
    <>
      The full Purpose Activation Toolkit — all four modules, your keepsake export, and cloud sync across every
      device — is <b>$247</b>, lifetime access. Already purchased? Sign in with the same email you used at
      checkout and your work will follow you.
    </>
  ),
  unentitledLede: (
    <>
      Everything you&apos;ve written so far is safe. The four modules and your keepsake export unlock the moment
      your purchase is on file. <b>$247</b> — lifetime access, one-time.
    </>
  ),
  cta: {
    href: CHECKOUT_URL,
    label: "Get the Toolkit — $247",
    productName: "Purpose Activation Toolkit",
    amount: TOOLKIT_PRICE,
    contentId: TOOLKIT_PAYMENT_LINK_ID,
  },
  secondary: { href: "/audit", label: "Or take the free Audit" },
  inclusions: [
    "All four interactive modules — Purpose Activation, Decision-Making, Alignment-to-Action, Execution Prompts",
    "The Inner Alignment Audit + your Alignment Profile",
    "The complete keepsake — every answer, signed covenants, printable PDF",
    "Cross-device sync — start on your phone, continue on your laptop",
    "Lifetime access — no subscription, no renewal",
  ],
  signInRedirect: "/toolkit",
};

/**
 * Wraps a paid route. Signed-out users see a warm sign-in prompt; signed-in
 * users without an entitlement see the unlock screen with the buy button.
 * Entitled users pass through untouched.
 *
 * Client-side check — good enough for a $247 workbook. If we ever need
 * server-enforced access, migrate to Next.js middleware + a server-verified
 * Supabase session.
 */
export default function Paywall({
  children,
  product = TOOLKIT_PAYWALL,
}: {
  children: React.ReactNode;
  product?: PaywallProduct;
}) {
  const ent = useEntitlement(product.id);

  if (ent.state === "entitled") return <>{children}</>;

  if (ent.state === "loading") {
    return (
      <div className="canvas-inner">
        <div className="paywall-loading">Loading your access…</div>
      </div>
    );
  }

  const isSignedOut = ent.state === "signed-out";
  const { cta } = product;

  return (
    <div className="canvas-inner">
      <div className="paywall">
        <div className="eyebrow">{product.eyebrow}</div>
        <h1 className="paywall-title">{isSignedOut ? product.signedOutTitle : product.unentitledTitle}</h1>
        <p className="paywall-lede">{isSignedOut ? product.signedOutLede : product.unentitledLede}</p>

        <div className="paywall-cta">
          <a
            className="btn gold"
            href={cta.href}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              track("InitiateCheckout", {
                content_name: cta.productName,
                content_ids: [cta.contentId],
                content_type: "product",
                value: cta.amount,
                currency: CURRENCY,
              })
            }
          >
            {cta.label}
          </a>
          {product.secondary ? (
            <Link className="btn ghost" href={product.secondary.href}>
              {product.secondary.label}
            </Link>
          ) : null}
        </div>

        {isSignedOut ? (
          <div className="paywall-signin">
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Already have access?
            </div>
            <AccountWidget redirectTo={product.signInRedirect} />
          </div>
        ) : (
          <p className="paywall-note">
            Signed in as <b>{ent.state === "unentitled" ? ent.email : ""}</b>. Purchases are matched to your
            email automatically — no code required. This page refreshes once your entitlement is on file
            (usually within a minute).
          </p>
        )}

        <div className="paywall-inclusions">
          <div className="paywall-inc-title">What&apos;s included</div>
          <ul>
            {product.inclusions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
