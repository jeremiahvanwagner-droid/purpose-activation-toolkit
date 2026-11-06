/**
 * Paid answer labels. Built on the server and sent only after authorization.
 * The client lookup in lib/fieldLabels.ts must not import these modules.
 */
import "server-only";

import * as PA from "@/lib/content/purposeActivation";
import * as DM from "@/lib/content/decisionMaking";
import * as ATA from "@/lib/content/alignmentToAction";
import * as EP from "@/lib/content/executionPrompts";
import * as IAA from "@/lib/content/innerAlignmentAudit";

export function buildAnswerLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  const put = (id: string, label: string) => {
    labels[id] = label;
  };

  PA.S1_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  PA.S2_LISTS.forEach((l) => put(l.id, l.label));
  put(PA.S2_REFLECTION.id, PA.S2_REFLECTION.prompt);
  put(PA.VALUES_FIELD, "My core values, ranked");
  put(PA.S3_REFLECTION.id, PA.S3_REFLECTION.prompt);
  PA.STATEMENT_PARTS.forEach((p) => put(p.id, `Purpose statement — ${p.hint}`));
  put(PA.STATEMENT_WORKING_FIELD, "My working purpose statement");
  PA.LIFE_DOMAINS.forEach((d) => put(PA.domainField(d.key), `Life domain — ${d.name}`));
  put(PA.S5_REFLECTION.id, PA.S5_REFLECTION.prompt);
  put(PA.MORNING_FIELD, "My Purpose Morning");
  put(PA.S6_REFLECTION.id, PA.S6_REFLECTION.prompt);
  PA.BELIEF_FIELDS.forEach((id, i) => put(id, `Limiting belief ${i + 1}`));
  put(PA.S7_REFLECTION.id, PA.S7_REFLECTION.prompt);
  put(PA.PLAN_FOCUS, "My 30-day focus");
  put(PA.PLAN_WEEKS, "30-day plan — weekly targets");
  put(PA.PLAN_MICRO, "30-day plan — daily micro-commitments");
  put(PA.PLAN_SUPPORT, "30-day plan — support");
  put(PA.COMMIT_FIELD, "My 30-day commitment");
  PA.CLOSING_REFLECTIONS.forEach((r) => put(r.id, r.prompt));

  DM.DM_S1_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  put(DM.FILTER_FIELD, "Higher-Self decision filter");
  put(DM.DM_S2_REFLECTION.id, DM.DM_S2_REFLECTION.prompt);
  put(DM.SEVEN_FIELD, "7-Step Divine Decision Framework");
  DM.REWRITE_FIELDS.forEach((id, i) => put(id, `Distorted thought ${i + 1}`));
  put(DM.DM_S4_REFLECTION.id, DM.DM_S4_REFLECTION.prompt);
  put(DM.GRID_FIELD, "Values-Based Decision Grid");
  DM.DM_S5_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  put(DM.DM_S5_SPIRIT.id, DM.DM_S5_SPIRIT.prompt);
  DM.LISTENING_PROMPTS.forEach((r) => put(r.id, r.prompt));
  DM.DM_DOMAINS.forEach((d) => put(DM.domainAppField(d.key), `Decision in ${d.name}`));
  put(DM.DM_S7_REFLECTION.id, DM.DM_S7_REFLECTION.prompt);
  put(DM.PRACTICES_FIELD, "My decision practices");
  put(DM.PENDING_FIELD, "One pending decision");
  put(DM.DM_COMMIT_FIELD, "My Decision Covenant");
  DM.DM_CLOSING.forEach((r) => put(r.id, r.prompt));

  ATA.ATA_S1_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  put(ATA.IN_FIELD, "Signs I am in alignment");
  put(ATA.OUT_FIELD, "Signs I am out of alignment");
  ATA.ATA_S2_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  put(ATA.FORMULA_FIELD, "Aligned Action Formula");
  put(ATA.RESISTANCE_FIELD, "Resistance and bypass actions");
  put(ATA.ATA_S4_REFLECTION.id, ATA.ATA_S4_REFLECTION.prompt);
  put(ATA.RITUAL_FIELD, "Daily aligned-action ritual");
  put(ATA.ECO_FIELD, "Accountability ecosystem");
  ATA.ATA_S6_REFLECTIONS.forEach((r) => put(r.id, r.prompt));
  put(ATA.TRACKER_FIELD, "21-Day Alignment Tracker");
  put(ATA.POST_CHALLENGE.id, ATA.POST_CHALLENGE.prompt);
  ATA.INTEGRATION.forEach((r) => put(r.id, r.prompt));
  put(ATA.P90_FOCUS, "90-day focus");
  put(ATA.P90_ACTIONS, "90-day core aligned actions");
  put(ATA.P90_RITUALS, "90-day ritual commitments");
  put(ATA.P90_ACCT, "90-day accountability structure");
  put(ATA.P90_REVIEWS, "90-day review dates");
  put(ATA.P90_SUCCESS, "What success looks like at 90 days");
  put(ATA.ATA_COMMIT_FIELD, "My 90-day commitment");

  EP.DECKS.forEach((d) => {
    put(EP.deckField(d.key), `${d.title} prompts`);
    d.prompts.forEach((prompt, index) => put(`${EP.deckField(d.key)}#${index}`, prompt));
  });
  EP.LAB_FIELDS.forEach((id, i) => put(id, `Custom prompt set ${i + 1}`));
  put(EP.TOOLKIT_FIELD, "My personal prompt toolkit");

  IAA.DOMAINS.forEach((d) => {
    d.reflectionPrompts.forEach((p, i) => put(IAA.reflectField(d.key, i + 1), `${d.name} — ${p}`));
  });
  IAA.WORKSHEETS.forEach((w) => put(w.id, w.title));

  return labels;
}
