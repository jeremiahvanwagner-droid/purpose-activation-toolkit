import Link from "next/link";
import ProductArt from "@/components/store/ProductArt";
import { storeHref } from "@/lib/store/base";
import { actionWord, formatPrice, type StoreItem } from "@/lib/store/catalog";

/**
 * One product on a grid. The whole card is the link; the single call to
 * action lives on the product page, so a card only ever says the price and
 * how the thing is obtained.
 */
export default function ProductCard({
  item,
  base,
  ratio = "std",
  sizes = "(max-width: 720px) 100vw, 33vw",
}: {
  item: StoreItem;
  base: string;
  ratio?: "std" | "tall" | "wide";
  sizes?: string;
}) {
  const artClass = ratio === "std" ? "st-card-art" : `st-card-art ${ratio}`;
  return (
    <Link className={`st-card${item.meta.featured ? " featured" : ""}`} href={storeHref(base, `/product/${item.slug}`)}>
      <div className={artClass}>
        {item.meta.badge ? <span className="st-badge">{item.meta.badge}</span> : null}
        <ProductArt art={item.art} sizes={sizes} />
      </div>
      <div className="st-card-body">
        <span className="st-card-kicker">{item.meta.kicker}</span>
        <h3 className="st-card-title">{item.name}</h3>
        <p className="st-card-tag">{item.meta.tagline}</p>
        <div className="st-card-foot">
          <span className="st-price">{formatPrice(item.amount)}</span>
          <span className="st-card-cta">{actionWord(item)} →</span>
          {item.meta.priceNote ? <span className="st-price-note">{item.meta.priceNote}</span> : null}
        </div>
      </div>
    </Link>
  );
}
