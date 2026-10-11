import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import JsonLd from "@/components/JsonLd";
import PrintBookCard from "@/components/store/PrintBookCard";
import { STORE_URL, SUPPORT_EMAIL, storeBase, storeHref } from "@/lib/store/base";
import { PRINT_COLLECTION_TITLE, PRINT_STEPS, printBookUrl, publishedPrintBooks } from "@/lib/store/lulu-books";
import { LULU_SCRIPT_ID, LULU_SCRIPT_SRC } from "@/lib/store/lulu-script";
import { COLLECTIONS } from "@/lib/store/overlay";

/**
 * The print shelf: every paperback sold through Lulu, each linking to its own
 * page. A static segment, so it wins over [collection] for "/books" — and on
 * www, where "/books" is the brand site's page, this lives at /store/books.
 *
 * Nothing is asked of a reader before they can see a book or buy one: no
 * Audit, no sign-in, no email.
 */
const DESCRIPTION =
  "Paperback books by Jeremiah Van Wagner, printed to order and shipped by Lulu. Choose a title, see its price, and buy it without an account.";

export const metadata: Metadata = {
  title: PRINT_COLLECTION_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${STORE_URL}/books` },
};

export default async function PrintBooksPage() {
  const base = await storeBase();
  const books = publishedPrintBooks();

  return (
    <>
      {/* Lulu's script draws the cart a reader has already started. Without it
          here, someone who added a book and came back to the shelf would find
          no way into their cart until they opened another book. Same id as
          the one LuluPurchase loads, so it is only ever fetched once. */}
      {books.length ? <Script id={LULU_SCRIPT_ID} src={LULU_SCRIPT_SRC} strategy="afterInteractive" /> : null}
      {books.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: PRINT_COLLECTION_TITLE,
            url: `${STORE_URL}/books`,
            itemListElement: books.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.title,
              url: printBookUrl(b),
            })),
          }}
        />
      ) : null}
      <section className="st-section" style={{ paddingBottom: 0 }}>
        <div className="st-container">
          <nav className="st-crumbs" aria-label="Breadcrumb">
            <Link href={storeHref(base, "/")}>The Store</Link>
            <span aria-hidden="true">›</span>
            <b>{PRINT_COLLECTION_TITLE}</b>
          </nav>
          <div className="st-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="st-kicker">Truth J Blue · The Store</div>
              <h1 className="st-h2" style={{ fontSize: "clamp(2rem, 1.4rem + 2.4vw, 3.2rem)" }}>
                {PRINT_COLLECTION_TITLE}
              </h1>
              <p className="st-blurb">
                Paperbacks you can hold, mark, and return to. Each one is printed to order and shipped by Lulu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="st-section">
        <div className="st-container">
          {books.length ? (
            <div className="st-print-grid">
              {books.map((b) => (
                <PrintBookCard key={b.sku} book={b} base={base} />
              ))}
            </div>
          ) : (
            <p className="st-blurb">Nothing here just now — check back soon.</p>
          )}
        </div>
      </section>

      <section className="st-section st-section-alt">
        <div className="st-container">
          <div className="st-kicker">How printed books reach you</div>
          <ol className="st-steps" style={{ maxWidth: "64ch" }}>
            {PRINT_STEPS.map((s, i) => (
              <li key={i}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="st-buy-note" style={{ marginTop: 18 }}>
            For help with an order, contact Truth J Blue Books at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            Prefer to read on Kindle? <Link href={storeHref(base, "/library")}>The Library</Link> has the twelve-book
            Palace of Excellence series on Amazon.
          </p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-container">
          <div className="st-kicker">Keep exploring</div>
          <div className="st-cta-row">
            {COLLECTIONS.map((c) => (
              <Link key={c.key} className="st-btn st-btn-ghost" href={storeHref(base, `/${c.key}`)}>
                {c.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
