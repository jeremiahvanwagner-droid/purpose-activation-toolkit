"use client";

import { useResponse } from "@/lib/store";

type Commitment = { name?: string; signature?: string; date?: string; sealed?: boolean };

/**
 * A signable commitment statement. `body` is the covenant text that follows
 * "I, {name}" — each module supplies its own wording.
 */
export default function Covenant({
  id,
  body,
  buttonLabel = "Sign my commitment",
}: {
  id: string;
  body: string;
  buttonLabel?: string;
}) {
  const [c, setC] = useResponse<Commitment>(id, {});
  const set = (key: keyof Commitment, v: string | boolean) => setC({ ...c, [key]: v });

  const name = (c.name ?? "").trim();
  const signature = (c.signature ?? "").trim();
  const canSign = Boolean(name && signature);
  const sealed = Boolean(c.sealed);

  function sign() {
    if (!canSign) return;
    const date =
      (c.date ?? "").trim() ||
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    setC({ ...c, date, sealed: true });
  }

  return (
    <div>
      <div className={`covenant${sealed ? " sealed" : ""}`}>
        <div className="seal">✦ Covenant sealed</div>
        <div className="c-k">My Commitment Statement</div>
        <p className="c-text">
          I, <span className="c-name">{name || "__________________"}</span>
          {body}
        </p>

        <div className="sig-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`${id}-name`}>Your full name</label>
            <input
              id={`${id}-name`}
              type="text"
              autoComplete="off"
              value={c.name ?? ""}
              placeholder="Your name"
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`${id}-date`}>Date</label>
            <input
              id={`${id}-date`}
              type="text"
              autoComplete="off"
              value={c.date ?? ""}
              placeholder="Signed on…"
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="field sig-field" style={{ marginBottom: 0 }}>
            <label htmlFor={`${id}-sig`}>Signature</label>
            <input
              id={`${id}-sig`}
              className="sig"
              type="text"
              autoComplete="off"
              value={c.signature ?? ""}
              placeholder="Sign your name"
              onChange={(e) => set("signature", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="builder-actions">
        <button type="button" className="btn gold" onClick={sign} disabled={!canSign}>
          {sealed ? "Covenant sealed ✦" : buttonLabel}
        </button>
        {sealed ? <span className="done-note">✓ Saved to your workbook</span> : null}
        {!canSign ? (
          <span style={{ fontSize: "0.76rem", color: "var(--slate)" }}>
            Add your name and signature to seal your commitment.
          </span>
        ) : null}
      </div>
    </div>
  );
}
