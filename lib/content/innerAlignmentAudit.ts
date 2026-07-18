/**
 * Inner Alignment Audit (Beyond the Veil V3)
 *
 * Content transcribed verbatim from the Truth J Blue source PDF.
 * Every question, framing line, and micro-commitment below is from the source
 * — do not paraphrase without an author's approval.
 */

export const IAA_META = {
  title: "The Inner Alignment Audit",
  subtitle:
    "A premium self-diagnostic to locate drift, restore clarity, and rebuild alignment — without shame, striving, or spiritual performance.",
  byline: "Truth J Blue",
  ctaUrl: "https://beyondtheveil.support",
};

/** The Likert scale, printed identically under every scored item. */
export const LIKERT: readonly { label: string; value: number }[] = [
  { label: "Always", value: 5 },
  { label: "Often", value: 4 },
  { label: "Sometimes", value: 3 },
  { label: "Rarely", value: 2 },
  { label: "Never", value: 1 },
] as const;

export type Band = "aligned" | "tension" | "misaligned";

export type Domain = {
  key: "spiritual" | "emotional" | "identity" | "structure";
  index: 1 | 2 | 3 | 4;
  name: string;
  definingQuestion: string;
  whyThisMatters: string;
  naming: string;
  questions: string[];
  reflectionPrompts: string[];
  microCommitments: string[];
};

export const DOMAINS: Domain[] = [
  {
    key: "spiritual",
    index: 1,
    name: "Spiritual Perception",
    definingQuestion:
      "How clearly do you recognize God's leading in the middle of your inner and outer noise?",
    whyThisMatters:
      "When perception is distorted, you can confuse anxiety for guidance, intensity for direction, and noise for God's voice.",
    naming:
      "This is where your spiritual signal is either clear, distorted, or drowned out. Write what is true without editing yourself.",
    questions: [
      "I recognize God's attention on something — even in ordinary moments.",
      "I can tell the difference between conviction and condemnation without spiraling.",
      "After prayer, I experience clarity (not just emotional intensity).",
      "I can discern whether a thought is God's leading, fear, or impulse.",
      "I can sit in silence with God without needing constant stimulation.",
      "I do not confuse spiritual intensity with spiritual direction.",
      "When I receive guidance, I follow through without over-explaining everything.",
    ],
    reflectionPrompts: [
      "What patterns did you notice in your answers?",
      "Where is your signal strongest? Where is it weakest?",
    ],
    microCommitments: [
      "I will protect 10 minutes of silence each day.",
      "I will test impressions by fruit: peace, clarity, humility.",
      "I will stop treating anxiety like revelation.",
    ],
  },
  {
    key: "emotional",
    index: 2,
    name: "Emotional Regulation",
    definingQuestion:
      "How well do your emotions move with God instead of against you?",
    whyThisMatters:
      "If emotions stay unprocessed, they become a steering wheel. Regulation restores choice and clarity.",
    naming:
      "Emotions are signals. They are not leaders. This page helps you reclaim command.",
    questions: [
      "I can feel emotions without being ruled by them.",
      "When I'm triggered, I slow down before I speak or act.",
      "I recover from emotional swings without losing my spiritual center.",
      "I can name what I feel without judging myself for feeling it.",
      "I process pain honestly instead of covering it with spiritual language.",
      "I have healthy outlets that calm my nervous system (not just distractions).",
      "My inner world feels guided, not chaotic, even under stress.",
    ],
    reflectionPrompts: [
      "What emotion shows up most often for you lately?",
      "What is that emotion trying to protect you from?",
      "What would truth sound like in that moment?",
    ],
    microCommitments: [
      "I will pause before reacting when I feel triggered.",
      "I will name the emotion and the story attached to it.",
      "I will choose one calming practice daily (walk, breath, prayer).",
    ],
  },
  {
    key: "identity",
    index: 3,
    name: "Identity Integration",
    definingQuestion:
      "How much of you actually lives like who you are in Christ — under pressure, not just in peace?",
    whyThisMatters:
      "Identity drift makes you live from the old name while speaking the new one. Integration restores inner agreement.",
    naming:
      "Misalignment often hides in identity: who you believe you are under pressure.",
    questions: [
      "I think about myself the way God speaks about me, not the way my past labeled me.",
      "I don't negotiate with old identities when pressure hits.",
      "My actions match my stated beliefs more often than not.",
      "I can receive correction without collapsing into shame.",
      "My spirit, mind, and choices feel internally aligned.",
      "I don't sabotage new seasons because I still expect old outcomes.",
      "I can hold confidence and humility at the same time.",
    ],
    reflectionPrompts: [
      "What old label still tries to lead your decisions?",
      "What is the truth God has been teaching you about yourself?",
    ],
    microCommitments: [
      "I will speak the truth of who I am before I face the day.",
      "I will stop rehearsing the old story when pressure hits.",
      "I will practice obedience that matches my stated beliefs.",
    ],
  },
  {
    key: "structure",
    index: 4,
    name: "Life Structure",
    definingQuestion:
      "Does your life make it easier or harder to stay aware of God?",
    whyThisMatters:
      "Structure is how revelation becomes lived reality. Without structure, faith feels heavy because your life contradicts your spirit.",
    naming:
      "Structure is how revelation becomes lived reality. This is where faith gets light.",
    questions: [
      "My daily rhythms support prayer, presence, and peace.",
      "My media intake strengthens my mind more than it drains it.",
      "My environment encourages alignment (not constant distraction).",
      "My relationships reinforce my walk with God, not just my comfort.",
      "I protect quiet space in my week to hear God clearly.",
      "I translate spiritual intentions into practical structure.",
      "I can identify the habits that quietly pull me out of alignment.",
    ],
    reflectionPrompts: [
      "What habit drains your awareness the most?",
      "What rhythm would make alignment easier?",
      "What one boundary would protect your peace?",
    ],
    microCommitments: [
      "I will protect a daily quiet block (even 10 minutes).",
      "I will reduce one input that drains me (scrolling, noise, gossip).",
      "I will set one small boundary and keep it.",
    ],
  },
];

/** Field-id helpers — all Audit answers live under the `iaa.*` namespace. */
export const answerField = (d: string, q: number): string => `iaa.${d}.q${q}`;
export const reflectField = (d: string, r: number): string => `iaa.${d}.r${r}`;

export const PROFILE_FIELD = "iaa.profile";
export const INTERP_FIELD = "iaa.interpret";
export const PLAN_FIELD = "iaa.plan";
export const STATEMENT_FIELD = "iaa.statement";
export const WORKSHEET_FIELDS = [
  "iaa.ws.signal",
  "iaa.ws.emotion",
  "iaa.ws.identity",
  "iaa.ws.structure",
] as const;

export const WORKSHEETS: { id: string; title: string }[] = [
  { id: "iaa.ws.signal", title: "Signal vs Noise Filter — What am I actually sensing right now?" },
  { id: "iaa.ws.emotion", title: "Emotion → Meaning → Choice Map — Stop the spiral, choose again." },
  {
    id: "iaa.ws.identity",
    title: "Identity Collapse Recovery Protocol — Return to truth, then act.",
  },
  { id: "iaa.ws.structure", title: "Structure Reset · Rhythm Builder — Make alignment inevitable." },
];

/** Progress manifest — only the 28 scored Likert items count toward completion. */
export const IAA_FIELD_IDS: string[] = DOMAINS.flatMap((d) =>
  d.questions.map((_, i) => answerField(d.key, i + 1))
);

export const BANDS: Record<Band, { label: string; meaning: string; min: number; max: number }> = {
  aligned: { label: "Aligned", meaning: "stable and strengthening", min: 28, max: 35 },
  tension: { label: "Tension", meaning: "drift present; repairable", min: 20, max: 27 },
  misaligned: {
    label: "Misaligned",
    meaning: "overload; needs focused integration",
    min: 7,
    max: 19,
  },
};

/** Per-domain banding. 28+ = Aligned, 20-27 = Tension, else Misaligned. */
export function bandFor(total: number): Band {
  if (total >= BANDS.aligned.min) return "aligned";
  if (total >= BANDS.tension.min) return "tension";
  return "misaligned";
}

export type DomainResult = {
  key: Domain["key"];
  name: string;
  total: number;
  band: Band;
};

export type AuditResult = {
  results: DomainResult[];
  answered: number;
  total: number;
  complete: boolean;
  primaryLever: DomainResult | null;
};

/**
 * Score the audit from the flat response store.
 * - Only integer answers 1..5 count as "answered".
 * - Domain total is the sum of its 7 answers (missing → 0 for summing).
 * - The Primary Lever is the domain carrying the most tension = the LOWEST total.
 *   Tie-break: lower domain index wins (Spiritual → Emotional → Identity → Structure).
 */
export function scoreAudit(all: Record<string, unknown>): AuditResult {
  const isAnswer = (v: unknown): v is number =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

  let answered = 0;
  const results: DomainResult[] = DOMAINS.map((d) => {
    let total = 0;
    for (let i = 1; i <= d.questions.length; i++) {
      const v = all[answerField(d.key, i)];
      if (isAnswer(v)) {
        total += v;
        answered += 1;
      }
    }
    return { key: d.key, name: d.name, total, band: bandFor(total) };
  });

  const totalScored = DOMAINS.reduce((n, d) => n + d.questions.length, 0);
  const complete = answered === totalScored;

  let primaryLever: DomainResult | null = null;
  if (complete && results.length) {
    // Lowest total = most tension. Deterministic tie-break by domain index.
    primaryLever = results.reduce((leader, r) => {
      if (r.total < leader.total) return r;
      if (r.total === leader.total) {
        const lIdx = DOMAINS.find((d) => d.key === leader.key)?.index ?? 99;
        const rIdx = DOMAINS.find((d) => d.key === r.key)?.index ?? 99;
        return rIdx < lIdx ? r : leader;
      }
      return leader;
    }, results[0]);
  }

  return { results, answered, total: totalScored, complete, primaryLever };
}
