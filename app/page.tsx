import Link from "next/link";

/**
 * Marketing landing — the public face at "/".
 * The signed-in product surface lives under (app)/ with its own layout.
 */

function Glyph() {
  return (
    <svg className="mk-glyph" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 26 L18 9 L26 22 L33 13" strokeOpacity="0.55" />
      </g>
      <g fill="currentColor">
        <circle cx="8" cy="26" r="2.1" />
        <circle cx="18" cy="9" r="2.6" />
        <circle cx="26" cy="22" r="2.1" />
        <circle cx="33" cy="13" r="1.8" />
      </g>
      <circle cx="18" cy="9" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

const PILLARS = [
  {
    kicker: "Module 1",
    title: "Purpose Activation",
    body: "Discover the God-given design already knit into you. Rank your core values, map your six life domains, and craft a purpose statement that becomes the compass of the whole toolkit.",
  },
  {
    kicker: "Module 2",
    title: "Proper Decision-Making",
    body: "Trade reactive choices for stewardship. Walk any decision through the 7-Step Divine Decision Framework and a scored Values-Based Grid — with peace as the final arbiter.",
  },
  {
    kicker: "Module 3",
    title: "Alignment-to-Action",
    body: "Close the gap between what you know and what you live. Design your daily ritual, complete the 21-Day Alignment Challenge, and sign a 90-day covenant.",
  },
  {
    kicker: "Module 4",
    title: "Execution Prompts",
    body: "Sixty-nine prompts across six themed decks — Purpose, Identity, Decisions, Action, Reflection, Legacy. Your daily companion for aligned living.",
  },
];

const DIFF = [
  {
    title: "Interactive, not a PDF.",
    body: "Every exercise is fillable. Every answer saves the instant you write it. Nothing is lost, ever.",
  },
  {
    title: "Yours to keep.",
    body: "When you finish, export your completed workbook as a beautiful keepsake PDF you'll return to for years.",
  },
  {
    title: "Faith-first, unapologetically.",
    body: "This isn't self-help with a Christian veneer. It's stewardship of a Divine assignment, Scripture-grounded from the first page.",
  },
  {
    title: "Sync across every device.",
    body: "Start on your phone. Continue on your laptop. Sign in once with your email — your work follows you.",
  },
];

export default function Landing() {
  return (
    <div className="mk">
      {/* Top nav */}
      <nav className="mk-nav">
        <Link className="mk-brand" href="/">
          <Glyph />
          <span>
            <span className="mk-brand-name">TRUTH J BLUE</span>
            <span className="mk-brand-tag">Growth by Choice</span>
          </span>
        </Link>
        <div className="mk-nav-right">
          <Link href="/audit" className="mk-nav-link">Take the Audit</Link>
          <Link href="/toolkit" className="mk-nav-link">Enter the Toolkit</Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-eyebrow">Beyond the Veil · Truth J Blue</div>
          <h1 className="mk-h1">
            You weren't made to wonder about your purpose.
            <span className="mk-h1-accent"> You were made to walk in it.</span>
          </h1>
          <p className="mk-lede">
            An interactive, faith-first digital workbook that turns spiritual clarity into daily, aligned
            action — for Christians who love God but feel the gap between knowing and living.
          </p>
          <div className="mk-cta-row">
            <Link className="mk-btn mk-btn-primary" href="/audit">
              Take the free Inner Alignment Audit
              <span className="mk-btn-note">3 minutes · no email required</span>
            </Link>
            <a className="mk-btn mk-btn-ghost" href="#whats-inside">
              See what's inside
            </a>
          </div>
        </div>
      </header>

      {/* The problem */}
      <section className="mk-section mk-problem">
        <div className="mk-container mk-narrow">
          <div className="mk-eyebrow mk-eyebrow-c">The gap you already feel</div>
          <h2 className="mk-h2">You know what you're called to. You're just not consistently living it.</h2>
          <p className="mk-body">
            You've read the books. Listened to the sermons. Prayed the prayers. And still — somewhere between
            knowing and doing, the bridge collapses. Purpose feels heavy. Clarity comes in flashes, not
            rhythms. You suspect you were made for more than <i>this</i>, and you're right.
          </p>
          <p className="mk-body">
            This isn't a moral failing. It's a design gap. Insight without integration turns into fatigue.
            You don't need more information — you need <b>guided integration</b>, so your perception, emotions,
            identity, and daily structure can finally agree with what Heaven has been saying.
          </p>
        </div>
      </section>

      {/* The promise */}
      <section className="mk-section mk-promise">
        <div className="mk-container">
          <div className="mk-promise-grid">
            <div>
              <div className="mk-eyebrow mk-eyebrow-c">The promise</div>
              <h2 className="mk-h2">From drift to direction. From tension to testimony.</h2>
            </div>
            <div className="mk-promise-body">
              <p className="mk-body">
                The Purpose Activation Toolkit is the guided path from wondering to walking. Not another
                course to consume — a working workbook you complete once and revisit forever.
              </p>
              <p className="mk-body">
                Discover your design. Align your inner life with your Higher Self in Christ. Translate that
                alignment into visible, fruitful action across every domain of your life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's inside — the 4 modules */}
      <section id="whats-inside" className="mk-section mk-inside">
        <div className="mk-container">
          <div className="mk-eyebrow mk-eyebrow-c">What's inside</div>
          <h2 className="mk-h2 mk-center">Four interactive modules. One integrated journey.</h2>
          <div className="mk-pillars">
            {PILLARS.map((p) => (
              <article className="mk-pillar" key={p.title}>
                <div className="mk-pillar-kicker">{p.kicker}</div>
                <h3 className="mk-pillar-title">{p.title}</h3>
                <p className="mk-pillar-body">{p.body}</p>
              </article>
            ))}
          </div>
          <blockquote className="mk-scripture">
            “You are a Child of God, called according to His purpose, equipped with everything you need to
            fulfill your assignment. Now walk in it.”
            <cite>The Purpose Activation Framework</cite>
          </blockquote>
        </div>
      </section>

      {/* Why it's different */}
      <section className="mk-section mk-diff">
        <div className="mk-container mk-narrow">
          <div className="mk-eyebrow mk-eyebrow-c">Why this one</div>
          <h2 className="mk-h2">A workbook that actually works with you.</h2>
          <div className="mk-diff-grid">
            {DIFF.map((d) => (
              <div className="mk-diff-item" key={d.title}>
                <div className="mk-diff-mark" aria-hidden="true">
                  <Glyph />
                </div>
                <div>
                  <h4 className="mk-diff-title">{d.title}</h4>
                  <p className="mk-diff-body">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The journey */}
      <section className="mk-section mk-journey">
        <div className="mk-container mk-narrow">
          <div className="mk-eyebrow mk-eyebrow-c">The path</div>
          <h2 className="mk-h2">How it unfolds.</h2>
          <ol className="mk-steps">
            <li className="mk-step">
              <span className="mk-step-n">01</span>
              <div>
                <h3 className="mk-step-title">Take the free Inner Alignment Audit.</h3>
                <p className="mk-step-body">
                  Twenty-eight honest questions across four Alignment Domains — Spiritual Perception,
                  Emotional Regulation, Identity Integration, Life Structure. In minutes you'll see where
                  you're stable, where there's drift, and the one place to begin.
                </p>
              </div>
            </li>
            <li className="mk-step">
              <span className="mk-step-n">02</span>
              <div>
                <h3 className="mk-step-title">Enter the Toolkit.</h3>
                <p className="mk-step-body">
                  Move through the four modules at your own pace — teaching, exercise, reflection. Every
                  answer saves and follows you to any device.
                </p>
              </div>
            </li>
            <li className="mk-step">
              <span className="mk-step-n">03</span>
              <div>
                <h3 className="mk-step-title">Sign your covenants.</h3>
                <p className="mk-step-body">
                  A 30-day purpose plan. A Decision Covenant. A 90-day alignment commitment. Real name, real
                  signature, sealed in the app — kept in the keepsake.
                </p>
              </div>
            </li>
            <li className="mk-step">
              <span className="mk-step-n">04</span>
              <div>
                <h3 className="mk-step-title">Export your keepsake.</h3>
                <p className="mk-step-body">
                  When you finish, download your completed workbook as a beautifully typeset PDF — cover
                  page, Alignment Profile, all your answers, every signed commitment. Yours forever.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Primary CTA */}
      <section className="mk-section mk-final">
        <div className="mk-container mk-narrow mk-center">
          <div className="mk-eyebrow mk-eyebrow-c">Begin</div>
          <h2 className="mk-h2">
            Take the first step. The rest is a matter of walking.
          </h2>
          <p className="mk-body mk-final-body">
            Start with the free Inner Alignment Audit. Three minutes, no sign-up — and you'll know exactly
            where to begin. When you're ready to go deeper, the full four-module toolkit is <b>$247</b>.
          </p>
          <div className="mk-cta-row mk-center">
            <Link className="mk-btn mk-btn-primary" href="/audit">
              Take the free Audit
              <span className="mk-btn-note">Your first step ✦</span>
            </Link>
            <a
              className="mk-btn mk-btn-ghost"
              href="https://site.truthjblue.com/payment-link/696ec80453f21b434dfae38d"
              target="_blank"
              rel="noreferrer"
            >
              Get the Toolkit
              <span className="mk-btn-note">$247 · Lifetime access</span>
            </a>
          </div>
          <p className="mk-assist">
            Already have access?{" "}
            <Link href="/toolkit" style={{ color: "inherit", textDecoration: "underline" }}>
              Sign in to continue your work
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mk-foot">
        <div className="mk-container mk-foot-inner">
          <Link className="mk-brand" href="/">
            <Glyph />
            <span>
              <span className="mk-brand-name">TRUTH J BLUE</span>
              <span className="mk-brand-tag">Growth by Choice</span>
            </span>
          </Link>
          <div className="mk-foot-links">
            <Link href="/audit">Inner Alignment Audit</Link>
            <Link href="/toolkit">Enter the Toolkit</Link>
            <a href="https://beyondtheveil.support" target="_blank" rel="noreferrer">Beyond the Veil</a>
          </div>
          <p className="mk-foot-fine">
            © Truth J Blue LLC · Divine Path Walkers.
            <br />
            This toolkit is for educational purposes and is not a substitute for medical, psychological, or
            spiritual counsel.
          </p>
        </div>
      </footer>
    </div>
  );
}
