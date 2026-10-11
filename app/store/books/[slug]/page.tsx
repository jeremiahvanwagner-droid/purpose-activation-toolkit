import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import LuluPurchase from "@/components/store/LuluPurchase";
import PrintBookCard from "@/components/store/PrintBookCard";
import { SUPPORT_EMAIL, storeBase, storeHref } from "@/lib/store/base";
import {
  PRINT_COLLECTION_TITLE,
  PRINT_STEPS,
  coverUrl,
  formatMinor,
  isbn13Digits,
  printBookBreadcrumbs,
  printBookBySlug,
  printBookSchema,
  printBookUrl,
  publishedPrintBooks,
} from "@/lib/store/lulu-books";

/**
 * One print edition.
 *
 * The first screen answers four things: what the book is, which edition this
 * is, what it costs, and how to buy it. All of that is ordinary server HTML —
 * a crawler, a share preview and a reader whose browser blocks Lulu's script
 * all get the title, the cover, the price and a working checkout link.
 *
 * Unlike a HighLevel product page, this one sends no ViewContent and no
 * InitiateCheckout to the Meta Pixel. The purchase happens on Lulu, where this
 * app sees nothing, and a book's subject is not ours to report on a reader's
 * behalf. The sitewide PageView is the only thing these pages inherit.
 */

// Next 15 hands route params to the page as a promise.
type Params = { params: Promise<{ slug: string }> };

function summary(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const book = printBookBySlug((await params).slug);
  if (!book) return {};
  return {
    title: `${book.title} (${book.formatLabel})`,
    description: summary(book.description),
    alternates: { canonical: printBookUrl(book) },
    openGraph: {
      type: "book",
      title: `${book.title} — ${book.formatLabel}`,
      description: summary(book.description, 200),
      url: printBookUrl(book),
      images: [{ url: coverUrl(book), width: book.coverWidth, height: book.coverHeight, alt: `Cover of ${book.title}` }],
    },
  };
}

export default async function PrintBookPage({ params }: Params) {
  const book = printBookBySlug((await params).slug);
  if (!book) notFound();

  const base = await storeBase();
  const others = publishedPrintBooks()
    .filter((b) => b.sku !== book.sku)
    .slice(0, 4);
  const available = book.availability === "in_stock";
  const isbn = book.isbn13 ? isbn13Digits(book.isbn13) : null;

  return (
    <>
      <JsonLd data={printBookSchema(book)} />
      <JsonLd data={printBookBreadcrumbs(book)} />
      <div className="st-container">
        <nav className="st-crumbs" aria-label="Breadcrumb">
          <Link href={storeHref(base, "/")}>The Store</Link>
          <span aria-hidden="true">›</span>
          <Link href={storeHref(base, "/books")}>{PRINT_COLLECTION_TITLE}</Link>
          <span aria-hidden="true">›</span>
          <b>{book.title}</b>
        </nav>

        <article className="st-product st-print-product">
          <div className="st-print-art">
            <Image
              src={book.coverPath}
              alt={`Cover of ${book.title} by ${book.author}`}
              width={book.coverWidth}
              height={book.coverHeight}
              sizes="(max-width: 960px) 70vw, 384px"
              priority
            />
          </div>

          <div>
            <div className="st-product-kicker">{book.formatLabel} · printed to order</div>
            <h1 className="st-product-title">{book.title}</h1>
            <p className="st-product-tag">by {book.author}</p>

            <div className="st-buy">
              <div className="st-buy-price">
                <span className="st-price">{formatMinor(book.priceMinor)}</span>
                <span className="st-price-note">
                  {book.formatLabel} · shipping and tax are added at Lulu’s checkout
                </span>
              </div>
              {available ? (
                <>
                  <LuluPurchase buyButtonId={book.buyButtonId} title={book.title} />
                  <a className="st-lulu-direct" href={book.checkoutUrl} target="_blank" rel="noreferrer">
                    Open Lulu checkout <span aria-hidden="true">↗</span>
                    <span className="st-sr"> for {book.title} (opens in a new tab)</span>
                  </a>
                </>
              ) : (
                <p className="st-buy-note" role="status">
                  This edition is not available to order at the moment.
                </p>
              )}
              <p className="st-buy-note">
                Printed and shipped by Lulu. Shipping options and estimated delivery are shown at checkout. For help
                with your order, contact Truth J Blue Books at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
            </div>

            <div className="st-section-title">About this book</div>
            <div className="st-prose">
              <p>{book.description}</p>
            </div>

            <div className="st-section-title">This edition</div>
            <dl className="st-print-facts">
              <div>
                <dt>Format</dt>
                <dd>{book.formatLabel}</dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>{book.author}</dd>
              </div>
              {isbn ? (
                <div>
                  <dt>ISBN</dt>
                  <dd>{book.isbn13}</dd>
                </div>
              ) : null}
              <div>
                <dt>Sold by</dt>
                <dd>Truth J Blue Books, through Lulu</dd>
              </div>
            </dl>

            <div className="st-section-title">How it works</div>
            <ol className="st-steps">
              {PRINT_STEPS.map((s, i) => (
                <li key={i}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </div>

      {others.length ? (
        <section className="st-related">
          <div className="st-container">
            <div className="st-head">
              <div>
                <div className="st-kicker">Also in print</div>
                <h2 className="st-h2" style={{ fontSize: "1.5rem" }}>
                  More books in print
                </h2>
              </div>
              <Link className="st-more" href={storeHref(base, "/books")}>
                All {PRINT_COLLECTION_TITLE.toLowerCase()} →
              </Link>
            </div>
            <div className="st-print-grid">
              {others.map((b) => (
                <PrintBookCard key={b.sku} book={b} base={base} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
