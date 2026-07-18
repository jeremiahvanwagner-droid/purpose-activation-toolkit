"use client";

import { useResponses } from "@/lib/store";
import { BANDS, DOMAINS, scoreAudit } from "@/lib/content/innerAlignmentAudit";

const DOMAIN_MAX = (DOMAINS[0]?.questions.length ?? 7) * 5;

/**
 * The results reveal. Locked until every scored item is answered; then shows
 * four domain scores banded (Aligned / Tension / Misaligned) with the
 * Primary Lever — the highest-tension domain — highlighted.
 */
export default function AlignmentProfile() {
  const all = useResponses();
  const res = scoreAudit(all as Record<string, unknown>);

  if (!res.complete) {
    const pct = res.total ? Math.round((res.answered / res.total) * 100) : 0;
    return (
      <div className="profile-locked">
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p>
          Answer all {res.total} statements to reveal your Alignment Profile — <b>{res.answered} of {res.total}</b> so
          far.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="profile-grid">
        {res.results.map((r) => {
          const b = BANDS[r.band];
          const isLever = res.primaryLever?.key === r.key;
          return (
            <div className={`pcard band-${r.band}${isLever ? " lever" : ""}`} key={r.key}>
              {isLever ? <span className="lever-tag">Primary lever</span> : null}
              <div className="pcard-name">{r.name}</div>
              <div className="pcard-score">
                {r.total}
                <span>/{DOMAIN_MAX}</span>
              </div>
              <div className="pcard-band">{b.label}</div>
              <div className="pcard-mean">{b.meaning}</div>
            </div>
          );
        })}
      </div>
      {res.primaryLever ? (
        <div className="callout lever-note">
          <b>{res.primaryLever.name} is your primary lever.</b> The domain carrying the most tension is where to
          begin. Repair that first, and the rest begins to settle.
        </div>
      ) : null}
    </div>
  );
}
