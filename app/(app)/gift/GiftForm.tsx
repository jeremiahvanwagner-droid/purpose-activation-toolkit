"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * DRAFT form. The server route is the authority: it reads the buyer from the
 * session and writes nothing unless the flag is on. This component sends no email.
 */
export default function GiftForm() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const supa = getSupabase();
    const session = supa ? (await supa.auth.getSession()).data.session : null;
    const token = session?.access_token;
    if (!token) {
      setMessage("Sign in from the menu with the email you paid with.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/toolkit/gift", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          firstName: firstName.trim() ? firstName.trim() : undefined,
        }),
        cache: "no-store",
      });
      if (res.status === 404) {
        setMessage("This page is not available.");
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setDone(true);
        setMessage("Recorded. They can sign in here with that email. No email was sent.");
        return;
      }
      setMessage(body?.error ?? "The gift could not be saved.");
    } catch {
      setMessage("The gift could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="canvas-inner">
      <div className="eyebrow">DRAFT · not published</div>
      <h1 className="page-title">Gift Toolkit access</h1>
      <p className="lede">
        DRAFT. Give a Toolkit purchase to someone else. They get the seat. You do not, from that purchase.
        Nothing on this page sends an email.
      </p>
      {done ? (
        <p className="lede">{message}</p>
      ) : (
        <form className="card" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="gift-email">Recipient email</label>
            <input
              id="gift-email"
              type="email"
              autoComplete="off"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="gift-name">First name, optional</label>
            <input
              id="gift-name"
              type="text"
              autoComplete="off"
              maxLength={80}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <button className="btn gold" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Give access"}
          </button>
          {message ? <p className="field assist">{message}</p> : null}
        </form>
      )}
    </div>
  );
}
