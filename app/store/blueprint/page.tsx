"use client";

import Link from "next/link";
import Paywall, { type PaywallProduct } from "@/components/Paywall";
import {
  BANDS,
  BLUEPRINT_CLOSING,
  BLUEPRINT_DOMAIN_MAX,
  BLUEPRINT_META,
  buildBlueprint,
  inlineQuote,
} from "@/lib/content/alignmentBlueprint";
import { DAB_PRODUCT_ID } from "@/lib/entitlements";
import {
  BLUEPRINT_CHECKOUT_URL,
  BLUEPRINT_PAYMENT_LINK_ID,
  PAID_AUDIT_PATH,
  PAID_BLUEPRINT_PATH,
} from "@/lib/links";
import { useResponses } from "@/lib/store";

/**
 * The Divine Alignment Blueprint — delivered here, generated from the reader's
 * own Audit answers (see lib/content/alignmentBlueprint.ts).
 *
 * Gated by the same entitlement machinery as the Toolkit and the Audit, keyed
 * to the Blueprint's own HighLevel payment link. Their answers live in this
 * app already, so the document exists the moment they arrive — nothing to
 * write by hand, nothing to email, nothing to wait for.
 */
const BLUEPRINT_PAYWALL: PaywallProduct = {
  id: DAB_PRODUCT_ID,
  eyebrow: "Divine Alignment Blueprint",
  signedOutTitle: "Sign in to open your Blueprint.",
  unentitledTitle: "Unlock your Blueprint.",
  signedOutLede: (
    <>
      Your Blueprint reads the story behind your Inner Alignment Audit scores — what each domain is saying, the
      one place to begin, the habit quietly costing you most, and a seven-day path back into alignment. It is{" "}
      <b>$27</b>. Already purchased? Sign in with the same email you used at checkout.
    </>
  ),
  unentitledLede: (
    <>
      Your Blueprint is written from your own Audit answers, so it is ready the moment your purchase is on file.{" "}
      <b>$27</b>, one-time.
    </>
  ),
  cta: {
    href: BLUEPRINT_CHECKOUT_URL,
    label: "Get the Blueprint — $27",
    productName: "Divine Alignment Blueprint",
    amount: 27,
    contentId: BLUEPRINT_PAYMENT_LINK_ID,
  },
  secondary: { href: "/store/product/divine-alignment-blueprint", label: "About the Blueprint" },
  inclusions: [
    "Your four domain scores interpreted — what each one is actually reporting",
    "Your primary lever: the one place to begin, and why it comes first",
    "The strength already holding you steady, and how it carries the repair",
    "The single habit quietly costing you the most",
    "A seven-day realignment plan, small enough to keep",
    "Yours to return to, and to save as a PDF",
  ],
  signInRedirect: PAID_BLUEPRINT_PATH,
};

export default function BlueprintPage() {
  return (
    <Paywall product={BLUEPRINT_PAYWALL}>
      <Blueprint />
    </Paywall>
  );
}

function Blueprint() {
  const all = useResponses();
  const bp = buildBlueprint(all as Record<string, unknown>);

  // The Blueprint is written from a complete Audit. Until there is one, say so
  // plainly and send them to take it — rather than printing a hollow document.
  if (!bp) {
    return (
      <div className="canvas-inner">
        <header>
          <div className="eyebrow">Truth J Blue · Your Blueprint</div>
          <h1 className="page-title">{BLUEPRINT_META.title}</h1>
          <p className="lede">{BLUEPRINT_META.subtitle}</p>
        </header>
        <section className="card">
          <span className="tag">One step first</span>
          <h2>Your Blueprint is written from your Audit.</h2>
          <div className="body-copy">
            <p>
              It reads your four domain scores and tells you what they mean — so it needs a complete Audit to read.
              That takes a few minutes, and your answers save as you go.
            </p>
            <p>Finish it, come back here, and your Blueprint will be waiting.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            <Link className="btn gold" href={PAID_AUDIT_PATH}>
              Open your Audit
            </Link>
            <Link className="btn ghost" href="/audit">
              Or take the free Audit
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const dated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="canvas-inner bp">
      <header>
        <div className="eyebrow">Truth J Blue · Prepared {dated}</div>
        <h1 className="page-title">{BLUEPRINT_META.title}</h1>
        <p className="lede">{BLUEPRINT_META.subtitle}</p>
        <div className="bp-actions">
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </header>

      {/* At a glance */}
      <section className="card">
        <span className="tag">Where you stand</span>
        <h2>Your four domains</h2>
        <p className="hint">Each scored out of {BLUEPRINT_DOMAIN_MAX}. The lowest is not a failure — it is the place with the most to give back.</p>
        <div className="bp-scores">
          {bp.results.map((r) => (
            <div className={`bp-score band-${r.band}${r.key === bp.primaryLever.key ? " lever" : ""}`} key={r.key}>
              {r.key === bp.primaryLever.key ? <span className="bp-tag">Primary lever</span> : null}
              <div className="bp-score-name">{r.name}</div>
              <div className="bp-score-n">
                {r.total}
                <span>/{BLUEPRINT_DOMAIN_MAX}</span>
              </div>
              <div className="bp-score-band">{BANDS[r.band].label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Domain by domain */}
      <section className="card">
        <span className="tag">What each domain is saying</span>
        <h2>Your pattern, read closely</h2>
        {bp.readings.map((r) => (
          <div className="bp-reading" key={r.key}>
            <div className="bp-reading-head">
              <span className="bp-reading-name">{r.name}</span>
              <span className="bp-reading-meta">
                {r.total}/{BLUEPRINT_DOMAIN_MAX} · {BANDS[r.band].label}
              </span>
            </div>
            <p>{r.reading}</p>
          </div>
        ))}
      </section>

      {/* The lever */}
      <section className="card">
        <span className="tag">Begin here</span>
        <h2>{bp.primaryLever.name} is your primary lever</h2>
        <div className="body-copy">
          <p>
            It carries the most tension of the four, which means it is also where a small change pays the most.
            Repair usually travels outward from here: steady this, and the others get easier rather than
            competing for your attention.
          </p>
          <p className="bp-invitation">{bp.invitation}</p>
        </div>

        <div className="st-section-title" style={{ marginTop: 26 }}>The ground you&apos;re standing on</div>
        <div className="body-copy">
          <p>
            Your steadiest domain is <b>{bp.strongest.name}</b>, at {bp.strongest.total}/{BLUEPRINT_DOMAIN_MAX}.{" "}
            {bp.support}
          </p>
          <p>
            You marked <i>&ldquo;{inlineQuote(bp.holding.statement)}&rdquo;</i> as <b>{bp.holding.label.toLowerCase()}</b>. That is
            already holding. Build from it.
          </p>
        </div>

        <div className="st-section-title" style={{ marginTop: 26 }}>The quiet drain</div>
        <div className="body-copy">
          <p>
            Of all twenty-eight statements, one sits lowest: <i>&ldquo;{inlineQuote(bp.drain.statement)}&rdquo;</i> —{" "}
            <b>{bp.drain.label.toLowerCase()}</b>, in {bp.drain.domain}.
          </p>
          <p>
            Things at this level are rarely dramatic. They are normalised, which is exactly why they cost so much
            without ever announcing themselves. You are not being asked to fix it this week — only to see it.
          </p>
        </div>
      </section>

      {/* The plan */}
      <section className="card">
        <span className="tag">Turn it into action</span>
        <h2>Your seven days</h2>
        <p className="hint">Small and specific beats ambitious and vague. One week, then choose again.</p>
        <ol className="bp-plan">
          {bp.plan.map((d) => (
            <li key={d.day}>
              <span className="bp-day">Day {d.day}</span>
              <div>
                <div className="bp-day-title">{d.title}</div>
                <p>{d.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <span className="tag">A word to close</span>
        <div className="body-copy">
          <p>{BLUEPRINT_CLOSING}</p>
        </div>
        <p className="bp-sign">Truth J Blue</p>
      </section>

      <section className="card cta-card bp-hide-print">
        <span className="tag">Keep walking</span>
        <h2>When you&apos;re ready for the whole path</h2>
        <div className="body-copy">
          <p>
            The <b>Purpose Activation Toolkit</b> turns this week into a practice — four interactive modules that
            carry you from clarity into daily, aligned action.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <Link className="btn gold" href="/store/product/purpose-activation-toolkit">
            See the Toolkit
          </Link>
          <Link className="btn ghost" href={PAID_AUDIT_PATH}>
            Back to your Audit
          </Link>
        </div>
      </section>
    </div>
  );
}
