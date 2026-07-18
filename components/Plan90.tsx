"use client";

import { useResponse } from "@/lib/store";
import NumberedList from "@/components/NumberedList";
import {
  P90_ACCT,
  P90_ACTIONS,
  P90_FOCUS,
  P90_FOCUS_OPTIONS,
  P90_REVIEWS,
  P90_RITUALS,
  P90_SUCCESS,
} from "@/lib/content/alignmentToAction";

export default function Plan90() {
  const [focus, setFocus] = useResponse<string>(P90_FOCUS, "");
  const [rituals, setRituals] = useResponse<Record<string, string>>(P90_RITUALS, {});
  const [acct, setAcct] = useResponse<Record<string, string>>(P90_ACCT, {});
  const [reviews, setReviews] = useResponse<Record<string, string>>(P90_REVIEWS, {});
  const [success, setSuccess] = useResponse<string>(P90_SUCCESS, "");

  return (
    <div>
      <div className="field" style={{ maxWidth: 340 }}>
        <label htmlFor="p90-focus">My primary focus area for the next 90 days</label>
        <select id="p90-focus" value={focus} onChange={(e) => setFocus(e.target.value)}>
          <option value="">Choose one…</option>
          {P90_FOCUS_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <NumberedList
        id={P90_ACTIONS}
        count={3}
        noun="Action"
        label="My 3 core aligned actions (non-negotiables)"
        assist="The actions that must happen in this 90-day cycle, no matter what."
      />

      <div className="plan-support">
        <div className="dm-name" style={{ fontSize: "0.95rem" }}>Daily ritual commitments</div>
        <div className="dm-cells">
          {(["morning", "midday", "evening"] as const).map((k) => (
            <div className="field" style={{ marginBottom: 0 }} key={k}>
              <label style={{ textTransform: "capitalize" }}>{k}</label>
              <input
                type="text"
                autoComplete="off"
                value={rituals[k] ?? ""}
                placeholder={k === "morning" ? "e.g., Purpose Morning, 6:15" : k === "midday" ? "e.g., 12:30 check-in" : "e.g., 9 PM reflection"}
                onChange={(e) => setRituals({ ...rituals, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="plan-support" style={{ marginTop: 12 }}>
        <div className="dm-name" style={{ fontSize: "0.95rem" }}>My accountability structure</div>
        <div className="dm-cells">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Partner / mentor</label>
            <input type="text" autoComplete="off" value={acct.partner ?? ""} placeholder="Who?"
              onChange={(e) => setAcct({ ...acct, partner: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Community</label>
            <input type="text" autoComplete="off" value={acct.community ?? ""} placeholder="e.g., Divine Path Walkers"
              onChange={(e) => setAcct({ ...acct, community: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Service commitment</label>
            <input type="text" autoComplete="off" value={acct.service ?? ""} placeholder="Your recurring act of service"
              onChange={(e) => setAcct({ ...acct, service: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="plan-support" style={{ marginTop: 12 }}>
        <div className="dm-name" style={{ fontSize: "0.95rem" }}>Monthly review dates</div>
        <div className="dm-cells">
          {(["m1", "m2", "m3"] as const).map((k, i) => (
            <div className="field" style={{ marginBottom: 0 }} key={k}>
              <label>Month {i + 1}</label>
              <input
                type="text"
                autoComplete="off"
                value={reviews[k] ?? ""}
                placeholder="Pick a date…"
                onChange={(e) => setReviews({ ...reviews, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
        <label htmlFor="p90-success">What does success look like at the end of 90 days?</label>
        <textarea
          id="p90-success"
          rows={3}
          value={success}
          placeholder="Be specific and measurable — what fruit will be visible?"
          onChange={(e) => setSuccess(e.target.value)}
        />
      </div>
    </div>
  );
}
