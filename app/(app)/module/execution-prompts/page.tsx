"use client";

import ModuleMeta from "@/components/ModuleMeta";
import PromptDeck from "@/components/PromptDeck";
import PromptLab from "@/components/PromptLab";
import PromptToolkit from "@/components/PromptToolkit";
import { DECKS, EP_META, USAGE_MODES } from "@/lib/content/executionPrompts";

export default function ExecutionPromptsModule() {
  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Four · Practical Application</div>
        <h1 className="page-title">{EP_META.title}</h1>
        <p className="lede">“{EP_META.lede}”</p>
      </header>

      <ModuleMeta slug="execution-prompts" />

      <section className="card">
        <span className="tag">Orientation · Why Prompts Work</span>
        <h2>Prompts as spiritual interrupts</h2>
        <div className="body-copy">
          <p>
            A good prompt does three things at once: it interrupts autopilot and overthinking, it invites your
            Higher Self in Christ perspective, and it integrates faith with cognition. There is no wrong way
            to use them — the only requirement is honest engagement and a willingness to listen.
          </p>
        </div>
        <div className="teach" style={{ gridTemplateColumns: "1fr" }}>
          <div className="to">
            <h4>When to reach for a deck</h4>
            <ul>
              {USAGE_MODES.map((m) => (
                <li key={m.name}>
                  <b>{m.name}</b> — {m.desc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {DECKS.map((deck, i) => (
        <section className="card" key={deck.key}>
          <span className="tag">
            Deck {i + 1} of {DECKS.length} · {deck.prompts.length} prompts
          </span>
          <h2>{deck.title}</h2>
          <PromptDeck deck={deck} />
        </section>
      ))}

      <section className="card">
        <span className="tag">The Lab · Create Your Own</span>
        <h2>Custom prompt creation lab</h2>
        <p className="hint">
          The most powerful prompts are the ones written for your actual struggles. Name three recurring
          patterns, then craft an awareness, decision, and action prompt for each — your own spiritual
          technology.
        </p>
        <PromptLab />
      </section>

      <section className="card">
        <span className="tag">Your Collection</span>
        <h2>My personal prompt toolkit</h2>
        <PromptToolkit />
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>
          Let these prompts become daily conversation starters between you, your Higher Self in Christ, and
          the Spirit who leads you into all truth.
        </p>
      </footer>
    </div>
  );
}
