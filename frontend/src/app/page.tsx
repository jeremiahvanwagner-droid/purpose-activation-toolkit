"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedSection } from "@/components/AnimatedSection";

const journeySteps = [
  {
    title: "Awaken",
    description: "Clarify the divine potential that already lives within you.",
  },
  {
    title: "Align",
    description: "Fuse intention, purpose, and daily rituals into one rhythm.",
  },
  {
    title: "Activate",
    description: "Take consistent action with accountability and reflection.",
  },
  {
    title: "Integrate",
    description: "Sustain the practices that keep purpose alive.",
  },
];

const sections = [
  {
    id: "mission",
    title: "Mission & Vision",
    body: [
      "Truth J Blue LLC exists to empower individuals to recognise their Divine Power, awaken to their Divine Potential and align with their Divine Purpose.",
      "The Purpose Activation Toolkit (PAK) is a self-serve experience that blends quantum science, the psychology of intention, and evidence-based studies on purpose-driven living so you can align intentions with meaningful purpose, build supportive habits, and cultivate vitality.",
    ],
  },
  {
    id: "primer",
    title: "Divine Power Primer",
    body: [
      "Quantum mechanics explains how matter and energy behave at the smallest scales, introducing superposition, entanglement, and wave-particle duality.",
      "This toolkit honors physical laws while celebrating the genuine power of intention as a psychological and behavioral force, clearing up misconceptions about the observer effect and magical thinking.",
    ],
  },
  {
    id: "intention",
    title: "Science of Intention & Purpose",
    body: [
      "Intentions are self-instructions that create commitment to act. Implementation intentions specify when, where, and how you will move, turning desire into behavior.",
      "Purpose-driven living is linked to increased well-being, reduced mortality risk, and stronger cardiovascular outcomes by motivating healthy behavior and buffering stress.",
    ],
  },
  {
    id: "scorecard",
    title: "Purpose Scorecard Self-Assessment",
    body: [
      "The Purpose Scorecard evaluates alignment across six domains: Mind, Body, Spirit, Relationships, Contribution, and Vitality.",
      "After tallying your responses, you are guided toward one of three archetypes—Ready, Build, or Explore—so you know exactly where to focus your attention.",
    ],
  },
  {
    id: "workbook",
    title: "Purpose Discovery Workbook",
    body: [
      "The Discovery Workbook uncovers passions, strengths, sacred wounds, and core values through prompts, visualization, and contribution brainstorming.",
      "A purpose statement template at the end helps you synthesize your insights into a concise declaration of purpose.",
    ],
  },
  {
    id: "activation",
    title: "Activation Practices",
    body: [
      "Daily rituals and weekly routines keep purpose embodied. Practices include gratitude journaling, breath meditation, intentional movement, spoken declarations, and weekly calendar reviews.",
      "Audio meditations and a printable Daily Alignment Checklist in the membership portal support consistent action.",
    ],
  },
  {
    id: "implementation",
    title: "Implementation Plan & Next Steps",
    body: [
      "The toolkit culminates in a 30-day activation plan: review scorecard results, complete the workbook, implement daily practices, and reassess progress.",
      "An Audit offers one-on-one guidance to interpret results and refine strategy, with mentorship available for deeper accountability.",
    ],
  },
];

export default function Home() {
  return (
    <div>
      <header className="navbar">
        <div className="glass-panel navbar-inner">
          <span className="badge">Purpose Activation Toolkit</span>
          <nav>
            <ul className="nav-links">
              <li>
                <a href="#mission">Mission</a>
              </li>
              <li>
                <a href="#primer">Primer</a>
              </li>
              <li>
                <a href="#intention">Intention</a>
              </li>
              <li>
                <a href="#scorecard">Scorecard</a>
              </li>
              <li>
                <a href="#workbook">Workbook</a>
              </li>
              <li>
                <a href="#activation">Practices</a>
              </li>
              <li>
                <a href="#implementation">Plan</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="glass-panel" style={{ padding: "2.5rem" }}>
          <div className="hero">
            <div>
              <span className="badge">Divine Alignment</span>
              <h1>
                Activate your <span className="hero-highlight">purpose</span> with
                clarity, ritual, and momentum.
              </h1>
              <p className="section-subtitle">
                The Purpose Activation Toolkit is a luminous, evidence-guided
                pathway designed to help you align intention with action. Explore
                the resources, rituals, and scorecard that make your purpose
                undeniable.
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <Link className="primary-button" href="#scorecard">
                  View the Scorecard
                </Link>
                <Link className="secondary-button" href="#journey">
                  See the Journey
                </Link>
              </div>
            </div>
            <motion.div
              className="hero-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
                What you will unlock
              </h3>
              <ul style={{ display: "grid", gap: "0.75rem" }}>
                <li>• A purpose statement rooted in your gifts.</li>
                <li>• Daily alignment practices that stick.</li>
                <li>• Insight across Mind, Body, Spirit, and Vitality.</li>
                <li>• A 30-day activation roadmap with accountability.</li>
              </ul>
            </motion.div>
          </div>
        </section>

        <section id="journey" className="glass-panel" style={{ padding: "2.5rem", marginTop: "2.5rem" }}>
          <div>
            <p className="badge">Journey Visualization</p>
            <h2 className="section-title">From intention to embodiment</h2>
            <p className="section-subtitle">
              Follow the four-stage journey to move from awakening your potential
              to integrating purpose with daily living.
            </p>
            <div className="timeline">
              {journeySteps.map((step, index) => (
                <motion.div
                  className="timeline-item"
                  key={step.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.4 }}
                >
                  <div className="timeline-marker">{index + 1}</div>
                  <div>
                    <h3 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
                      {step.title}
                    </h3>
                    <p className="section-subtitle">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gap: "2rem", marginTop: "2.5rem" }}>
          {sections.map((section) => (
            <AnimatedSection key={section.id} id={section.id}>
              <div style={{ padding: "2.5rem" }}>
                <h2 className="section-title">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p className="section-subtitle" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
                {section.id === "scorecard" && (
                  <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
                    <Link className="primary-button" href="/scorecard">
                      View sample results
                    </Link>
                    <Link className="secondary-button" href="#workbook">
                      Explore workbook
                    </Link>
                  </div>
                )}
                {section.id === "activation" && (
                  <div className="section-grid">
                    {[
                      "Gratitude journaling",
                      "Breath meditation",
                      "Intentional movement",
                      "Weekly calendar review",
                      "Community engagement",
                      "Spoken declarations",
                    ].map((item) => (
                      <div className="glass-card" key={item}>
                        <h4 style={{ marginBottom: "0.5rem" }}>{item}</h4>
                        <p className="section-subtitle">
                          Practice this ritual to keep your purpose front and
                          center daily.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </main>

      <footer className="footer">
        <p>
          © 2026 Truth J Blue LLC. This toolkit is for educational purposes and
          does not substitute for medical or psychological advice.
        </p>
      </footer>
    </div>
  );
}
