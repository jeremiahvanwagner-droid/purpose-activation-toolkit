"use client";

import { useResponse } from "@/lib/store";
import { GRID_CRITERIA, GRID_FIELD } from "@/lib/content/decisionMaking";

type Grid = {
  decision?: string;
  options?: string[];
  scores?: Record<string, number[]>;
};

const SCORES = [1, 2, 3, 4, 5];

export default function DecisionGrid() {
  const [g, setG] = useResponse<Grid>(GRID_FIELD, {});
  const options = [0, 1, 2].map((i) => g.options?.[i] ?? "");

  function setOption(i: number, val: string) {
    const next = options.slice();
    next[i] = val;
    setG({ ...g, options: next });
  }
  function score(critKey: string, oi: number): number {
    return g.scores?.[critKey]?.[oi] ?? 0;
  }
  function setScore(critKey: string, oi: number, val: number) {
    const scores = { ...(g.scores ?? {}) };
    const row = [0, 1, 2].map((j) => scores[critKey]?.[j] ?? 0);
    row[oi] = val;
    scores[critKey] = row;
    setG({ ...g, scores });
  }
  const totals = [0, 1, 2].map((oi) =>
    GRID_CRITERIA.reduce((sum, c) => sum + score(c.key, oi), 0)
  );

  return (
    <div>
      <div className="field" style={{ maxWidth: 480 }}>
        <label htmlFor="grid-decision">My decision</label>
        <input
          id="grid-decision"
          type="text"
          autoComplete="off"
          value={g.decision ?? ""}
          placeholder="The decision you're weighing…"
          onChange={(e) => setG({ ...g, decision: e.target.value })}
        />
      </div>

      <div className="dgrid-wrap">
        <table className="dgrid">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Criteria · score 1–5</th>
              {options.map((o, i) => (
                <th key={i}>
                  <input
                    type="text"
                    autoComplete="off"
                    aria-label={`Option ${i + 1} name`}
                    value={o}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => setOption(i, e.target.value)}
                    style={{ width: "100%", minWidth: 96, textAlign: "center" }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRID_CRITERIA.map((c) => (
              <tr key={c.key}>
                <td className="crit">
                  <b>{c.label}</b>
                  <span>{c.anchor}</span>
                </td>
                {[0, 1, 2].map((oi) => (
                  <td key={oi}>
                    <select
                      aria-label={`${c.label} — option ${oi + 1}`}
                      value={score(c.key, oi) || ""}
                      onChange={(e) => setScore(c.key, oi, Number(e.target.value) || 0)}
                    >
                      <option value="">–</option>
                      {SCORES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="total">
              <td className="crit">
                <b>Total score</b>
              </td>
              {totals.map((t, i) => (
                <td key={i}>{t > 0 ? t : "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="callout">
        <b>Peace is the final arbiter.</b> The highest score doesn't always carry peace — if the numbers and
        your spirit disagree, that discrepancy is information. Bring it to prayer before you choose.
      </div>
    </div>
  );
}
