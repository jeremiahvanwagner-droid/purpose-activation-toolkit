import Link from "next/link";
import { Fragment } from "react";
import Glyph from "@/components/store/Glyph";
import { SITE_URL, storeHref } from "@/lib/store/base";
import { COLLECTIONS } from "@/lib/store/overlay";

export default function StoreNav({ base, current }: { base: string; current?: string }) {
  return (
    <nav className="st-nav" aria-label="Store">
      <Link className="st-brand" href={storeHref(base, "/")}>
        <Glyph />
        <span>
          <span className="st-brand-name">TRUTH J BLUE</span>
          <span className="st-brand-tag">The Store</span>
        </span>
      </Link>
      <div className="st-nav-links">
        {COLLECTIONS.map((c, i) => (
          <Fragment key={c.key}>
            <Link
              className="st-nav-link"
              href={storeHref(base, `/${c.key}`)}
              aria-current={current === c.key ? "page" : undefined}
            >
              {c.short}
            </Link>
            {/* The print shelf is not a HighLevel collection, so it is not in
                COLLECTIONS. It sits second, where a phone still shows it
                before the links scroll off the edge. */}
            {i === 0 ? (
              <Link className="st-nav-link" href={storeHref(base, "/books")} aria-current={current === "books" ? "page" : undefined}>
                Books
              </Link>
            ) : null}
          </Fragment>
        ))}
      </div>
      <a className="st-nav-cta" href={SITE_URL}>
        truthjblue.com
      </a>
    </nav>
  );
}
