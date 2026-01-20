"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const domainInfo = {
  Mind: {
    description:
      "Your thoughts, beliefs, and mental habits shape your experience. High scores here suggest a growth mindset and strong cognitive tools. Maintain healthy thinking patterns through journaling, challenging limiting beliefs, and seeking mental stimulation.",
  },
  Body: {
    description:
      "The body is the vessel through which purpose is expressed. High scores indicate that you prioritize nutrition, movement, and rest. Continue honoring your body with mindful movement and nourishing choices.",
  },
  Spirit: {
    description:
      "Spirit reflects your connection to something larger than yourself—Source, nature, community, or philosophy. A strong spirit provides meaning and resilience. Deepen your practice through meditation, prayer, or time in nature.",
  },
  Relationships: {
    description:
      "Relationships are the webs through which love and purpose flow. Lower scores may signal disconnection or unresolved tensions. Invest in authentic communication, set healthy boundaries, and seek community that uplifts you.",
  },
  Contribution: {
    description:
      "Contribution reflects how you share your gifts with others. Low scores might indicate a lack of clarity on your impact. Explore ways to serve that align with your values and strengths.",
  },
  Vitality: {
    description:
      "Vitality encompasses overall energy, health, and zest for life. Lower scores may point to burnout or neglect. Renew your vitality by balancing work and rest, nourishing your body, and engaging in joyful movement.",
  },
};

const cards = [
  { title: "Mind", tone: "high" },
  { title: "Body", tone: "high" },
  { title: "Spirit", tone: "high" },
  { title: "Relationships", tone: "low" },
  { title: "Contribution", tone: "low" },
  { title: "Vitality", tone: "low" },
] as const;

export default function ScorecardPage() {
  const [activeDomain, setActiveDomain] = useState<keyof typeof domainInfo | null>(
    null
  );

  return (
    <main>
      <section className="glass-panel" style={{ padding: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="badge">Scorecard</p>
            <h1 className="section-title">Sample Scorecard Results</h1>
            <p className="section-subtitle">
              The top three domains where you scored highest are marked in green,
              while the lowest three are marked in red. Tap the plus button to see
              guidance and growth prompts.
            </p>
          </div>
          <Link className="secondary-button" href="/">
            Back to toolkit
          </Link>
        </div>

        <div className="scorecard-grid">
          {cards.map((card) => (
            <motion.div
              key={card.title}
              className={`scorecard-card ${card.tone}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>
                {card.title}
              </h3>
              <p className="section-subtitle">
                {card.tone === "high"
                  ? "Aligned and energized in this domain."
                  : "Needs attention to restore balance."}
              </p>
              <button
                type="button"
                className="scorecard-button"
                onClick={() => setActiveDomain(card.title)}
                aria-label={`More info about ${card.title}`}
              >
                +
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {activeDomain && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="section-title" style={{ fontSize: "2rem" }}>
                {activeDomain}
              </h2>
              <p className="section-subtitle" style={{ marginTop: "0.75rem" }}>
                {domainInfo[activeDomain].description}
              </p>
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: "1.5rem" }}
                onClick={() => setActiveDomain(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
