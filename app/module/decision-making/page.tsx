"use client";

import ModuleMeta from "@/components/ModuleMeta";
import Reflection from "@/components/Reflection";
import NumberedList from "@/components/NumberedList";
import Covenant from "@/components/Covenant";
import LowerHigherFilter from "@/components/LowerHigherFilter";
import SevenStepFramework from "@/components/SevenStepFramework";
import DistortionRewrite from "@/components/DistortionRewrite";
import DecisionGrid from "@/components/DecisionGrid";
import ListeningTimer from "@/components/ListeningTimer";
import DomainApps from "@/components/DomainApps";
import PendingDecision from "@/components/PendingDecision";
import {
  CHANNELS,
  DISTORTIONS,
  DM_CLOSING,
  DM_COMMIT_FIELD,
  DM_COVENANT_BODY,
  DM_META,
  DM_S1_REFLECTIONS,
  DM_S2_REFLECTION,
  DM_S4_REFLECTION,
  DM_S5_REFLECTIONS,
  DM_S5_SPIRIT,
  DM_S7_REFLECTION,
  FILTER_QUESTION,
  HIGHER,
  LISTENING_PROMPTS,
  LOWER,
  PRACTICES_FIELD,
  REACTIVE,
  REWRITE_FIELDS,
  STEWARD,
} from "@/lib/content/decisionMaking";

export default function DecisionMakingModule() {
  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Module Two · Proper Decision-Making Techniques</div>
        <h1 className="page-title">{DM_META.title}</h1>
        <p className="lede">“{DM_META.lede}”</p>
      </header>

      <ModuleMeta slug="decision-making" />

      {/* Section 1 */}
      <section className="card">
        <span className="tag">Section 1 · The Teaching</span>
        <h2>Every decision is a seed</h2>
        <div className="body-copy">
          <p>
            Your decisions are spiritual stewardship — of your calling, your time, your relationships, your
            resources, and your integrity. Every choice sows a seed, and seeds determine harvests. The
            question is never <i>whether</i> you're sowing, only <i>what</i>.
          </p>
        </div>
        <div className="scripture">
          Do not be deceived: God cannot be mocked. A man reaps what he sows.
          <cite>Galatians 6:7</cite>
        </div>
        <div className="teach">
          <div className="from">
            <h4>Reactive deciding</h4>
            <ul>
              {REACTIVE.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>Stewardship deciding</h4>
            <ul>
              {STEWARD.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="tag">Section 1 · Reflection</span>
        <h2>Bring one decision into the light</h2>
        <p className="hint">
          Free-write for 5–7 minutes. Don't edit or overthink — this workbook works best with a live decision
          on the table.
        </p>
        {DM_S1_REFLECTIONS.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} assist={r.assist} />
        ))}
      </section>

      {/* Section 2 */}
      <section className="card">
        <span className="tag">Section 2 · Exercise</span>
        <h2>The Higher-Self decision filter</h2>
        <div className="body-copy">
          <p>
            Every decision is made by one of two selves. The one question to carry into every choice:{" "}
            <b>“{FILTER_QUESTION}”</b>
          </p>
        </div>
        <div className="teach">
          <div className="from">
            <h4>The Lower Self decides from</h4>
            <ul>
              {LOWER.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="to">
            <h4>The Higher Self in Christ decides from</h4>
            <ul>
              {HIGHER.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <LowerHigherFilter />
        </div>
        <div style={{ marginTop: 20 }}>
          <Reflection id={DM_S2_REFLECTION.id} prompt={DM_S2_REFLECTION.prompt} />
        </div>
      </section>

      {/* Section 3 */}
      <section className="card">
        <span className="tag">Section 3 · The Framework</span>
        <h2>The 7-Step Divine Decision Framework</h2>
        <p className="hint">
          A repeatable process for every significant choice. Walk your live decision through all seven steps —
          over time this becomes second nature, and indecision loses its grip. Remember: indecision is a
          decision — it's a decision to stay stuck.
        </p>
        <div className="scripture">
          Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit
          to him, and he will make your paths straight.
          <cite>Proverbs 3:5–6</cite>
        </div>
        <SevenStepFramework />
      </section>

      {/* Section 4 */}
      <section className="card">
        <span className="tag">Section 4 · Renewing the Mind</span>
        <h2>Catch the distortions</h2>
        <div className="body-copy">
          <p>
            Discernment gets distorted by predictable thought patterns. Learn to name them, and they lose
            their authority:
          </p>
        </div>
        <div className="teach" style={{ gridTemplateColumns: "1fr" }}>
          <div className="to">
            <h4>Common distortions in decision-making</h4>
            <ul>
              {DISTORTIONS.map((d) => (
                <li key={d.name}>
                  <b>{d.name}</b> — {d.ex}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 16 }}>
          For your live decision, catch three distorted thoughts and rewrite each as truth.
        </p>
        {REWRITE_FIELDS.map((id, i) => (
          <DistortionRewrite key={id} id={id} index={i + 1} />
        ))}
        <div style={{ marginTop: 20 }}>
          <Reflection id={DM_S4_REFLECTION.id} prompt={DM_S4_REFLECTION.prompt} assist={DM_S4_REFLECTION.assist} />
        </div>
      </section>

      {/* Section 5 */}
      <section className="card">
        <span className="tag">Section 5 · The Flagship Tool</span>
        <h2>The Values-Based Decision Grid</h2>
        <p className="hint">
          Name up to three options and score each against five criteria, 1–5. The totals calculate live — then
          the grid hands the final word back to your spirit.
        </p>
        <DecisionGrid />
        <div style={{ marginTop: 20 }}>
          {DM_S5_REFLECTIONS.map((r) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
          <Reflection id={DM_S5_SPIRIT.id} prompt={DM_S5_SPIRIT.prompt} assist={DM_S5_SPIRIT.assist} />
        </div>
      </section>

      {/* Section 6 */}
      <section className="card">
        <span className="tag">Section 6 · Listening Prayer</span>
        <h2>Ten minutes of listening</h2>
        <div className="body-copy">
          <p>
            God guides through three channels — {CHANNELS.join(", ")}. When all three align, you have clarity.
            When they conflict, wait. This guided practice opens the third channel: quieting yourself enough
            to hear.
          </p>
        </div>
        <div className="scripture">
          My sheep listen to my voice; I know them, and they follow me.
          <cite>John 10:27</cite>
        </div>
        <ListeningTimer />
        <div style={{ marginTop: 20 }}>
          {LISTENING_PROMPTS.map((r) => (
            <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
          ))}
        </div>
      </section>

      {/* Section 7 */}
      <section className="card">
        <span className="tag">Section 7 · Applications</span>
        <h2>Decisions in every domain</h2>
        <p className="hint">
          Context matters. For each life domain, sit with the key considerations — then run a live or upcoming
          decision through the quick application.
        </p>
        <DomainApps />
        <div style={{ marginTop: 20 }}>
          <Reflection id={DM_S7_REFLECTION.id} prompt={DM_S7_REFLECTION.prompt} assist={DM_S7_REFLECTION.assist} />
        </div>
      </section>

      {/* Section 8 */}
      <section className="card">
        <span className="tag">Section 8 · Commitment</span>
        <h2>Your Decision Covenant</h2>
        <div className="body-copy">
          <p>
            For the next 30 days, no major decision gets made without your three practices. Name them, name
            one pending decision, and seal it.
          </p>
        </div>
        <NumberedList
          id={PRACTICES_FIELD}
          count={3}
          noun="Practice"
          label="My three non-negotiable decision practices"
          assist="e.g., 10 minutes of listening prayer · completing the Values-Based Decision Grid · one conversation with wise counsel."
        />
        <PendingDecision />
        <Covenant id={DM_COMMIT_FIELD} buttonLabel="Sign my Decision Covenant" body={DM_COVENANT_BODY} />
      </section>

      {/* Section 9 */}
      <section className="card later">
        <span className="later-badge">Return after Day 30</span>
        <h2>Closing reflection: what's next?</h2>
        <p className="hint">
          Come back when your 30-day covenant is complete. These don't count toward today's progress.
        </p>
        {DM_CLOSING.map((r) => (
          <Reflection key={r.id} id={r.id} prompt={r.prompt} minRows={2} />
        ))}
      </section>

      <footer style={{ marginTop: 10, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--slate)", lineHeight: 1.6, maxWidth: "64ch" }}>
          You are not condemned to confusion or paralysis. You are called to walk by the Spirit, make wise
          choices, and steward your life faithfully. Now decide. Next on the path: Alignment-to-Action.
        </p>
      </footer>
    </div>
  );
}
