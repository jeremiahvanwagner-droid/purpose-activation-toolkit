"use client";

import BeliefReframe from "@/components/BeliefReframe";
import Covenant from "@/components/Covenant";
import DomainMatrix from "@/components/DomainMatrix";
import ModuleMeta from "@/components/ModuleMeta";
import MorningDesigner from "@/components/MorningDesigner";
import NumberedList from "@/components/NumberedList";
import Plan30 from "@/components/Plan30";
import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import PurposeStatement from "@/components/PurposeStatement";
import Reflection from "@/components/Reflection";
import ValueRanker from "@/components/ValueRanker";

export default function PurposeActivationModule() {
  const { purposeActivation: pa, page } = usePaidCurriculum();
  const copy = page.purposeActivation;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module One · Purpose Activation Framework</div>
        <h1 className="page-title">{pa.PA_META.title}</h1>
        <p className="lede">“{copy.lede}”</p>
      </header>

      <ModuleMeta slug="purpose-activation" />

      <div className="callout" style={{ marginTop: 0, marginBottom: 22 }}>
        <b>Where to begin.</b> {copy.whereToBegin}
      </div>

      <section className="card">
        <span className="tag">Section 1 · The Teaching</span>
        <h2>{copy.s1Title}</h2>
        <div className="body-copy">
          <p>{copy.s1Body}</p>
        </div>
        <div className="scripture">
          {copy.s1Scripture}
          <cite>{copy.s1Cite}</cite>
        </div>
        <div className="teach">
          <div className="from">
            <h4>Egoic ambition</h4>
            <ul>
              {pa.EGOIC.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>Divine purpose</h4>
            <ul>
              {pa.DIVINE.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="body-copy" style={{ marginTop: 18 }}>
          <p>{copy.s1Levels}</p>
        </div>
        <div className="components">
          {pa.FOUR_COMPONENTS.map((c: { name: string; desc: string; example: string | null }) => (
            <div className="comp" key={c.name}>
              <h4>{c.name}</h4>
              <p>{c.desc}</p>
              {c.example ? <p className="ex">Example: {c.example}</p> : null}
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          <b>Key insight:</b> {pa.FOUR_COMPONENTS_INSIGHT}
        </p>
      </section>

      <section className="card">
        <span className="tag">Section 1 · Reflection</span>
        <h2>{copy.s1ReflectTitle}</h2>
        <p className="hint">{copy.s1ReflectHint}</p>
        {pa.S1_REFLECTIONS.map((r: { id: string; prompt: string; assist?: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist ?? ""} />
        ))}
      </section>

      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>{copy.s2Title}</h2>
        <div className="body-copy">
          <p>{copy.s2Body.replace("{channels}", pa.DESIGN_DOMAINS.join(", ").toLowerCase())}</p>
        </div>
        {pa.S2_LISTS.map((l: { id: string; label: string; assist?: string; noun?: string }) => (
          <NumberedList key={l.id} id={l.id} label={l.label} assist={l.assist} noun={l.noun ?? "Item"} />
        ))}
        <Reflection id={pa.S2_REFLECTION.id} prompt={pa.S2_REFLECTION.prompt} assist={pa.S2_REFLECTION.assist} />
      </section>

      <section className="card">
        <span className="tag">Section 3 · Exercise</span>
        <h2>{copy.s3Title}</h2>
        <p className="hint">{copy.s3Hint}</p>
        <ValueRanker />
        <div style={{ marginTop: 20 }}>
          <Reflection id={pa.S3_REFLECTION.id} prompt={pa.S3_REFLECTION.prompt} assist={pa.S3_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 4 · The Payoff</span>
        <h2>{copy.s4Title}</h2>
        <p className="hint">{copy.s4Hint}</p>
        <ul className="statement-examples" aria-label="Examples">
          {pa.STATEMENT_EXAMPLES.map((x: string) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <PurposeStatement />
      </section>

      <section className="card">
        <span className="tag">Section 5 · Exercise</span>
        <h2>{copy.s5Title}</h2>
        <p className="hint">{copy.s5Hint}</p>
        <DomainMatrix />
        <div style={{ marginTop: 20 }}>
          <Reflection id={pa.S5_REFLECTION.id} prompt={pa.S5_REFLECTION.prompt} assist={pa.S5_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 6 · Ritual</span>
        <h2>{copy.s6Title}</h2>
        <div className="body-copy">
          <p>{copy.s6Body}</p>
        </div>
        <div className="scripture">
          {copy.s6Scripture}
          <cite>{copy.s6Cite}</cite>
        </div>
        <MorningDesigner />
        <div style={{ marginTop: 20 }}>
          <Reflection id={pa.S6_REFLECTION.id} prompt={pa.S6_REFLECTION.prompt} assist={pa.S6_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 7 · Renewing the Mind</span>
        <h2>{copy.s7Title}</h2>
        <div className="body-copy">
          <p>{copy.s7Body}</p>
        </div>
        <div className="scripture">
          {copy.s7Scripture}
          <cite>{copy.s7Cite}</cite>
        </div>
        {pa.BELIEF_FIELDS.map((id: string, i: number) => (
          <BeliefReframe key={id} id={id} index={i + 1} />
        ))}
        <div style={{ marginTop: 20 }}>
          <Reflection id={pa.S7_REFLECTION.id} prompt={pa.S7_REFLECTION.prompt} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 8 · Commitment</span>
        <h2>{copy.s8Title}</h2>
        <div className="body-copy">
          <p>{copy.s8Body}</p>
        </div>
        <Plan30 />
        <Covenant id={pa.COMMIT_FIELD} buttonLabel="Sign my 30-day commitment" body={copy.covenantBody} />
      </section>

      <section className="card later">
        <span className="later-badge">Return after Day 30</span>
        <h2>{copy.s9Title}</h2>
        <p className="hint">{copy.s9Hint}</p>
        {pa.CLOSING_REFLECTIONS.map((r: { id: string; prompt: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
        ))}
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>{copy.footer}</p>
      </footer>
    </div>
  );
}
