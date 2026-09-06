import type { Metadata } from "next";
import "./globals.css";
import MetaPixel from "@/components/MetaPixel";
import SyncProvider from "@/components/SyncProvider";
import { COMMUNITY_URL } from "@/lib/links";

const SITE_URL = "https://www.truthjblue.com";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
        />
        <MetaPixel />
        <SyncProvider />
        {children}
      </body>
    </html>
  );
}
