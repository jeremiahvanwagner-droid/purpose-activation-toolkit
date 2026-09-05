/**
 * The Divine Alignment Blueprint — the $27 product, generated from a reader's
 * own Inner Alignment Audit answers.
 *
 * The Audit gives four scores. The Blueprint is what those scores mean: how
 * each domain is actually behaving, which one to repair first, which strength
 * carries that repair, the single habit quietly costing the most, and a seven
 * day plan small enough to keep.
 *
 * Everything here is derived from their responses — the domain totals, the
 * statements they scored lowest and highest, the micro-commitments already
 * written for each domain in innerAlignmentAudit.ts. Nothing is random and
 * nothing is invented at read time, so the same answers always produce the
 * same Blueprint and it can be regenerated or printed at any time.
 */

import {
  BANDS,
  DOMAINS,
  LIKERT,
  answerField,
  scoreAudit,
  type Band,
  type Domain,
  type DomainResult,
} from "./innerAlignmentAudit";

type DomainKey = Domain["key"];

/** How each domain reads at each band. Written to be true of the score, not
 *  of the person — a low domain is a condition to repair, never a verdict. */
const READING: Record<DomainKey, Record<Band, string>> = {
  spiritual: {
    aligned:
      "Your spiritual signal is clear. You are recognising God's attention in ordinary moments, and you can tell conviction from condemnation without spiralling. Guard this: clarity of this kind is usually the fruit of a practice, and it fades quietly when the practice does.",
    tension:
      "Your signal is real but intermittent. You hear clearly in some seasons and go looking for confirmation in others, which is usually a sign that noise — not doubt — is the problem. The work here is not to hear more; it is to make room to hear at all.",
    misaligned:
      "Right now the noise is louder than the signal, and that makes ordinary decisions feel heavier than they are. This is not distance from God; it is bandwidth. When perception is crowded, anxiety starts to sound like guidance and intensity starts to feel like direction.",
  },
  emotional: {
    aligned:
      "Your emotions are moving with you rather than driving you. You can feel something strongly and still choose your response, and you recover without losing your centre. This is hard-won ground — most people mistake it for temperament when it is actually practice.",
    tension:
      "You regulate well in calm conditions and lose some ground under pressure. That is the ordinary pattern: the skill is present, the margin is thin. Emotions are still signals here, but in the harder moments they are beginning to steer.",
    misaligned:
      "Emotion is currently doing work it was never meant to do — carrying decisions, setting pace, standing in for rest. That is exhausting, and it is not a character flaw. Unprocessed feeling becomes a steering wheel; regulation is how you take the wheel back.",
  },
  identity: {
    aligned:
      "Who you are in Christ and who you are under pressure are broadly the same person. You can take correction without collapsing and hold confidence and humility together. That agreement is the quiet engine underneath everything else on this page.",
    tension:
      "You know the truth about who you are, and an older name still gets a vote when the pressure rises. That gap between what you believe and what you default to is the tension this domain is reporting — and it closes with rehearsal, not effort.",
    misaligned:
      "There is real distance between the name you speak over yourself and the one you live from when things get hard. Identity drift is subtle: it rarely announces itself, it just makes new seasons feel like old ones and keeps you braced for an outcome God has already changed.",
  },
  structure: {
    aligned:
      "Your life is currently making it easier to stay aware of God, not harder. Rhythms, inputs and relationships are mostly pulling the same direction. Structure at this level is what makes faith feel light rather than heavy.",
    tension:
      "Your intentions are sound and your structure only partly supports them. Some rhythms hold; others are being crowded out by inputs you did not consciously choose. This is the most repairable domain on the page — structure responds fast.",
    misaligned:
      "Your daily life and your spiritual intentions are working against each other, and that contradiction is expensive. When structure does not support revelation, faith starts to feel like effort — not because your desire is weak, but because nothing in the week protects it.",
  },
};

/** What each domain contributes when it is your steadiest ground. Full
 *  sentences: they follow the score, they do not extend it into a clause. */
const SUPPORT: Record<DomainKey, string> = {
  spiritual:
    "You can already hear clearly. Bring the harder domain into that quiet rather than trying to solve it in motion.",
  emotional:
    "You can stay steady while something is still unresolved — which means you can face the harder domain without needing it fixed today.",
  identity:
    "You know who you are. That is what makes the work below possible to look at honestly: it is not a referendum on your worth.",
  structure:
    "Your life already holds rhythms that work. The harder domain has somewhere to live, instead of depending on willpower.",
};

/** The invitation for the domain carrying the most tension. */
const INVITATION: Record<DomainKey, string> = {
  spiritual: "Make room before you make decisions.",
  emotional: "Feel it fully, then lead it.",
  identity: "Rehearse the true name until it answers first.",
  structure: "Change the week, not your willpower.",
};

export type BlueprintItem = { domain: string; statement: string; label: string; value: number };

export type BlueprintDay = { day: number; title: string; body: string };

export type Blueprint = {
  results: DomainResult[];
  primaryLever: DomainResult;
  strongest: DomainResult;
  /** The interpretation paragraph for each domain, in domain order. */
  readings: { key: DomainKey; name: string; total: number; band: Band; reading: string }[];
  invitation: string;
  support: string;
  /** The single statement scored lowest — the quiet drain. */
  drain: BlueprintItem;
  /** The single statement scored highest — what is already holding. */
  holding: BlueprintItem;
  plan: BlueprintDay[];
};

const DOMAIN_MAX = (DOMAINS[0]?.questions.length ?? 7) * 5;
export const BLUEPRINT_DOMAIN_MAX = DOMAIN_MAX;

const labelFor = (value: number): string =>
  LIKERT.find((l) => l.value === value)?.label ?? "";

/** Statements are written as sentences and end in a full stop. Quoted inline
 *  mid-sentence — «you marked "…" as never» — that stop reads as a stumble. */
export const inlineQuote = (statement: string): string => statement.replace(/\.$/, "");

/** Every answered statement, flattened, so the extremes can be found. */
function items(all: Record<string, unknown>): BlueprintItem[] {
  const out: BlueprintItem[] = [];
  for (const d of DOMAINS) {
    d.questions.forEach((statement, i) => {
      const v = all[answerField(d.key, i + 1)];
      if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) {
        out.push({ domain: d.name, statement, label: labelFor(v), value: v });
      }
    });
  }
  return out;
}

/**
 * Seven days built from the primary lever's own micro-commitments, with the
 * supporting domain brought in mid-week and the drain named on day three —
 * late enough that the week has begun, early enough to still change it.
 */
function buildPlan(lever: Domain, support: Domain, drain: BlueprintItem): BlueprintDay[] {
  const [first, second, third] = lever.microCommitments;
  return [
    {
      day: 1,
      title: "Name it before God",
      body: `Read your ${lever.name} score again and say it plainly in prayer: this is the place I am asking for help. No striving, no explaining. Then write one sentence: what would change in an ordinary week if this were steady?`,
    },
    {
      day: 2,
      title: "Begin the first practice",
      body: `Today's commitment, in your own words: “${first}” Keep it small enough that you will still do it on your worst day this week.`,
    },
    {
      day: 3,
      title: "Look at the quiet drain",
      body: `You marked “${inlineQuote(drain.statement)}” as ${drain.label.toLowerCase()}. Do not fix it today — just watch it. Notice when it happens, what precedes it, and what it costs you afterwards.`,
    },
    {
      day: 4,
      title: "Add the second practice",
      body: `Add a second: “${second}” You are not replacing day two — you are stacking on it. Two small things held together are worth more than one heroic effort.`,
    },
    {
      day: 5,
      title: "Draw on your strength",
      body: `Bring ${lever.name} into ${support.name}, the domain already holding steady for you. Ask specifically: how does what already works here make the harder thing easier?`,
    },
    {
      day: 6,
      title: "Hold the boundary",
      body: `And the third: “${third}” Expect resistance today. Resistance is usually evidence that the practice is touching something real, not evidence that it is wrong.`,
    },
    {
      day: 7,
      title: "Review, and choose again",
      body: `What held this week? What slipped, and what was happening when it slipped? Choose the one practice worth carrying into next week — then carry only that one.`,
    },
  ];
}

/** Build the Blueprint. Returns null until the Audit is complete, because
 *  every section below is derived from a full set of answers. */
export function buildBlueprint(all: Record<string, unknown>): Blueprint | null {
  const score = scoreAudit(all);
  if (!score.complete || !score.primaryLever) return null;

  const lever = score.primaryLever;
  const strongest = score.results.reduce((best, r) => (r.total > best.total ? r : best), score.results[0]);

  const answered = items(all);
  if (!answered.length) return null;
  const sorted = [...answered].sort((a, b) => a.value - b.value);
  const drain = sorted[0];
  const holding = sorted[sorted.length - 1];

  const leverDomain = DOMAINS.find((d) => d.key === lever.key)!;
  const supportDomain = DOMAINS.find((d) => d.key === strongest.key)!;

  return {
    results: score.results,
    primaryLever: lever,
    strongest,
    readings: score.results.map((r) => ({
      key: r.key,
      name: r.name,
      total: r.total,
      band: r.band,
      reading: READING[r.key][r.band],
    })),
    invitation: INVITATION[lever.key],
    support: SUPPORT[strongest.key],
    drain,
    holding,
    plan: buildPlan(leverDomain, supportDomain, drain),
  };
}

export const BLUEPRINT_META = {
  title: "Your Divine Alignment Blueprint",
  subtitle:
    "The story behind your scores — where you stand, the one place to begin, and a seven-day path into deeper alignment.",
};

/** The closing benediction. Named here so the page and any future PDF share it. */
export const BLUEPRINT_CLOSING =
  "Alignment is not a performance you sustain. It is an agreement you keep returning to — and returning is the practice. Take one week. Keep it small. Then come back to this page and read your own words again.";

export { BANDS };
