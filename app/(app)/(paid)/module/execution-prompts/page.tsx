"use client";

import ModuleMeta from "@/components/ModuleMeta";
import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import PromptDeck from "@/components/PromptDeck";
import PromptLab from "@/components/PromptLab";
import PromptToolkit from "@/components/PromptToolkit";

export default function ExecutionPromptsModule() {
  const { executionPrompts: ep, page } = usePaidCurriculum();
  const copy = page.executionPrompts;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Four · Practical Application</div>
        <h1 className="page-title">{ep.EP_META.title}</h1>
        <p className="lede">“{ep.EP_META.lede}”</p>
      </header>

      <ModuleMeta slug="execution-prompts" />

      <section className="card">
        <span className="tag">Orientation · Why Prompts Work</span>
        <h2>{copy.s1Title}</h2>
        <div className="body-copy">
          <p>{copy.s1Body}</p>
        </div>
        <div className="teach" style={{ gridTemplateColumns: "1fr" }}>
          <div className="to">
            <h4>When to reach for a deck</h4>
            <ul>
              {ep.USAGE_MODES.map((m: { name: string; desc: string }) => (
                <li key={m.name}>
                  <b>{m.name}</b> — {m.desc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {ep.DECKS.map((deck: { key: string; title: string; prompts: string[]; intro?: string }, i: number) => (
        <section className="card" key={deck.key}>
          <span className="tag">
            Deck {i + 1} of {ep.DECKS.length} · {deck.prompts.length} prompts
          </span>
          <h2>{deck.title}</h2>
          <PromptDeck deck={deck} />
        </section>
      ))}

      <section className="card">
        <span className="tag">The Lab · Create Your Own</span>
        <h2>{copy.labTitle}</h2>
        <p className="hint">{copy.labHint}</p>
        <PromptLab />
      </section>

      <section className="card">
        <span className="tag">Your Collection</span>
        <h2>{copy.toolkitTitle}</h2>
        <PromptToolkit />
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>{copy.footer}</p>
      </footer>
    </div>
  );
}
