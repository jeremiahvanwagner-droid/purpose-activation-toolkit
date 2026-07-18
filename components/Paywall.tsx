"use client";

import Link from "next/link";
import AccountWidget from "@/components/AccountWidget";
import { PAT_PRODUCT_ID, useEntitlement } from "@/lib/entitlements";

const CHECKOUT_URL = "https://site.truthjblue.com/payment-link/696ec80453f21b434dfae38d";

/**
 * Wraps a paid route. Signed-out users see a warm sign-in prompt; signed-in
 * users without an entitlement see the unlock screen with the buy button.
 * Entitled users pass through untouched.
 *
 * Client-side check — good enough for a $247 workbook. If we ever need
 * server-enforced access, migrate to Next.js middleware + a server-verified
 * Supabase session.
 */
export default function Paywall({ children }: { children: React.ReactNode }) {
  const ent = useEntitlement(PAT_PRODUCT_ID);

  if (ent.state === "entitled") return <>{children}</>;

  if (ent.state === "loading") {
    return (
      <div className="canvas-inner">
        <div className="paywall-loading">Loading your access…</div>
      </div>
    );
  }

  const isSignedOut = ent.state === "signed-out";

  return (
    <div className="canvas-inner">
      <div className="paywall">
        <div className="eyebrow">Purpose Activation Toolkit</div>
        <h1 className="paywall-title">
          {isSignedOut ? "Sign in to continue your work." : "Unlock the full Toolkit."}
        </h1>
        <p className="paywall-lede">
          {isSignedOut ? (
            <>
              The full Purpose Activation Toolkit — all four modules, your keepsake export, and cloud sync
              across every device — is <b>$247</b>, lifetime access. Already purchased? Sign in with the same
              email you used at checkout and your work will follow you.
            </>
          ) : (
            <>
              Everything you've written so far is safe. The four modules and your keepsake export unlock the
              moment your purchase is on file. <b>$247</b> — lifetime access, one-time.
            </>
          )}
        </p>

        <div className="paywall-cta">
          <a
            className="btn gold"
            href={CHECKOUT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Get the Toolkit — $247
          </a>
          <Link className="btn ghost" href="/audit">
            Or take the free Audit
          </Link>
        </div>

        {isSignedOut ? (
          <div className="paywall-signin">
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Already have access?
            </div>
            <AccountWidget />
          </div>
        ) : (
          <p className="paywall-note">
            Signed in as <b>{ent.state === "unentitled" ? ent.email : ""}</b>. Purchases are matched to your
            email automatically — no code required. This page refreshes once your entitlement is on file
            (usually within a minute).
          </p>
        )}

        <div className="paywall-inclusions">
          <div className="paywall-inc-title">What's included</div>
          <ul>
            <li>All four interactive modules — Purpose Activation, Decision-Making, Alignment-to-Action, Execution Prompts</li>
            <li>The Inner Alignment Audit + your Alignment Profile</li>
            <li>The complete keepsake — every answer, signed covenants, printable PDF</li>
            <li>Cross-device sync — start on your phone, continue on your laptop</li>
            <li>Lifetime access — no subscription, no renewal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
