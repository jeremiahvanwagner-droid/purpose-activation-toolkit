"use client";

import { isFilled, useResponses } from "./store";
import { PA_FIELD_IDS } from "./content/purposeActivation";

export type ModuleMeta = {
  slug: string;
  index: number;
  kicker: string;
  title: string;
  blurb: string;
  available: boolean;
  fieldIds: string[];
};

export const MODULES: ModuleMeta[] = [
  {
    slug: "purpose-activation",
    index: 1,
    kicker: "Module 1",
    title: "Purpose Activation",
    blurb: "Discover your design",
    available: true,
    fieldIds: PA_FIELD_IDS,
  },
  {
    slug: "decision-making",
    index: 2,
    kicker: "Module 2",
    title: "Decision-Making",
    blurb: "Decide with peace",
    available: false,
    fieldIds: [],
  },
  {
    slug: "alignment-to-action",
    index: 3,
    kicker: "Module 3",
    title: "Alignment-to-Action",
    blurb: "Turn clarity into motion",
    available: false,
    fieldIds: [],
  },
  {
    slug: "execution-prompts",
    index: 4,
    kicker: "Module 4",
    title: "Execution Prompts",
    blurb: "Your daily companion",
    available: false,
    fieldIds: [],
  },
];

export function moduleBySlug(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export type Progress = { done: number; total: number; pct: number };

/** Progress for every module in one pass (reads the store once). */
export function useAllModuleProgress(): Record<string, Progress> {
  const all = useResponses();
  const out: Record<string, Progress> = {};
  for (const m of MODULES) {
    const total = m.fieldIds.length;
    const done = m.fieldIds.reduce((n, id) => (isFilled(all[id]) ? n + 1 : n), 0);
    out[m.slug] = { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  return out;
}
