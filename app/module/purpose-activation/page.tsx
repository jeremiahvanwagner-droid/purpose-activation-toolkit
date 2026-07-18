"use client";

import ModuleMeta from "@/components/ModuleMeta";
import Reflection from "@/components/Reflection";
import ValueRanker from "@/components/ValueRanker";
import PurposeStatement from "@/components/PurposeStatement";
import NumberedList from "@/components/NumberedList";
import DomainMatrix from "@/components/DomainMatrix";
import MorningDesigner from "@/components/MorningDesigner";
import BeliefReframe from "@/components/BeliefReframe";
import Plan30 from "@/components/Plan30";
import Covenant from "@/components/Covenant";
import {
  BELIEF_FIELDS,
  CLOSING_REFLECTIONS,
  DESIGN_DOMAINS,
  DIVINE,
  EGOIC,
  PA_META,
  S1_REFLECTIONS,
  S2_LISTS,
  S2_REFLECTION,
  S3_REFLECTION,
  S5_REFLECTION,
  S6_REFLECTION,
  S7_REFLECTION,
} from "@/lib/content/purposeActivation";

export default function PurposeActivationModule() {
  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module One · Purpose Activation Framework</div>
        <h1 className="page-title">{PA_META.title}</h1>
        <p className="lede">
          “You are a Child of God, called according to His purpose, equipped with everything you need to
          fulfill your assignment. Now walk in it.”
        </p>
      </header>

      <ModuleMeta slug="purpose-activation" />

      {/* ---------- Section 1 — Orientation ---------- */}
      <section className="card">
        <span className="tag">Section 1 · The Teaching</span>
        <h2>Divine purpose, not egoic ambition</h2>
        <div className="body-copy">
          <p>
            Purpose Activation is the intentional process of discerning your God-given design, aligning your
            inner life with your Higher Self in Christ, and translating that alignment into visible, fruitful
            action. It is not about proving yourself — it is stewardship of an assignment you were given long
            before today.
          </p>
        </div>
        <div className="scripture">
          You were given permission the day you were conceived — fearfully and wonderfully made.
          <cite>Psalm 139</cite>
        </div>
        <div className="teach">
          <div className="from">
            <h4>Egoic ambition</h4>
            <ul>
              {EGOIC.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>Divine purpose</h4>
            <ul>
              {DIVINE.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 1 · Reflection</span>
        <h2>Begin honestly</h2>
        <p className="hint">
          Set aside five quiet minutes per question. Be ruthlessly honest — self-deception is the enemy of
          activation. This is a judgment-free space between you and the Spirit.
        </p>
        {S1_REFLECTIONS.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} />
        ))}
      </section>

      {/* ---------- Section 2 — Design ---------- */}
      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>Discover your design patterns</h2>
        <div className="body-copy">
          <p>
            Purpose flows from design. God wired you through four channels — {DESIGN_DOMAINS.join(", ").toLowerCase()} —
            and the evidence of that wiring is already visible in your life. Answer as specifically as
            possible, then look for the recurring themes.
          </p>
        </div>
        {S2_LISTS.map((l) => (
          <NumberedList key={l.id} id={l.id} label={l.label} assist={l.assist} noun={l.noun} />
        ))}
        <Reflection id={S2_REFLECTION.id} prompt={S2_REFLECTION.prompt} assist={S2_REFLECTION.assist} />
      </section>

      {/* ---------- Section 3 — Values ---------- */}
      <section className="card">
        <span className="tag">Section 3 · Exercise</span>
        <h2>Rank your core values</h2>
        <p className="hint">
          Your values are the operating system of your Higher Self in Christ. Tap the values that resonate most
          deeply, choose your top <b>7</b>, and use the arrows to order what matters most.
        </p>
        <ValueRanker />
        <div style={{ marginTop: 20 }}>
          <Reflection id={S3_REFLECTION.id} prompt={S3_REFLECTION.prompt} assist={S3_REFLECTION.assist} />
        </div>
      </section>

      {/* ---------- Section 4 — Purpose Statement ---------- */}
      <section className="card">
        <span className="tag">Section 4 · The Payoff</span>
        <h2>Craft your purpose statement</h2>
        <p className="hint">
          Fill in the four parts and watch your statement take shape — then illuminate it. This becomes the
          compass for the entire toolkit.
        </p>
        <PurposeStatement />
      </section>

      {/* ---------- Section 5 — Purpose Domains ---------- */}
      <section className="card">
        <span className="tag">Section 5 · Exercise</span>
        <h2>Map your six life domains</h2>
        <p className="hint">
          Purpose isn't one compartment of your life — it wants expression in every domain. For each one, name
          where it honestly stands, what alignment would look like, and the one shift that moves it forward.
        </p>
        <DomainMatrix />
        <div style={{ marginTop: 20 }}>
          <Reflection id={S5_REFLECTION.id} prompt={S5_REFLECTION.prompt} assist={S5_REFLECTION.assist} />
        </div>
      </section>

      {/* ---------- Section 6 — Purpose Morning ---------- */}
      <section className="card">
        <span className="tag">Section 6 · Ritual</span>
        <h2>Design your Purpose Morning</h2>
        <div className="body-copy">
          <p>
            Purpose is realized through daily practice, not occasional inspiration. A Purpose Morning is 15–60
            minutes anchored by three non-negotiable practices — Word, focus, and one aligned action.
          </p>
        </div>
        <div className="scripture">
          Grand vision without daily discipline is fantasy.
          <cite>The Purpose Activation Framework</cite>
        </div>
        <MorningDesigner />
        <div style={{ marginTop: 20 }}>
          <Reflection id={S6_REFLECTION.id} prompt={S6_REFLECTION.prompt} assist={S6_REFLECTION.assist} />
        </div>
      </section>

      {/* ---------- Section 7 — Renewing the Mind ---------- */}
      <section className="card">
        <span className="tag">Section 7 · Renewing the Mind</span>
        <h2>Trade the lies for truth</h2>
        <div className="body-copy">
          <p>
            Your thoughts shape your feelings, and your feelings drive your behaviors — thoughts become
            beliefs, beliefs become identity, identity becomes destiny. Name the three lies that most often
            shrink your calling, then answer each one with truth.
          </p>
        </div>
        <div className="scripture">
          Take captive every thought to make it obedient to Christ.
          <cite>2 Corinthians 10:5</cite>
        </div>
        {BELIEF_FIELDS.map((id, i) => (
          <BeliefReframe key={id} id={id} index={i + 1} />
        ))}
        <div style={{ marginTop: 20 }}>
          <Reflection id={S7_REFLECTION.id} prompt={S7_REFLECTION.prompt} />
        </div>
      </section>

      {/* ---------- Section 8 — 30-Day Plan + Covenant ---------- */}
      <section className="card">
        <span className="tag">Section 8 · Commitment</span>
        <h2>Your 30-day activation plan</h2>
        <div className="body-copy">
          <p>
            Insight becomes transformation through commitment — clarity without commitment is just
            inspiration. Choose one focus, set four weekly targets, and name the tiny actions you'll take
            every single day.
          </p>
        </div>
        <Plan30 />
        <Covenant />
      </section>

      {/* ---------- Section 9 — After Day 30 ---------- */}
      <section className="card later">
        <span className="later-badge">Return after Day 30</span>
        <h2>Closing reflection: what's next?</h2>
        <p className="hint">
          Come back when your 30 days are complete. These five questions turn your experience into your next
          assignment — and they don't count toward today's progress, so finish the module without them.
        </p>
        {CLOSING_REFLECTIONS.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
        ))}
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>
          Module 1 complete: teaching, exercises, ritual design, and your signed 30-day covenant — every answer
          saved automatically. Module 2, Proper Decision-Making, is next on the path.
        </p>
      </footer>
    </div>
  );
}
