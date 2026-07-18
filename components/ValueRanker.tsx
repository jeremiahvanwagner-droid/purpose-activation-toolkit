"use client";

import { useResponse } from "@/lib/store";
import { VALUES_BANK, VALUES_CAP, VALUES_FIELD } from "@/lib/content/purposeActivation";

export default function ValueRanker() {
  const [picked, setPicked] = useResponse<string[]>(VALUES_FIELD, []);
  const atCap = picked.length >= VALUES_CAP;

  function toggle(v: string) {
    if (picked.includes(v)) setPicked(picked.filter((x) => x !== v));
    else if (!atCap) setPicked([...picked, v]);
  }
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= picked.length) return;
    const next = picked.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setPicked(next);
  }
  function remove(i: number) {
    setPicked(picked.filter((_, k) => k !== i));
  }

  return (
    <div className="values-wrap">
      <div className="chips" role="listbox" aria-label="Core values">
        {VALUES_BANK.map((v) => {
          const on = picked.includes(v);
          return (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={on}
              className={`chip${on ? " picked" : ""}${!on && atCap ? " locked" : ""}`}
              onClick={() => toggle(v)}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="rank" aria-live="polite">
        <div className="rk-head">
          <span>Your Top 7</span>
          <b>
            {picked.length} / {VALUES_CAP}
          </b>
        </div>
        {picked.length === 0 ? (
          <p className="rk-empty">Your ranked values will appear here as you choose them.</p>
        ) : (
          <div>
            {picked.map((v, i) => (
              <div className="rk-item" key={v}>
                <span className="n">{i + 1}</span>
                <span className="nm">{v}</span>
                <button type="button" title="Move up" aria-label={`Move ${v} up`} onClick={() => move(i, -1)}>
                  ▲
                </button>
                <button type="button" title="Move down" aria-label={`Move ${v} down`} onClick={() => move(i, 1)}>
                  ▼
                </button>
                <button type="button" title="Remove" aria-label={`Remove ${v}`} onClick={() => remove(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
