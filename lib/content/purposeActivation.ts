/**
 * Module 1 — Purpose Activation Framework
 * Content transcribed from the Truth J Blue source workbook.
 *
 * `PA_FIELD_IDS` drives the module progress meter, so it must list every
 * field currently rendered on the module page (closing reflections are
 * intentionally excluded — they're completed after Day 30).
 */

export const PA_META = {
  title: "Purpose Activation",
  subtitle: "Your Journey to Purpose Activation",
  promise:
    "Move from wondering about your purpose to walking in it — discerning your God-given design, aligning your inner life with your Higher Self in Christ, and translating that into visible, fruitful action.",
};

/* ------------------------------------------------------------------ */
/* Section 1 — Orientation: Divine Purpose vs. Egoic Ambition          */
/* ------------------------------------------------------------------ */

export const EGOIC = [
  "Proving your worth",
  "Comparison & competition",
  "External validation",
  "Fear of insignificance",
  "Control & self-reliance",
];
export const DIVINE = [
  "Inner peace & alignment",
  "Service & stewardship",
  "Fruit that outlasts you",
  "Dependence on the Spirit",
  "“I was made for this”",
];

export const S1_REFLECTIONS = [
  {
    id: "pa.s1.here",
    prompt: "Why do I believe I am here?",
    assist: "Set aside 5 minutes. Don't overthink — let the Spirit guide your pen.",
  },
  {
    id: "pa.s1.misaligned",
    prompt: "Where do I currently feel misaligned?",
    assist:
      "Think about areas where your actions, choices, or environment don't reflect your deepest values or sense of calling.",
  },
];

/* ------------------------------------------------------------------ */
/* Section 2 — Design: Identity, Gifts, and Wiring                     */
/* ------------------------------------------------------------------ */

export const DESIGN_DOMAINS = [
  "Spiritual gifts",
  "Natural talents",
  "Temperament & personality",
  "Life story & experiences",
];

export const S2_LISTS = [
  {
    id: "pa.s2.strengths",
    label: "List your top 5 strengths",
    assist: "Things you do well — even effortlessly.",
    noun: "Strength",
  },
  {
    id: "pa.s2.asked",
    label: "List the top 5 things people regularly ask for your help with",
    assist: "What do others consistently seek you out for?",
    noun: "Request",
  },
  {
    id: "pa.s2.flow",
    label: "List the top 5 activities that make you lose track of time",
    assist: "Where you enter “flow” and hours feel like minutes.",
    noun: "Activity",
  },
];

export const S2_REFLECTION = {
  id: "pa.s2.reflect",
  prompt: "If my life was intentionally “knit together” for impact, what patterns do I see?",
  assist:
    "Look across your strengths, the help people seek from you, and the activities that bring you alive. (Psalm 139:13)",
};

/* ------------------------------------------------------------------ */
/* Section 3 — Values and Higher-Self Alignment                        */
/* ------------------------------------------------------------------ */

export const VALUES_BANK = [
  "Authenticity", "Compassion", "Creativity", "Courage", "Faith", "Family",
  "Freedom", "Generosity", "Growth", "Health", "Honesty", "Humility",
  "Influence", "Integrity", "Joy", "Justice", "Kindness", "Knowledge",
  "Leadership", "Legacy", "Love", "Loyalty", "Peace", "Purpose",
  "Service", "Simplicity", "Stewardship", "Truth", "Wisdom", "Wonder",
];
export const VALUES_FIELD = "pa.values.ranked";
export const VALUES_CAP = 7;

export const S3_REFLECTION = {
  id: "pa.s3.betraying",
  prompt: "Where are my daily choices betraying my stated values?",
  assist:
    "Be specific. “I say I value health, but I consistently skip exercise and eat reactively.” “I say I value family, but I check my phone during dinner.”",
};

/* ------------------------------------------------------------------ */
/* Section 4 — Purpose Statement                                       */
/* ------------------------------------------------------------------ */

export const STATEMENT_PARTS = [
  {
    id: "pa.stmt.identity",
    leadIn: "Because God designed me as…",
    hint: "your identity",
    placeholder: "a bridge-builder with a teacher's heart",
  },
  {
    id: "pa.stmt.calling",
    leadIn: "I am called to…",
    hint: "your calling",
    placeholder: "help weary believers rediscover their God-given assignment",
  },
  {
    id: "pa.stmt.audience",
    leadIn: "for…",
    hint: "the people you serve",
    placeholder: "Christian women stepping into their second act",
  },
  {
    id: "pa.stmt.method",
    leadIn: "by…",
    hint: "how you'll do it",
    placeholder: "writing, mentoring, and honest conversation",
  },
] as const;
export const STATEMENT_WORKING_FIELD = "pa.stmt.working";

/* ------------------------------------------------------------------ */
/* Section 5 — Purpose Domains (the six-domain life map)               */
/* ------------------------------------------------------------------ */

export const LIFE_DOMAINS = [
  { key: "work", name: "Work / Vocation" },
  { key: "relationships", name: "Relationships" },
  { key: "service", name: "Service / Ministry" },
  { key: "health", name: "Health / Wellness" },
  { key: "finances", name: "Finances" },
  { key: "creativity", name: "Creativity / Rest" },
];

export const DOMAIN_COLS = [
  { key: "current", label: "Current reality", ph: "Where does this domain honestly stand today?" },
  { key: "vision", label: "Purpose-aligned vision", ph: "What would this domain look like fully aligned?" },
  { key: "shift", label: "One shift needed", ph: "The single change that moves it toward alignment." },
];

export const domainField = (key: string) => `pa.s5.domain.${key}`;

export const S5_REFLECTION = {
  id: "pa.s5.reflect",
  prompt: "Which domain is the Spirit highlighting for immediate attention?",
  assist: "Listen quietly for 2–3 minutes. Write what you sense — even if it's uncomfortable.",
};

/* ------------------------------------------------------------------ */
/* Section 6 — Purpose Pathways: the Purpose Morning                   */
/* ------------------------------------------------------------------ */

export const MORNING_FIELD = "pa.s6.morning";

export const MORNING_PRACTICES = [
  {
    key: "word",
    label: "Practice 1 · Word & Prayer",
    example: "e.g., 10 minutes of Scripture and prayer; journaling God's promises",
  },
  {
    key: "focus",
    label: "Practice 2 · Intentional Focus",
    example:
      "e.g., review your purpose statement and top value; visualize one aligned action; set your intention",
  },
  {
    key: "action",
    label: "Practice 3 · One Aligned Action",
    example:
      "e.g., send one encouraging message; 20 minutes on your creative project; complete one health practice",
  },
];

export const S6_REFLECTION = {
  id: "pa.s6.reflect",
  prompt: "What daily habit most clearly expresses my Divine purpose?",
  assist:
    "Think of a practice that, done consistently, would compound into major transformation over a year.",
};

/* ------------------------------------------------------------------ */
/* Section 7 — Obstacles, Lies, and Renewing the Mind                  */
/* ------------------------------------------------------------------ */

export const BELIEF_FIELDS = ["pa.s7.belief1", "pa.s7.belief2", "pa.s7.belief3"];

export const S7_REFLECTION = {
  id: "pa.s7.reflect",
  prompt:
    "If I believed God's truth about me — fully, without reservation — what action would I take this week?",
};

/* ------------------------------------------------------------------ */
/* Section 8 — 30-Day Purpose Activation Plan + Commitment             */
/* ------------------------------------------------------------------ */

export const PLAN_FOCUS = "pa.s8.focus";
export const PLAN_WEEKS = "pa.s8.weeks"; // { w1..w4 }
export const PLAN_MICRO = "pa.s8.micro"; // string[3]
export const PLAN_SUPPORT = "pa.s8.support"; // { partner, community, checkin }
export const COMMIT_FIELD = "pa.s8.commitment"; // { name, signature, date, sealed }

/* ------------------------------------------------------------------ */
/* Section 9 — Closing Reflection (return after Day 30)                */
/* ------------------------------------------------------------------ */

export const CLOSING_REFLECTIONS = [
  { id: "pa.s9.inner", prompt: "What shifted in my inner life?" },
  { id: "pa.s9.outer", prompt: "What shifted in my outer circumstances or relationships?" },
  { id: "pa.s9.nonneg", prompt: "Which practices are now non-negotiable?" },
  { id: "pa.s9.deeper", prompt: "Where do I need deeper work or support?" },
  { id: "pa.s9.next", prompt: "What is the Spirit inviting me into next?" },
];

/* ------------------------------------------------------------------ */
/* Progress manifest                                                   */
/* ------------------------------------------------------------------ */

export const PA_FIELD_IDS: string[] = [
  ...S1_REFLECTIONS.map((r) => r.id),
  ...S2_LISTS.map((l) => l.id),
  S2_REFLECTION.id,
  VALUES_FIELD,
  S3_REFLECTION.id,
  ...STATEMENT_PARTS.map((p) => p.id),
  STATEMENT_WORKING_FIELD,
  ...LIFE_DOMAINS.map((d) => domainField(d.key)),
  S5_REFLECTION.id,
  MORNING_FIELD,
  S6_REFLECTION.id,
  ...BELIEF_FIELDS,
  S7_REFLECTION.id,
  PLAN_FOCUS,
  PLAN_WEEKS,
  PLAN_MICRO,
  PLAN_SUPPORT,
  COMMIT_FIELD,
];
