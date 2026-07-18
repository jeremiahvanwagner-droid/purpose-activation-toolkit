"use client";

import LikertScale from "@/components/LikertScale";
import { DOMAINS, answerField } from "@/lib/content/innerAlignmentAudit";

/** The four Alignment Domains, each with its framing copy and 7 Likert items. */
export default function AuditRunner() {
  return (
    <>
      {DOMAINS.map((d) => (
        <section className="card" id={`domain-${d.key}`} key={d.key}>
          <span className="tag">Domain {d.index} · {d.name}</span>
          <h2>{d.definingQuestion}</h2>
          {d.whyThisMatters ? (
            <div className="body-copy">
              <p>{d.whyThisMatters}</p>
            </div>
          ) : null}
          {d.naming ? (
            <div className="callout">
              <b>What you're naming.</b> {d.naming}
            </div>
          ) : null}
          <div className="likert-list">
            {d.questions.map((q, i) => (
              <LikertScale key={i} id={answerField(d.key, i + 1)} question={q} n={i + 1} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
