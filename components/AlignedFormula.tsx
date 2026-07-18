"use client";

import { useResponse } from "@/lib/store";
import { FORMULA_CHAIN, FORMULA_DOMAINS, FORMULA_FIELD } from "@/lib/content/alignmentToAction";

type Formula = {
  domain?: string;
  purpose?: string;
  values?: string;
  intend?: string;
  smallest?: string;
  outcome?: string;
};

export default function AlignedFormula() {
  const [f, setF] = useResponse<Formula>(FORMULA_FIELD, {});
  const set = (key: keyof Formula, val: string) => setF({ ...f, [key]: val });

  return (
    <div>
      <div className="flow" aria-label="The Aligned Action Formula">
        {FORMULA_CHAIN.map((step, i) => (
          <span key={step} style={{ display: "contents" }}>
            <span className="f-step">{step}</span>
            {i < FORMULA_CHAIN.length - 1 ? <span className="f-arrow">→</span> : null}
          </span>
        ))}
      </div>

      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="af-domain">Domain</label>
        <select id="af-domain" value={f.domain ?? ""} onChange={(e) => set("domain", e.target.value)}>
          <option value="">Choose one domain…</option>
          {FORMULA_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="assist">Carry over the domain the Spirit highlighted in Module 1.</p>
      </div>

      <div className="field">
        <label htmlFor="af-purpose">Because my purpose is…</label>
        <textarea
          id="af-purpose"
          rows={2}
          value={f.purpose ?? ""}
          placeholder="Bring your purpose statement into this domain…"
          onChange={(e) => set("purpose", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="af-values">And my core values in this domain are…</label>
        <input
          id="af-values"
          type="text"
          autoComplete="off"
          value={f.values ?? ""}
          placeholder="e.g., stewardship, courage, service"
          onChange={(e) => set("values", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="af-intend">This week, I intend to…</label>
        <textarea
          id="af-intend"
          rows={2}
          value={f.intend ?? ""}
          placeholder="One clear intention for the next seven days…"
          onChange={(e) => set("intend", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="af-smallest">My smallest aligned action (5–15 minutes) is…</label>
        <input
          id="af-smallest"
          type="text"
          autoComplete="off"
          value={f.smallest ?? ""}
          placeholder="Something so small resistance can't argue with it…"
          onChange={(e) => set("smallest", e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="af-outcome">The outcome I expect from consistent action over 21 days is…</label>
        <textarea
          id="af-outcome"
          rows={2}
          value={f.outcome ?? ""}
          placeholder="The visible fruit you're believing for…"
          onChange={(e) => set("outcome", e.target.value)}
        />
      </div>
    </div>
  );
}
