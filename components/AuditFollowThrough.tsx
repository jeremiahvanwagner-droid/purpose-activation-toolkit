"use client";

import Reflection from "@/components/Reflection";
import { DOMAINS, WORKSHEETS, reflectField } from "@/lib/content/innerAlignmentAudit";

/** Namespace-guard: worksheet ids MUST live under `iaa.*` so they belong to
 *  this audit's data island (and sync with it). Defensive belt-and-braces in
 *  case the content file drifts. */
function nsGuard(id: string): string {
  return id.startsWith("iaa.") ? id : `iaa.ws.${id}`;
}

/**
 * Everything that comes after the Alignment Profile: reading the pattern, the
 * 7-day plan, the alignment statement, and the deeper reflections. Shared by
 * the free Audit at /audit and the paid Audit in the store, so the two can
 * never drift apart. Every prompt references the profile above it, so callers
 * render this only once the profile has actually appeared.
 */
export default function AuditFollowThrough() {
  return (
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
        <Reflection id="iaa.plan.focus" prompt="The one domain I'm focusing on for the next 7 days" minRows={2} />
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
  );
}
