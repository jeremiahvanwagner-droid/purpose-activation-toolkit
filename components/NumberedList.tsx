"use client";

import { useResponse } from "@/lib/store";

export default function NumberedList({
  id,
  label,
  assist,
  noun,
  count = 5,
}: {
  id: string;
  label: string;
  assist?: string;
  noun: string;
  count?: number;
}) {
  const [items, setItems] = useResponse<string[]>(id, []);
  const vals = Array.from({ length: count }, (_, i) => items[i] ?? "");

  function set(i: number, v: string) {
    const next = vals.slice();
    next[i] = v;
    setItems(next);
  }

  return (
    <div className="field" style={{ marginBottom: 18 }}>
      <label
        style={{
          fontFamily: "var(--serif)",
          textTransform: "none",
          letterSpacing: 0,
          fontSize: "0.95rem",
          color: "var(--ink)",
        }}
      >
        {label}
      </label>
      {assist ? (
        <p className="assist" style={{ margin: "0 0 2px" }}>
          {assist}
        </p>
      ) : null}
      <div className="numlist">
        {vals.map((v, i) => (
          <div className="nl-row" key={i}>
            <span className="nl-n">{i + 1}</span>
            <input
              type="text"
              autoComplete="off"
              value={v}
              placeholder={`${noun} ${i + 1}…`}
              aria-label={`${label} — ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
