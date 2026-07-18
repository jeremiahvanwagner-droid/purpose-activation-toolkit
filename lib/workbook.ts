/**
 * Keepsake builder — turns the flat response store into an ordered, labeled
 * document structure for the printable "completed workbook" view (and, later,
 * a generated-PDF download and cloud export). Pure data; the /workbook page
 * renders it.
 */

import { isFilled } from "./store";
import * as PA from "./content/purposeActivation";
import * as DM from "./content/decisionMaking";
import * as ATA from "./content/alignmentToAction";
import * as EP from "./content/executionPrompts";
import * as IAA from "./content/innerAlignmentAudit";
import type { Band } from "./content/innerAlignmentAudit";

export type Entry =
  | { k: "text"; label: string; text: string }
  | { k: "list"; label: string; items: string[]; ranked?: boolean }
  | { k: "kv"; label: string; rows: { k: string; v: string }[] }
  | { k: "statement"; text: string }
  | { k: "grid"; decision: string; options: { name: string; total: number }[] }
  | { k: "tracker"; done: number; total: number; days: { n: number; date: string; action: string; note: string }[] }
  | { k: "covenant"; body: string; name: string; date: string; signature: string; sealed: boolean }
  | { k: "prompts"; label: string; items: { prompt: string; answer: string }[] }
  | {
      k: "profile";
      results: { name: string; total: number; max: number; band: Band; bandLabel: string; isLever: boolean }[];
      primaryLever: string | null;
    };

export type Section = { heading: string; entries: Entry[] };
export type ModuleDoc = { slug: string; title: string; sections: Section[] };
export type Workbook = { name: string; date: string; modules: ModuleDoc[]; anyContent: boolean };

type Any = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const obj = (v: unknown): Any => (v && typeof v === "object" && !Array.isArray(v) ? (v as Any) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function textEntry(all: Any, id: string, label: string): Entry | null {
  const t = str(all[id]);
  return t ? { k: "text", label, text: t } : null;
}

function listEntry(all: Any, id: string, label: string, ranked = false): Entry | null {
  const items = arr(all[id]).map((x) => str(x)).filter(Boolean);
  return items.length ? { k: "list", label, items, ranked } : null;
}

function kvEntry(all: Any, id: string, label: string, keys: [string, string][]): Entry | null {
  const o = obj(all[id]);
  const rows = keys.map(([k, kl]) => ({ k: kl, v: str(o[k]) })).filter((r) => r.v);
  return rows.length ? { k: "kv", label, rows } : null;
}

function push(list: Entry[], e: Entry | null) {
  if (e) list.push(e);
}

/* ---------------------------------- Module 1 ---------------------------------- */
function buildPA(all: Any): Section[] {
  const s: Section[] = [];

  const s1: Entry[] = [];
  PA.S1_REFLECTIONS.forEach((r) => push(s1, textEntry(all, r.id, r.prompt)));
  if (s1.length) s.push({ heading: "Orientation", entries: s1 });

  const s2: Entry[] = [];
  PA.S2_LISTS.forEach((l) => push(s2, listEntry(all, l.id, l.label)));
  push(s2, textEntry(all, PA.S2_REFLECTION.id, PA.S2_REFLECTION.prompt));
  if (s2.length) s.push({ heading: "Design patterns", entries: s2 });

  const s3: Entry[] = [];
  push(s3, listEntry(all, PA.VALUES_FIELD, "My core values, ranked", true));
  push(s3, textEntry(all, PA.S3_REFLECTION.id, PA.S3_REFLECTION.prompt));
  if (s3.length) s.push({ heading: "Core values", entries: s3 });

  const stmt = PA.STATEMENT_PARTS.map((p) => str(all[p.id]));
  const s4: Entry[] = [];
  if (stmt.every(Boolean)) {
    s4.push({
      k: "statement",
      text: `Because God designed me as ${stmt[0]}, I am called to ${stmt[1]} for ${stmt[2]} by ${stmt[3]}.`,
    });
  }
  push(s4, textEntry(all, PA.STATEMENT_WORKING_FIELD, "My working purpose statement"));
  if (s4.length) s.push({ heading: "Purpose statement", entries: s4 });

  const s5: Entry[] = [];
  PA.LIFE_DOMAINS.forEach((d) =>
    push(
      s5,
      kvEntry(all, PA.domainField(d.key), d.name, [
        ["current", "Current reality"],
        ["vision", "Purpose-aligned vision"],
        ["shift", "One shift needed"],
      ])
    )
  );
  push(s5, textEntry(all, PA.S5_REFLECTION.id, PA.S5_REFLECTION.prompt));
  if (s5.length) s.push({ heading: "Six life domains", entries: s5 });

  const s6: Entry[] = [];
  push(
    s6,
    kvEntry(all, PA.MORNING_FIELD, "My Purpose Morning", [
      ["time", "Time"],
      ["word", "Word & prayer"],
      ["focus", "Intentional focus"],
      ["action", "One aligned action"],
    ])
  );
  push(s6, textEntry(all, PA.S6_REFLECTION.id, PA.S6_REFLECTION.prompt));
  if (s6.length) s.push({ heading: "Purpose Morning", entries: s6 });

  const s7: Entry[] = [];
  PA.BELIEF_FIELDS.forEach((id, i) =>
    push(
      s7,
      kvEntry(all, id, `Belief ${i + 1}`, [
        ["belief", "The lie"],
        ["truth", "God's truth"],
        ["scripture", "Scripture / evidence"],
      ])
    )
  );
  push(s7, textEntry(all, PA.S7_REFLECTION.id, PA.S7_REFLECTION.prompt));
  if (s7.length) s.push({ heading: "Renewing the mind", entries: s7 });

  const s8: Entry[] = [];
  push(s8, textEntry(all, PA.PLAN_FOCUS, "My 30-day focus"));
  push(
    s8,
    kvEntry(all, PA.PLAN_WEEKS, "Weekly targets", [
      ["w1", "Week 1"],
      ["w2", "Week 2"],
      ["w3", "Week 3"],
      ["w4", "Week 4"],
    ])
  );
  push(s8, listEntry(all, PA.PLAN_MICRO, "Daily micro-commitments"));
  push(
    s8,
    kvEntry(all, PA.PLAN_SUPPORT, "Support", [
      ["partner", "Accountability partner"],
      ["community", "Community"],
      ["checkin", "Check-in schedule"],
    ])
  );
  const cov = obj(all[PA.COMMIT_FIELD]);
  if (str(cov.name) || str(cov.signature)) {
    s8.push({
      k: "covenant",
      body:
        ", commit to walking in my Divine purpose with intentionality and faith for the next 30 days. I recognize that this is not about perfection, but about progress and obedience. I will honor my design, live my values, and take aligned action daily. I trust that God will meet me in my faithfulness and make my path clear.",
      name: str(cov.name),
      date: str(cov.date),
      signature: str(cov.signature),
      sealed: Boolean(cov.sealed),
    });
  }
  if (s8.length) s.push({ heading: "30-day activation plan", entries: s8 });

  const s9: Entry[] = [];
  PA.CLOSING_REFLECTIONS.forEach((r) => push(s9, textEntry(all, r.id, r.prompt)));
  if (s9.length) s.push({ heading: "Closing reflection", entries: s9 });

  return s;
}

/* ---------------------------------- Module 2 ---------------------------------- */
function buildDM(all: Any): Section[] {
  const s: Section[] = [];

  const s1: Entry[] = [];
  DM.DM_S1_REFLECTIONS.forEach((r) => push(s1, textEntry(all, r.id, r.prompt)));
  if (s1.length) s.push({ heading: "Bring one decision into the light", entries: s1 });

  push(s1, null);
  const filt = obj(all[DM.FILTER_FIELD]);
  const s2: Entry[] = [];
  if (str(filt.decision)) s2.push({ k: "text", label: "Current decision", text: str(filt.decision) });
  const pairs = arr(filt.pairs)
    .map((p) => obj(p))
    .filter((p) => str(p.fear) || str(p.higher));
  if (pairs.length)
    s2.push({
      k: "kv",
      label: "Fear says → Higher Self says",
      rows: pairs.map((p) => ({ k: str(p.fear) || "—", v: str(p.higher) })),
    });
  push(s2, textEntry(all, DM.DM_S2_REFLECTION.id, DM.DM_S2_REFLECTION.prompt));
  if (s2.length) s.push({ heading: "The Higher-Self filter", entries: s2 });

  const seven = obj(all[DM.SEVEN_FIELD]);
  const s3: Entry[] = [];
  if (str(seven.decision)) s3.push({ k: "text", label: "My decision", text: str(seven.decision) });
  const steps = DM.SEVEN_STEPS.map((st) => ({ k: st.title, v: str(seven[st.key]) })).filter((r) => r.v);
  if (steps.length) s3.push({ k: "kv", label: "The 7 steps", rows: steps });
  if (s3.length) s.push({ heading: "7-Step Divine Decision Framework", entries: s3 });

  const grid = obj(all[DM.GRID_FIELD]);
  const s5: Entry[] = [];
  if (str(grid.decision) || arr(grid.options).some((o) => str(o))) {
    const scores = obj(grid.scores);
    const options = [0, 1, 2]
      .map((i) => {
        const name = str(arr(grid.options)[i]);
        const total = DM.GRID_CRITERIA.reduce((sum, c) => sum + (Number(arr(scores[c.key])[i]) || 0), 0);
        return { name, total };
      })
      .filter((o) => o.name);
    if (options.length) s5.push({ k: "grid", decision: str(grid.decision), options });
  }
  DM.DM_S5_REFLECTIONS.forEach((r) => push(s5, textEntry(all, r.id, r.prompt)));
  push(s5, textEntry(all, DM.DM_S5_SPIRIT.id, DM.DM_S5_SPIRIT.prompt));
  if (s5.length) s.push({ heading: "Values-Based Decision Grid", entries: s5 });

  const s6: Entry[] = [];
  DM.LISTENING_PROMPTS.forEach((r) => push(s6, textEntry(all, r.id, r.prompt)));
  if (s6.length) s.push({ heading: "Listening prayer", entries: s6 });

  const s8: Entry[] = [];
  push(s8, listEntry(all, DM.PRACTICES_FIELD, "My non-negotiable practices"));
  const cov = obj(all[DM.DM_COMMIT_FIELD]);
  if (str(cov.name) || str(cov.signature)) {
    s8.push({
      k: "covenant",
      body: DM.DM_COVENANT_BODY,
      name: str(cov.name),
      date: str(cov.date),
      signature: str(cov.signature),
      sealed: Boolean(cov.sealed),
    });
  }
  if (s8.length) s.push({ heading: "Decision Covenant", entries: s8 });

  return s;
}

/* ---------------------------------- Module 3 ---------------------------------- */
function buildATA(all: Any): Section[] {
  const s: Entry[] = [];
  const out: Section[] = [];

  const s1: Entry[] = [];
  ATA.ATA_S1_REFLECTIONS.forEach((r) => push(s1, textEntry(all, r.id, r.prompt)));
  if (s1.length) out.push({ heading: "From intention to embodiment", entries: s1 });

  const s2: Entry[] = [];
  push(s2, listEntry(all, ATA.IN_FIELD, "In alignment"));
  push(s2, listEntry(all, ATA.OUT_FIELD, "Out of alignment"));
  ATA.ATA_S2_REFLECTIONS.forEach((r) => push(s2, textEntry(all, r.id, r.prompt)));
  if (s2.length) out.push({ heading: "Alignment indicators", entries: s2 });

  const s3: Entry[] = [];
  push(
    s3,
    kvEntry(all, ATA.FORMULA_FIELD, "Aligned Action Formula", [
      ["domain", "Domain"],
      ["purpose", "Because my purpose is"],
      ["values", "My core values here"],
      ["intend", "This week I intend to"],
      ["smallest", "Smallest aligned action"],
      ["outcome", "Expected outcome"],
    ])
  );
  if (s3.length) out.push({ heading: "The Aligned Action Formula", entries: s3 });

  const tr = arr(all[ATA.TRACKER_FIELD]).map((d) => obj(d));
  const days = tr
    .map((d, i) => ({ n: i + 1, date: str(d.date), action: str(d.action), note: str(d.note) }))
    .filter((d) => d.action);
  if (days.length) {
    out.push({
      heading: "21-Day Alignment Tracker",
      entries: [{ k: "tracker", done: days.length, total: 21, days }],
    });
  }

  const s9: Entry[] = [];
  push(s9, textEntry(all, ATA.P90_FOCUS, "90-day focus"));
  push(s9, listEntry(all, ATA.P90_ACTIONS, "Core aligned actions"));
  push(s9, textEntry(all, ATA.P90_SUCCESS, "What success looks like"));
  const cov = obj(all[ATA.ATA_COMMIT_FIELD]);
  if (str(cov.name) || str(cov.signature)) {
    s9.push({
      k: "covenant",
      body: ATA.ATA_COVENANT_BODY,
      name: str(cov.name),
      date: str(cov.date),
      signature: str(cov.signature),
      sealed: Boolean(cov.sealed),
    });
  }
  if (s9.length) out.push({ heading: "90-day focus plan", entries: s9 });

  return out;
}

/* ---------------------------------- Module 4 ---------------------------------- */
function buildEP(all: Any): Section[] {
  const out: Section[] = [];
  EP.DECKS.forEach((deck) => {
    const j = obj(all[EP.deckField(deck.key)]);
    const items = deck.prompts
      .map((prompt, i) => ({ prompt, answer: str(j[i]) }))
      .filter((x) => x.answer);
    if (items.length) out.push({ heading: deck.title, entries: [{ k: "prompts", label: "", items }] });
  });

  const lab: Entry[] = [];
  EP.LAB_FIELDS.forEach((id, i) => {
    const o = obj(all[id]);
    const rows = [
      ["struggle", "Struggle"],
      ["awareness", "Awareness prompt"],
      ["decision", "Decision prompt"],
      ["action", "Action prompt"],
    ]
      .map(([k, kl]) => ({ k: kl, v: str(o[k]) }))
      .filter((r) => r.v);
    if (rows.length) lab.push({ k: "kv", label: `My prompt set ${i + 1}`, rows });
  });
  if (lab.length) out.push({ heading: "Custom prompt lab", entries: lab });

  return out;
}

/* ---------------------------------- Inner Alignment Audit ---------------------------------- */
function buildIAA(all: Any): Section[] {
  const out: Section[] = [];
  const res = IAA.scoreAudit(all);

  // Alignment Profile — only after all 28 items are answered.
  if (res.complete) {
    const results = res.results.map((r) => ({
      name: r.name,
      total: r.total,
      max: IAA.BANDS.aligned.max,
      band: r.band,
      bandLabel: IAA.BANDS[r.band].label,
      isLever: res.primaryLever?.key === r.key,
    }));
    out.push({
      heading: "Your Alignment Profile",
      entries: [{ k: "profile", results, primaryLever: res.primaryLever?.name ?? null }],
    });
  }

  // Interpretation
  const interp: Entry[] = [];
  push(
    interp,
    textEntry(all, "iaa.interpret.secondary", "Which domain most supports the one you're repairing first?")
  );
  push(interp, textEntry(all, "iaa.interpret.hidden", "Where is a hidden drain quietly costing you energy?"));
  if (interp.length) out.push({ heading: "Read your pattern", entries: interp });

  // 7-day realignment plan
  const plan: Entry[] = [];
  push(plan, textEntry(all, "iaa.plan.focus", "Focus domain for the next 7 days"));
  push(plan, textEntry(all, "iaa.plan.boundary", "One boundary I'll hold"));
  push(plan, textEntry(all, "iaa.plan.practice", "One daily practice I'll keep"));
  push(plan, textEntry(all, "iaa.plan.measure", "How I'll know I'm improving"));
  if (plan.length) out.push({ heading: "My 7-day realignment plan", entries: plan });

  // Alignment statement — carries the same anchoring language as the audit page.
  const stmt: Entry[] = [];
  push(stmt, textEntry(all, "iaa.stmt.inviting", "God is inviting me to…"));
  push(stmt, textEntry(all, "iaa.stmt.release", "I release…"));
  push(stmt, textEntry(all, "iaa.stmt.commit", "I commit to…"));
  push(stmt, textEntry(all, "iaa.stmt.next7", "My next 7 days will look like…"));
  if (stmt.length) out.push({ heading: "My alignment statement", entries: stmt });

  // Deeper reflections per domain
  const reflect: Entry[] = [];
  IAA.DOMAINS.forEach((d) => {
    d.reflectionPrompts.forEach((p, i) => {
      push(reflect, textEntry(all, IAA.reflectField(d.key, i + 1), `${d.name} — ${p}`));
    });
  });
  if (reflect.length) out.push({ heading: "Deeper reflection", entries: reflect });

  // Worksheets
  const ws: Entry[] = [];
  IAA.WORKSHEETS.forEach((w) => {
    push(ws, textEntry(all, w.id, w.title));
  });
  if (ws.length) out.push({ heading: "Worksheets", entries: ws });

  return out;
}

const BUILDERS: Record<string, (all: Any) => Section[]> = {
  "inner-alignment-audit": buildIAA,
  "purpose-activation": buildPA,
  "decision-making": buildDM,
  "alignment-to-action": buildATA,
  "execution-prompts": buildEP,
};

const TITLES: Record<string, string> = {
  "inner-alignment-audit": "The Inner Alignment Audit",
  "purpose-activation": "Purpose Activation",
  "decision-making": "Proper Decision-Making",
  "alignment-to-action": "Alignment-to-Action",
  "execution-prompts": "Execution Prompts",
};

/** Best-effort name: first covenant signed. */
function findName(all: Any): string {
  for (const id of [PA.COMMIT_FIELD, DM.DM_COMMIT_FIELD, ATA.ATA_COMMIT_FIELD]) {
    const n = str(obj(all[id]).name);
    if (n) return n;
  }
  return "";
}

export function buildWorkbook(all: Any, today: string): Workbook {
  const modules: ModuleDoc[] = Object.keys(BUILDERS).map((slug) => ({
    slug,
    title: TITLES[slug],
    sections: BUILDERS[slug](all),
  }));
  const anyContent = modules.some((m) => m.sections.length > 0);
  return { name: findName(all), date: today, modules, anyContent };
}

/** Count of filled fields across everything (for the "you've written N answers" line). */
export function countAnswers(all: Any, fieldIds: string[]): number {
  return fieldIds.reduce((n, id) => (isFilled(all[id]) ? n + 1 : n), 0);
}
