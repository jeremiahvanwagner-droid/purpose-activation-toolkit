"use client";

import { useResponse } from "@/lib/store";
import { LAB_EXAMPLE, LAB_FIELDS } from "@/lib/content/executionPrompts";

type Lab = { struggle?: string; awareness?: string; decision?: string; action?: string };

function LabBlock({ id, index }: { id: string; index: number }) {
  const [v, setV] = useResponse<Lab>(id, {});
  const set = (key: keyof Lab, val: string) => setV({ ...v, [key]: val });

  return (
    <div className="dm-row">
      <div className="dm-name">Struggle {index}</div>
      <div className="field">
        <input
          type="text"
          autoComplete="off"
          aria-label={`Struggle ${index}`}
          value={v.struggle ?? ""}
          placeholder="e.g., fear of rejection, procrastination, overcommitting, people-pleasing, self-doubt"
          onChange={(e) => set("struggle", e.target.value)}
        />
      </div>
      <div className="dm-cells">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Awareness prompt</label>
          <textarea
            rows={2}
            value={v.awareness ?? ""}
            placeholder="To catch yourself in the pattern…"
            onChange={(e) => set("awareness", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Decision prompt</label>
          <textarea
            rows={2}
            value={v.decision ?? ""}
            placeholder="To choose differently in the moment…"
            onChange={(e) => set("decision", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Action prompt</label>
          <textarea
            rows={2}
            value={v.action ?? ""}
            placeholder="To move into a small, aligned behavior…"
            onChange={(e) => set("action", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default function PromptLab() {
  return (
    <div>
      <div className="callout" style={{ marginTop: 0, marginBottom: 16 }}>
        <b>Worked example — {LAB_EXAMPLE.struggle}.</b>
        <br />
        Awareness: “{LAB_EXAMPLE.awareness}”
        <br />
        Decision: “{LAB_EXAMPLE.decision}”
        <br />
        Action: “{LAB_EXAMPLE.action}”
      </div>
      <div className="dm">
        {LAB_FIELDS.map((id, i) => (
          <LabBlock key={id} id={id} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
