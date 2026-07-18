"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Passwordless (magic-link) sign-in, shown in the rail. Signing in turns on
 * cross-device sync (handled by SyncProvider). Renders nothing when Supabase
 * isn't configured, so the app stays fully usable local-only.
 */
export default function AccountWidget() {
  const supa = getSupabase();
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supa) return;
    supa.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supa.auth.onAuthStateChange((_e, s) => setUserEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supa]);

  if (!isSupabaseConfigured || !supa) return null;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || !supa) return;
    setBusy(true);
    setErr(null);
    const { error } = await supa.auth.signInWithOtp({
      email: addr,
      // Land signed-in users straight in their toolkit, not the marketing page.
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/toolkit` : undefined,
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  if (userEmail) {
    return (
      <div className="acct">
        <div className="acct-status">
          <span className="acct-dot" /> Synced · {userEmail}
        </div>
        <button type="button" className="acct-link" onClick={() => supa!.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="acct">
        <div className="acct-title">Check your email ✉</div>
        <p className="acct-note">
          We sent a magic link to <b>{email.trim()}</b>. Open it on any device to sync your workbook.
        </p>
      </div>
    );
  }

  return (
    <form className="acct" onSubmit={sendLink}>
      <div className="acct-title">Save to every device</div>
      <p className="acct-note">Free — sign in with just your email to sync your progress.</p>
      <input
        className="acct-input"
        type="email"
        required
        value={email}
        placeholder="you@email.com"
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="acct-btn" disabled={busy}>
        {busy ? "Sending…" : "Send magic link"}
      </button>
      {err ? <p className="acct-err">{err}</p> : null}
    </form>
  );
}
