"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAllModuleProgress } from "@/lib/modules";
import { useResponses } from "@/lib/store";

export default function ModuleMeta({ slug, label = "Module progress" }: { slug: string; label?: string }) {
  const progress = useAllModuleProgress()[slug] ?? { done: 0, total: 0, pct: 0 };
  const responses = useResponses();

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const first = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setTouched(true);
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaving(false), 700);
    return () => clearTimeout(saveTimer.current);
  }, [responses]);

  return (
    <div className="meta">
      <div className="prog">
        <div className="row">
          <span>{label}</span>
          <b>{progress.pct}%</b>
        </div>
        <div className="bar">
          <i style={{ width: `${progress.pct}%` }} />
        </div>
      </div>
      <span className={`saved${saving ? " saving" : ""}`}>
        <span className="pip" />
        <span>{saving ? "Saving…" : touched ? "Saved just now" : "Saved"}</span>
      </span>
      <Link className="btn ghost" href="/workbook">
        Export my workbook
      </Link>
    </div>
  );
}
