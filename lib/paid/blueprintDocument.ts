/**
 * The Blueprint document, including the teaching sentences that used to be
 * hardcoded in the client page. Callers must already have authorized the product.
 */
import "server-only";

import { BLUEPRINT_CLOSING, BLUEPRINT_DOMAIN_MAX, BLUEPRINT_META, buildBlueprint } from "@/lib/content/alignmentBlueprint";
import { BANDS, type Band } from "@/lib/content/innerAlignmentAudit";

function quote(statement: string): string {
  return statement.replace(/\.$/, "");
}

export function blueprintDocument(answers: Record<string, unknown>, dated: string) {
  const bp = buildBlueprint(answers);
  const empty = {
    ready: false as const,
    title: BLUEPRINT_META.title,
    subtitle: BLUEPRINT_META.subtitle,
    emptyTitle: "Your Blueprint is written from your Audit.",
    emptyBody:
      "It reads your four domain scores and tells you what they mean — so it needs a complete Audit to read. That takes a few minutes, and your answers save as you go.",
    emptyNext: "Finish it, come back here, and your Blueprint will be waiting.",
  };
  if (!bp) return empty;

  const bandLabel = (band: Band) => BANDS[band].label;
  return {
    ready: true as const,
    dated,
    title: BLUEPRINT_META.title,
    subtitle: BLUEPRINT_META.subtitle,
    domainMax: BLUEPRINT_DOMAIN_MAX,
    scoresHint: "The lowest is not a failure — it is the place with the most to give back.",
    scores: bp.results.map((r) => ({
      key: r.key,
      name: r.name,
      total: r.total,
      band: r.band,
      bandLabel: bandLabel(r.band),
      lever: r.key === bp.primaryLever.key,
    })),
    readings: bp.readings.map((r) => ({
      key: r.key,
      name: r.name,
      total: r.total,
      bandLabel: bandLabel(r.band),
      reading: r.reading,
    })),
    leverTitle: `${bp.primaryLever.name} is your primary lever`,
    leverIntro:
      "It carries the most tension of the four, which means it is also where a small change pays the most. Repair usually travels outward from here: steady this, and the others get easier rather than competing for your attention.",
    invitation: bp.invitation,
    groundTitle: "The ground you're standing on",
    groundBody: `Your steadiest domain is ${bp.strongest.name}, at ${bp.strongest.total}/${BLUEPRINT_DOMAIN_MAX}. ${bp.support}`,
    holdingBody: `You marked “${quote(bp.holding.statement)}” as ${bp.holding.label.toLowerCase()}. That is already holding. Build from it.`,
    drainTitle: "The quiet drain",
    drainBody: `Of all twenty-eight statements, one sits lowest: “${quote(bp.drain.statement)}” — ${bp.drain.label.toLowerCase()}, in ${bp.drain.domain}.`,
    drainNote:
      "Things at this level are rarely dramatic. They are normalised, which is exactly why they cost so much without ever announcing themselves. You are not being asked to fix it this week — only to see it.",
    planHint: "Small and specific beats ambitious and vague. One week, then choose again.",
    plan: bp.plan,
    closing: BLUEPRINT_CLOSING,
    pitch:
      "The Purpose Activation Toolkit turns this week into a practice — four interactive modules that carry you from clarity into daily, aligned action.",
  };
}
