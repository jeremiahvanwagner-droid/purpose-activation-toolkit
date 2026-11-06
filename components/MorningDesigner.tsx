"use client";

import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import { useResponse } from "@/lib/store";

type Morning = Record<string, string>;

export default function MorningDesigner() {
  const pa = usePaidCurriculum().purposeActivation;
  const MORNING_FIELD = pa.MORNING_FIELD as string;
  const MORNING_PRACTICES = pa.MORNING_PRACTICES as { key: string; label: string; example?: string }[];
  const [m, setM] = useResponse<Morning>(MORNING_FIELD, {});
  const set = (key: string, v: string) => setM({ ...m, [key]: v });

  return (
    <div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="pm-time">My Purpose Morning time</label>
        <input
          id="pm-time"
          type="text"
          autoComplete="off"
          value={m.time ?? ""}
          placeholder="e.g., 6:15 – 6:45 AM"
          onChange={(e) => set("time", e.target.value)}
        />
        <p className="assist">15–60 minutes, anchored by three non-negotiable practices.</p>
      </div>

      {MORNING_PRACTICES.map((p) => (
        <div className="field" key={p.key}>
          <label htmlFor={`pm-${p.key}`}>{p.label}</label>
          <textarea
            id={`pm-${p.key}`}
            rows={2}
            value={m[p.key] ?? ""}
            placeholder={p.example}
            onChange={(e) => set(p.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
