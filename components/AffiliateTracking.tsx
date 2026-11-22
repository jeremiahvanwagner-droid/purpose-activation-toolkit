"use client";

import Script from "next/script";
import {
  HL_AFFILIATE_BRANDED_URL,
  HL_AFFILIATE_COOKIE_DOMAIN,
  HL_AFFILIATE_LOCATION_ID,
  HL_AFFILIATE_SCRIPT_URL,
} from "@/lib/links";
import { shouldLoadAffiliateTracking } from "@/lib/affiliateTracking";

/**
 * Loads HighLevel's affiliate script once the flag is on and the request host
 * is www.truthjblue.com. Renders nothing otherwise. init is the snippet's
 * call, wrapped so a failed script cannot break the page.
 */
export default function AffiliateTracking({ host }: { host: string }) {
  if (!shouldLoadAffiliateTracking(host)) return null;

  return (
    <Script
      id="hl-affiliate-manager"
      src={HL_AFFILIATE_SCRIPT_URL}
      strategy="afterInteractive"
      onLoad={() => {
        try {
          const manager = (window as Window & {
            __hlAffiliateInited?: boolean;
            affiliateManager?: {
              init: (locationId: string, brandedUrl: string, domain: string) => void;
            };
          });
          if (manager.__hlAffiliateInited) return;
          manager.affiliateManager?.init(
            HL_AFFILIATE_LOCATION_ID,
            HL_AFFILIATE_BRANDED_URL,
            HL_AFFILIATE_COOKIE_DOMAIN,
          );
          manager.__hlAffiliateInited = true;
        } catch {
          /* Affiliate tracking must never break a page. */
        }
      }}
    />
  );
}
