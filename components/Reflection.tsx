"use client";

import { useResponse } from "@/lib/store";

export default function Reflection({
  id,
  prompt,
  assist,
  minRows = 3,
}: {
  id: string;
  prompt: string;
  assist?: string;
  minRows?: number;
}) {
  const [value, setValue] = useResponse<string>(id, "");
  return (
    <div className="field" style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{ fontSize: "0.95rem", letterSpacing: 0, textTransform: "none", color: "var(--ink)", fontFamily: "var(--serif)" }}>
        {prompt}
      </label>
      {assist ? <p className="assist" style={{ margin: "0 0 2px" }}>{assist}</p> : null}
      <textarea
        id={id}
        rows={minRows}
        value={value}
        placeholder="Write freely and honestly…"
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
