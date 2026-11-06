"use client";

import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import { useResponse } from "@/lib/store";

type Pair = { r?: string; bypass?: string };
type Resistance = { pairs?: Pair[] };

const ROWS = 3;

export default function ResistancePairs() {
  const { RESISTANCE_FIELD } = usePaidCurriculum().alignmentToAction;
  const [v, setV] = useResponse<Resistance>(RESISTANCE_FIELD, {});
  const pairs = Array.from({ length: ROWS }, (_, i) => v.pairs?.[i] ?? {});

  function setPair(i: number, key: keyof Pair, val: string) {
    const next = pairs.map((p) => ({ ...p }));
    next[i] = { ...next[i], [key]: val };
    setV({ pairs: next });
  }

  return (
    <div>
      <div className="lh-head">
        <h4 className="lh-from">Recurring resistance</h4>
        <h4 className="lh-to">My 5-minute bypass action</h4>
      </div>
      {pairs.map((p, i) => (
        <div className="lh-pair" key={i}>
          <input
            type="text"
            autoComplete="off"
            aria-label={`Resistance ${i + 1}`}
            value={p.r ?? ""}
            placeholder={`Resistance ${i + 1} — e.g., perfectionism, distraction…`}
            onChange={(e) => setPair(i, "r", e.target.value)}
          />
          <input
            type="text"
            autoComplete="off"
            aria-label={`Bypass action ${i + 1}`}
            value={p.bypass ?? ""}
            placeholder="Doable in 5 minutes, starting now…"
            onChange={(e) => setPair(i, "bypass", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
