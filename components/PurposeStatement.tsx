"use client";

import { useState } from "react";
import { useResponse, useResponses } from "@/lib/store";
import { STATEMENT_PARTS, STATEMENT_WORKING_FIELD } from "@/lib/content/purposeActivation";

function Part({ id, leadIn, hint, placeholder }: { id: string; leadIn: string; hint: string; placeholder: string }) {
  const [value, setValue] = useResponse<string>(id, "");
  return (
    <div className="field">
      <label htmlFor={id}>
        <span className="lead-in">{leadIn}</span> ({hint})
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export default function PurposeStatement() {
  const all = useResponses();
  const [working, setWorking] = useResponse<string>(STATEMENT_WORKING_FIELD, "");
  const [sealed, setSealed] = useResponse<boolean>("pa.stmt.sealed", false);
  const [pulse, setPulse] = useState(0);

  const get = (id: string) => ((all[id] as string) || "").trim();
  const parts = STATEMENT_PARTS.map((p) => ({ ...p, val: get(p.id) }));
  const allFilled = parts.every((p) => p.val);

  function illuminate() {
    if (!allFilled) return;
    setSealed(true);
    setPulse((n) => n + 1);
  }

  return (
    <div>
      <div className="fields">
        {STATEMENT_PARTS.map((p) => (
          <Part key={p.id} {...p} />
        ))}
      </div>

      <div className={`statement${sealed ? " sealed" : ""}`} key={pulse}>
        <div className="sweep" />
        <div className="seal">✦ Sealed in faith</div>
        <div className="s-k">My Working Purpose Statement</div>
        <p>
          Because God designed me as{" "}
          <span className={`fill${parts[0].val ? "" : " blank"}`}>{parts[0].val || "…"}</span>, I am called to{" "}
          <span className={`fill${parts[1].val ? "" : " blank"}`}>{parts[1].val || "…"}</span> for{" "}
          <span className={`fill${parts[2].val ? "" : " blank"}`}>{parts[2].val || "…"}</span> by{" "}
          <span className={`fill${parts[3].val ? "" : " blank"}`}>{parts[3].val || "…"}</span>.
        </p>
      </div>

      <div className="builder-actions">
        <button type="button" className="btn gold" onClick={illuminate} disabled={!allFilled}>
          {sealed ? "Purpose statement sealed ✦" : "Illuminate my purpose statement"}
        </button>
        {sealed ? <span className="done-note">✓ Saved to your workbook</span> : null}
        {!allFilled ? (
          <span style={{ fontSize: "0.76rem", color: "var(--slate)" }}>Fill in all four parts to seal it.</span>
        ) : null}
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor={STATEMENT_WORKING_FIELD} style={{ fontFamily: "var(--serif)", textTransform: "none", letterSpacing: 0, fontSize: "0.95rem", color: "var(--ink)" }}>
          Now refine it into your working purpose statement
        </label>
        <p className="assist" style={{ margin: "0 0 2px" }}>
          Read your statement aloud. Combine or reword until it lands deepest in your spirit — this becomes your compass for the whole toolkit.
        </p>
        <textarea
          id={STATEMENT_WORKING_FIELD}
          rows={3}
          value={working}
          placeholder="My working purpose statement…"
          onChange={(e) => setWorking(e.target.value)}
        />
      </div>
    </div>
  );
}
