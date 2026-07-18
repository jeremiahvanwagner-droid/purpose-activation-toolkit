"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function Rail() {
  const pathname = usePathname();
  const progress = useAllModuleProgress();

  return (
    <aside className="rail" aria-label="Your journey">
      <Link className="brand" href="/">
        <BrandGlyph />
        <span className="wordmark">
          <span className="wm-name">TRUTH J BLUE</span>
          <span className="wm-tag">Growth by Choice</span>
        </span>
      </Link>

      <div className="rail-title">Purpose Activation Toolkit</div>

      <nav className="nav">
        <span className="thread" aria-hidden="true" />
        {MODULES.map((m) => {
          const p = progress[m.slug];
          const active = pathname === `/module/${m.slug}`;
          const done = p.total > 0 && p.done >= p.total;
          const className = `mod${active ? " active" : ""}${done ? " done" : ""}`;
          const label = (
            <>
              <span className="star">
                <span className="dot" />
              </span>
              <span className="label">
                <span className="m-k">{m.kicker}</span>
                <span className="m-t">{m.title}</span>
                <span className="m-d">{m.blurb}</span>
              </span>
              {m.available ? (
                <Ring pct={p.pct} />
              ) : (
                <span
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
            <Link key={m.slug} href={`/module/${m.slug}`} className={className}>
              {label}
            </Link>
          ) : (
            <div
              key={m.slug}
              className={className}
              aria-disabled="true"
              title="Unlocks as the toolkit is built out"
              style={{ opacity: 0.55, cursor: "default" }}
            >
              {label}
            </div>
          );
        })}
      </nav>

      <AccountWidget />

      <div className="rail-foot">
        Your progress saves automatically on this device.
        <br />
        <b>Divine Path Walkers</b> · your community awaits.
      </div>
    </aside>
  );
}
