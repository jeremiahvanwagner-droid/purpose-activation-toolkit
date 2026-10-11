"use client";

/**
 * Lulu's own Buy Button for one print edition.
 *
 * The button, its cart and the checkout it opens are all Lulu's: this renders
 * the custom element from the embed code Lulu generated for the product and
 * loads Lulu's script, nothing more. Money never touches this app, and nothing
 * here reads the cart or guesses at what happened inside it.
 *
 * The script is loaded once per document (next/script de-duplicates on id), so
 * moving between book pages does not fetch it again; a custom element defined
 * once upgrades every later <lulu-buy-button> on its own. What this component
 * tracks is only whether that element exists yet:
 *
 *   loading      the script has not registered the element so far
 *   ready        the element is registered — Lulu's button takes it from here
 *   unavailable  the script failed, or never arrived (a blocker, a bad network)
 *
 * "ready" means Lulu's code is on the page, not that a price was shown or a
 * cart worked. And when it is "unavailable" the page still sells the book: the
 * checkout link under this component is plain HTML written by the server and
 * needs none of this.
 *
 * No Meta Pixel event is sent from here, on purpose. A click on Lulu's button
 * is not something this app can observe, and nothing here pretends otherwise.
 */

import Script from "next/script";
import { useEffect, useState } from "react";
import { LULU_SCRIPT_ID, LULU_SCRIPT_SRC } from "@/lib/store/lulu-script";

const ELEMENT = "lulu-buy-button";
/**
 * Which of Lulu's display modes to draw. The embed code Lulu generated for
 * these products says "product-showcase", which draws its own cover, title,
 * description and price around the button. The book page already shows all of
 * that as server HTML, so the showcase printed everything twice and pushed
 * "Add to Cart" below the first screen. "button-only" is the same Buy Button,
 * same id, same cart — just the button.
 */
const VARIANT = "button-only";
/** How long to wait for Lulu's script before saying so. It is never retried. */
const GIVE_UP_AFTER_MS = 8000;

type Phase = "loading" | "ready" | "unavailable";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "lulu-buy-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "buy-button-id": string;
        variant?: string;
      };
    }
  }
}

export default function LuluPurchase({ buyButtonId, title }: { buyButtonId: string; title: string }) {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let current = true;
    if (window.customElements.get(ELEMENT)) {
      setPhase("ready");
      return;
    }
    window.customElements.whenDefined(ELEMENT).then(() => {
      if (current) setPhase("ready");
    });
    const timer = window.setTimeout(() => {
      if (current) setPhase((p) => (p === "loading" ? "unavailable" : p));
    }, GIVE_UP_AFTER_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="st-lulu" data-phase={phase}>
      <Script
        id={LULU_SCRIPT_ID}
        src={LULU_SCRIPT_SRC}
        strategy="afterInteractive"
        onError={() => setPhase("unavailable")}
      />
      {phase === "unavailable" ? null : (
        <div className="st-lulu-widget" role="group" aria-label={`Buy ${title} through Lulu`}>
          <lulu-buy-button buy-button-id={buyButtonId} variant={VARIANT} />
        </div>
      )}
      <p className="st-buy-note st-lulu-status" role="status">
        {phase === "loading"
          ? "Loading Lulu’s cart…"
          : phase === "unavailable"
            ? "Lulu’s cart did not load in this browser. The checkout link below goes to the same book."
            : ""}
      </p>
    </div>
  );
}
