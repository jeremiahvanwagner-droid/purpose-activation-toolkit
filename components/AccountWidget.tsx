"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getWorkbookSync, useSaveStatus } from "@/lib/store";
import { describeStatus, type Conflict } from "@/lib/sync/workbookSync";
import { labelForField, previewValue } from "@/lib/fieldLabels";

/**
 * Passwordless (magic-link) sign-in, shown in the rail and on paywalls, plus
 * the signed-in reader's save status and the decisions only they can make:
 * what to do with answers written on this browser before signing in, which
 * version to keep when an answer changed in two places, and whether to sign
 * out while answers haven't reached the account yet. Renders nothing when
 * Supabase isn't configured, so the app stays fully usable local-only.
 *
 * `redirectTo` is the path the magic link lands on — the Toolkit by default,
 * or the paid page a reader was trying to open, so a buyer comes back to the
 * thing they bought rather than to a dashboard they then have to leave.
 */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function otherLabel(c: Conflict): string {
  switch (c.otherFrom) {
    case "another-device":
      return "From another device";
    case "before-sign-in":
      return "Written here before you signed in";
    default:
      return "Set aside on this device";
  }
}

export default function AccountWidget({ redirectTo = "/toolkit" }: { redirectTo?: string }) {
  const supa = getSupabase();
  const status = useSaveStatus();
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!supa) return;
    supa.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supa.auth.onAuthStateChange((_e, s) => setUserEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supa]);

  if (!isSupabaseConfigured || !supa) return null;
  const sync = getWorkbookSync();

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

  async function signOut(keepOnDevice: boolean) {
    if (!supa) return;
    if (keepOnDevice) sync?.keepOnSignOut();
    setSigningOut(true);
    await supa.auth.signOut();
    setSigningOut(false);
    setConfirmSignOut(false);
  }

  function requestSignOut() {
    const unsaved = sync?.unsavedOnSignOut() ?? { pending: 0, conflicts: 0 };
    if (unsaved.pending > 0 || unsaved.conflicts > 0) setConfirmSignOut(true);
    else void signOut(false);
  }

  if (userEmail) {
    const described = describeStatus(status);
    const accountReady = status.scope === "account";
    const cantReach = status.cloud === "retrying" || status.cloud === "blocked";
    const unsaved = status.pending + status.conflicts.length;

    return (
      <div className="acct">
        <div className={`acct-status tone-${accountReady ? described.tone : "busy"}`}>
          <span className="acct-dot" />{" "}
          {accountReady ? described.text : "Opening your workbook…"}
        </div>
        {accountReady && described.detail ? <p className="acct-msg">{described.detail}</p> : null}
        <p className="acct-msg">
          Signed in as <b>{userEmail}</b>
        </p>
        {cantReach ? (
          <button type="button" className="acct-link" onClick={() => void sync?.syncNow()}>
            Try again now
          </button>
        ) : null}

        {status.adoptedGuestAnswers > 0 ? (
          <div className="acct-notice">
            <p className="acct-msg">
              We added {status.adoptedGuestAnswers}{" "}
              {plural(status.adoptedGuestAnswers, "answer", "answers")} written on this browser before you signed
              in to your new workbook.
            </p>
            <button type="button" className="acct-link" onClick={() => sync?.dismissAdoptionNotice()}>
              Keep them
            </button>
            <button type="button" className="acct-link" onClick={() => sync?.returnAdoptedAnswers()}>
              Not mine — take them out
            </button>
          </div>
        ) : null}

        {status.guestAnswers > 0 ? (
          <div className="acct-notice">
            <p className="acct-msg">
              This browser has {status.guestAnswers} {plural(status.guestAnswers, "answer", "answers")} that
              {status.guestAnswers === 1 ? " isn't" : " aren't"} in your account yet.
            </p>
            <button type="button" className="acct-btn" onClick={() => sync?.adoptGuestAnswers()}>
              Add {plural(status.guestAnswers, "it", "them")} to my workbook
            </button>
            <button type="button" className="acct-link" onClick={() => sync?.keepGuestAnswersSeparate()}>
              Keep {plural(status.guestAnswers, "it", "them")} separate
            </button>
          </div>
        ) : null}

        {status.conflicts.length > 0 ? (
          <div className="acct-notice">
            <p className="acct-msg">
              {status.conflicts.length} {plural(status.conflicts.length, "answer was", "answers were")} changed in
              two places. Your workbook shows the newer version; the other is saved here.
            </p>
            <button type="button" className="acct-link" onClick={() => setReviewOpen((o) => !o)}>
              {reviewOpen ? "Hide" : "Review"}
            </button>
            {reviewOpen
              ? status.conflicts.map((c) => (
                  <div className="acct-conflict" key={c.id}>
                    <div className="acct-conflict-q">{labelForField(c.field, c.path)}</div>
                    <div className="acct-conflict-v">
                      <span>In your workbook:</span> {previewValue(c.kept)}
                    </div>
                    <div className="acct-conflict-v">
                      <span>{otherLabel(c)}:</span> {previewValue(c.other)}
                    </div>
                    <button type="button" className="acct-link" onClick={() => sync?.useOtherVersion(c.id)}>
                      Use this version instead
                    </button>
                    <button type="button" className="acct-link" onClick={() => sync?.dismissConflict(c.id)}>
                      Discard the saved version
                    </button>
                  </div>
                ))
              : null}
          </div>
        ) : null}

        {confirmSignOut ? (
          <div className="acct-notice warn">
            {unsaved > 0 ? (
              <p className="acct-msg">
                {status.pending > 0
                  ? `${status.pending} ${plural(status.pending, "answer hasn't", "answers haven't")} reached your account yet. `
                  : ""}
                {status.conflicts.length > 0
                  ? `${status.conflicts.length} saved ${plural(status.conflicts.length, "version is", "versions are")} waiting for review. `
                  : ""}
                If you sign out, {unsaved === 1 ? "it stays" : "they stay"} on this browser — out of view — until you
                sign in here again.
              </p>
            ) : (
              <p className="acct-msg">Everything is in your account now.</p>
            )}
            {status.pending > 0 ? (
              <button type="button" className="acct-btn" onClick={() => void sync?.syncNow()}>
                Try to sync now
              </button>
            ) : null}
            <button type="button" className="acct-link" disabled={signingOut} onClick={() => void signOut(unsaved > 0)}>
              {unsaved > 0 ? `Sign out and keep ${unsaved === 1 ? "it" : "them"} on this browser` : "Sign out"}
            </button>
            <button type="button" className="acct-link" onClick={() => setConfirmSignOut(false)}>
              Stay signed in
            </button>
          </div>
        ) : (
          <button type="button" className="acct-link" disabled={signingOut} onClick={requestSignOut}>
            Sign out
          </button>
        )}
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
      {status.deviceSave === "failed" ? (
        <p className="acct-msg acct-warn">
          This browser is blocking storage, so answers aren&apos;t being saved on this device.
        </p>
      ) : null}
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
