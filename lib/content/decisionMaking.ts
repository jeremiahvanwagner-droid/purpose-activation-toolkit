/**
 * Module 2 — Proper Decision-Making Techniques
 * Content transcribed from the Truth J Blue source workbook.
 */

export const DM_META = {
  title: "Proper Decision-Making",
  subtitle: "Your Journey to Spirit-Led Decision Making",
  lede:
    "Proper decision making is not about never making mistakes — it's about making choices from your Higher Self in Christ rather than from fear, ego, or urgency.",
};

/* Section 1 — Decisions as Spiritual Stewardship */
export const REACTIVE = [
  "Driven by fear, urgency, or external pressure",
  "Isolated — decides alone",
  "Chases short-term comfort or relief",
  "Ruled by the emotion of the moment",
  "Avoids or delays until forced",
];
export const STEWARD = [
  "Guided by values, purpose, and peace",
  "Communal — seeks counsel and accountability",
  "Sows seeds for long-term fruit",
  "Prayerful, patient, and deliberate",
  "Faces decisions as acts of faithfulness",
];

export const DM_S1_REFLECTIONS = [
  {
    id: "dm.s1.weighs",
    prompt: "What recent decision still weighs on my heart?",
    assist:
      "A decision you made that you're questioning — or a decision you're avoiding that's creating inner tension.",
  },
  { id: "dm.s1.why", prompt: "Why does this decision still weigh on me?" },
  {
    id: "dm.s1.surrender",
    prompt: "What would it mean to bring this decision into the light and surrender it to God?",
  },
];

/* Section 2 — The Higher-Self Decision Filter */
export const LOWER = [
  "Fear & anxiety",
  "Ego & self-protection",
  "Urgency & reactivity",
  "Scarcity & comparison",
  "Past wounds",
  "People-pleasing",
];
export const HIGHER = [
  "Peace & clarity",
  "Love & generosity",
  "Patience & wisdom",
  "Abundance & gratitude",
  "Healed identity",
  "God-honoring courage",
];
export const FILTER_QUESTION =
  "Am I making this decision from fear or from faith? From my Lower Self or my Higher Self?";
export const FILTER_FIELD = "dm.s2.filter"; // { decision, pairs: [{fear, higher}] }
export const FILTER_ROWS = 4;

export const DM_S2_REFLECTION = {
  id: "dm.s2.reflect",
  prompt:
    "How would I choose if I knew — deeply, unshakably — that I am fully loved and supported by God, no matter what happens?",
};

/* Section 3 — The 7-Step Divine Decision Framework */
export const SEVEN_FIELD = "dm.s3.seven";

/** Teaching and worked examples are the workbook's own (PDF 2 pp. 9–10). The
 *  examples are shown on request and never written into the reader's answers. */
export const SEVEN_STEPS = [
  {
    key: "question",
    title: "Clarify the real question",
    label: "The real question is…",
    guide:
      "Often, the surface question is not the real question. “Should I take this job?” might actually be “Am I running from something, or running toward my calling?” Spend time defining what you're actually deciding.",
    example:
      "Instead of “Should I move to a new city?” ask “What is God calling me to in this season, and does this move serve that calling?”",
  },
  {
    key: "values",
    title: "Name the values and purpose at stake",
    label: "The values and purpose related to this decision are…",
    guide:
      "Every decision intersects with your core values and Divine purpose. Identify which values are at stake (e.g., family, integrity, service, stewardship) and how this decision relates to your calling.",
    example:
      "“This decision involves my values of family, financial stewardship, and long-term Kingdom impact. My purpose is to equip others, so I need to ask: does this opportunity enhance or distract from that?”",
  },
  {
    key: "facts",
    title: "Gather facts and counsel",
    label: "The facts I need and the counsel I'll seek…",
    guide:
      "Proverbs 15:22 says, “Plans fail for lack of counsel, but with many advisers they succeed.” Seek input from wise, spiritually mature people. Gather objective data. Don't decide in isolation.",
    example:
      "“I'll talk to my mentor, my spouse, and two friends who know me well. I'll also research salary ranges, cost of living, and organizational culture.”",
  },
  {
    key: "thoughts",
    title: "Examine your thoughts and emotions",
    label: "Thought patterns I need to examine…",
    guide:
      "Cognitive-behavioral therapy teaches that thoughts drive emotions, and emotions drive behavior. Identify any distorted thinking (catastrophizing, all-or-nothing, people-pleasing) and challenge it with truth.",
    example:
      "“I'm thinking ‘If I don't take this, I'll never get another chance’ (catastrophizing). The truth is: God is not limited by one opportunity.”",
  },
  {
    key: "prayer",
    title: "Pray, listen, and reflect",
    label: "What I sense in prayer and listening…",
    guide:
      "Set aside time for stillness. Ask the Spirit for wisdom (James 1:5). Journal what you sense. Pay attention to peace or unsettledness (Colossians 3:15).",
    example:
      "“After 20 minutes of listening prayer, I sense peace about the direction, but caution about the timeline. I'll ask for more time to decide.”",
  },
  {
    key: "choice",
    title: "Choose and commit",
    label: "My choice and commitment…",
    guide:
      "Indecision is a decision—it's a decision to stay stuck. Once you have clarity, choose and commit fully. Trust that God will guide your steps and redeem any mistakes (Proverbs 16:9).",
    example:
      "“I'm choosing Option B. I'm committing for the next 90 days and will review with my mentor at that point.”",
  },
  {
    key: "review",
    title: "Review and learn",
    label: "My review date and learning plan…",
    guide:
      "After you've acted on your decision, review the outcome. What worked? What didn't? What did you learn about yourself, God, and discernment? This step turns every decision into a learning opportunity.",
    example:
      "“Three months in, I see that I made the right call, but I underestimated the relational cost. Next time, I'll factor that in more intentionally.”",
  },
];

/* Section 4 — Cognitive & Spiritual Checkpoints */
export const DISTORTIONS = [
  { name: "Catastrophizing", ex: "“If this goes wrong, everything falls apart.”" },
  { name: "All-or-Nothing Thinking", ex: "“If it isn't perfect, it's a failure.”" },
  { name: "Mind Reading", ex: "“They'll think I'm foolish for choosing this.”" },
  { name: "Overgeneralization", ex: "“I always get these decisions wrong.”" },
  { name: "Should Statements", ex: "“I should have figured this out by now.”" },
  { name: "Emotional Reasoning", ex: "“I feel afraid, so this must be the wrong door.”" },
  { name: "People-Pleasing", ex: "“I can't say no — they're counting on me.”" },
];
/** Reconciles the emotional-reasoning warning with the role of felt peace in the grid. */
export const EMOTIONS_NOTE =
  "Naming emotional reasoning doesn't mean ignoring what you feel. Notice your emotions alongside the facts, your responsibilities, prayer, and trusted counsel. Discomfort may accompany a worthwhile step; it may also point to a constraint that needs attention.";
export const REWRITE_FIELDS = ["dm.s4.r1", "dm.s4.r2", "dm.s4.r3"];
export const DM_S4_REFLECTION = {
  id: "dm.s4.reflect",
  prompt: "Which story about this situation needs renewing?",
  assist: "What narrative have you been telling yourself about this decision that may not be fully true?",
};

/* Section 5 — Values-Based Decision Grid */
export const GRID_FIELD = "dm.s5.grid"; // { decision, options[3], scores{crit: number[3]} }
export const GRID_CRITERIA = [
  { key: "purpose", label: "Alignment with Divine Purpose", anchor: "1 = not aligned · 5 = fully aligned" },
  { key: "values", label: "Alignment with Core Values", anchor: "1 = betrays values · 5 = honors values" },
  { key: "impact", label: "Positive Impact on Others", anchor: "1 = harmful · 5 = highly beneficial" },
  { key: "peace", label: "Inner Peace Level", anchor: "1 = unsettled · 5 = deep peace" },
  { key: "practical", label: "Practicality / Feasibility", anchor: "1 = unrealistic · 5 = very practical" },
];
export const DM_S5_REFLECTIONS = [
  { id: "dm.s5.highest", prompt: "Which option has the highest score?" },
  { id: "dm.s5.spirit", prompt: "Does that align with what you sense in your spirit?" },
  {
    id: "dm.s5.gap",
    prompt: "If there's a discrepancy between the score and your peace, what might that reveal?",
  },
];
export const DM_S5_SPIRIT = {
  id: "dm.s5.confirm",
  prompt: "What is the Spirit confirming or unsettling as I look at this grid?",
  assist: "Sit quietly for 3–5 minutes. Write whatever comes.",
};

/* Section 6 — Listening Prayer & Intuitive Discernment */
export const CHANNELS = ["Scripture", "Wise Counsel", "The Inner Witness"];
export const LISTENING_PROMPTS = [
  { id: "dm.s6.invited", prompt: "What am I being invited into?" },
  { id: "dm.s6.release", prompt: "What am I being asked to release?" },
  { id: "dm.s6.step", prompt: "What is one next step I sense the Spirit highlighting?" },
];

/* Section 7 — Decisions in Different Domains */
export const DM_DOMAINS = [
  {
    key: "career",
    name: "Career / Vocation",
    considerations: [
      "Does this align with my Divine purpose and calling?",
      "Will this use my gifts and grow me, or just pay the bills?",
      "What is the long-term trajectory? (Don't just look at Year 1.)",
      "What will this cost relationally and spiritually?",
    ],
  },
  {
    key: "relationship",
    name: "Relationships",
    considerations: [
      "Does this relationship call me higher or pull me lower?",
      "Am I being led by fear of loneliness or by wisdom?",
      "What fruit is this relationship producing in my life and theirs?",
      "Does this person honor my calling and values?",
    ],
  },
  {
    key: "financial",
    name: "Finances",
    considerations: [
      "Am I making this choice from scarcity or abundance?",
      "Is this stewarding resources or wasting them?",
      "What does wise counsel say about the numbers?",
      "Does this support my long-term purpose or just short-term comfort?",
    ],
  },
  {
    key: "health",
    name: "Health / Wellness",
    considerations: [
      "Am I honoring my body as a temple of the Holy Spirit?",
      "Is this sustainable, or am I chasing a quick fix?",
      "What do I need to release (habits, foods, patterns) to step into health?",
      "How does this decision affect my energy for purpose?",
    ],
  },
  {
    key: "ministry",
    name: "Ministry / Service",
    considerations: [
      "Is this an assignment from God, or an expectation from people?",
      "Do I have the capacity, or am I people-pleasing?",
      "What will saying yes to this require me to say no to?",
      "Does this fit my current season and calling?",
    ],
  },
];
export const domainAppField = (key: string) => `dm.s7.${key}`; // { q, v, c }
export const DM_S7_REFLECTION = {
  id: "dm.s7.reflect",
  prompt: "Which domain has the highest cost of indecision right now?",
  assist: "Where is your avoidance or delay causing the most damage or missed opportunity?",
};

/* Section 8 — Decision Covenant */
export const PRACTICES_FIELD = "dm.s8.practices"; // string[3]
export const PENDING_FIELD = "dm.s8.pending"; // { facing, action, commitDate, reviewDate, accountability }
export const DM_COMMIT_FIELD = "dm.s8.commitment";
/** PDF 2 p. 23, verbatim. */
export const DM_COVENANT_BODY =
  ", commit to making decisions from my Higher Self in Christ, aligned with my values and Divine purpose, for the next 30 days. I will not rush, react, or decide in isolation. I will steward my calling, time, relationships, and resources with intentionality, wisdom, and faith. I trust that God will guide my steps and make my paths straight as I submit my choices to Him.";

/* Section 9 — Closing Reflection (after 30 days) */
export const DM_CLOSING = [
  { id: "dm.s9.step", prompt: "Which step in the 7-Step Framework was most transformative for me?" },
  { id: "dm.s9.distortion", prompt: "What distorted thought pattern did I recognize and renew?" },
  { id: "dm.s9.clarity", prompt: "Which decision did I make with the most clarity and peace?" },
  { id: "dm.s9.struggle", prompt: "Where did I still struggle, and what support do I need?" },
  { id: "dm.s9.voice", prompt: "How has my confidence in hearing the Spirit's voice grown?" },
];

/* Progress manifest */
export const DM_FIELD_IDS: string[] = [
  ...DM_S1_REFLECTIONS.map((r) => r.id),
  FILTER_FIELD,
  DM_S2_REFLECTION.id,
  SEVEN_FIELD,
  ...REWRITE_FIELDS,
  DM_S4_REFLECTION.id,
  GRID_FIELD,
  ...DM_S5_REFLECTIONS.map((r) => r.id),
  DM_S5_SPIRIT.id,
  ...LISTENING_PROMPTS.map((r) => r.id),
  ...DM_DOMAINS.map((d) => domainAppField(d.key)),
  DM_S7_REFLECTION.id,
  PRACTICES_FIELD,
  PENDING_FIELD,
  DM_COMMIT_FIELD,
];
