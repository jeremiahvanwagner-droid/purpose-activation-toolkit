"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Passwordless (magic-link) sign-in, shown in the rail and on paywalls.
 * Signing in turns on cross-device sync (handled by SyncProvider). Renders
 * nothing when Supabase isn't configured, so the app stays fully usable
 * local-only.
 *
 * `redirectTo` is the path the magic link lands on — the Toolkit by default,
 * or the paid page a reader was trying to open, so a buyer comes back to the
 * thing they bought rather than to a dashboard they then have to leave.
 */
export default function AccountWidget({ redirectTo = "/toolkit" }: { redirectTo?: string }) {
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
      // Land signed-in users where they were headed, not on the marketing page.
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}${redirectTo}` : undefined,
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
          We sent a sign-in link to <b>{email.trim()}</b>. Open it on any device to sync your
          workbook.
        </p>
        {/* Auth mail is a brand-new sending reputation, so first sends land in spam often
            enough to cost us buyers. Naming the sender and the real subject line is what
            makes it findable — a first-time address gets Supabase's "Confirm Your Signup"
            template, NOT the magic-link one, so telling people to look for a "magic link"
            sends them past it. */}
        <p className="acct-note">
          It comes from <b>support@truthjblue.com</b>. If it isn&apos;t there in a minute, check
          your spam or junk folder and mark it <b>Not spam</b> — signing in the first time is
          all it takes to fix it for good.
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
