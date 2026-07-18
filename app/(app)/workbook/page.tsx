"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useResponses } from "@/lib/store";
import { MODULES } from "@/lib/modules";
import { IAA_FIELD_IDS } from "@/lib/content/innerAlignmentAudit";
import { buildWorkbook, countAnswers, type Entry } from "@/lib/workbook";

function EntryView({ e }: { e: Entry }) {
  switch (e.k) {
    case "text":
      return (
        <div className="wb-qa">
          <div className="wb-q">{e.label}</div>
          <p className="wb-a">{e.text}</p>
        </div>
      );
    case "list":
      return (
        <div className="wb-qa">
          <div className="wb-q">{e.label}</div>
          {e.ranked ? (
            <ol className="wb-a wb-ol">
              {e.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ol>
          ) : (
            <ul className="wb-a wb-ul">
              {e.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "kv":
      return (
        <div className="wb-qa">
          <div className="wb-q">{e.label}</div>
          <div className="wb-kv">
            {e.rows.map((r, i) => (
              <div className="wb-kv-row" key={i}>
                <span className="wb-kv-k">{r.k}</span>
                <span className="wb-kv-v">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "statement":
      return <blockquote className="wb-statement">{e.text}</blockquote>;
    case "grid":
      return (
        <div className="wb-qa">
          <div className="wb-q">Decision grid{e.decision ? `: ${e.decision}` : ""}</div>
          <ul className="wb-a wb-ul">
            {e.options.map((o, i) => (
              <li key={i}>
                <b>{o.name}</b> — total score {o.total}
              </li>
            ))}
          </ul>
        </div>
      );
    case "tracker":
      return (
        <div className="wb-qa">
          <div className="wb-q">
            21-Day Alignment Tracker — {e.done} of {e.total} days walked
          </div>
          <div className="wb-kv">
            {e.days.map((d) => (
              <div className="wb-kv-row" key={d.n}>
                <span className="wb-kv-k">
                  Day {d.n}
                  {d.date ? ` · ${d.date}` : ""}
                </span>
                <span className="wb-kv-v">
                  {d.action}
                  {d.note ? <em> — {d.note}</em> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "covenant":
      return (
        <div className={`wb-covenant${e.sealed ? " sealed" : ""}`}>
          {e.sealed ? <div className="wb-seal">✦ Covenant sealed</div> : null}
          <p>
            I, <span className="wb-cov-name">{e.name || "—"}</span>
            {e.body}
          </p>
          <div className="wb-sig">
            <span className="wb-sig-mark">{e.signature}</span>
            <span className="wb-sig-date">{e.date}</span>
          </div>
        </div>
      );
    case "prompts":
      return (
        <div className="wb-prompts">
          {e.items.map((it, i) => (
            <div className="wb-qa" key={i}>
              <div className="wb-q">{it.prompt}</div>
              <p className="wb-a">{it.answer}</p>
            </div>
          ))}
        </div>
      );
    case "profile":
      return (
        <div className="wb-profile">
          <div className="wb-profile-grid">
            {e.results.map((r) => (
              <div className={`wb-pcard wb-band-${r.band}${r.isLever ? " wb-lever" : ""}`} key={r.name}>
                {r.isLever ? <span className="wb-lever-tag">Primary lever</span> : null}
                <div className="wb-pcard-name">{r.name}</div>
                <div className="wb-pcard-score">
                  {r.total}
                  <span>/{r.max}</span>
                </div>
                <div className="wb-pcard-band">{r.bandLabel}</div>
              </div>
            ))}
          </div>
          {e.primaryLever ? (
            <p className="wb-lever-note">
              <b>{e.primaryLever}</b> is your primary lever — the place to begin.
            </p>
          ) : null}
        </div>
      );
  }
}

export default function WorkbookPage() {
  const all = useResponses();
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const wb = buildWorkbook(all as Record<string, unknown>, date);
  const answers = countAnswers(
    all as Record<string, unknown>,
    [...IAA_FIELD_IDS, ...MODULES.flatMap((m) => m.fieldIds)]
  );

  return (
    <div className="canvas-inner wb">
      <div className="wb-actions no-print">
        <Link className="btn ghost" href="/toolkit">
          ← Back to toolkit
        </Link>
        <button type="button" className="btn gold" onClick={() => window.print()} disabled={!wb.anyContent}>
          Save as PDF
        </button>
      </div>

      {!wb.anyContent ? (
        <div className="wb-empty no-print">
          <h2>Your keepsake is waiting to be written.</h2>
          <p>
            As you complete exercises across the toolkit, they gather here into a beautiful workbook you can
            save, print, and return to for years. Begin with{" "}
            <Link href="/module/purpose-activation">Module 1</Link>.
          </p>
        </div>
      ) : (
        <article className="wb-doc">
          <header className="wb-cover">
            <svg className="wb-glyph" viewBox="0 0 40 40" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M8 26 L18 9 L26 22 L33 13" strokeOpacity="0.6" />
              </g>
              <g fill="currentColor">
                <circle cx="8" cy="26" r="2" />
                <circle cx="18" cy="9" r="2.6" />
                <circle cx="26" cy="22" r="2" />
                <circle cx="33" cy="13" r="1.7" />
              </g>
            </svg>
            <div className="wb-kicker">Truth J Blue · Growth by Choice</div>
            <h1 className="wb-title">Purpose Activation Toolkit</h1>
            <div className="wb-sub">A keepsake workbook</div>
            <div className="wb-meta">
              {wb.name ? (
                <>
                  <span>The work of {wb.name}</span>
                  <span className="wb-dot">·</span>
                </>
              ) : null}
              <span>{answers} {answers === 1 ? "answer" : "answers"} written</span>
              {date ? (
                <>
                  <span className="wb-dot">·</span>
                  <span>{date}</span>
                </>
              ) : null}
            </div>
          </header>

          {wb.modules.map((m) =>
            m.sections.length ? (
              <section className="wb-module" key={m.slug}>
                <h2 className="wb-mtitle">{m.title}</h2>
                {m.sections.map((sec, si) => (
                  <div className="wb-section" key={si}>
                    <h3 className="wb-sheading">{sec.heading}</h3>
                    {sec.entries.map((e, ei) => (
                      <EntryView e={e} key={ei} />
                    ))}
                  </div>
                ))}
              </section>
            ) : null
          )}

          <footer className="wb-foot">
            “You are a Child of God, called according to His purpose, equipped with everything you need to
            fulfill your assignment. Now walk in it.”
          </footer>
        </article>
      )}
    </div>
  );
}
