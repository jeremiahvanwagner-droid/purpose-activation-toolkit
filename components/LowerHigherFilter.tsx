"use client";

import { useResponse } from "@/lib/store";
import { FILTER_FIELD, FILTER_ROWS } from "@/lib/content/decisionMaking";

type Pair = { fear?: string; higher?: string };
type Filter = { decision?: string; pairs?: Pair[] };

export default function LowerHigherFilter() {
  const [v, setV] = useResponse<Filter>(FILTER_FIELD, {});
  const pairs = Array.from({ length: FILTER_ROWS }, (_, i) => v.pairs?.[i] ?? {});

  function setPair(i: number, key: keyof Pair, val: string) {
    const next = pairs.map((p) => ({ ...p }));
    next[i] = { ...next[i], [key]: val };
    setV({ ...v, pairs: next });
  }

  return (
    <div>
      <div className="field" style={{ maxWidth: 480 }}>
        <label htmlFor="filter-decision">Current decision</label>
        <input
          id="filter-decision"
          type="text"
          autoComplete="off"
          value={v.decision ?? ""}
          placeholder="The choice in front of you right now…"
          onChange={(e) => setV({ ...v, decision: e.target.value })}
        />
      </div>

      <div className="lh-head">
        <h4 className="lh-from">What fear / my Lower Self says</h4>
        <h4 className="lh-to">What my Higher Self in Christ says</h4>
      </div>
      {pairs.map((p, i) => (
        <div className="lh-pair" key={i}>
          <textarea
            rows={2}
            aria-label={`Fear says — row ${i + 1}`}
            value={p.fear ?? ""}
            placeholder="“You'll fail… you'll lose… you're not ready…”"
            onChange={(e) => setPair(i, "fear", e.target.value)}
          />
          <textarea
            rows={2}
            aria-label={`Higher Self says — row ${i + 1}`}
            value={p.higher ?? ""}
            placeholder="“You are held. Choose from peace, not panic…”"
            onChange={(e) => setPair(i, "higher", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
