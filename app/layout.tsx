import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import MetaPixel from "@/components/MetaPixel";
import SyncProvider from "@/components/SyncProvider";
import AttributionCapture from "@/components/AttributionCapture";
import { COMMUNITY_URL } from "@/lib/links";

const SITE_URL = "https://www.truthjblue.com";

/**
 * GA4, picked by hostname.
 *
 * One Vercel project answers on both truthjblue.com and store.truthjblue.com,
 * and each has its own GA4 property. A single hardcoded id would have pushed
 * every storefront session into the brand property and left the store's own
 * permanently empty, so the id is chosen from the request host. The store host
 * is rewritten onto /store by middleware, which preserves the Host header, so
 * this still reads the address the visitor actually typed.
 *
 * Deliberately PLAIN script tags, not next/script. next/script at
 * afterInteractive injects after hydration, so the tag never appears in the
 * server-rendered HTML — which is why MetaPixel is invisible to curl and why
 * "is analytics installed?" could not be answered by looking at the page. On
 * 2026-09-17 GA4 had been reporting "no data received" and nothing in this
 * repo referenced a measurement id at all. These tags render into the HTML, so
 * a plain fetch proves whether tracking is live.
 *
 * Ids are public by design; an env var would only add a way for this to
 * silently not ship again.
 */
const GA_BRAND = "G-4TF57DLDBH";
const GA_STORE = "G-JP0HS6X4S8";
const GA_STORE_HOSTS = new Set(["store.truthjblue.com", "shop.truthjblue.com"]);
const TITLE = "Truth J Blue LLC — Faith-First Purpose Activation Toolkit";
const DESCRIPTION =
  "From Truth J Blue LLC: an interactive, faith-first digital workbook to help you recognize your Divine design, align with your Higher Self in Christ, and walk in your purpose.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Truth J Blue",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * Organization schema, rendered on every page.
 *
 * On 2026-09-06 a search for the legal name returned growthbychoice.com and
 * GitHub as Google's sources for this business. Nothing on this domain said
 * "Truth J Blue LLC is a company, and these are its products" in a form a
 * crawler reads. This is that statement, with the profiles Google should
 * merge into the same entity.
 *
 * sameAs mirrors src/data/site.ts in the Astro repo (truthjblue-website);
 * change both when a profile changes. No postal address by design. Phone and
 * email are the ones published on the Business Profile.
 */
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  // Same @id, name and url as the graph on jeremiahvanwagner.com — the
  // official entity page (2026-08-28) — so Google merges the two into one
  // Organization instead of seeing a second one on the www host.
  "@id": "https://truthjblue.com/#organization",
  name: "Truth J Blue LLC",
  alternateName: "Truth J Blue",
  legalName: "Truth J Blue LLC",
  url: "https://truthjblue.com",
  email: "support@truthjblue.com",
  telephone: "+1-877-779-3107",
  founder: {
    "@type": "Person",
    "@id": "https://jeremiahvanwagner.com/#person",
    name: "Jeremiah Van Wagner",
    url: "https://jeremiahvanwagner.com/",
    sameAs: ["https://www.linkedin.com/in/vanwagnerjeremiah/"],
  },
  sameAs: [
    "https://facebook.com/TruthjBlue",
    "https://instagram.com/TruthjBlue",
    "https://www.tiktok.com/@TruthjBlue",
    "https://youtube.com/@TruthjBlue",
    "https://x.com/TruthjBlue",
    COMMUNITY_URL,
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "")
    .toLowerCase()
    .split(":")[0];
  const gaId = GA_STORE_HOSTS.has(host) ? GA_STORE : GA_BRAND;

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
        />
        <MetaPixel />
        <SyncProvider />
        <AttributionCapture />
        {children}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
        <script
          id="ga4-init"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`,
          }}
        />
      </body>
    </html>
  );
}
