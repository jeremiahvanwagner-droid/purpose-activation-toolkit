"use client";

import { useRef } from "react";
import { useResponse } from "@/lib/store";
import { LIKERT } from "@/lib/content/innerAlignmentAudit";

/**
 * One scored audit item: a stem + the 5-point Always…Never scale as tappable pills.
 * Behaves as a proper ARIA radiogroup — Left/Right/Home/End move focus and selection
 * across the five pills with roving tabIndex, and clicking the selected pill again
 * clears it (returns to unanswered, so accidental picks are reversible).
 */
export default function LikertScale({ id, question, n }: { id: string; question: string; n: number }) {
  const [value, setValue] = useResponse<number>(id, 0);
  const groupRef = useRef<HTMLDivElement | null>(null);

  const selectedIndex = LIKERT.findIndex((o) => o.value === value);
  // If nothing is selected yet, the first pill is the tab stop; otherwise the selected one.
  const tabIndexTarget = selectedIndex >= 0 ? selectedIndex : 0;

  function pick(v: number) {
    setValue(value === v ? 0 : v);
  }

  function focusPill(i: number) {
    // Clamp to the ends (do not wrap) — wrapping would silently record the
    // opposite answer when a user overshoots at the edge of the scale.
    if (i < 0 || i >= LIKERT.length) return;
    const el = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[i];
    el?.focus();
    setValue(LIKERT[i].value);
  }

  function onKey(e: React.KeyboardEvent) {
    const key = e.key;
    const cur = selectedIndex >= 0 ? selectedIndex : 0;
    if (key === "ArrowRight" || key === "ArrowDown") {
      e.preventDefault();
      focusPill(cur + 1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      e.preventDefault();
      focusPill(cur - 1);
    } else if (key === "Home") {
      e.preventDefault();
      focusPill(0);
    } else if (key === "End") {
      e.preventDefault();
      focusPill(LIKERT.length - 1);
    }
  }

  return (
    <div className="likert">
      <div className="likert-q" id={`${id}-label`}>
        <span className="likert-n">{n}</span>
        <span>{question}</span>
      </div>
      <div
        className="likert-scale"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        ref={groupRef}
        onKeyDown={onKey}
      >
        {LIKERT.map((opt, i) => {
          const on = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === tabIndexTarget ? 0 : -1}
              className={`likert-pill${on ? " on" : ""}`}
              onClick={() => pick(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
