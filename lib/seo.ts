/**
 * Structured data shared across the app.
 *
 * Two ids anchor everything a crawler is told about this business: the
 * company and its founder. They are the same ids the official entity page
 * (jeremiahvanwagner.com, 2026-08-28) and the brand pages vendored from
 * truthjblue-website declare, so every property describes one Organization
 * and one Person rather than several look-alikes. Any new page reuses these;
 * never mint a fresh @id for either.
 */
export const ORGANIZATION_ID = "https://truthjblue.com/#organization";
export const PERSON_ID = "https://jeremiahvanwagner.com/#person";

/** The founder, by reference. Enough for a validator to resolve the node on
 *  a page that does not carry the full Person. */
export const PERSON_REF = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Jeremiah Van Wagner",
} as const;

export type Faq = { q: string; a: string };

/**
 * FAQPage schema. Google requires the answers here to be the same text a
 * visitor can read on the page, so callers render the visible block and this
 * from one list — never two copies of the copy.
 */
export function faqPageSchema(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/**
 * JSON for a <script type="application/ld+json"> body. "<" is escaped so a
 * string that happens to contain "</script>" — a product description edited
 * in GHL, say — cannot close the tag early and run as markup.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
