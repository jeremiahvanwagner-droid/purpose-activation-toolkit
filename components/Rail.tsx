"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MODULES, useAllModuleProgress } from "@/lib/modules";
import AccountWidget from "@/components/AccountWidget";

const R = 15;
const C = 2 * Math.PI * R;

function Ring({ pct }: { pct: number }) {
  const off = C * (1 - pct / 100);
  return (
    <svg className="mini-ring" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle className="trk" cx="17" cy="17" r={R} fill="none" strokeWidth="3" />
      <circle
        className="val"
        cx="17"
        cy="17"
        r={R}
        fill="none"
        strokeWidth="3"
        strokeDasharray={C.toFixed(1)}
        strokeDashoffset={off.toFixed(1)}
      />
    </svg>
  );
}

function BrandGlyph() {
  return (
    <svg className="glyph" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="#E7C97F" strokeWidth="1.3">
        <path d="M8 26 L18 9 L26 22 L33 13" strokeOpacity="0.55" />
      </g>
      <g fill="#E7C97F">
        <circle cx="8" cy="26" r="2.1" />
        <circle cx="18" cy="9" r="2.6" />
        <circle cx="26" cy="22" r="2.1" />
        <circle cx="33" cy="13" r="1.8" />
      </g>
      <circle cx="18" cy="9" r="5.5" fill="none" stroke="#E7C97F" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

/**
 * On a desktop the rail is a fixed column beside the canvas. On a phone the
 * same markup becomes a slim sticky header — brand on the left, a Menu button
 * on the right — and everything else (module list, sign-in, footnote) lives in
 * a drawer that opens under it. Which layout applies is decided purely in CSS
 * (see the 880px breakpoint in globals.css); this component only tracks
 * whether the drawer is open. The drawer closes itself when a module link is
 * followed and on Escape, so the reader is never left with a stale overlay.
 */
export default function Rail() {
  const pathname = usePathname();
  const progress = useAllModuleProgress();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <aside className={`rail${open ? " rail-open" : ""}`} aria-label="Your journey">
      <div className="rail-bar">
        <Link className="brand" href="/toolkit">
          <BrandGlyph />
          <span className="wordmark">
            <span className="wm-name">TRUTH J BLUE</span>
            <span className="wm-tag">Growth by Choice</span>
          </span>
        </Link>
        <button
          type="button"
          className="rail-toggle"
          aria-expanded={open}
          aria-controls="rail-drawer"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="rail-toggle-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="rail-toggle-label">{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      <div id="rail-drawer" className="rail-drawer">
        <div className="rail-title">Purpose Activation Toolkit</div>

        <nav className="nav">
          <span className="thread" aria-hidden="true" />
          {MODULES.map((m) => {
            const p = progress[m.slug];
            const active = pathname === `/module/${m.slug}`;
            const done = p.total > 0 && p.done >= p.total;
            const className = `mod${active ? " active" : ""}${done ? " done" : ""}`;
            const stateWord = done ? "every exercise started" : p.done > 0 ? "in progress" : "not started";
            const linkAria = m.available
              ? `${m.title} — ${m.blurb}. ${p.done} of ${p.total} exercises started, ${stateWord}.`
              : `${m.title} — ${m.blurb}. Not yet available.`;
            const label = (
              <>
                <span className="star" aria-hidden="true">
                  <span className="dot" />
                </span>
                <span className="label">
                  <span className="m-k">{m.kicker}</span>
                  <span className="m-t">{m.title}</span>
                  <span className="m-d">{m.blurb}</span>
                </span>
                {m.available ? (
                  <span aria-hidden="true">
                    <Ring pct={p.pct} />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "0.56rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(231,201,127,0.65)",
                    }}
                  >
                    Soon
                  </span>
                )}
              </>
            );
            return m.available ? (
              <Link key={m.slug} href={`/module/${m.slug}`} className={className} aria-label={linkAria}>
                {label}
              </Link>
            ) : (
              <div
                key={m.slug}
                className={className}
                role="link"
                aria-disabled="true"
                aria-label={linkAria}
                style={{ opacity: 0.55, cursor: "default" }}
              >
                {label}
              </div>
            );
          })}
        </nav>

        <AccountWidget />

        <div className="rail-foot">
          Answers save on this device as you write. Sign in to keep them in your account.
          <br />
          <b>Divine Path Walkers</b> · your community awaits.
        </div>
      </div>
    </aside>
  );
}
