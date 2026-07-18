"use client";

import { useResponse } from "@/lib/store";
import NumberedList from "@/components/NumberedList";
import { PLAN_FOCUS, PLAN_MICRO, PLAN_SUPPORT, PLAN_WEEKS } from "@/lib/content/purposeActivation";

const WEEKS = [
  { key: "w1", label: "Week 1 purpose target", ph: "What will you accomplish or establish by the end of Week 1?" },
  { key: "w2", label: "Week 2 purpose target", ph: "Build on Week 1 — what's next?" },
  { key: "w3", label: "Week 3 purpose target", ph: "Where should momentum carry you by Week 3?" },
  { key: "w4", label: "Week 4 purpose target", ph: "What does 'established' look like at Day 30?" },
];

export default function Plan30() {
  const [focus, setFocus] = useResponse<string>(PLAN_FOCUS, "");
  const [weeks, setWeeks] = useResponse<Record<string, string>>(PLAN_WEEKS, {});
  const [support, setSupport] = useResponse<Record<string, string>>(PLAN_SUPPORT, {});
  const setWeek = (k: string, v: string) => setWeeks({ ...weeks, [k]: v });
  const setSup = (k: string, v: string) => setSupport({ ...support, [k]: v });

  return (
    <div>
      <div className="field">
        <label htmlFor="plan-focus">My 30-day focus area</label>
        <input
          id="plan-focus"
          type="text"
          autoComplete="off"
          value={focus}
          placeholder="Choose ONE domain or practice from this workbook to emphasize for the next month"
          onChange={(e) => setFocus(e.target.value)}
        />
      </div>

      <div className="plan-weeks">
        {WEEKS.map((w) => (
          <div className="field" key={w.key} style={{ marginBottom: 0 }}>
            <label htmlFor={`plan-${w.key}`}>{w.label}</label>
            <textarea
              id={`plan-${w.key}`}
              rows={2}
              value={weeks[w.key] ?? ""}
              placeholder={w.ph}
              onChange={(e) => setWeek(w.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <NumberedList
          id={PLAN_MICRO}
          count={3}
          noun="Commitment"
          label="Daily micro-commitments"
          assist="What will you do EVERY day for the next 30 days? Small enough to never miss."
        />
      </div>

      <div className="plan-support">
        <div className="field">
          <label htmlFor="sup-partner">Accountability partner(s)</label>
          <input
            id="sup-partner"
            type="text"
            autoComplete="off"
            value={support.partner ?? ""}
            placeholder="Who will walk this with you?"
            onChange={(e) => setSup("partner", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="sup-community">Community group or platform</label>
          <input
            id="sup-community"
            type="text"
            autoComplete="off"
            value={support.community ?? ""}
            placeholder="e.g., Divine Path Walkers on Skool"
            onChange={(e) => setSup("community", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="sup-checkin">Check-in schedule</label>
          <input
            id="sup-checkin"
            type="text"
            autoComplete="off"
            value={support.checkin ?? ""}
            placeholder="e.g., weekly voice note update; bi-weekly call; daily post"
            onChange={(e) => setSup("checkin", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
