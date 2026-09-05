"use client";

/** Gift claim — appears once the audit is complete (28/28).
 *
 *  Design rule: the reader is NEVER blocked on email deliverability. They give
 *  an address, and the download link appears immediately on this page. The
 *  emailed copy (sent by the GHL workflow keyed to the `audit-completed` tag)
 *  is a convenience, not the delivery mechanism. This is deliberate — the
 *  $247 Toolkit already taught us what happens when access depends on an
 *  email arriving.
 *
 *  The claim is remembered locally so returning readers keep their link
 *  without re-entering anything.
 */

import { useEffect, useState } from "react";
import { COMMUNITY_URL, EBOOK_PDF_PATH, ebookDownloadUrl } from "@/lib/links";
import { track } from "@/lib/metaPixel";
import { CLAIM_KEY, writeClaim } from "@/lib/auditClaim";

const FALLBACK_URL = process.env.NEXT_PUBLIC_EBOOK_URL ?? "";

type State = "idle" | "sending" | "claimed" | "error";

/** `gift` — the original post-result thank-you.
 *  `unlock` — the same form standing in front of the Alignment Profile, which
 *  is the only place a reader is asked for an address. Identical mechanics; the
 *  copy differs because the promise differs. */
type Variant = "gift" | "unlock";

export default function EbookClaim({
  profile,
  variant = "gift",
}: {
  profile?: unknown;
  variant?: Variant;
}) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [url, setUrl] = useState(FALLBACK_URL);
  /** Whether the GHL upsert landed. Only that tag makes the workflow send the
   *  email, so this is our only honest basis for saying a copy is on its way. */
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState("");

  // Restore a prior claim so the link survives a refresh. Presence of the key
  // is the claim — not truthiness of its value, which is empty when the eBook
  // URL is unset.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLAIM_KEY);
      if (saved !== null) {
        setUrl(saved || FALLBACK_URL);
        setState("claimed");
      }
    } catch {
      /* private browsing — fall through to the form */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/audit-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, website, profile }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      const link = data.ebookUrl || FALLBACK_URL;
      if (!link) {
        // Operator misconfiguration: NEXT_PUBLIC_EBOOK_URL is unset. Loud in the
        // console, graceful on the page — see the claimed-state copy below.
        console.error("[EbookClaim] No eBook URL configured; nothing to download.");
      }
      setUrl(link);
      setEmailed(Boolean(data.synced));
      // Shared write: also notifies the audit page so the profile unlocks in
      // the same tick, without a reload.
      writeClaim(link);
      // The lead is the address reaching the CRM, so this fires here and not on
      // the restore-from-localStorage path (a returning reader is not a new
      // lead) or the offline fallback below (that reader's email never landed).
      // No value: the eBook is a gift, and pricing a gift would poison the
      // optimisation signal for the $247 Toolkit.
      track("Lead", { content_name: "You Were Created to Serve" });
      setState("claimed");
    } catch {
      // Network failure. If we have a build-time URL, honour the promise anyway.
      // `writeClaim` runs here too even though the lead never landed: in the
      // `unlock` variant this form stands in front of the reader's own result,
      // and trapping them behind a network blip would be a worse failure than
      // the lost address. Same priority the route itself takes.
      if (FALLBACK_URL) {
        setUrl(FALLBACK_URL);
        writeClaim(FALLBACK_URL);
        setState("claimed");
        return;
      }
      if (variant === "unlock") {
        writeClaim("");
        setState("claimed");
        return;
      }
      setError("We couldn't reach the server. Please try again in a moment.");
      setState("error");
    }
  }

  if (state === "claimed") {
    return (
      <section className="card cta-card" id="gift">
        <span className="tag">Your gift</span>
        <h2>You Were Created to Serve</h2>
        <div className="body-copy">
          {/* Claim only what is actually true. `url` is the download; `emailed`
              means the CRM tag landed, which is what triggers the send. */}
          <p>
            {url
              ? emailed
                ? "It's yours — read it right here as a PDF, or take the EPUB for Apple Books, Kindle or any e-reader. We've also sent a copy to your inbox so you can read it on any device."
                : "It's yours — read it right here as a PDF, or take the EPUB for Apple Books, Kindle or any e-reader. Save the file somewhere you'll find it again."
              : "Thank you — your copy is on its way to your inbox."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          {url ? (
            <a className="btn gold" href={EBOOK_PDF_PATH} target="_blank" rel="noreferrer">
              Read the eBook (PDF)
            </a>
          ) : null}
          {url ? (
            <a className="btn ghost" href={ebookDownloadUrl(url)} rel="noreferrer">
              EPUB for e-readers
            </a>
          ) : null}
          <a className="btn ghost" href={COMMUNITY_URL} target="_blank" rel="noreferrer">
            Start your 7 days in Divine Path Walkers
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="card cta-card" id="gift">
      <span className="tag">{variant === "unlock" ? "Your result" : "Your gift"}</span>
      <h2>{variant === "unlock" ? "See your Alignment Profile" : "You Were Created to Serve"}</h2>
      <div className="body-copy">
        {variant === "unlock" ? (
          <p>
            All 28 answered — your profile is ready. Tell us where to send it and it opens right
            here, along with your free copy of <i>You Were Created to Serve</i> and 7-day access to
            the{" "}
            <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">
              Divine Path Walkers community
            </a>
            .
          </p>
        ) : (
          <p>
            You finished the audit — this book is yours, free. Tell us where to send it and your
            download will appear right here, along with 7-day access to the{" "}
            <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">
              Divine Path Walkers community
            </a>
            .
          </p>
        )}
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 6, maxWidth: 420 }}>
        <label className="assist" htmlFor="gift-name">
          First name <span style={{ opacity: 0.6 }}>(optional)</span>
        </label>
        <input
          id="gift-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          placeholder="Your first name"
        />

        <label className="assist" htmlFor="gift-email">
          Email
        </label>
        <input
          id="gift-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />

        {/* Honeypot — hidden from people, irresistible to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        <button className="btn gold" type="submit" disabled={state === "sending"}>
          {state === "sending"
            ? "Sending…"
            : variant === "unlock"
              ? "Show my Alignment Profile"
              : "Send me the book"}
        </button>

        {error ? (
          <p className="assist" role="alert" style={{ color: "#b3261e" }}>
            {error}
          </p>
        ) : null}

        <p className="assist" style={{ marginTop: 2 }}>
          One email with your book. Unsubscribe any time.
        </p>
      </form>
    </section>
  );
}
