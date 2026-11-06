"use client";

import AlignedFormula from "@/components/AlignedFormula";
import Covenant from "@/components/Covenant";
import Ecosystem from "@/components/Ecosystem";
import ModuleMeta from "@/components/ModuleMeta";
import NumberedList from "@/components/NumberedList";
import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import Plan90 from "@/components/Plan90";
import Reflection from "@/components/Reflection";
import ResistancePairs from "@/components/ResistancePairs";
import RitualDesigner from "@/components/RitualDesigner";
import Tracker21 from "@/components/Tracker21";

export default function AlignmentToActionModule() {
  const { alignmentToAction: ata, page } = usePaidCurriculum();
  const copy = page.alignmentToAction;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Three · Alignment-to-Action</div>
        <h1 className="page-title">{ata.ATA_META.title}</h1>
        <p className="lede">“{ata.ATA_META.lede}”</p>
      </header>

      <ModuleMeta slug="alignment-to-action" />

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
        {ata.ATA_S1_REFLECTIONS.map((r: { id: string; prompt: string; assist?: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} />
        ))}
      </section>

      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>{copy.s2Title}</h2>
        <p className="hint">{copy.s2Hint}</p>
        <NumberedList id={ata.IN_FIELD} count={5} noun="Sign" label={copy.inLabel} assist={ata.IN_ASSIST} />
        <NumberedList id={ata.OUT_FIELD} count={5} noun="Sign" label={copy.outLabel} assist={ata.OUT_ASSIST} />
        {ata.ATA_S2_REFLECTIONS.map((r: { id: string; prompt: string; assist?: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} minRows={2} />
        ))}
      </section>

      <section className="card">
        <span className="tag">Section 3 · The Framework</span>
        <h2>{copy.s3Title}</h2>
        <p className="hint">{copy.s3Hint}</p>
        <AlignedFormula />
      </section>

      <section className="card">
        <span className="tag">Section 4 · Removing Friction</span>
        <h2>{copy.s4Title}</h2>
        <div className="body-copy">
          <p>{copy.s4Body.replace("{forms}", ata.RESIST_FORMS.join(", ").toLowerCase())}</p>
        </div>
        <div className="scripture">
          {copy.s4Scripture}
          <cite>{copy.s4Cite}</cite>
        </div>
        <ResistancePairs />
        <div style={{ marginTop: 20 }}>
          <Reflection id={ata.ATA_S4_REFLECTION.id} prompt={ata.ATA_S4_REFLECTION.prompt} assist={ata.ATA_S4_REFLECTION.assist} />
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 5 · Ritual</span>
        <h2>{copy.s5Title}</h2>
        <p className="hint">{copy.s5Hint}</p>
        <RitualDesigner />
      </section>

      <section className="card">
        <span className="tag">Section 6 · Community</span>
        <h2>{copy.s6Title}</h2>
        <div className="body-copy">
          <p>{copy.s6Body}</p>
        </div>
        <div className="scripture">
          {copy.s6Scripture}
          <cite>{copy.s6Cite}</cite>
        </div>
        <Ecosystem />
        <div style={{ marginTop: 20 }}>
          {ata.ATA_S6_REFLECTIONS.map((r: { id: string; prompt: string }) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 7 · The Challenge</span>
        <h2>{copy.s7Title}</h2>
        <p className="hint">{copy.s7Hint}</p>
        <Tracker21 />
      </section>

      <section className="card later">
        <span className="later-badge">Return after Day 21</span>
        <h2>{copy.s8Title}</h2>
        <p className="hint">{copy.s8Hint}</p>
        <Reflection id={ata.POST_CHALLENGE.id} prompt={ata.POST_CHALLENGE.prompt} assist={ata.POST_CHALLENGE.assist} />
        {ata.INTEGRATION.map((r: { id: string; prompt: string; assist?: string }) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} minRows={2} />
        ))}
      </section>

      <section className="card">
        <span className="tag">Section 9 · Commitment</span>
        <h2>{copy.s9Title}</h2>
        <div className="body-copy">
          <p>{copy.s9Body}</p>
        </div>
        <Plan90 />
        <Covenant id={ata.ATA_COMMIT_FIELD} buttonLabel="Sign my 90-day commitment" body={ata.ATA_COVENANT_BODY} />
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>{copy.footer}</p>
      </footer>
    </div>
  );
}
