"use client";

import ModuleMeta from "@/components/ModuleMeta";
import Reflection from "@/components/Reflection";
import NumberedList from "@/components/NumberedList";
import Covenant from "@/components/Covenant";
import AlignedFormula from "@/components/AlignedFormula";
import ResistancePairs from "@/components/ResistancePairs";
import RitualDesigner from "@/components/RitualDesigner";
import Ecosystem from "@/components/Ecosystem";
import Tracker21 from "@/components/Tracker21";
import Plan90 from "@/components/Plan90";
import {
  ATA_COMMIT_FIELD,
  ATA_COVENANT_BODY,
  ATA_META,
  ATA_S1_REFLECTIONS,
  ATA_S2_REFLECTIONS,
  ATA_S4_REFLECTION,
  ATA_S6_REFLECTIONS,
  IN_ASSIST,
  IN_FIELD,
  INTEGRATION,
  OUT_ASSIST,
  OUT_FIELD,
  POST_CHALLENGE,
  RESIST_FORMS,
} from "@/lib/content/alignmentToAction";

export default function AlignmentToActionModule() {
  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Three · Alignment-to-Action</div>
        <h1 className="page-title">{ATA_META.title}</h1>
        <p className="lede">“{ATA_META.lede}”</p>
      </header>

      <ModuleMeta slug="alignment-to-action" />

      {/* Section 1 */}
      <section className="card">
        <span className="tag">Section 1 · The Teaching</span>
        <h2>From intention to embodiment</h2>
        <div className="body-copy">
          <p>
            You know what you're called to — but somewhere between knowing and doing, the bridge collapses.
            Alignment is congruence; action is proof. This module closes the gap with small, compounding,
            Spirit-led actions.
          </p>
        </div>
        <div className="scripture">
          Do not merely listen to the word, and so deceive yourselves. Do what it says.
          <cite>James 1:22</cite>
        </div>
        {ATA_S1_REFLECTIONS.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} />
        ))}
      </section>

      {/* Section 2 */}
      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>My alignment indicators</h2>
        <p className="hint">
          Alignment has dashboard lights — green lights that say you're in flow with the Spirit, and red
          lights that say you've drifted. Name yours so you can catch drift early.
        </p>
        <NumberedList id={IN_FIELD} count={5} noun="Sign" label="5 ways I know I am IN alignment" assist={IN_ASSIST} />
        <NumberedList id={OUT_FIELD} count={5} noun="Sign" label="5 signs I am OUT of alignment" assist={OUT_ASSIST} />
        {ATA_S2_REFLECTIONS.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} minRows={2} />
        ))}
      </section>

      {/* Section 3 */}
      <section className="card">
        <span className="tag">Section 3 · The Framework</span>
        <h2>The Aligned Action Formula</h2>
        <p className="hint">
          Most people jump from Purpose straight to Outcomes — and stall. The formula honors the middle steps.
          Choose one domain and walk it through.
        </p>
        <AlignedFormula />
      </section>

      {/* Section 4 */}
      <section className="card">
        <span className="tag">Section 4 · Removing Friction</span>
        <h2>Name and bypass resistance</h2>
        <div className="body-copy">
          <p>
            Resistance wears five familiar faces — {RESIST_FORMS.join(", ").toLowerCase()} — and it always
            lies. The antidote is truth, grace, and micro-steps: name the lie, release perfectionism, and
            shrink the action until resistance can't argue with it.
          </p>
        </div>
        <div className="scripture">
          You have everything you need. Resistance is a liar.
          <cite>Alignment-to-Action</cite>
        </div>
        <ResistancePairs />
        <div style={{ marginTop: 20 }}>
          <Reflection id={ATA_S4_REFLECTION.id} prompt={ATA_S4_REFLECTION.prompt} assist={ATA_S4_REFLECTION.assist} />
        </div>
      </section>

      {/* Section 5 */}
      <section className="card">
        <span className="tag">Section 5 · Ritual</span>
        <h2>Design your daily aligned-action ritual</h2>
        <p className="hint">
          Alignment is a daily practice, not a one-time decision. Three touchpoints — morning, midday, evening
          — keep you on the path all day long.
        </p>
        <RitualDesigner />
      </section>

      {/* Section 6 */}
      <section className="card">
        <span className="tag">Section 6 · Community</span>
        <h2>Build your accountability ecosystem</h2>
        <div className="body-copy">
          <p>
            Alignment stabilizes in community. Isolated intentions fade; witnessed commitments endure. Build
            three layers of support around your purpose.
          </p>
        </div>
        <div className="scripture">
          And let us consider how we may spur one another on toward love and good deeds, not giving up meeting
          together.
          <cite>Hebrews 10:24–25</cite>
        </div>
        <Ecosystem />
        <div style={{ marginTop: 20 }}>
          {ATA_S6_REFLECTIONS.map((r) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
        </div>
      </section>

      {/* Section 7 */}
      <section className="card">
        <span className="tag">Section 7 · The Challenge</span>
        <h2>The 21-Day Alignment Challenge</h2>
        <p className="hint">
          Twenty-one days to rewire your life: one clear, purpose-aligned action every day, written down, with
          a one-sentence reflection. The rules keep it honest — and grace keeps it going.
        </p>
        <Tracker21 />
      </section>

      {/* Section 8 — after the challenge */}
      <section className="card later">
        <span className="later-badge">Return after Day 21</span>
        <h2>Integration: from challenge to lifestyle</h2>
        <p className="hint">
          Come back once your 21 days are complete. These don't count toward today's progress.
        </p>
        <Reflection id={POST_CHALLENGE.id} prompt={POST_CHALLENGE.prompt} assist={POST_CHALLENGE.assist} />
        {INTEGRATION.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} minRows={2} />
        ))}
      </section>

      {/* Section 9 */}
      <section className="card">
        <span className="tag">Section 9 · Commitment</span>
        <h2>Your 90-day alignment focus plan</h2>
        <div className="body-copy">
          <p>
            The challenge builds the habit; the 90-day cycle builds the life. Choose one focus, three
            non-negotiables, and the structures that will hold you — then seal it.
          </p>
        </div>
        <Plan90 />
        <Covenant id={ATA_COMMIT_FIELD} buttonLabel="Sign my 90-day commitment" body={ATA_COVENANT_BODY} />
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>
          You are no longer a person who just knows — you are a person who does. Next on the path: Execution
          Prompts, your daily companion.
        </p>
      </footer>
    </div>
  );
}
