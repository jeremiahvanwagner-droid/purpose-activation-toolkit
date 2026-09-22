import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/store/ProductCard";
import { Constellation } from "@/components/store/Glyph";
import { COMMUNITY_URL } from "@/lib/links";
import { faqPageSchema, type Faq } from "@/lib/seo";
import { STORE_URL, SUPPORT_EMAIL, storeBase, storeHref } from "@/lib/store/base";
import { formatPrice, getStore, type StoreData } from "@/lib/store/catalog";
import { SERIES_TITLE } from "@/lib/store/overlay";

export const metadata: Metadata = {
  title: "The Store — Truth J Blue",
  alternates: { canonical: STORE_URL },
};

/**
 * The questions people ask before they begin, answered in plain sentences.
 *
 * Every page here was written to convert, which left nothing for a search
 * engine or an AI assistant to quote when someone asks what the Audit is or
 * how delivery works. This block is that answer, and it is also rendered as
 * FAQPage schema from the same list, so the two can never drift.
 *
 * Each answer restates something already published — a product page, the
 * Audit itself, or /legal — with the live GHL price where one is named.
 * Nothing here may promise what the store does not sell. Voice as everywhere
 * in the store: calm, invitational, no urgency, nothing asserted about the
 * reader.
 */
function storeFaq(store: StoreData): Faq[] {
  const audit = store.bySlug("inner-alignment-audit");
  const toolkit = store.items.find((i) => i.meta.featured) ?? null;
  const auditPrice = audit?.amount != null ? `, ${formatPrice(audit.amount)},` : "";
  const toolkitPrice = toolkit?.amount != null ? `${formatPrice(toolkit.amount)} once, ` : "";

  return [
    {
      q: "Where should I begin?",
      a: "Most people begin with the Inner Alignment Audit or the Purpose Activation Toolkit. The Audit shows you where you stand; the Toolkit walks you forward. Begin with one and grow into the other.",
    },
    {
      q: "What is the Inner Alignment Audit?",
      a: `Twenty-eight honest statements across four domains of alignment — Spiritual Perception, Emotional Regulation, Identity Integration, and Life Structure — with clear scoring that shows where you're aligned, where there's drift, and the best place to begin. A free version is at truthjblue.com/audit. The store edition${auditPrice} adds a focused follow-up call to integrate what you find.`,
    },
    {
      q: "What is the Purpose Activation Toolkit?",
      a: `An interactive, faith-first digital workbook in four modules that turn spiritual clarity into daily, aligned action. Every answer saves as you write it, your work follows you to any device, and the finished workbook is yours for life — ${toolkitPrice}no subscription.`,
    },
    {
      q: "How do checkout and delivery work?",
      a: `Checkout is secure, on HighLevel, our payments platform, and no account is needed. Your access details arrive by email right after purchase. The Toolkit and the Audit open at truthjblue.com when you sign in with the email you used at checkout.`,
    },
    {
      q: "How do the programs and one-to-one work begin?",
      a: "With a conversation. The Beyond the Veil Mentorship runs twelve weeks and begins with an interview. The Ascension Intensive runs six weeks, by application, with a payment plan available. A Deep Dive Call with Jeremiah is thirty minutes, booked from the calendar and paid as you book.",
    },
    {
      q: "Can I return a digital product?",
      a: `Digital products — the Toolkit, the Audit, the Divine Alignment Blueprint, courses, and eBooks — are not returnable, because access is granted the moment you purchase. If an order is wrong or a purchase never reaches you, write to ${SUPPORT_EMAIL} and we will make it right at no cost to you. The full policy is at truthjblue.com/legal.`,
    },
    {
      q: "Who is Truth J Blue?",
      a: "Truth J Blue LLC is the company founded by Jeremiah Van Wagner — author of 23 books, founder of Divine Path Walkers and the Beyond the Veil mentorship, and founder of the nonprofit Inspire Build Motivate. Everything here is faith-first and built to be lived, not just read.",
    },
  ];
}

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
  const base = await storeBase();
  const store = await getStore();
  const start = store.inCollection("start-here");
  const courses = store.inCollection("courses-workbooks");
  const programs = store.inCollection("programs-mentorship");
  const work = store.inCollection("work-with-jeremiah");
  const toolkit = start.find((i) => i.meta.featured);
  const faq = storeFaq(store);

  return (
    <>
      <JsonLd data={faqPageSchema(faq)} />
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

      <section id="questions" className="st-section st-section-alt" aria-labelledby="st-faq-title">
        <div className="st-container">
          <div className="st-head">
            <div>
              <div className="st-kicker">Good to know</div>
              <h2 id="st-faq-title" className="st-h2">
                Questions, answered.
              </h2>
              <p className="st-blurb">
                The short version of what people ask before they begin. A person answers the rest at {SUPPORT_EMAIL}.
              </p>
            </div>
          </div>
          <div className="st-faq">
            {faq.map(({ q, a }) => (
              <details key={q} className="st-faq-item">
                <summary className="st-faq-q">{q}</summary>
                <p className="st-faq-a">{a}</p>
              </details>
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
