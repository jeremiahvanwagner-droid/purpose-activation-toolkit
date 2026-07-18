"use client";

import { useResponse } from "@/lib/store";
import { DISTORTIONS } from "@/lib/content/decisionMaking";

type Rewrite = { thought?: string; type?: string; truth?: string; scripture?: string };

export default function DistortionRewrite({ id, index }: { id: string; index: number }) {
  const [v, setV] = useResponse<Rewrite>(id, {});
  const set = (key: keyof Rewrite, val: string) => setV({ ...v, [key]: val });

  const thoughtId = `${id}-thought`;
  const typeId = `${id}-type`;
  const truthId = `${id}-truth`;
  const scriptureId = `${id}-scripture`;

  return (
    <div className="belief">
      <div className="b-lie">
        <h4>Distorted thought #{index}</h4>
        <div className="field">
          <label htmlFor={thoughtId} className="sr-only">Distorted thought {index}</label>
          <textarea
            id={thoughtId}
            rows={2}
            value={v.thought ?? ""}
            placeholder="The anxious story this decision keeps telling you…"
            onChange={(e) => set("thought", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0, maxWidth: 320 }}>
          <label htmlFor={typeId}>What type of distortion is this?</label>
          <select id={typeId} value={v.type ?? ""} onChange={(e) => set("type", e.target.value)}>
            <option value="">Choose one…</option>
            {DISTORTIONS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="b-truth">
        <h4>Faith-aligned, reality-based truth</h4>
        <div className="field">
          <label htmlFor={truthId}>Truth statement</label>
          <textarea
            id={truthId}
            rows={2}
            value={v.truth ?? ""}
            placeholder="Rewrite the thought as truth — grounded and unhurried…"
            onChange={(e) => set("truth", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor={scriptureId}>Supporting Scripture or evidence</label>
          <input
            id={scriptureId}
            type="text"
            autoComplete="off"
            value={v.scripture ?? ""}
            placeholder="e.g., Philippians 4:6–7 · past evidence of God's faithfulness"
            onChange={(e) => set("scripture", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
