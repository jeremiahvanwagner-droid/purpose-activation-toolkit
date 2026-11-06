"use client";

import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import { useResponse } from "@/lib/store";

type Ritual = { morning?: string; middayTime?: string; recalibrate?: string; evening?: string };

export default function RitualDesigner() {
  const ata = usePaidCurriculum().alignmentToAction;
  const MIDDAY_PROTOCOL = ata.MIDDAY_PROTOCOL as string[];
  const RITUAL_FIELD = ata.RITUAL_FIELD as string;
  const chrome = ata.RITUAL_CHROME as Record<string, string>;
  const [r, setR] = useResponse<Ritual>(RITUAL_FIELD, {});
  const set = (key: keyof Ritual, val: string) => setR({ ...r, [key]: val });

  return (
    <div className="dm">
      <div className="dm-row">
        <div className="dm-name">{chrome.morningName}</div>
        <p className="assist" style={{ margin: "0 0 8px" }}>
          Anchor question: <i>“{chrome.morningAnchor}”</i>
        </p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rit-morning">{chrome.morningLabel}</label>
          <textarea
            id="rit-morning"
            rows={2}
            value={r.morning ?? ""}
            placeholder={chrome.morningPlaceholder}
            onChange={(e) => set("morning", e.target.value)}
          />
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">{chrome.middayName}</div>
        <ul className="dm-considerations">
          {MIDDAY_PROTOCOL.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <div className="plan-weeks" style={{ marginTop: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="rit-midday">{chrome.middayLabel}</label>
            <input
              id="rit-midday"
              type="text"
              autoComplete="off"
              value={r.middayTime ?? ""}
              placeholder={chrome.middayPlaceholder}
              onChange={(e) => set("middayTime", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="rit-recal">{chrome.recalLabel}</label>
            <input
              id="rit-recal"
              type="text"
              autoComplete="off"
              value={r.recalibrate ?? ""}
              placeholder={chrome.recalPlaceholder}
              onChange={(e) => set("recalibrate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">{chrome.eveningName}</div>
        <p className="assist" style={{ margin: "0 0 8px" }}>
          Anchor question: <i>“{chrome.eveningAnchor}”</i>
        </p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rit-evening">{chrome.eveningLabel}</label>
          <textarea
            id="rit-evening"
            rows={2}
            value={r.evening ?? ""}
            placeholder={chrome.eveningPlaceholder}
            onChange={(e) => set("evening", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
