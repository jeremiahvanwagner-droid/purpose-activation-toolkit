/**
 * Exercise ids and structural keys only. No prompts, examples, or teaching.
 * Progress on the public toolkit shell counts these. The curriculum text that
 * belongs to a paid module stays in the server content modules.
 *
 * tests/field-ids.test.ts fails if these lists drift from the content modules.
 */

export const COMMIT_FIELD = "pa.s8.commitment";
export const SEVEN_FIELD = "dm.s3.seven";
export const FILTER_FIELD = "dm.s2.filter";
export const GRID_FIELD = "dm.s5.grid";
export const PENDING_FIELD = "dm.s8.pending";
export const DM_COMMIT_FIELD = "dm.s8.commitment";
export const FORMULA_FIELD = "ata.s3.formula";
export const TRACKER_FIELD = "ata.s7.tracker";
export const ATA_COMMIT_FIELD = "ata.s9.commitment";

export const SEVEN_STEP_KEYS = ["question", "values", "facts", "thoughts", "prayer", "choice", "review"] as const;

export const PA_FIELD_IDS = [
  "pa.s1.here",
  "pa.s1.misaligned",
  "pa.s2.strengths",
  "pa.s2.asked",
  "pa.s2.flow",
  "pa.s2.reflect",
  "pa.values.ranked",
  "pa.s3.betraying",
  "pa.stmt.identity",
  "pa.stmt.calling",
  "pa.stmt.audience",
  "pa.stmt.method",
  "pa.stmt.working",
  "pa.s5.domain.work",
  "pa.s5.domain.relationships",
  "pa.s5.domain.service",
  "pa.s5.domain.health",
  "pa.s5.domain.finances",
  "pa.s5.domain.creativity",
  "pa.s5.reflect",
  "pa.s6.morning",
  "pa.s6.reflect",
  "pa.s7.belief1",
  "pa.s7.belief2",
  "pa.s7.belief3",
  "pa.s7.reflect",
  "pa.s8.focus",
  "pa.s8.weeks",
  "pa.s8.micro",
  "pa.s8.support",
  "pa.s8.commitment",
] as const;

export const DM_FIELD_IDS = [
  "dm.s1.weighs",
  "dm.s1.why",
  "dm.s1.surrender",
  "dm.s2.filter",
  "dm.s2.reflect",
  "dm.s3.seven",
  "dm.s4.r1",
  "dm.s4.r2",
  "dm.s4.r3",
  "dm.s4.reflect",
  "dm.s5.grid",
  "dm.s5.highest",
  "dm.s5.spirit",
  "dm.s5.gap",
  "dm.s5.confirm",
  "dm.s6.invited",
  "dm.s6.release",
  "dm.s6.step",
  "dm.s7.career",
  "dm.s7.relationship",
  "dm.s7.financial",
  "dm.s7.health",
  "dm.s7.ministry",
  "dm.s7.reflect",
  "dm.s8.practices",
  "dm.s8.pending",
  "dm.s8.commitment",
] as const;

export const ATA_FIELD_IDS = [
  "ata.s1.gap",
  "ata.s1.why",
  "ata.s1.change",
  "ata.s2.in",
  "ata.s2.out",
  "ata.s2.warning",
  "ata.s2.response",
  "ata.s3.formula",
  "ata.s4.resistance",
  "ata.s4.onepct",
  "ata.s5.ritual",
  "ata.s6.eco",
  "ata.s6.who",
  "ata.s6.action",
  "ata.s7.tracker",
  "ata.s9.focus",
  "ata.s9.actions",
  "ata.s9.rituals",
  "ata.s9.acct",
  "ata.s9.reviews",
  "ata.s9.success",
  "ata.s9.commitment",
] as const;

export const EP_FIELD_IDS = [
  "ep.deck.purpose",
  "ep.deck.identity",
  "ep.deck.decision",
  "ep.deck.action",
  "ep.deck.reflection",
  "ep.deck.legacy",
  "ep.lab.s1",
  "ep.lab.s2",
  "ep.lab.s3",
  "ep.toolkit",
] as const;
