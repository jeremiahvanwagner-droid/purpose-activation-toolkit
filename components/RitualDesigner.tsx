"use client";

import { useResponse } from "@/lib/store";
import { MIDDAY_PROTOCOL, RITUAL_FIELD } from "@/lib/content/alignmentToAction";

type Ritual = { morning?: string; middayTime?: string; recalibrate?: string; evening?: string };

export default function RitualDesigner() {
  const [r, setR] = useResponse<Ritual>(RITUAL_FIELD, {});
  const set = (key: keyof Ritual, val: string) => setR({ ...r, [key]: val });

  return (
    <div className="dm">
      <div className="dm-row">
        <div className="dm-name">Morning ritual · 5–10 minutes</div>
        <p className="assist" style={{ margin: "0 0 8px" }}>
          Anchor question: <i>“How can I live in alignment with my higher purpose today?”</i>
        </p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rit-morning">My morning practice will include</label>
          <textarea
            id="rit-morning"
            rows={2}
            value={r.morning ?? ""}
            placeholder="e.g., 5 minutes of Scripture or prayer; review my purpose statement; set one aligned intention; speak affirmations"
            onChange={(e) => set("morning", e.target.value)}
          />
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">Midday check-in · 2 minutes</div>
        <ul className="dm-considerations">
          {MIDDAY_PROTOCOL.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <div className="plan-weeks" style={{ marginTop: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="rit-midday">My midday check-in will happen at</label>
            <input
              id="rit-midday"
              type="text"
              autoComplete="off"
              value={r.middayTime ?? ""}
              placeholder="e.g., 12:30 PM — set a phone reminder"
              onChange={(e) => set("middayTime", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="rit-recal">My recalibration practice (if drifted)</label>
            <input
              id="rit-recal"
              type="text"
              autoComplete="off"
              value={r.recalibrate ?? ""}
              placeholder="e.g., 3 breaths + one-line prayer + one aligned step"
              onChange={(e) => set("recalibrate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">Evening reflection · 5 minutes</div>
        <p className="assist" style={{ margin: "0 0 8px" }}>
          Anchor question: <i>“What did I do today that was in alignment?”</i>
        </p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rit-evening">My evening practice will include</label>
          <textarea
            id="rit-evening"
            rows={2}
            value={r.evening ?? ""}
            placeholder="e.g., journal 3 aligned actions; name 3 gratitudes; review tomorrow's intention; pray a prayer of surrender"
            onChange={(e) => set("evening", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
