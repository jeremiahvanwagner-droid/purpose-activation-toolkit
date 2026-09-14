/**
 * Progress rules: when an exercise counts as started. Pure, so it can be
 * tested without React (tests/progress.test.ts).
 */

import { isFilled } from "./sync/workbookSync";
import { COMMIT_FIELD } from "./content/purposeActivation";
import { DM_COMMIT_FIELD, FILTER_FIELD, GRID_FIELD, PENDING_FIELD, SEVEN_FIELD, SEVEN_STEPS } from "./content/decisionMaking";
import { ATA_COMMIT_FIELD, FORMULA_FIELD, TRACKER_FIELD } from "./content/alignmentToAction";

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const sealed = (v: unknown) => asObj(v).sealed === true;

/**
 * When a compound exercise counts as started. Anything not listed counts as
 * soon as it holds any content. These rules keep the count honest where "any
 * content" would overstate it — a decision's title is not the 7-step process,
 * and a covenant with a name typed in is not a signed covenant.
 */
const STARTED_RULES: Record<string, (v: unknown) => boolean> = {
  [SEVEN_FIELD]: (v) => SEVEN_STEPS.some((s) => isFilled(asObj(v)[s.key])),
  [FILTER_FIELD]: (v) => Array.isArray(asObj(v).pairs) && (asObj(v).pairs as unknown[]).some(isFilled),
  [GRID_FIELD]: (v) =>
    Object.values(asObj(asObj(v).scores)).some((row) => Array.isArray(row) && row.some((n) => Number(n) > 0)),
  [PENDING_FIELD]: (v) => isFilled(asObj(v).facing) || isFilled(asObj(v).action),
  [FORMULA_FIELD]: (v) => ["purpose", "values", "intend", "smallest", "outcome"].some((k) => isFilled(asObj(v)[k])),
  [TRACKER_FIELD]: (v) => Array.isArray(v) && v.some((d) => isFilled(asObj(d).action)),
  [COMMIT_FIELD]: sealed,
  [DM_COMMIT_FIELD]: sealed,
  [ATA_COMMIT_FIELD]: sealed,
};

/** True when an exercise has been started (see STARTED_RULES). */
export function isStarted(fieldId: string, value: unknown): boolean {
  const rule = STARTED_RULES[fieldId];
  return rule ? rule(value) : isFilled(value);
}

