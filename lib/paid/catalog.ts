/**
 * Authorized curriculum payload. Importing this from a client component fails
 * the build (server-only). The strings stay out of .next/static.
 */
import "server-only";

import * as ATA from "@/lib/content/alignmentToAction";
import * as DM from "@/lib/content/decisionMaking";
import * as EP from "@/lib/content/executionPrompts";
import * as PA from "@/lib/content/purposeActivation";
import { buildAnswerLabels } from "@/lib/paid/labels";
import { PAGE } from "@/lib/paid/pageCopy";
import type { ToolkitCurriculum } from "@/lib/paid/types";

export const PAID_CURRICULUM_SENTINEL = "tjb-paid-curriculum-sentinel-7f3a9c";

function jsonData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toolkitCurriculum(): ToolkitCurriculum {
  return {
    sentinel: PAID_CURRICULUM_SENTINEL,
    purposeActivation: jsonData(PA),
    decisionMaking: jsonData(DM),
    alignmentToAction: jsonData(ATA),
    executionPrompts: jsonData(EP),
    page: PAGE,
    labels: buildAnswerLabels(),
    epigraph: PAGE.workbookEpigraph,
  } as ToolkitCurriculum;
}
