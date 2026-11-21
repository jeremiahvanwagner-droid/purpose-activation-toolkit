import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import JsonLd from "@/components/JsonLd";
import AffiliateClicks from "@/components/store/AffiliateClicks";
import AmazonPickCard from "@/components/store/AmazonPickCard";
import { faqPageSchema, type Faq } from "@/lib/seo";
import { STORE_URL, SUPPORT_EMAIL, storeBase, storeHref } from "@/lib/store/base";
import {
  AMAZON_DISCLOSURE,
  AMAZON_DISCLOSURE_PLAIN,
  AMAZON_PICKS,
  OWN_BOOKS_NOTE,
  amazonListUrl,
  amazonProductUrl,
  amazonStorefrontUrl,
  distinctPickCount,
  formatVerified,
  shownLists,
} from "@/lib/store/amazon-picks";

/**
 * Recommended: the Amazon storefront's idea lists, inside the store.
 *
 * A static segment, so it wins over [collection] for "/recommended" — on the
 * store host that is store.truthjblue.com/recommended, and on www it is
 * /store/recommended, canonical to the store host like every store page.
 *
 * Everything here is sold by Amazon. The page's job is to let a reader find a
 * good companion for the walk, say plainly that the links earn a commission,
 * and then point back to what Truth J Blue makes: the series, the Toolkit,
 * the books in print. lib/store/amazon-picks.ts has the rules the Associates
 * agreement sets and how each is met.
 */
const DESCRIPTION =
  "Christ-centered books and simple tools for Scripture, prayer, focused work and everyday service, gathered by Truth J Blue. Each one opens on Amazon.";

const CANONICAL = `${STORE_URL}/recommended`;
/** Live document title (page title + store layout template). Used as image alt. */
const SHARE_TITLE = "Recommended Books & Tools — Truth J Blue Store";
const SHARE_IMAGE = {
  url: `${STORE_URL}/og/recommended-1200x630.jpg`,
  width: 1200,
  height: 630,
  alt: SHARE_TITLE,
};

export const metadata: Metadata = {
  title: "Recommended Books & Tools",
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "Truth J Blue Store",
    type: "website",
    url: CANONICAL,
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

/** The four covers on the hero shelf. Any that leaves the storefront simply drops out. */
const SHELF_ASINS = ["0310347556", "1433562014", "1433592304", "0830846948"];

/** The Toolkit's journaling decks follow the list that is all journals. */
const BRIDGE_AFTER = "prayer-journals";

const FAQ: Faq[] = [
  {
    q: "Do you earn from these links?",
    a: `Yes. ${AMAZON_DISCLOSURE} If you buy through a link here, Truth J Blue may earn a small commission, and the price you pay is the same. The Palace of Excellence books are Jeremiah Van Wagner’s own; he earns author royalties on them.`,
  },
  {
    q: "Why aren’t prices shown?",
    a: "Amazon sets prices and changes them often. Rather than show a number here that may already be out of date, each link opens the product on Amazon, where the current price, delivery and any offer are shown.",
  },
  {
    q: "Who handles my order?",
    a: `Amazon does. Payment, delivery and any return are between you and Amazon, under Amazon’s policies. For anything bought from the Truth J Blue store itself, write to ${SUPPORT_EMAIL}.`,
  },
  {
    q: "How are these chosen?",
    a: "Each list gathers books and tools around one part of the walk: purpose and service, Scripture, prayer, daily rhythm, the mind, and leadership. They are companions for a practice, not a promise of results — start with what you already own.",
  },
];

export default async function RecommendedPage() {
  const base = await storeBase();
  const lists = shownLists(new Date());
  const curated = lists.filter((l) => !l.own);
  const picks = distinctPickCount(lists);
  const shelf = SHELF_ASINS.map((asin) => lists.flatMap((l) => l.shown).find((i) => i.asin === asin)).filter(
    (i): i is NonNullable<typeof i> => Boolean(i)
  );
  // Curated lists alternate parchment and surface; the series band is its own
  // colour. The questions take the next shade in turn, so the last list and
  // the questions never run together — whether or not the holiday list shows.
  let shade = 0;

  return (
    <>
      <JsonLd data={faqPageSchema(FAQ)} />
      <AffiliateClicks />

      <header className="st-hero st-hero-rec">
        <div className="st-hero-inner">
          <div>
            <div className="st-eyebrow">Truth J Blue · Recommended</div>
            <h1 className="st-h1">
              Companions for the walk, <em>chosen with care.</em>
            </h1>
            <p className="st-lede">
              Books and simple tools for Scripture, prayer, focused work and everyday service. Each one opens on
              Amazon, where you’ll see today’s price and delivery.
            </p>
            <p className="st-verse">
              “Your word is a lamp to my feet and a light to my path.” <cite>Psalm 119:105</cite>
            </p>
            <div className="st-cta-row">
              <a className="st-btn st-btn-primary" href="#lists">
                Browse the lists
                <span className="st-btn-note">
                  {curated.length} lists · {picks} picks
                </span>
              </a>
              <a
                className="st-btn st-btn-ghost"
                href={amazonStorefrontUrl()}
                target="_blank"
                rel="sponsored noopener"
                data-affiliate="amazon"
                data-list="storefront"
                data-name="Storefront"
              >
                Our storefront on Amazon ↗<span className="st-btn-note">Every list in one place</span>
              </a>
            </div>
            <p className="st-disclose">
              <b>{AMAZON_DISCLOSURE}</b> {AMAZON_DISCLOSURE_PLAIN}
            </p>
          </div>
          {shelf.length === SHELF_ASINS.length ? (
            <div className="st-shelf" aria-label="From the lists">
              {shelf.map((p) => (
                <a
                  key={p.asin}
                  href={amazonProductUrl(p.asin)}
                  target="_blank"
                  rel="sponsored noopener"
                  data-affiliate="amazon"
                  data-list="hero"
                  data-asin={p.asin}
                  data-name={p.name}
                >
                  <img src={p.image} alt={`${p.name} by ${p.byline}, on Amazon`} decoding="async" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <nav id="lists" className="st-chips-wrap" aria-label="Lists on this page">
        <div className="st-container st-chips">
          <span className="st-chips-label">The lists</span>
          {lists.map((l) => (
            <a key={l.id} className="st-chip" href={`#${l.slug}`}>
              {l.title}
            </a>
          ))}
        </div>
      </nav>

      {lists.map((l) => {
        if (l.own) {
          return (
            <section key={l.id} id={l.slug} className="st-section st-section-deep st-rec-list">
              <div className="st-container">
                <div className="st-head">
                  <div>
                    <div className="st-kicker">
                      {l.kicker} · {l.shown.length} books
                    </div>
                    <h2 className="st-h2">{l.title}</h2>
                    <p className="st-blurb">{l.description}</p>
                    <p className="st-buy-note" style={{ marginTop: 12 }}>
                      {OWN_BOOKS_NOTE} More on the series in <Link href={storeHref(base, "/library")}>the Library</Link>.
                    </p>
                  </div>
                  <a
                    className="st-more"
                    href={amazonListUrl(l.id)}
                    target="_blank"
                    rel="sponsored noopener"
                    data-affiliate="amazon"
                    data-list={l.id}
                    data-name="List"
                  >
                    The series on Amazon ↗
                  </a>
                </div>
                <div className="st-books">
                  {l.shown.map((p) => (
                    <AmazonPickCard key={p.asin} pick={p} listId={l.id} variant="cover" />
                  ))}
                </div>
              </div>
            </section>
          );
        }
        const alt = shade++ % 2 === 1;
        return (
          <Fragment key={l.id}>
            <section id={l.slug} className={`st-section st-rec-list${alt ? " st-section-alt" : ""}`}>
              <div className="st-container">
                <div className="st-head">
                  <div>
                    <div className="st-kicker">
                      {l.kicker} · {l.shown.length} picks
                    </div>
                    <h2 className="st-h2">{l.title}</h2>
                    <p className="st-blurb">{l.description}</p>
                  </div>
                  <a
                    className="st-more"
                    href={amazonListUrl(l.id)}
                    target="_blank"
                    rel="sponsored noopener"
                    data-affiliate="amazon"
                    data-list={l.id}
                    data-name="List"
                  >
                    This list on Amazon ↗
                  </a>
                </div>
                <div className="st-picks">
                  {l.shown.map((p) => (
                    <AmazonPickCard key={p.asin} pick={p} listId={l.id} />
                  ))}
                </div>
              </div>
            </section>
            {l.slug === BRIDGE_AFTER ? (
              <aside className="st-band" aria-label="From the Truth J Blue store">
                <div className="st-container st-band-inner">
                  <div>
                    <div className="st-eyebrow" style={{ marginBottom: 10 }}>
                      From the Truth J Blue store
                    </div>
                    <p className="st-band-text">
                      Prefer a guided page to a blank one? The Purpose Activation Toolkit holds 69 journaling prompts in
                      six decks — purpose, identity, decisions, action, reflection and legacy — and saves every answer
                      as you write.
                    </p>
                  </div>
                  <Link className="st-btn st-btn-primary" href={storeHref(base, "/product/purpose-activation-toolkit")}>
                    See the Toolkit
                    <span className="st-btn-note">$247 · one-time</span>
                  </Link>
                </div>
              </aside>
            ) : null}
          </Fragment>
        );
      })}

      <section
        id="questions"
        className={`st-section${curated.length % 2 === 1 ? " st-section-alt" : ""}`}
        aria-labelledby="st-rec-faq-title"
      >
        <div className="st-container">
          <div className="st-head">
            <div>
              <div className="st-kicker">Good to know</div>
              <h2 id="st-rec-faq-title" className="st-h2">
                How these links work.
              </h2>
              <p className="st-blurb">
                Lists last checked against Amazon on {formatVerified(AMAZON_PICKS.verifiedAt)}.
              </p>
            </div>
          </div>
          <div className="st-faq">
            {FAQ.map(({ q, a }) => (
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
          <div className="st-eyebrow">Tools help. The walk is yours.</div>
          <h2 className="st-h2">When a reading list isn’t enough, begin the work.</h2>
          <p className="st-final-body">
            The Purpose Activation Toolkit is a faith-first workbook in four modules. You write in it, your answers
            save as you go, and the finished workbook is yours to keep. Our own paperbacks are on the Books in Print
            shelf, printed to order.
          </p>
          <div className="st-cta-row">
            <Link className="st-btn st-btn-primary" href={storeHref(base, "/product/purpose-activation-toolkit")}>
              Get the Toolkit
              <span className="st-btn-note">$247 · one-time</span>
            </Link>
            <Link className="st-btn st-btn-ghost" href={storeHref(base, "/books")}>
              Books in Print
              <span className="st-btn-note">Paperbacks by Jeremiah</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
