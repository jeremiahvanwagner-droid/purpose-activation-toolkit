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

const CLAIM_KEY = "pat:ebookClaimed:v1";
const FALLBACK_URL = process.env.NEXT_PUBLIC_EBOOK_URL ?? "";

type State = "idle" | "sending" | "claimed" | "error";

export default function EbookClaim({ profile }: { profile?: unknown }) {
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
      try {
        localStorage.setItem(CLAIM_KEY, link);
      } catch {
        /* non-fatal */
      }
      setState("claimed");
    } catch {
      // Network failure. If we have a build-time URL, honour the promise anyway.
      if (FALLBACK_URL) {
        setUrl(FALLBACK_URL);
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
                ? "It's yours — download it right here. We've also sent a copy to your inbox so you can read it on any device."
                : "It's yours — download it right here. Save the file somewhere you'll find it again."
              : "Thank you — your copy is on its way to your inbox."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          {url ? (
            <a className="btn gold" href={url} download>
              Download the eBook
            </a>
          ) : null}
          <a
            className="btn ghost"
            href="https://beyondtheveil.support"
            target="_blank"
            rel="noreferrer"
          >
            Start your 7 days in Divine Path Walkers
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="card cta-card" id="gift">
      <span className="tag">Your gift</span>
      <h2>You Were Created to Serve</h2>
      <div className="body-copy">
        <p>
          You finished the audit — this book is yours, free. Tell us where to send it and your
          download will appear right here, along with 7-day access to the{" "}
          <a href="https://beyondtheveil.support" target="_blank" rel="noreferrer">
            Divine Path Walkers community
          </a>
          .
        </p>
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
          {state === "sending" ? "Sending…" : "Send me the book"}
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
