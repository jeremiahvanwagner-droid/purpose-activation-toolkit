"use client";

import Link from "next/link";
import AlignmentProfile from "@/components/AlignmentProfile";
import AuditFollowThrough from "@/components/AuditFollowThrough";
import AuditRunner from "@/components/AuditRunner";
import Paywall, { type PaywallProduct } from "@/components/Paywall";
import { IAA_META, scoreAudit } from "@/lib/content/innerAlignmentAudit";
import { IAA_PRODUCT_ID } from "@/lib/entitlements";
import { AUDIT_CHECKOUT_URL, AUDIT_PAYMENT_LINK_ID, AUDIT_REVIEW_CALENDAR_URL, EBOOK_PDF_PATH, PAID_AUDIT_PATH, ebookDownloadUrl } from "@/lib/links";
import { useResponses } from "@/lib/store";

const EBOOK_URL = ebookDownloadUrl(process.env.NEXT_PUBLIC_EBOOK_URL ?? "");

/**
 * The Inner Alignment Audit as a purchase.
 *
 * Same twenty-eight statements, same scoring, same follow-through as the free
 * Audit at /audit — that is the point; a buyer is not getting a different
 * audit — but delivered as the product they paid for: no email gate in front
 * of the profile, the follow-up call the product promises, the eBook, and
 * cloud sync of every answer under the email they bought with.
 *
 * Gated by the same entitlement machinery as the Toolkit: sign in with the
 * checkout email, and /api/entitlement-sync matches the HighLevel purchase.
 * Lives on www on purpose — sessions and saved answers are per origin, so
 * store.truthjblue.com/audit redirects here (see middleware.ts).
 */
const AUDIT_PAYWALL: PaywallProduct = {
  id: IAA_PRODUCT_ID,
  eyebrow: "Inner Alignment Audit",
  signedOutTitle: "Sign in to open your Audit.",
  unentitledTitle: "Unlock your Audit.",
  signedOutLede: (
    <>
      The Inner Alignment Audit — twenty-eight statements across four domains, your Alignment Profile, a
      seven-day realignment plan, and a follow-up call to integrate it — is <b>$97</b>. Already purchased? Sign
      in with the same email you used at checkout and it will be waiting for you.
    </>
  ),
  unentitledLede: (
    <>
      Your Audit opens the moment your purchase is on file, and your answers follow you to every device you
      sign in on. <b>$97</b>, one-time.
    </>
  ),
  cta: {
    href: AUDIT_CHECKOUT_URL,
    label: "Get the Audit — $97",
    productName: "Inner Alignment Audit",
    amount: 97,
    contentId: AUDIT_PAYMENT_LINK_ID,
  },
  secondary: { href: "/store/product/inner-alignment-audit", label: "About the Audit" },
  inclusions: [
    "Twenty-eight statements across four domains — Spiritual Perception, Emotional Regulation, Identity Integration, Life Structure",
    "Your Alignment Profile, scored and banded, with your primary lever named",
    "A seven-day realignment plan and your own alignment statement",
    "A follow-up call to integrate your results — included",
    "The eBook You Were Created to Serve",
    "Cross-device sync — start on your phone, continue on your laptop",
  ],
  signInRedirect: PAID_AUDIT_PATH,
};

export default function PaidAuditPage() {
  return (
    <Paywall product={AUDIT_PAYWALL}>
      <PaidAudit />
    </Paywall>
  );
}

function PaidAudit() {
  const all = useResponses();
  const score = scoreAudit(all as Record<string, unknown>);
  const complete = score.complete;

  return (
    <div className="canvas-inner">
      <header>
        <div className="eyebrow">Truth J Blue · Your Audit</div>
        <h1 className="page-title">{IAA_META.title}</h1>
        <p className="lede">{IAA_META.subtitle}</p>
        <p className="store-note">
          Yours — thank you. Your answers save as you go and follow you to any device you sign in on.
        </p>
      </header>

      <div className="card">
        <span className="tag">How to take this</span>
        <div className="body-copy">
          <p>
            This isn&apos;t a test you can fail. For each statement, choose how often it&apos;s been true of you{" "}
            <i>lately</i> — quickly and honestly, without overthinking. In a few minutes you&apos;ll see clearly
            where you&apos;re aligned, where there&apos;s drift, and the one place to begin.
          </p>
        </div>
      </div>

      <AuditRunner />

      <section className="card" id="profile">
        <span className="tag">Your Result</span>
        <h2>Your Alignment Profile</h2>
        <p className="hint">
          Four domains, each scored out of 35. The domain carrying the most tension is your primary lever — your
          best first move.
        </p>
        <AlignmentProfile />
      </section>

      {complete ? (
        <>
          <section className="card cta-card">
            <span className="tag">Included with your Audit</span>
            <h2>Integrate it in a follow-up call</h2>
            <div className="body-copy">
              <p>
                Twenty minutes with Jeremiah to walk through your profile together and settle the one place to
                begin. It&apos;s part of your Audit — choose a time that suits you.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <a className="btn gold" href={AUDIT_REVIEW_CALENDAR_URL} target="_blank" rel="noreferrer">
                Book your follow-up call
              </a>
            </div>
          </section>

          <AuditFollowThrough />
        </>
      ) : (
        <section className="card">
          <span className="tag">Coming next</span>
          <h2>What you&apos;ll see when you finish</h2>
          <p className="hint">
            Once all 28 statements are answered, your Alignment Profile appears — then your follow-up call, a
            seven-day plan, a personal alignment statement, and space for deeper reflection.
          </p>
        </section>
      )}

      {EBOOK_PDF_PATH ? (
        <section className="card">
          <span className="tag">Also yours</span>
          <h2>You Were Created to Serve</h2>
          <p className="hint">The eBook that accompanies the Audit — read it as a PDF, or take the EPUB for Apple Books, Kindle or any e-reader.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            <a className="btn gold" href={EBOOK_PDF_PATH} target="_blank" rel="noreferrer">
              Read the eBook (PDF)
            </a>
            {EBOOK_URL ? (
              <a className="btn ghost" href={EBOOK_URL} rel="noreferrer">
                EPUB for e-readers
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card cta-card">
        <span className="tag">Your next step</span>
        <h2>From drift to direction</h2>
        <div className="body-copy">
          <p>
            Naming the tension is the beginning. The <b>Purpose Activation Toolkit</b> is the guided path that turns
            this profile into a lived transformation — four interactive modules that walk you from clarity into
            daily, aligned action.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <Link className="btn gold" href="/store/product/purpose-activation-toolkit">
            See the Toolkit
          </Link>
          <Link className="btn ghost" href="/toolkit">
            Already have it? Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
