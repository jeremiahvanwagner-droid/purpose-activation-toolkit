"use client";

import Link from "next/link";
import AuditRunner from "@/components/AuditRunner";
import AlignmentProfile from "@/components/AlignmentProfile";
import AuditFollowThrough from "@/components/AuditFollowThrough";
import EbookClaim from "@/components/EbookClaim";
import { useResponses } from "@/lib/store";
import { useAuditClaim } from "@/lib/auditClaim";
import { STORE_AUDIT_PATH } from "@/lib/links";
import { IAA_META, scoreAudit } from "@/lib/content/innerAlignmentAudit";

export default function AuditPage() {
  const all = useResponses();
  const score = scoreAudit(all as Record<string, unknown>);
  const complete = score.complete;

  // The result is the thing worth an address, so it is what we ask for one in
  // front of. `claimed` is null until localStorage has been read — treat that
  // as "undetermined" rather than "not claimed", or a returning reader sees the
  // form flash over a profile they already paid for with their email.
  const { claimed } = useAuditClaim();
  const unlocked = complete && claimed === true;
  const needsEmail = complete && claimed === false;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Beyond the Veil · Inner Alignment Audit</div>
        <h1 className="page-title">{IAA_META.title}</h1>
        <p className="lede">{IAA_META.subtitle}</p>
        <p className="store-note">
          {IAA_META.storeNote.lead}
          <Link href={STORE_AUDIT_PATH} style={{ color: "inherit", textDecoration: "underline" }}>
            {IAA_META.storeNote.linkText}
          </Link>
          {IAA_META.storeNote.tail}
        </p>
      </header>

      <div className="card">
        <span className="tag">How to take this</span>
        <div className="body-copy">
          <p>
            This isn't a test you can fail. For each statement, choose how often it's been true of you{" "}
            <i>lately</i> — quickly and honestly, without overthinking. In a few minutes you'll see clearly
            where you're aligned, where there's drift, and the one place to begin. Your answers save
            automatically as you go.
          </p>
        </div>
      </div>

      <AuditRunner />

      {/* Results. While incomplete this stays visible so the progress bar can
          fill — that anticipation is what makes finishing feel worth it. At
          28/28 the scores sit behind one email; see `needsEmail` above. */}
      {needsEmail ? (
        <EbookClaim variant="unlock" profile={score} />
      ) : (
        <section className="card" id="profile">
          <span className="tag">Your Result</span>
          <h2>Your Alignment Profile</h2>
          <p className="hint">
            Four domains, each scored out of 35. The domain carrying the most tension is your primary lever —
            your best first move.
          </p>
          {/* claimed === null means localStorage hasn't been read yet. Render the
              profile only when we know the reader is entitled to it; while
              incomplete it is safe either way, since there is nothing to reveal. */}
          {complete && claimed !== true ? null : <AlignmentProfile />}
        </section>
      )}

      {/* Everything from here down references the profile above ("your primary lever…"),
          so we hide it until the profile has actually appeared. */}
      {unlocked ? (
        <AuditFollowThrough />
      ) : !complete ? (
        <section className="card">
          <span className="tag">Coming next</span>
          <h2>What you'll see when you finish</h2>
          <p className="hint">
            Once all 28 statements are answered, your Alignment Profile unlocks — with a 7-day plan, a personal
            alignment statement, and space for deeper reflection.
          </p>
        </section>
      ) : null}

      {/* The gift is the reward for finishing, so it sits above the upsell and
          only appears at 28/28. Delivery is immediate on-page; the emailed copy
          is a convenience. */}
      {unlocked ? <EbookClaim profile={score} /> : null}

      {/* Next step CTA — always visible so the funnel isn't gated behind completion */}
      <section className="card cta-card">
        <span className="tag">Your next step</span>
        <h2>From drift to direction</h2>
        <div className="body-copy">
          <p>
            Naming the tension is the beginning. The <b>Purpose Activation Toolkit</b> is the guided path that
            turns this profile into a lived transformation — four interactive modules that walk you from
            clarity into daily, aligned action.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <Link className="btn gold" href="/toolkit">
            Open the Purpose Activation Toolkit
          </Link>
          <Link className="btn ghost" href="/module/purpose-activation">
            Or begin with Module 1
          </Link>
        </div>
        <p className="assist" style={{ marginTop: 14 }}>
          Finish the audit to unlock your free eBook, <i>You Were Created to Serve</i>, and 7-day
          access to the{" "}
          <a href={IAA_META.ctaUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
            Divine Path Walkers community
          </a>
          .
        </p>
      </section>
    </div>
  );
}
