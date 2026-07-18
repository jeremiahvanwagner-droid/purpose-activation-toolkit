"use client";

import { useResponse } from "@/lib/store";
import { DECKS, TOOLKIT_FIELD, TOOLKIT_SLOTS } from "@/lib/content/executionPrompts";

type Toolkit = Record<string, string>;

function promptFor(key: string): string | null {
  const [deckKey, idxRaw] = key.split(":");
  const deck = DECKS.find((d) => d.key === deckKey);
  const idx = Number(idxRaw);
  if (!deck || Number.isNaN(idx)) return null;
  return deck.prompts[idx] ?? null;
}

export default function PromptToolkit() {
  const [toolkit, setToolkit] = useResponse<Toolkit>(TOOLKIT_FIELD, {});
  const entries = Object.entries(toolkit).filter(([k]) => promptFor(k));

  if (entries.length === 0) {
    return (
      <p className="hint" style={{ marginBottom: 0 }}>
        Tap the ☆ on any prompt above to gather it here — then assign each one to Morning, Decision moments,
        or Evening. Aim for 3–5 prompts per rotation.
      </p>
    );
  }

  function setSlot(key: string, slot: string) {
    setToolkit({ ...toolkit, [key]: slot });
  }
  function remove(key: string) {
    const next = { ...toolkit };
    delete next[key];
    setToolkit(next);
  }

  return (
    <div>
      <p className="hint">
        Your gathered prompts. Assign each to a rotation — this page becomes your daily companion.
      </p>
      {TOOLKIT_SLOTS.map((slot) => {
        const inSlot = entries.filter(([, s]) => s === slot.key);
        if (inSlot.length === 0) return null;
        return (
          <div key={slot.key}>
            <div className="tk-slot">{slot.label}</div>
            {inSlot.map(([key]) => (
              <div className="tk-row" key={key}>
                <span className="p-text">{promptFor(key)}</span>
                <select
                  aria-label="Assign to rotation"
                  value={toolkit[key]}
                  onChange={(e) => setSlot(key, e.target.value)}
                >
                  {TOOLKIT_SLOTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="p-star"
                  aria-label="Remove from toolkit"
                  title="Remove"
                  onClick={() => remove(key)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
