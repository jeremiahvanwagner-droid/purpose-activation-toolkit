/**
 * Module 4 — Practical Application: Execution Prompts
 * All 69 prompts transcribed verbatim from the Truth J Blue source workbook.
 */

export const EP_META = {
  title: "Execution Prompts",
  subtitle: "Your Daily Companion for Aligned Living",
  lede:
    "Simple questions that interrupt mental noise and invite you to see from your Higher Self in Christ — used consistently, they become a Spirit-led daily practice.",
};

export const USAGE_MODES = [
  { name: "In the morning", desc: "Choose 1–2 prompts to set the day's direction." },
  { name: "In decision moments", desc: "Pick 2–4 and write until you reach clarity or the next right step." },
  { name: "In emotional waves", desc: "Interrupt the spiral; respond from truth instead of reactivity." },
  { name: "In evening reflections", desc: "Review the day with God — notice drift, celebrate grace." },
  { name: "In weekly & seasonal retreats", desc: "Zoom out with the reflection and legacy decks." },
];

export type Deck = { key: string; title: string; intro: string; prompts: string[] };

export const DECKS: Deck[] = [
  {
    key: "purpose",
    title: "Purpose Activation",
    intro:
      "Use these when you need clarity about your calling, assignment, or the way God wants to express Himself through your life in this season. Choose 3–5 at a time.",
    prompts: [
      "If my life is not an accident, what feels most assigned to me in this season?",
      "Where do my gifts, joy, and others' needs intersect right now?",
      "What activities or roles leave me with a sense of “I was made for this”?",
      "Who seems to be drawn to me for support, guidance, or encouragement — and what does that reveal about my purpose?",
      "When I look back over my story, what recurring themes of redemption, healing, or breakthrough do I see?",
      "If I could only serve one group of people for the next year, who would they be and why?",
      "What aspect of God's heart do I uniquely reveal when I am fully myself?",
      "Where do I feel a holy dissatisfaction — an area of the world or the Church that grieves me enough to act?",
      "What would I do with my life if I were not afraid of failure, rejection, or lack?",
      "Which of my current activities feel like obligation, and which feel like assignment?",
      "How is my current season (location, relationships, responsibilities) hinting at what God is inviting me to steward right now?",
      "What fruit (in others) do I see when I show up in my most authentic, Spirit-led way?",
      "If my purpose could be summarized in one sentence today, what might it be?",
    ],
  },
  {
    key: "identity",
    title: "Identity & Higher Self",
    intro:
      "Anchor into who you are in Christ and who you are becoming — rather than who you've been conditioned to believe you are.",
    prompts: [
      "How would my Higher Self in Christ describe me in one paragraph?",
      "What am I afraid will happen if I fully step into who I am?",
      "What lies about myself have I outgrown but still behave as if they're true?",
      "When do I feel most like “the real me”? What am I doing, and who am I with?",
      "What parts of myself do I hide to feel safe or accepted?",
      "If I believed I was fully loved, fully held, and fully provided for, how would I show up differently this week?",
      "What labels (from family, culture, church, or my own inner critic) do I need to release?",
      "What core truths about my identity in Christ do I need to revisit and embody? (e.g., beloved, chosen, equipped, forgiven)",
      "How does my body feel when I am in alignment with my Higher Self versus when I'm in ego or fear?",
      "In what situations do I most easily abandon myself to please others?",
      "What boundaries would my Higher Self set to protect purpose and peace?",
      "If my 80-year-old self could speak to me now, what would they affirm, and what would they gently correct?",
    ],
  },
  {
    key: "decision",
    title: "Decision-Making",
    intro:
      "Use these alongside your decision frameworks. Pick 2–4 in any decision moment and write until you reach a sense of clarity or the next right step.",
    prompts: [
      "What is the real decision beneath the surface decision?",
      "What values are truly at stake here, and which one do I want to honor most?",
      "If I chose from my values instead of my fears, what would I do?",
      "Which option leads to more long-term fruit, even if it is less comfortable short-term?",
      "What am I trying to protect by delaying or avoiding this decision?",
      "Whose voice am I hearing the loudest right now — God, fear, other people, or my ego?",
      "How would I advise someone I deeply love if they were facing this same decision?",
      "If I knew this decision would work out for my growth and God's glory, what would I choose?",
      "What data or counsel do I still need before deciding — and when will I gather it by?",
      "What does my body say when I imagine Option A? What about Option B? (Notice peace vs. constriction.)",
      "What previous experiences am I projecting onto this situation that may not actually apply?",
      "If I do nothing, what will this cost me in six months? In three years?",
    ],
  },
  {
    key: "action",
    title: "Alignment-to-Action",
    intro:
      "Move from clarity to embodiment — bridge the gap between what you know and what you do. Keep your answers concrete and time-bound.",
    prompts: [
      "What is one small action today that would make my future self grateful?",
      "If I could only do one aligned thing today, what would it be?",
      "What can I do in the next 10 minutes to express my purpose in a concrete way?",
      "Which commitment do I need to renegotiate or release to stay in alignment?",
      "What conversation am I avoiding that, if had, would restore integrity?",
      "Where is my “yes” too full and my “no” underdeveloped, and what is one boundary I can set today?",
      "How can I bring my purpose into what is already on my calendar today?",
      "What act of service can I offer today that embodies who I am called to be?",
      "If I treated my purpose like a real assignment, what would I put on my task list this week?",
      "What one habit, if done consistently for 90 days, would most change my life — and what is today's tiny step toward it?",
      "Where am I waiting for motivation instead of creating movement? What micro-action can I take anyway?",
    ],
  },
  {
    key: "reflection",
    title: "Reflection & Course-Correction",
    intro:
      "Use these in the evening or at the end of each week to review your life with God, notice drift, and gently bring yourself back into alignment.",
    prompts: [
      "Where did I feel most alive and aligned this week?",
      "What decisions or actions brought me the most peace or fruit?",
      "What decision did I avoid, and what did avoidance cost me (emotionally, spiritually, practically)?",
      "Where did I override my inner witness, and what can I learn from that without shame?",
      "What patterns am I noticing in my energy, emotions, and behavior?",
      "Where did I partner with fear instead of faith, and how might I choose differently next time?",
      "What grace did I experience this week that I want to remember?",
      "Where did I see evidence of God's presence, provision, or guidance?",
      "What would I like to celebrate with God about this week, even if it feels small?",
      "What needs to be forgiven — by me, from me, or toward me — so I don't carry it into next week?",
      "What one adjustment would make next week more aligned than this one?",
    ],
  },
  {
    key: "legacy",
    title: "Legacy, Impact & the Long View",
    intro:
      "Stretch beyond the immediate into the larger story of your life and calling. Revisit this deck at least quarterly.",
    prompts: [
      "If I live fully in my Divine purpose for the next 10 years, what fruit do I envision?",
      "What do I want the people closest to me to say my life stood for?",
      "If I trusted God completely with my future, what bold step would I take in the next 90 days?",
      "What kind of ancestor do I want to be for future generations — biological or spiritual?",
      "What patterns do I feel called to break in my family line or community?",
      "How do I want to use my gifts to love God and love others more fully over the next decade?",
      "What legacy of faith, courage, and creativity do I want to leave behind?",
      "If my life were a letter to the world about God's character, what would I want it to say?",
      "What would “finishing well” look like for me in this season, and in my lifetime?",
      "What am I postponing to “someday” that needs to begin in a small way now?",
    ],
  },
];

export const deckField = (key: string) => `ep.deck.${key}`; // { [promptIndex]: journal }
export const TOOLKIT_FIELD = "ep.toolkit"; // { "deckKey:idx": "morning" | "decision" | "evening" | "unsorted" }
export const TOOLKIT_SLOTS = [
  { key: "morning", label: "Morning" },
  { key: "decision", label: "Decision moments" },
  { key: "evening", label: "Evening" },
  { key: "unsorted", label: "To sort" },
];

/* Custom Prompt Creation Lab */
export const LAB_FIELDS = ["ep.lab.s1", "ep.lab.s2", "ep.lab.s3"]; // { struggle, awareness, decision, action }
export const LAB_EXAMPLE = {
  struggle: "Procrastination on purpose projects",
  awareness: "What am I feeling right now that I'm trying to avoid by scrolling or distracting myself?",
  decision: "If I chose from my purpose instead of my comfort, what would I do next?",
  action: "What is one 5-minute step I can take on this project right now?",
};

/* Progress manifest */
export const EP_FIELD_IDS: string[] = [
  ...DECKS.map((d) => deckField(d.key)),
  ...LAB_FIELDS,
  TOOLKIT_FIELD,
];
