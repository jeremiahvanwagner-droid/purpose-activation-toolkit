"use client";

import { useResponse } from "@/lib/store";
import { COMMIT_FIELD } from "@/lib/content/purposeActivation";

type Commitment = { name?: string; signature?: string; date?: string; sealed?: boolean };

export default function Covenant() {
  const [c, setC] = useResponse<Commitment>(COMMIT_FIELD, {});
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
          I, <span className="c-name">{name || "__________________"}</span>, commit to walking in my Divine
          purpose with intentionality and faith for the next 30 days. I recognize that this is not about
          perfection, but about progress and obedience. I will honor my design, live my values, and take
          aligned action daily. I trust that God will meet me in my faithfulness and make my path clear.
        </p>

        <div className="sig-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="cov-name">Your full name</label>
            <input
              id="cov-name"
              type="text"
              autoComplete="off"
              value={c.name ?? ""}
              placeholder="Your name"
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="cov-date">Date</label>
            <input
              id="cov-date"
              type="text"
              autoComplete="off"
              value={c.date ?? ""}
              placeholder="Signed on…"
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="field sig-field" style={{ marginBottom: 0 }}>
            <label htmlFor="cov-sig">Signature</label>
            <input
              id="cov-sig"
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
          {sealed ? "Covenant sealed ✦" : "Sign my 30-day commitment"}
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
