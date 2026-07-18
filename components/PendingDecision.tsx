"use client";

import { useResponse } from "@/lib/store";
import { PENDING_FIELD } from "@/lib/content/decisionMaking";

type Pending = {
  facing?: string;
  action?: string;
  commitDate?: string;
  reviewDate?: string;
  accountability?: string;
};

export default function PendingDecision() {
  const [p, setP] = useResponse<Pending>(PENDING_FIELD, {});
  const set = (key: keyof Pending, val: string) => setP({ ...p, [key]: val });

  return (
    <div className="plan-support" style={{ marginTop: 14 }}>
      <div className="field">
        <label htmlFor="pd-facing">I am currently facing this decision</label>
        <textarea
          id="pd-facing"
          rows={2}
          value={p.facing ?? ""}
          placeholder="Name the live decision you'll walk through this covenant…"
          onChange={(e) => set("facing", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pd-action">Having applied the framework, my chosen action is</label>
        <textarea
          id="pd-action"
          rows={2}
          value={p.action ?? ""}
          placeholder="The choice you're committing to…"
          onChange={(e) => set("action", e.target.value)}
        />
      </div>
      <div className="plan-weeks" style={{ marginTop: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="pd-commit">I commit to this decision as of</label>
          <input
            id="pd-commit"
            type="text"
            autoComplete="off"
            value={p.commitDate ?? ""}
            placeholder="e.g., July 18, 2026"
            onChange={(e) => set("commitDate", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="pd-review">I will review the outcome on</label>
          <input
            id="pd-review"
            type="text"
            autoComplete="off"
            value={p.reviewDate ?? ""}
            placeholder="e.g., August 17, 2026"
            onChange={(e) => set("reviewDate", e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="pd-acct">Accountability partner / community</label>
        <input
          id="pd-acct"
          type="text"
          autoComplete="off"
          value={p.accountability ?? ""}
          placeholder="Who will you tell — and when?"
          onChange={(e) => set("accountability", e.target.value)}
        />
      </div>
    </div>
  );
}
