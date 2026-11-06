"use client";

import Covenant from "@/components/Covenant";
import DecisionGrid from "@/components/DecisionGrid";
import DistortionRewrite from "@/components/DistortionRewrite";
import DomainApps from "@/components/DomainApps";
import ListeningTimer from "@/components/ListeningTimer";
import LowerHigherFilter from "@/components/LowerHigherFilter";
import ModuleMeta from "@/components/ModuleMeta";
import NumberedList from "@/components/NumberedList";
import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import PendingDecision from "@/components/PendingDecision";
import Reflection from "@/components/Reflection";
import SevenStepFramework from "@/components/SevenStepFramework";

export default function DecisionMakingModule() {
  const { decisionMaking: dm, page } = usePaidCurriculum();
  const copy = page.decisionMaking;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Two · Proper Decision-Making Techniques</div>
        <h1 className="page-title">{dm.DM_META.title}</h1>
        <p className="lede">“{dm.DM_META.lede}”</p>
      </header>

      <ModuleMeta slug="decision-making" />

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
            <h4>Reactive deciding</h4>
            <ul>
              {dm.REACTIVE.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>Stewardship deciding</h4>
            <ul>
              {dm.STEWARD.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 1 · Reflection</span>
        <h2>{copy.s1ReflectTitle}</h2>
        <p className="hint">{copy.s1ReflectHint}</p>
        {dm.DM_S1_REFLECTIONS.map((r: { id: string; prompt: string; assist?: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} />
        ))}
      </section>

      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>{copy.s2Title}</h2>
        <div className="body-copy">
          <p>
            {copy.s2Lead} <b>“{dm.FILTER_QUESTION}”</b>
          </p>
        </div>
        <div className="teach">
          <div className="from">
            <h4>The Lower Self decides from</h4>
            <ul>
              {dm.LOWER.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>The Higher Self in Christ decides from</h4>
            <ul>
              {dm.HIGHER.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <LowerHigherFilter />
        </div>
        <div style={{ marginTop: 20 }}>
          <Reflection id={dm.DM_S2_REFLECTION.id} prompt={dm.DM_S2_REFLECTION.prompt} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 3 · The Framework</span>
        <h2>{copy.s3Title}</h2>
        <p className="hint">{copy.s3Hint}</p>
        <div className="scripture">
          {copy.s3Scripture}
          <cite>{copy.s3Cite}</cite>
        </div>
        <SevenStepFramework />
      </section>

      <section className="card">
        <span className="tag">Section 4 · Renewing the Mind</span>
        <h2>{copy.s4Title}</h2>
        <div className="body-copy">
          <p>{copy.s4Body}</p>
        </div>
        <div className="teach" style={{ gridTemplateColumns: "1fr" }}>
          <div className="to">
            <h4>Common distortions in decision-making</h4>
            <ul>
              {dm.DISTORTIONS.map((d: { name: string; ex: string }) => (
                <li key={d.name}>
                  <b>{d.name}</b> — {d.ex}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          {dm.EMOTIONS_NOTE}
        </p>
        <p className="hint" style={{ marginTop: 16 }}>
          {copy.s4Rewrite}
        </p>
        {dm.REWRITE_FIELDS.map((id: string, i: number) => (
          <DistortionRewrite key={id} id={id} index={i + 1} />
        ))}
        <div style={{ marginTop: 20 }}>
          <Reflection id={dm.DM_S4_REFLECTION.id} prompt={dm.DM_S4_REFLECTION.prompt} assist={dm.DM_S4_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 5 · The Flagship Tool</span>
        <h2>{copy.s5Title}</h2>
        <p className="hint">{copy.s5Hint}</p>
        <DecisionGrid />
        <div style={{ marginTop: 20 }}>
          {dm.DM_S5_REFLECTIONS.map((r: { id: string; prompt: string }) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
          <Reflection id={dm.DM_S5_SPIRIT.id} prompt={dm.DM_S5_SPIRIT.prompt} assist={dm.DM_S5_SPIRIT.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 6 · Listening Prayer</span>
        <h2>{copy.s6Title}</h2>
        <div className="body-copy">
          <p>{copy.s6Body.replace("{channels}", dm.CHANNELS.join(", "))}</p>
        </div>
        <div className="scripture">
          {copy.s6Scripture}
          <cite>{copy.s6Cite}</cite>
        </div>
        <ListeningTimer />
        <div style={{ marginTop: 20 }}>
          {dm.LISTENING_PROMPTS.map((r: { id: string; prompt: string }) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 7 · Applications</span>
        <h2>{copy.s7Title}</h2>
        <p className="hint">{copy.s7Hint}</p>
        <DomainApps />
        <div style={{ marginTop: 20 }}>
          <Reflection id={dm.DM_S7_REFLECTION.id} prompt={dm.DM_S7_REFLECTION.prompt} assist={dm.DM_S7_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 8 · Commitment</span>
        <h2>{copy.s8Title}</h2>
        <div className="body-copy">
          <p>{copy.s8Body}</p>
        </div>
        <NumberedList
          id={dm.PRACTICES_FIELD}
          count={3}
          noun="Practice"
          label="My three non-negotiable decision practices"
          assist={copy.practicesAssist}
        />
        <PendingDecision />
        <Covenant id={dm.DM_COMMIT_FIELD} buttonLabel="Sign my Decision Covenant" body={dm.DM_COVENANT_BODY} />
      </section>

      <section className="card later">
        <span className="later-badge">Return after Day 30</span>
        <h2>{copy.s9Title}</h2>
        <p className="hint">{copy.s9Hint}</p>
        {dm.DM_CLOSING.map((r: { id: string; prompt: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
        ))}
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>{copy.footer}</p>
      </footer>
    </div>
  );
}
