"use client";

import { useEffect } from "react";
import { ecommerceMeasurementId } from "@/lib/ga4Ecommerce";

type GtagWindow = Window & { gtag?: (command: "event", name: string, params: Record<string, string>) => void };

/**
 * Counts clicks out to Amazon from /recommended, so it can be seen which lists
 * and which picks people actually open.
 *
 * One GA4 event, affiliate_click, on the property app/layout.tsx already
 * installs for this host — never Meta, and never an ecommerce event: these are
 * not products this store sells, and counting them as select_item or
 * begin_checkout would put Amazon's catalogue into the store's own reports.
 * Like trackGoogleEcommerce, it sends nothing from preview or local hosts,
 * loads no tag of its own, and can never stop the link from opening.
 *
 * One listener for the whole page reads what each link carries in its data-
 * attributes (AmazonPickCard). auxclick covers a middle-click into a new tab.
 */
export default function AffiliateClicks() {
  useEffect(() => {
    const target = ecommerceMeasurementId(window.location.hostname);
    if (!target) return;
    const onClick = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const link = (e.target as Element | null)?.closest?.("a[data-affiliate]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const w = window as GtagWindow;
      if (typeof w.gtag !== "function") return;
      try {
        w.gtag("event", "affiliate_click", {
          send_to: target,
          retailer: link.dataset.affiliate ?? "",
          list_id: link.dataset.list ?? "",
          asin: link.dataset.asin ?? "",
          pick_name: link.dataset.name ?? "",
          link_url: link.href,
          transport_type: "beacon",
        });
      } catch {
        /* measurement must never get in the way of the click */
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);
  return null;
}
