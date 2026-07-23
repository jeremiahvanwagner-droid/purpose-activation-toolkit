"use client";

import Link from "next/link";
import AuditRunner from "@/components/AuditRunner";
import AlignmentProfile from "@/components/AlignmentProfile";
import EbookClaim from "@/components/EbookClaim";
import Reflection from "@/components/Reflection";
import { useResponses } from "@/lib/store";
import {
  DOMAINS,
  IAA_META,
  WORKSHEETS,
  reflectField,
  scoreAudit,
} from "@/lib/content/innerAlignmentAudit";

/** Namespace-guard: worksheet ids MUST live under `iaa.*` so they belong to
 *  this audit's data island (and sync with it). Defensive belt-and-braces in
 *  case the content file drifts. */
function nsGuard(id: string): string {
  return id.startsWith("iaa.") ? id : `iaa.ws.${id}`;
}

export default function AuditPage() {
  const all = useResponses();
  const score = scoreAudit(all as Record<string, unknown>);
  const complete = score.complete;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Beyond the Veil · Inner Alignment Audit</div>
        <h1 className="page-title">{IAA_META.title}</h1>
        <p className="lede">{IAA_META.subtitle}</p>
      </header>

      <div className="card">
        <span className="tag">How to take this</span>
        <div className="body-copy">
          <p>
            This isn't a test you can fail. For each statement, choose how often it's been true of you{" "}
            <i>lately</i> — quickly and honestly, without overthinking. In a few minutes you'll see clearly
            where you're aligned, where there's drift, and the one place to begin. Your answers save
            automatically as you go.
          </p>
        </div>
      </div>

      <AuditRunner />

      {/* Results — always rendered so users can watch the progress bar fill; unlocks at 28/28 */}
      <section className="card" id="profile">
        <span className="tag">Your Result</span>
        <h2>Your Alignment Profile</h2>
        <p className="hint">
          Four domains, each scored out of 35. The domain carrying the most tension is your primary lever —
          your best first move.
        </p>
        <AlignmentProfile />
      </section>

      {/* Everything from here down references the profile above ("your primary lever…"),
          so we hide it until the profile has actually appeared. */}
      {complete ? (
        <>
          {/* Interpretation */}
          <section className="card">
            <span className="tag">Make sense of it</span>
            <h2>Read your pattern</h2>
            <p className="hint">
              Your primary lever is highlighted above. Sit with these two questions to sharpen the picture.
            </p>
            <Reflection
              id="iaa.interpret.secondary"
              prompt="Which domain most supports the one you're repairing first?"
              assist="Often, strengthening one area makes the harder one easier to face."
            />
            <Reflection
              id="iaa.interpret.hidden"
              prompt="Where is a hidden drain quietly costing you energy?"
              assist="Something you've normalized that's pulling more than you realize."
            />
          </section>

          {/* 7-Day Plan */}
          <section className="card">
            <span className="tag">Turn it into action</span>
            <h2>Your 7-day realignment plan</h2>
            <p className="hint">
              Small and specific beats ambitious and vague. One focus, one boundary, one practice.
            </p>
            <Reflection
              id="iaa.plan.focus"
              prompt="The one domain I'm focusing on for the next 7 days"
              minRows={2}
            />
            <Reflection id="iaa.plan.boundary" prompt="One boundary I'll hold" minRows={2} />
            <Reflection id="iaa.plan.practice" prompt="One daily practice I'll keep" minRows={2} />
            <Reflection id="iaa.plan.measure" prompt="How I'll know I'm improving" minRows={2} />
          </section>

          {/* Alignment Statement */}
          <section className="card">
            <span className="tag">Name it before God</span>
            <h2>Your alignment statement</h2>
            <Reflection id="iaa.stmt.inviting" prompt="God is inviting me to…" minRows={2} />
            <Reflection id="iaa.stmt.release" prompt="I release…" minRows={2} />
            <Reflection id="iaa.stmt.commit" prompt="I commit to…" minRows={2} />
            <Reflection id="iaa.stmt.next7" prompt="My next 7 days will look like…" minRows={2} />
          </section>

          {/* Deeper reflection */}
          <section className="card">
            <span className="tag">Go deeper (optional)</span>
            <h2>Reflect on each domain</h2>
            <p className="hint">Return to these whenever you want to go beneath the scores.</p>
            {DOMAINS.map((d) =>
              d.reflectionPrompts.length ? (
                <div key={d.key} style={{ marginBottom: 8 }}>
                  <div className="wb-sheading" style={{ marginBottom: 8 }}>
                    {d.name}
                  </div>
                  {d.reflectionPrompts.map((p, i) => (
                    <Reflection key={i} id={reflectField(d.key, i + 1)} prompt={p} minRows={2} />
                  ))}
                </div>
              ) : null
            )}
            {WORKSHEETS.map((w) => (
              <Reflection key={w.id} id={nsGuard(w.id)} prompt={w.title} minRows={2} />
            ))}
          </section>
        </>
      ) : (
        <section className="card">
          <span className="tag">Coming next</span>
          <h2>What you'll see when you finish</h2>
          <p className="hint">
            Once all 28 statements are answered, your Alignment Profile unlocks — with a 7-day plan, a personal
            alignment statement, and space for deeper reflection.
          </p>
        </section>
      )}

      {/* The gift is the reward for finishing, so it sits above the upsell and
          only appears at 28/28. Delivery is immediate on-page; the emailed copy
          is a convenience. */}
      {complete ? <EbookClaim profile={score} /> : null}

      {/* Next step CTA — always visible so the funnel isn't gated behind completion */}
      <section className="card cta-card">
        <span className="tag">Your next step</span>
        <h2>From drift to direction</h2>
        <div className="body-copy">
          <p>
            Naming the tension is the beginning. The <b>Purpose Activation Toolkit</b> is the guided path that
            turns this profile into a lived transformation — four interactive modules that walk you from
            clarity into daily, aligned action.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <Link className="btn gold" href="/toolkit">
            Open the Purpose Activation Toolkit
          </Link>
          <Link className="btn ghost" href="/module/purpose-activation">
            Or begin with Module 1
          </Link>
        </div>
        <p className="assist" style={{ marginTop: 14 }}>
          Finish the audit to unlock your free eBook, <i>You Were Created to Serve</i>, and 7-day
          access to the{" "}
          <a href={IAA_META.ctaUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
            Divine Path Walkers community
          </a>
          .
        </p>
      </section>
    </div>
  );
}
