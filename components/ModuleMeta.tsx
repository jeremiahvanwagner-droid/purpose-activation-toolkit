"use client";

import Link from "next/link";
import SaveStatus from "@/components/SaveStatus";
import { useAllModuleProgress } from "@/lib/modules";

/**
 * The module header strip: how many exercises have been started, where the
 * answers are saved, and the way to the keepsake. "Started" is deliberate —
 * the count moves when an exercise has real content in it, which is not the
 * same as the exercise being finished.
 */
export default function ModuleMeta({ slug, label = "Exercises started" }: { slug: string; label?: string }) {
  const progress = useAllModuleProgress()[slug] ?? { done: 0, total: 0, pct: 0 };

  return (
    <div className="meta">
      <div className="prog">
        <div className="row">
          <span>{label}</span>
          <b>
            {progress.done} of {progress.total}
          </b>
        </div>
        <div className="bar">
          <i style={{ width: `${progress.pct}%` }} />
        </div>
      </div>
      <SaveStatus />
      <Link className="btn ghost" href="/workbook">
        Export my workbook
      </Link>
    </div>
  );
}
