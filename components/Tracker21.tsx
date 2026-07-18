"use client";

import { useResponse } from "@/lib/store";
import { TRACKER_FIELD, TRACKER_RULES } from "@/lib/content/alignmentToAction";

type Day = { date?: string; action?: string; note?: string };

const DAYS = 21;

export default function Tracker21() {
  const [rows, setRows] = useResponse<Day[]>(TRACKER_FIELD, []);
  const list = Array.from({ length: DAYS }, (_, i) => rows[i] ?? {});

  function setCell(i: number, key: keyof Day, val: string) {
    const next = list.map((r) => ({ ...r }));
    next[i] = { ...next[i], [key]: val };
    // Stamp the date the first time an action is written for that day.
    if (key === "action" && val.trim() && !(next[i].date ?? "").trim()) {
      next[i].date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    setRows(next);
  }

  const done = list.filter((r) => (r.action ?? "").trim()).length;

  return (
    <div>
      <ul className="trk-rules">
        {TRACKER_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="trk-count" aria-live="polite">
        {done === 0
          ? "Day 1 begins the moment you write your first action."
          : done < DAYS
            ? `${done} of ${DAYS} days walked — keep going.`
            : "21 of 21 days — you finished the challenge. Well done, faithful one."}
      </div>

      <div className="trk">
        <div className="trk-row trk-head" aria-hidden="true">
          <span />
          <span className="trk-col">Date</span>
          <span className="trk-col">Aligned action of the day</span>
          <span className="trk-col">One-sentence reflection</span>
        </div>
        {list.map((r, i) => {
          const isDone = Boolean((r.action ?? "").trim());
          return (
            <div className={`trk-row${isDone ? " done" : ""}`} key={i}>
              <span className="trk-day">{i + 1}</span>
              <input
                type="text"
                autoComplete="off"
                aria-label={`Day ${i + 1} date`}
                value={r.date ?? ""}
                placeholder="—"
                onChange={(e) => setCell(i, "date", e.target.value)}
              />
              <input
                type="text"
                autoComplete="off"
                aria-label={`Day ${i + 1} aligned action`}
                value={r.action ?? ""}
                placeholder="One purpose-aligned action, however small…"
                onChange={(e) => setCell(i, "action", e.target.value)}
              />
              <input
                type="text"
                autoComplete="off"
                className="note"
                aria-label={`Day ${i + 1} reflection`}
                value={r.note ?? ""}
                placeholder="How it felt · what I noticed…"
                onChange={(e) => setCell(i, "note", e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
