"use client";

/**
 * Meta Pixel base code + PageView. Mounted once, in the root layout.
 *
 * The inline snippet sends the first PageView on hard load. App Router
 * client-side navigations never re-run it, so /audit → /toolkit would otherwise
 * register as a single page view for the whole session; the pathname effect
 * covers those. The ref guard is what stops the first render being counted
 * twice — once by the snippet, once by the effect's initial run.
 *
 * autoConfig is switched off before init. Meta's automatic configuration
 * installs click listeners that send every button's label to Meta as a
 * SubscribedButtonClick — on the Inner Alignment Audit that is the answer
 * text ("Rarely", "Often"...). The pixel is initialised once per session and
 * the Audit is usually reached by client-side navigation, so a per-route
 * switch would not cover it; the whole site runs with inferred events off.
 * Every event we want (PageView, ViewContent, Lead, Purchase, StartTrial)
 * is fired explicitly through lib/metaPixel.ts, so nothing intended is lost.
 * Decided by Axiom 2026-10-02 (Notion decision 3ed5dec117258135868ded6f34243dec).
 */

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, track } from "@/lib/metaPixel";

export default function MetaPixel() {
  const pathname = usePathname();
  const snippetAlreadySentOne = useRef(false);

  useEffect(() => {
    if (!snippetAlreadySentOne.current) {
      snippetAlreadySentOne.current = true;
      return;
    }
    track("PageView");
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      {/* The fallback beacon has to be injected as raw markup, not as JSX.
          Written as a child <img/>, React builds a real image node during
          hydration and the browser fetches it even though scripting is on —
          which double-counts PageView on every load (measured: two hits to
          /tr, one ev=PageView and one ev=PageView&noscript=1). Assigned as a
          string, the browser parses a noscript's content as inert text and
          only a genuinely script-less visitor ever requests it. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" />`,
        }}
      />
    </>
  );
}
