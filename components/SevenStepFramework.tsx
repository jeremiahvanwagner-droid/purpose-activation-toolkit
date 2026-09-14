"use client";

import { isFilled, useResponse } from "@/lib/store";
import { SEVEN_FIELD, SEVEN_STEPS } from "@/lib/content/decisionMaking";

type Seven = Record<string, string>;

export default function SevenStepFramework() {
  const [v, setV] = useResponse<Seven>(SEVEN_FIELD, {});
  const set = (key: string, val: string) => setV({ ...v, [key]: val });
  const written = SEVEN_STEPS.filter((s) => isFilled(v[s.key])).length;

  return (
    <div>
      <div className="field" style={{ maxWidth: 480 }}>
        <label htmlFor="seven-decision">My decision</label>
        <input
          id="seven-decision"
          type="text"
          autoComplete="off"
          value={v.decision ?? ""}
          placeholder="Name the decision you're walking through the framework…"
          onChange={(e) => set("decision", e.target.value)}
        />
      </div>
      <p className="assist" aria-live="polite" style={{ margin: "0 0 4px" }}>
        {written === 0
          ? "Naming the decision is the starting point — the framework begins with step 1."
          : `${written} of ${SEVEN_STEPS.length} steps written.`}
      </p>

      {SEVEN_STEPS.map((s, i) => (
        <div className="step-row" key={s.key}>
          <span className="step-badge">{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div className="step-title">{s.title}</div>
            <p className="step-guide">{s.guide}</p>
            <details className="step-example">
              <summary>See an example</summary>
              <p>{s.example}</p>
            </details>
            <div className="field" style={{ marginBottom: 0 }}>
              <textarea
                rows={2}
                aria-label={`Step ${i + 1}: ${s.title}`}
                value={v[s.key] ?? ""}
                placeholder={s.label}
                onChange={(e) => set(s.key, e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
