import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutButton from "@/components/store/CheckoutButton";
import ProductArt from "@/components/store/ProductArt";
import ProductCard from "@/components/store/ProductCard";
import { STORE_URL, storeBase, storeHref } from "@/lib/store/base";
import { formatPrice, getStore } from "@/lib/store/catalog";

type Params = { params: { slug: string } };

function plain(html: string, max = 160): string {
  const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const store = await getStore();
  const item = store.bySlug(params.slug);
  if (!item) return {};
  return {
    title: item.name,
    description: plain(item.meta.tagline),
    alternates: { canonical: `${STORE_URL}/product/${item.slug}` },
    openGraph: item.image ? { images: [{ url: item.image }] } : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const base = storeBase();
  const store = await getStore();
  const item = store.bySlug(params.slug);
  if (!item) notFound();

  const related = store.inCollection(item.collection.key).filter((i) => i.id !== item.id).slice(0, 3);
  const artRatio = item.art.kind === "photo" ? (item.collection.key === "work-with-jeremiah" ? "tall" : "wide") : "std";
  const priceLabel = formatPrice(item.amount);

  return (
    <>
      <div className="st-container">
        <nav className="st-crumbs" aria-label="Breadcrumb">
          <Link href={storeHref(base, "/")}>The Store</Link>
          <span aria-hidden="true">›</span>
          <Link href={storeHref(base, `/${item.collection.key}`)}>{item.collection.title}</Link>
          <span aria-hidden="true">›</span>
          <b>{item.name}</b>
        </nav>

        <article className="st-product">
          <div className={`st-product-art${artRatio === "std" ? "" : ` ${artRatio}`}`}>
            <ProductArt art={item.art} sizes="(max-width: 960px) 100vw, 50vw" priority />
          </div>

          <div>
            <div className="st-product-kicker">{item.meta.kicker}</div>
            <h1 className="st-product-title">{item.name}</h1>
            <p className="st-product-tag">{item.meta.tagline}</p>

            <div className="st-buy">
              <div className="st-buy-price">
                <span className="st-price">{priceLabel}</span>
                {item.meta.priceNote ? <span className="st-price-note">{item.meta.priceNote}</span> : null}
              </div>
              <CheckoutButton
                action={item.meta.checkout}
                productId={item.id}
                productName={item.name}
                amount={item.amount}
                note={item.meta.note}
              />
              {item.meta.access ? (
                <p className="st-buy-note">
                  Already purchased?{" "}
                  <a href={item.meta.access.href} style={{ color: "inherit", textDecoration: "underline" }}>
                    {item.meta.access.label}
                  </a>
                </p>
              ) : null}
              <p className="st-buy-note">
                {item.meta.checkout.kind === "buy"
                  ? "Opens our secure checkout on HighLevel. No account needed."
                  : item.meta.checkout.kind === "book"
                    ? "Opens the booking calendar in a new tab."
                    : item.meta.checkout.kind === "apply"
                      ? "Opens a short application in a new tab."
                      : "This item’s checkout is being connected. Check back shortly."}
              </p>
            </div>

            <div className="st-section-title">About</div>
            <div className="st-prose" dangerouslySetInnerHTML={{ __html: item.descriptionHtml }} />

            <div className="st-section-title">How it works</div>
            <ol className="st-steps">
              {item.meta.steps.map((s, i) => (
                <li key={i}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </div>

      {related.length ? (
        <section className="st-related">
          <div className="st-container">
            <div className="st-head">
              <div>
                <div className="st-kicker">Also in {item.collection.title}</div>
                <h2 className="st-h2" style={{ fontSize: "1.5rem" }}>
                  You might also consider
                </h2>
              </div>
              <Link className="st-more" href={storeHref(base, `/${item.collection.key}`)}>
                All of {item.collection.title} →
              </Link>
            </div>
            <div className="st-grid st-grid-fill">
              {related.map((r) => (
                <ProductCard key={r.id} item={r} base={base} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
