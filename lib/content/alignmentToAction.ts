/**
 * Module 3 — Alignment-to-Action
 * Content transcribed from the Truth J Blue source workbook.
 */

export const ATA_META = {
  title: "Alignment-to-Action",
  subtitle: "Your Journey from Inner Alignment to Outer Embodiment",
  lede: "Alignment without action is self-deception. Action without alignment is exhaustion. The goal is both.",
};

/* Section 1 — Orientation: From Intention to Embodiment */
export const ATA_S1_REFLECTIONS = [
  {
    id: "ata.s1.gap",
    prompt: "Where do I “know” more than I actually live?",
    assist:
      "Where is there a gap between what you believe or say and how you actually behave? Be specific: finances, relationships, health, work, spiritual practices, service.",
  },
  { id: "ata.s1.why", prompt: "Why does this gap exist?" },
  { id: "ata.s1.change", prompt: "What would change if I closed this gap in the next 30 days?" },
];

/* Section 2 — My Alignment Indicators */
export const IN_FIELD = "ata.s2.in";
export const OUT_FIELD = "ata.s2.out";
export const IN_ASSIST =
  "e.g., I wake up energized and clear · I feel peace during prayer · people comment on my joy · I'm making progress on my purpose work · meaningful “coincidences” keep happening";
export const OUT_ASSIST =
  "e.g., I feel anxious for no clear reason · I procrastinate on important tasks · I'm irritable with loved ones · I scroll mindlessly · I avoid prayer or reflection";
export const ATA_S2_REFLECTIONS = [
  { id: "ata.s2.warning", prompt: "What early warning sign is most common for me?" },
  {
    id: "ata.s2.response",
    prompt: "What do I need to do when I notice this sign?",
    assist:
      "e.g., take a walk and pray; call my accountability partner; journal for 10 minutes; cancel non-essential commitments.",
  },
];

/* Section 3 — The Aligned Action Formula */
export const FORMULA_FIELD = "ata.s3.formula"; // { domain, purpose, values, intend, smallest, outcome }
export const FORMULA_CHAIN = ["Higher Purpose", "Core Values", "Clear Intentions", "Tiny Actions", "Visible Outcomes"];
export const FORMULA_DOMAINS = [
  "Work / Vocation",
  "Relationships",
  "Service / Ministry",
  "Health / Wellness",
  "Finances",
  "Creativity / Rest",
];

/* Section 4 — Removing Friction & Resistance */
export const RESIST_FORMS = ["Fear", "Shame", "Perfectionism", "Overwhelm", "Distraction"];
export const RESISTANCE_FIELD = "ata.s4.resistance"; // { pairs: [{r, bypass}] x3 }
export const ATA_S4_REFLECTION = {
  id: "ata.s4.onepct",
  prompt: "If this action only had to be 1% expressed, what would I do?",
  assist:
    "If “writing a book” is 100%, what's 1%? Writing one sentence. Opening the document. Brainstorming three titles. Start there.",
};

/* Section 5 — Daily Aligned Action Ritual */
export const RITUAL_FIELD = "ata.s5.ritual"; // { morning, middayTime, recalibrate, evening }
export const MIDDAY_PROTOCOL = [
  "Pause whatever you're doing",
  "Take 3 deep breaths",
  "Ask: “Am I still aligned, or have I drifted?”",
  "If drifted: name it, release it, recalibrate",
  "If aligned: give thanks, keep going",
];

/* Section 6 — Accountability, Community, and Service */
export const ECO_FIELD = "ata.s6.eco";
export const ATA_S6_REFLECTIONS = [
  { id: "ata.s6.who", prompt: "Who needs the version of me that is fully aligned?" },
  { id: "ata.s6.action", prompt: "What does that version of me look like in action?" },
];

/* Section 7 — 21-Day Alignment Challenge */
export const TRACKER_FIELD = "ata.s7.tracker"; // Array<{date, action, note}> x21
export const TRACKER_RULES = [
  "Your action must align with your purpose, values, or intentions from the Aligned Action Formula.",
  "Tiny counts — five minutes is enough.",
  "Do it that day. No retroactive credit.",
  "Miss a day? Acknowledge it, forgive yourself, and begin again tomorrow — do not quit.",
];

/* Section 8 — After the challenge (not counted in progress) */
export const POST_CHALLENGE = {
  id: "ata.s8.shift",
  prompt: "After 21 days, how has my inner state and outer life shifted?",
  assist:
    "Be specific: what changed internally? In your relationships, work, health, or peace level? What surprised you?",
};
export const INTEGRATION = [
  { id: "ata.s8.fruit", prompt: "Which aligned actions produced the most peace or fruit?" },
  { id: "ata.s8.hardest", prompt: "Which aligned actions were hardest to sustain? Why?" },
  {
    id: "ata.s8.systems",
    prompt: "What systems or structures do I need to sustain this?",
    assist: "e.g., calendar blocks for daily rituals; weekly accountability calls; monthly reviews; community challenges.",
  },
  { id: "ata.s8.resist", prompt: "What resistance showed up most often, and how did I respond?" },
  { id: "ata.s8.support", prompt: "Who or what supported my alignment most powerfully?" },
];

/* Section 9 — 90-Day Alignment Focus Plan + Covenant */
export const P90_FOCUS = "ata.s9.focus";
export const P90_FOCUS_OPTIONS = [
  "Work",
  "Relationships",
  "Health",
  "Service",
  "Financial Stewardship",
  "Creative Expression",
];
export const P90_ACTIONS = "ata.s9.actions"; // string[3]
export const P90_RITUALS = "ata.s9.rituals"; // { morning, midday, evening }
export const P90_ACCT = "ata.s9.acct"; // { partner, community, service }
export const P90_REVIEWS = "ata.s9.reviews"; // { m1, m2, m3 }
export const P90_SUCCESS = "ata.s9.success";
export const ATA_COMMIT_FIELD = "ata.s9.commitment";
export const ATA_COVENANT_BODY =
  ", commit to living in alignment-to-action for the next 90 days. I will honor my daily rituals, take my non-negotiable aligned actions, and engage with my accountability structures. I recognize that this is not about perfection, but about consistency, obedience, and embodiment. I trust that God will meet me in my faithfulness and produce fruit beyond what I can ask or imagine.";

/* Progress manifest */
export const ATA_FIELD_IDS: string[] = [
  ...ATA_S1_REFLECTIONS.map((r) => r.id),
  IN_FIELD,
  OUT_FIELD,
  ...ATA_S2_REFLECTIONS.map((r) => r.id),
  FORMULA_FIELD,
  RESISTANCE_FIELD,
  ATA_S4_REFLECTION.id,
  RITUAL_FIELD,
  ECO_FIELD,
  ...ATA_S6_REFLECTIONS.map((r) => r.id),
  TRACKER_FIELD,
  P90_FOCUS,
  P90_ACTIONS,
  P90_RITUALS,
  P90_ACCT,
  P90_REVIEWS,
  P90_SUCCESS,
  ATA_COMMIT_FIELD,
];
