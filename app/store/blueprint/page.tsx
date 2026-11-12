"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Paywall, { type PaywallProduct } from "@/components/Paywall";
import { DAB_PRODUCT_ID, useEntitlement } from "@/lib/entitlements";
import {
  BLUEPRINT_CHECKOUT_URL,
  BLUEPRINT_PAYMENT_LINK_ID,
  PAID_AUDIT_PATH,
  PAID_BLUEPRINT_PATH,
} from "@/lib/links";
import { useResponses } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

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

type BlueprintDoc = {
  ready: boolean;
  title: string;
  subtitle: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyNext?: string;
  dated?: string;
  domainMax?: number;
  scoresHint?: string;
  scores?: { key: string; name: string; total: number; band: string; bandLabel: string; lever: boolean }[];
  readings?: { key: string; name: string; total: number; bandLabel: string; reading: string }[];
  leverTitle?: string;
  leverIntro?: string;
  invitation?: string;
  groundTitle?: string;
  groundBody?: string;
  holdingBody?: string;
  drainTitle?: string;
  drainBody?: string;
  drainNote?: string;
  planHint?: string;
  plan?: { day: number; title: string; body: string }[];
  closing?: string;
  pitch?: string;
};

export default function BlueprintPage() {
  const ent = useEntitlement(DAB_PRODUCT_ID);
  if (ent.state !== "entitled") return <Paywall product={BLUEPRINT_PAYWALL} />;
  return <Blueprint />;
}

function Blueprint() {
  const all = useResponses();
  const [doc, setDoc] = useState<BlueprintDoc | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return;
    let cancel = false;
    const timer = setTimeout(() => {
      void (async () => {
        const { data } = await supa.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/paid-content", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ productId: "divine-alignment-blueprint", view: "blueprint", answers: all }),
        });
        if (cancel) return;
        if (!res.ok) {
          setFailed(true);
          return;
        }
        const body = (await res.json()) as { blueprint?: BlueprintDoc };
        setFailed(false);
        if (body.blueprint) setDoc(body.blueprint);
      })();
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [all]);

  if (failed) {
    return (
      <div className="canvas-inner">
        <p>Your Blueprint didn’t load. Your answers are still saved. Try again in a moment.</p>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="canvas-inner">
        <div className="paywall-loading">Loading your Blueprint…</div>
      </div>
    );
  }
  if (!doc.ready) {
    return (
      <div className="canvas-inner">
        <header>
          <div className="eyebrow">Truth J Blue · Your Blueprint</div>
          <h1 className="page-title">{doc.title}</h1>
          <p className="lede">{doc.subtitle}</p>
        </header>
        <section className="card">
          <span className="tag">One step first</span>
          <h2>{doc.emptyTitle}</h2>
          <div className="body-copy">
            <p>{doc.emptyBody}</p>
            <p>{doc.emptyNext}</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            <Link className="btn gold" href={PAID_AUDIT_PATH}>
              Open your Audit
            </Link>
            <Link className="btn ghost" href="https://store.truthjblue.com/product/inner-alignment-audit">
              Or get the Audit — $97
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="canvas-inner bp">
      <header>
        <div className="eyebrow">Truth J Blue · Prepared {doc.dated}</div>
        <h1 className="page-title">{doc.title}</h1>
        <p className="lede">{doc.subtitle}</p>
        <div className="bp-actions">
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </header>
      <section className="card">
        <span className="tag">Where you stand</span>
        <h2>Your four domains</h2>
        <p className="hint">
          Each scored out of {doc.domainMax}. {doc.scoresHint}
        </p>
        <div className="bp-scores">
          {doc.scores?.map((r) => (
            <div className={`bp-score band-${r.band}${r.lever ? " lever" : ""}`} key={r.key}>
              {r.lever ? <span className="bp-tag">Primary lever</span> : null}
              <div className="bp-score-name">{r.name}</div>
              <div className="bp-score-n">
                {r.total}
                <span>/{doc.domainMax}</span>
              </div>
              <div className="bp-score-band">{r.bandLabel}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <span className="tag">What each domain is saying</span>
        <h2>Your pattern, read closely</h2>
        {doc.readings?.map((r) => (
          <div className="bp-reading" key={r.key}>
            <div className="bp-reading-head">
              <span className="bp-reading-name">{r.name}</span>
              <span className="bp-reading-meta">
                {r.total}/{doc.domainMax} · {r.bandLabel}
              </span>
            </div>
            <p>{r.reading}</p>
          </div>
        ))}
      </section>
      <section className="card">
        <span className="tag">Begin here</span>
        <h2>{doc.leverTitle}</h2>
        <div className="body-copy">
          <p>{doc.leverIntro}</p>
          <p className="bp-invitation">{doc.invitation}</p>
        </div>
        <div className="st-section-title" style={{ marginTop: 26 }}>
          {doc.groundTitle}
        </div>
        <div className="body-copy">
          <p>{doc.groundBody}</p>
          <p>{doc.holdingBody}</p>
        </div>
        <div className="st-section-title" style={{ marginTop: 26 }}>
          {doc.drainTitle}
        </div>
        <div className="body-copy">
          <p>{doc.drainBody}</p>
          <p>{doc.drainNote}</p>
        </div>
      </section>
      <section className="card">
        <span className="tag">Turn it into action</span>
        <h2>Your seven days</h2>
        <p className="hint">{doc.planHint}</p>
        <ol className="bp-plan">
          {doc.plan?.map((d) => (
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
          <p>{doc.closing}</p>
        </div>
        <p className="bp-sign">Truth J Blue</p>
      </section>
      <section className="card cta-card bp-hide-print">
        <span className="tag">Keep walking</span>
        <h2>When you&apos;re ready for the whole path</h2>
        <div className="body-copy">
          <p>{doc.pitch}</p>
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
