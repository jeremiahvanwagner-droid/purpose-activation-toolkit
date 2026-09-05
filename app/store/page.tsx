import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { Constellation } from "@/components/store/Glyph";
import { COMMUNITY_URL } from "@/lib/links";
import { STORE_URL, storeBase, storeHref } from "@/lib/store/base";
import { getStore } from "@/lib/store/catalog";
import { SERIES_TITLE } from "@/lib/store/overlay";

export const metadata: Metadata = {
  title: "The Store — Truth J Blue",
  alternates: { canonical: STORE_URL },
};

function SectionHead({
  kicker,
  title,
  blurb,
  href,
  more,
}: {
  kicker: string;
  title: string;
  blurb: string;
  href: string;
  more: string;
}) {
  return (
    <div className="st-head">
      <div>
        <div className="st-kicker">{kicker}</div>
        <h2 className="st-h2">{title}</h2>
        <p className="st-blurb">{blurb}</p>
      </div>
      <Link className="st-more" href={href}>
        {more} →
      </Link>
    </div>
  );
}

export default async function StoreHome() {
  const base = storeBase();
  const store = await getStore();
  const start = store.inCollection("start-here");
  const courses = store.inCollection("courses-workbooks");
  const programs = store.inCollection("programs-mentorship");
  const work = store.inCollection("work-with-jeremiah");
  const toolkit = start.find((i) => i.meta.featured);

  return (
    <>
      <header className="st-hero">
        <div className="st-hero-inner">
          <div>
            <div className="st-eyebrow">Truth J Blue · The Store</div>
            <h1 className="st-h1">
              Everything we make for the walk, <em>in one place.</em>
            </h1>
            <p className="st-lede">
              Workbooks, courses, a twelve-book library, and the programs where we work together. Faith-first,
              and built to be lived — not just read.
            </p>
            <div className="st-cta-row">
              <a className="st-btn st-btn-primary" href="#start-here">
                Start here
                <span className="st-btn-note">Two places to begin</span>
              </a>
              {toolkit ? (
                <Link className="st-btn st-btn-ghost" href={storeHref(base, `/product/${toolkit.slug}`)}>
                  The Purpose Activation Toolkit
                  <span className="st-btn-note">The core offer · $247</span>
                </Link>
              ) : null}
            </div>
            <p className="st-hero-trust">
              <span>Secure checkout by HighLevel</span>
              <span>Digital delivery by email</span>
              <span>A person at support@truthjblue.com</span>
            </p>
          </div>
          <div className="st-hero-art" aria-hidden="true">
            <Constellation />
          </div>
        </div>
      </header>

      <section id="start-here" className="st-section">
        <div className="st-container">
          <SectionHead
            kicker="Start here"
            title="Two places to begin."
            blurb="The Audit shows you where you stand. The Toolkit walks you forward. Most people begin with one and grow into the other."
            href={storeHref(base, "/start-here")}
            more="About starting here"
          />
          <div className="st-grid st-grid-2">
            {start.map((item) => (
              <ProductCard key={item.id} item={item} base={base} ratio="wide" sizes="(max-width: 720px) 100vw, 50vw" />
            ))}
          </div>
        </div>
      </section>

      <section id="courses" className="st-section st-section-alt">
        <div className="st-container">
          <SectionHead
            kicker="Courses & workbooks"
            title="Work you can begin this week."
            blurb="Short, guided, and self-paced. Each one takes what the Audit reveals and turns it into practice."
            href={storeHref(base, "/courses-workbooks")}
            more="All courses"
          />
          <div className="st-grid">
            {courses.map((item) => (
              <ProductCard key={item.id} item={item} base={base} />
            ))}
          </div>
        </div>
      </section>

      <section id="programs" className="st-section">
        <div className="st-container">
          <SectionHead
            kicker="Programs & mentorship"
            title="Where we go deeper, together."
            blurb="Weeks, not minutes. A cohort, a mentor, and a path with a beginning and an end. Each one starts with a conversation."
            href={storeHref(base, "/programs-mentorship")}
            more="About the programs"
          />
          <div className="st-grid st-grid-2">
            {programs.map((item) => (
              <ProductCard key={item.id} item={item} base={base} ratio="wide" sizes="(max-width: 720px) 100vw, 50vw" />
            ))}
          </div>
        </div>
      </section>

      <section id="work-with-jeremiah" className="st-section st-section-alt">
        <div className="st-container">
          <SectionHead
            kicker="Work with Jeremiah"
            title="One-to-one, and in small rooms."
            blurb="From a single session on your Audit results to a year in the Mastermind. By conversation first, always."
            href={storeHref(base, "/work-with-jeremiah")}
            more="Ways to work together"
          />
          <div className="st-grid st-grid-4">
            {work.map((item) => (
              <ProductCard key={item.id} item={item} base={base} ratio="tall" sizes="(max-width: 720px) 100vw, 25vw" />
            ))}
          </div>
        </div>
      </section>

      <section id="library" className="st-section st-section-deep">
        <div className="st-container">
          <SectionHead
            kicker="The library"
            title={SERIES_TITLE}
            blurb="Twelve books, one path — from discovering your purpose to the legacy it leaves. Read them on Amazon."
            href={storeHref(base, "/library")}
            more="Browse the library"
          />
          <div className="st-books">
            {store.books.map((b) => (
              <a key={b.id} className="st-book" href={b.href} target="_blank" rel="noreferrer">
                <span className="st-book-cover">
                  {b.image ? (
                    <Image src={b.image} alt={`${SERIES_TITLE} — Book ${b.n}: ${b.title}`} fill sizes="(max-width: 720px) 33vw, 160px" style={{ objectFit: "cover" }} />
                  ) : null}
                </span>
                <span className="st-book-n">Book {b.n}</span>
                <span className="st-book-title">{b.title}</span>
                <span className="st-book-link">Read on Amazon ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="st-final">
        <div className="st-container">
          <div className="st-eyebrow">Not sure where to begin?</div>
          <h2 className="st-h2">Begin with the Toolkit, and walk with company.</h2>
          <p className="st-final-body">
            The Purpose Activation Toolkit is the path from wondering to walking. And you don&apos;t have to walk it
            alone — Divine Path Walkers is yours to try, free, for seven days.
          </p>
          <div className="st-cta-row">
            {toolkit ? (
              <Link className="st-btn st-btn-primary" href={storeHref(base, `/product/${toolkit.slug}`)}>
                Get the Toolkit
                <span className="st-btn-note">$247 · lifetime access</span>
              </Link>
            ) : null}
            <a className="st-btn st-btn-ghost" href={COMMUNITY_URL} target="_blank" rel="noreferrer">
              Try Divine Path Walkers
              <span className="st-btn-note">Free for 7 days</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
