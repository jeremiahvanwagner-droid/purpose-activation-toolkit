"use client";

import { useEffect, useState } from "react";

const PHASES = [
  {
    name: "Center",
    secs: 120,
    hint: "Sit comfortably. Close your eyes. Breathe slowly, and pray:",
    prayer:
      "“Holy Spirit, I quiet my mind and open my heart. Speak to me about this decision. I trust You to guide me.”",
    bullets: null as string[] | null,
  },
  {
    name: "Listen",
    secs: 360,
    hint: "Stay open and unhurried. Simply notice:",
    prayer: null as string | null,
    bullets: [
      "Images or impressions",
      "Scripture that comes to mind",
      "Peace or unsettledness",
      "A quiet inner knowing",
    ],
  },
  {
    name: "Journal",
    secs: 120,
    hint: "Capture what you received in the prompts below — unedited, unfiltered.",
    prayer: null,
    bullets: null,
  },
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function ListeningTimer() {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(PHASES[0].secs);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          if (idx < PHASES.length - 1) {
            setIdx(idx + 1);
            return PHASES[idx + 1].secs;
          }
          setRunning(false);
          setDone(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, idx]);

  function reset() {
    setIdx(0);
    setLeft(PHASES[0].secs);
    setRunning(false);
    setDone(false);
  }
  function skip() {
    if (idx < PHASES.length - 1) {
      setIdx(idx + 1);
      setLeft(PHASES[idx + 1].secs);
    } else {
      setRunning(false);
      setDone(true);
      setLeft(0);
    }
  }

  const phase = PHASES[idx];
  const fresh = !running && !done && idx === 0 && left === PHASES[0].secs;

  return (
    <div className="timer">
      <div className="t-phases">
        {PHASES.map((p, i) => (
          <span key={p.name} className={`t-pill${i === idx && !done ? " on" : ""}${i < idx || done ? " past" : ""}`}>
            {p.name} · {Math.round(p.secs / 60)} min
          </span>
        ))}
      </div>

      <div className="t-clock" aria-live="off">
        {done ? "Amen." : fmt(left)}
      </div>

      {!done ? (
        <>
          <p className="t-hint">{phase.hint}</p>
          {phase.prayer ? <p className="t-prayer">{phase.prayer}</p> : null}
          {phase.bullets ? (
            <ul>
              {phase.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="t-hint">Ten minutes of listening, complete. Write what you received below.</p>
      )}

      <div className="t-actions">
        <button type="button" className="btn gold" onClick={() => (done ? reset() : setRunning(!running))}>
          {done ? "Begin again" : running ? "Pause" : fresh ? "Begin the 10 minutes" : "Resume"}
        </button>
        {!fresh && !done ? (
          <button type="button" className="btn ghost" onClick={skip}>
            Next phase
          </button>
        ) : null}
        {!fresh ? (
          <button type="button" className="btn ghost" onClick={reset}>
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
