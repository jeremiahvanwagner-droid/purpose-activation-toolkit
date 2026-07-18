"use client";

import { useResponse } from "@/lib/store";
import { SEVEN_FIELD, SEVEN_STEPS } from "@/lib/content/decisionMaking";

type Seven = Record<string, string>;

export default function SevenStepFramework() {
  const [v, setV] = useResponse<Seven>(SEVEN_FIELD, {});
  const set = (key: string, val: string) => setV({ ...v, [key]: val });

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

      {SEVEN_STEPS.map((s, i) => (
        <div className="step-row" key={s.key}>
          <span className="step-badge">{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div className="step-title">{s.title}</div>
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
