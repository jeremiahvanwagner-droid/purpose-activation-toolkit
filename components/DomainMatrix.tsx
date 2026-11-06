"use client";

import { usePaidCurriculum } from "@/components/paid/CurriculumProvider";
import { domainField } from "@/lib/paid/ids";
import { useResponse } from "@/lib/store";

function DomainRow({ dKey, name }: { dKey: string; name: string }) {
  const DOMAIN_COLS = usePaidCurriculum().purposeActivation.DOMAIN_COLS as { key: string; label: string; ph: string }[];
  const [row, setRow] = useResponse<Record<string, string>>(domainField(dKey), {});
  return (
    <div className="dm-row">
      <div className="dm-name">{name}</div>
      <div className="dm-cells">
        {DOMAIN_COLS.map((c) => (
          <div className="field" key={c.key} style={{ marginBottom: 0 }}>
            <label htmlFor={`${dKey}-${c.key}`}>{c.label}</label>
            <textarea
              id={`${dKey}-${c.key}`}
              rows={2}
              value={row[c.key] ?? ""}
              placeholder={c.ph}
              onChange={(e) => setRow({ ...row, [c.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DomainMatrix() {
  const LIFE_DOMAINS = usePaidCurriculum().purposeActivation.LIFE_DOMAINS as { key: string; name: string }[];
  return (
    <div className="dm">
      {LIFE_DOMAINS.map((d) => (
        <DomainRow key={d.key} dKey={d.key} name={d.name} />
      ))}
    </div>
  );
}
