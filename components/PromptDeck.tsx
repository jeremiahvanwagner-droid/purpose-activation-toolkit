"use client";

import { useResponse } from "@/lib/store";
import { Deck, deckField, TOOLKIT_FIELD } from "@/lib/content/executionPrompts";

type Journal = Record<string, string>;
type Toolkit = Record<string, string>;

export default function PromptDeck({ deck }: { deck: Deck }) {
  const [journal, setJournal] = useResponse<Journal>(deckField(deck.key), {});
  const [toolkit, setToolkit] = useResponse<Toolkit>(TOOLKIT_FIELD, {});

  const journaled = Object.values(journal).filter((t) => (t ?? "").trim()).length;

  function toggleFav(e: React.MouseEvent, key: string) {
    e.preventDefault();
    e.stopPropagation();
    const next = { ...toolkit };
    if (next[key]) delete next[key];
    else next[key] = "unsorted";
    setToolkit(next);
  }

  return (
    <div>
      <p className="hint">{deck.intro}</p>
      {journaled > 0 ? (
        <p className="assist" style={{ margin: "0 0 4px" }}>
          {journaled} of {deck.prompts.length} prompts journaled in this deck.
        </p>
      ) : null}
      {deck.prompts.map((p, i) => {
        const key = `${deck.key}:${i}`;
        const fav = Boolean(toolkit[key]);
        const hasJournal = Boolean((journal[i] ?? "").trim());
        return (
          <details className="p-item" key={key}>
            <summary>
              <button
                type="button"
                className={`p-star${fav ? " on" : ""}`}
                aria-label={fav ? "Remove from my toolkit" : "Save to my toolkit"}
                title={fav ? "In your toolkit" : "Save to my toolkit"}
                onClick={(e) => toggleFav(e, key)}
              >
                {fav ? "★" : "☆"}
              </button>
              <span className="p-text">{p}</span>
              {hasJournal ? <span className="p-dot" title="Journaled" /> : null}
            </summary>
            <div className="p-body">
              <div className="field" style={{ marginBottom: 0 }}>
                <textarea
                  rows={3}
                  aria-label={`Journal: ${p}`}
                  value={journal[i] ?? ""}
                  placeholder="Write until you reach clarity or the next right step…"
                  onChange={(e) => setJournal({ ...journal, [i]: e.target.value })}
                />
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
