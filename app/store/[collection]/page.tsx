import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/store/ProductCard";
import { STORE_URL, storeBase, storeHref } from "@/lib/store/base";
import { findCollection, getStore } from "@/lib/store/catalog";
import { COLLECTIONS, SERIES_TITLE } from "@/lib/store/overlay";

type Params = { params: { collection: string } };

export function generateMetadata({ params }: Params): Metadata {
  const c = findCollection(params.collection);
  if (!c) return {};
  return {
    title: c.title,
    description: c.seo,
    alternates: { canonical: `${STORE_URL}/${c.key}` },
  };
}

export default async function CollectionPage({ params }: Params) {
  const collection = findCollection(params.collection);
  if (!collection) notFound();

  const base = storeBase();
  const store = await getStore();
  const items = store.inCollection(collection.key);
  const ratio = collection.key === "work-with-jeremiah" ? "tall" : collection.key === "programs-mentorship" || collection.key === "start-here" ? "wide" : "std";
  const gridClass = ratio === "wide" ? "st-grid st-grid-2" : ratio === "tall" ? "st-grid st-grid-4" : "st-grid";
  const others = COLLECTIONS.filter((c) => c.key !== collection.key);

  return (
    <>
      <section className="st-section" style={{ paddingBottom: 0 }}>
        <div className="st-container">
          <nav className="st-crumbs" aria-label="Breadcrumb">
            <Link href={storeHref(base, "/")}>The Store</Link>
            <span aria-hidden="true">›</span>
            <b>{collection.title}</b>
          </nav>
          <div className="st-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="st-kicker">Truth J Blue · The Store</div>
              <h1 className="st-h2" style={{ fontSize: "clamp(2rem, 1.4rem + 2.4vw, 3.2rem)" }}>
                {collection.title}
              </h1>
              <p className="st-blurb">{collection.blurb}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="st-section">
        <div className="st-container">
          {collection.key === "library" ? (
            <div className="st-book-list">
              {store.books.map((b) => (
                <a key={b.id} className="st-book-row" href={b.href} target="_blank" rel="noreferrer">
                  <span className="st-book-cover">
                    {b.image ? (
                      <Image src={b.image} alt={`${SERIES_TITLE} — Book ${b.n}: ${b.title}`} fill sizes="110px" style={{ objectFit: "cover" }} />
                    ) : null}
                  </span>
                  <span>
                    <span className="st-book-n">Book {b.n}</span>
                    <span className="st-book-title" style={{ display: "block", fontSize: "1.15rem", marginTop: 4 }}>
                      {b.title}
                    </span>
                    <p dangerouslySetInnerHTML={{ __html: b.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().replace(/\s*Book \d+ of the twelve-book.*$/i, "") }} />
                    <span className="st-book-link">Read on Amazon ↗</span>
                  </span>
                </a>
              ))}
            </div>
          ) : items.length ? (
            <div className={gridClass}>
              {items.map((item) => (
                <ProductCard key={item.id} item={item} base={base} ratio={ratio} sizes={ratio === "wide" ? "(max-width: 720px) 100vw, 50vw" : "(max-width: 720px) 100vw, 33vw"} />
              ))}
            </div>
          ) : (
            <p className="st-blurb">Nothing here just now — check back soon.</p>
          )}
        </div>
      </section>

      <section className="st-section st-section-alt">
        <div className="st-container">
          <div className="st-kicker">Keep exploring</div>
          <div className="st-cta-row">
            {others.map((c) => (
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
