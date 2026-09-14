"use client";

import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getWorkbookSync } from "@/lib/store";
import type { AccountEvent } from "@/lib/sync/workbookSync";

/**
 * Tells the workbook store who is signed in. Renders nothing.
 *
 * All saving, merging, retrying, and sign-out handling lives in
 * lib/sync/workbookSync.ts. This component only forwards Supabase auth events
 * and the browser's "back online" / "tab visible again" moments.
 *
 * A token refresh is forwarded as exactly that: it no longer re-reads the
 * cloud copy over what is on screen. onAuthStateChange delivers the current
 * session as INITIAL_SESSION when subscribing, so there is no separate
 * getSession() call racing it.
 */
function toAccountEvent(event: AuthChangeEvent): AccountEvent {
  switch (event) {
    case "INITIAL_SESSION":
      return "initial";
    case "TOKEN_REFRESHED":
      return "token-refreshed";
    case "USER_UPDATED":
      return "user-updated";
    case "SIGNED_OUT":
      return "signed-out";
    default:
      return "signed-in";
  }
}

export default function SyncProvider() {
  useEffect(() => {
    const supa = getSupabase();
    const sync = getWorkbookSync();
    if (!supa || !sync) return;

    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      // Leave the auth callback before doing anything: supabase-js holds its
      // auth lock while callbacks run, and the sync's requests need that lock.
      setTimeout(() => sync.setAccount(user, toAccountEvent(event)), 0);
    });

    const onOnline = () => void sync.syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync.refreshIfIdle();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
