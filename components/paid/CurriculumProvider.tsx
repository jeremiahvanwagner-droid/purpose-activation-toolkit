"use client";

import { createContext, useContext } from "react";
import type { ToolkitCurriculum } from "@/lib/paid/types";

const CurriculumContext = createContext<ToolkitCurriculum | null>(null);

export function PaidCurriculumProvider({
  value,
  children,
}: {
  value: ToolkitCurriculum;
  children: React.ReactNode;
}) {
  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>;
}

export function usePaidCurriculum(): ToolkitCurriculum {
  const value = useContext(CurriculumContext);
  if (!value) throw new Error("Paid curriculum is unavailable until access is authorized.");
  return value;
}

export function usePaidLabels(): Record<string, string> | null {
  return useContext(CurriculumContext)?.labels ?? null;
}
