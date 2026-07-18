"use client";

import { useResponse } from "@/lib/store";
import { ECO_FIELD } from "@/lib/content/alignmentToAction";

type Eco = Record<string, string>;

export default function Ecosystem() {
  const [e, setE] = useResponse<Eco>(ECO_FIELD, {});
  const set = (key: string, val: string) => setE({ ...e, [key]: val });

  return (
    <div className="dm">
      <div className="dm-row">
        <div className="dm-name">1 · Accountability partner or mentor</div>
        <div className="dm-cells">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input type="text" autoComplete="off" value={e.partnerName ?? ""} placeholder="Who?"
              onChange={(ev) => set("partnerName", ev.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>How often we'll connect</label>
            <input type="text" autoComplete="off" value={e.partnerFreq ?? ""} placeholder="e.g., weekly call"
              onChange={(ev) => set("partnerFreq", ev.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>What I'll share</label>
            <input type="text" autoComplete="off" value={e.partnerShare ?? ""} placeholder="e.g., tracker + wins + struggles"
              onChange={(ev) => set("partnerShare", ev.target.value)} />
          </div>
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">2 · Community or group</div>
        <div className="plan-weeks" style={{ marginTop: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input type="text" autoComplete="off" value={e.communityName ?? ""} placeholder="e.g., Divine Path Walkers on Skool"
              onChange={(ev) => set("communityName", ev.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>How I'll engage</label>
            <input type="text" autoComplete="off" value={e.communityHow ?? ""} placeholder="e.g., weekly post; monthly Zoom; in-person meetup"
              onChange={(ev) => set("communityHow", ev.target.value)} />
          </div>
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-name">3 · A recurring act of service</div>
        <div className="dm-cells">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>My act of service</label>
            <input type="text" autoComplete="off" value={e.serviceAct ?? ""} placeholder="What will you give?"
              onChange={(ev) => set("serviceAct", ev.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>How often · who it serves</label>
            <input type="text" autoComplete="off" value={e.serviceWho ?? ""} placeholder="e.g., biweekly · single moms at church"
              onChange={(ev) => set("serviceWho", ev.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>How it connects to my purpose</label>
            <input type="text" autoComplete="off" value={e.serviceWhy ?? ""} placeholder="The thread back to your calling…"
              onChange={(ev) => set("serviceWhy", ev.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
