"use client";

import { useResponse } from "@/lib/store";

type Belief = { belief?: string; truth?: string; scripture?: string };

export default function BeliefReframe({ id, index }: { id: string; index: number }) {
  const [b, setB] = useResponse<Belief>(id, {});
  const set = (key: keyof Belief, v: string) => setB({ ...b, [key]: v });

  const beliefId = `${id}-belief`;
  const truthId = `${id}-truth`;
  const scriptureId = `${id}-scripture`;

  return (
    <div className="belief">
      <div className="b-lie">
        <h4>The lie · Limiting belief #{index}</h4>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor={beliefId} className="sr-only">Limiting belief {index}</label>
          <textarea
            id={beliefId}
            rows={2}
            value={b.belief ?? ""}
            placeholder="A recurring belief that shrinks your purpose or calling…"
            onChange={(e) => set("belief", e.target.value)}
          />
        </div>
      </div>
      <div className="b-truth">
        <h4>God's truth · The counter-narrative</h4>
        <div className="field">
          <label htmlFor={truthId}>Truth statement</label>
          <textarea
            id={truthId}
            rows={2}
            value={b.truth ?? ""}
            placeholder="A truth grounded in Scripture, evidence, or Spirit-led conviction…"
            onChange={(e) => set("truth", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor={scriptureId}>Supporting Scripture or evidence</label>
          <input
            id={scriptureId}
            type="text"
            autoComplete="off"
            value={b.scripture ?? ""}
            placeholder="e.g., Romans 8:28 · “God works all things together for good…”"
            onChange={(e) => set("scripture", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
