"use client";

import Link from "next/link";
import { MODULES, useAllModuleProgress } from "@/lib/modules";

export default function Home() {
  const progress = useAllModuleProgress();
  const m1 = progress["purpose-activation"];
  const started = m1.done > 0;

  return (
    <div className="canvas-inner">
      <div className="eyebrow">Truth J Blue · Growth by Choice</div>
      <h1 className="page-title">Your purpose, activated.</h1>
      <p className="lede">
        A guided, four-part journey from wondering about your purpose to walking in it —
        Spirit-led, saved as you go, and yours to keep.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "22px 0 30px" }}>
        <Link className="btn gold" href="/module/purpose-activation">
          {started ? "Continue your journey" : "Begin Module 1"}
        </Link>
        <a className="btn ghost" href="#journey">
          See the four modules
        </a>
      </div>

      <div id="journey" className="eyebrow" style={{ marginBottom: 12 }}>
        The Journey
      </div>
      <div className="journey-grid">
        {MODULES.map((m) => {
          const p = progress[m.slug];
          const card = (
            <>
              <div className="j-k">{m.kicker}</div>
              <div className="j-t">{m.title}</div>
              <div className="j-d">{m.blurb}</div>
              {m.available ? (
                <>
                  <div className="j-bar bar">
                    <i style={{ width: `${p.pct}%` }} />
                  </div>
                  <div className="j-status">
                    {p.done} of {p.total} steps · {p.pct}%
                  </div>
                </>
              ) : (
                <div className="j-status">Coming soon</div>
              )}
            </>
          );
          return m.available ? (
            <Link key={m.slug} className="jcard tappable" href={`/module/${m.slug}`}>
              {card}
            </Link>
          ) : (
            <div key={m.slug} className="jcard locked">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
