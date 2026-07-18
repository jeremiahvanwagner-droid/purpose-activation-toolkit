"use client";

import { useResponse } from "@/lib/store";
import { DM_DOMAINS, domainAppField } from "@/lib/content/decisionMaking";

type App = { q?: string; v?: string; c?: string };

function DomainApp({ dKey, name, considerations }: { dKey: string; name: string; considerations: string[] }) {
  const [a, setA] = useResponse<App>(domainAppField(dKey), {});
  const set = (key: keyof App, val: string) => setA({ ...a, [key]: val });

  return (
    <div className="dm-row">
      <div className="dm-name">{name}</div>
      <ul className="dm-considerations">
        {considerations.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="dm-cells">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Real question</label>
          <textarea
            rows={2}
            aria-label={`${name} — real question`}
            value={a.q ?? ""}
            placeholder="The decision actually before me…"
            onChange={(e) => set("q", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Values & purpose at stake</label>
          <textarea
            rows={2}
            aria-label={`${name} — values at stake`}
            value={a.v ?? ""}
            placeholder="What this choice honors or betrays…"
            onChange={(e) => set("v", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>My choice</label>
          <textarea
            rows={2}
            aria-label={`${name} — my choice`}
            value={a.c ?? ""}
            placeholder="The step I sense I'm to take…"
            onChange={(e) => set("c", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default function DomainApps() {
  return (
    <div className="dm">
      {DM_DOMAINS.map((d) => (
        <DomainApp key={d.key} dKey={d.key} name={d.name} considerations={d.considerations} />
      ))}
    </div>
  );
}
