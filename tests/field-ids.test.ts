import { test } from "node:test";
import assert from "node:assert/strict";
import { PA_FIELD_IDS as contentPA, COMMIT_FIELD as contentCommit } from "../lib/content/purposeActivation.ts";
import { DM_FIELD_IDS as contentDM, SEVEN_STEPS, SEVEN_FIELD as contentSeven } from "../lib/content/decisionMaking.ts";
import { ATA_FIELD_IDS as contentATA, ATA_COMMIT_FIELD as contentAta } from "../lib/content/alignmentToAction.ts";
import { EP_FIELD_IDS as contentEP } from "../lib/content/executionPrompts.ts";
import {
  ATA_COMMIT_FIELD,
  ATA_FIELD_IDS,
  COMMIT_FIELD,
  DM_FIELD_IDS,
  EP_FIELD_IDS,
  PA_FIELD_IDS,
  SEVEN_FIELD,
  SEVEN_STEP_KEYS,
} from "../lib/content/fieldIds.ts";

test("public field ids match the paid content modules and carry no teaching text", () => {
  assert.deepEqual([...PA_FIELD_IDS], contentPA);
  assert.deepEqual([...DM_FIELD_IDS], contentDM);
  assert.deepEqual([...ATA_FIELD_IDS], contentATA);
  assert.deepEqual([...EP_FIELD_IDS], contentEP);
  assert.equal(COMMIT_FIELD, contentCommit);
  assert.equal(SEVEN_FIELD, contentSeven);
  assert.equal(ATA_COMMIT_FIELD, contentAta);
  assert.deepEqual([...SEVEN_STEP_KEYS], SEVEN_STEPS.map((step) => step.key));
  const blob = JSON.stringify({ PA_FIELD_IDS, DM_FIELD_IDS, ATA_FIELD_IDS, EP_FIELD_IDS, SEVEN_STEP_KEYS });
  assert.equal(blob.includes(" "), false);
});
