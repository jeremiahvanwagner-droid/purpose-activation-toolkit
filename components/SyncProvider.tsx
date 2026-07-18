"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { clearAll, getAllData, replaceAll, subscribeStore } from "@/lib/store";

/**
 * Cloud sync (no UI). When a user is signed in:
 *  - on start, pull their cloud copy; if it's newer than local, adopt it,
 *    otherwise push local up (first sign-in seeds the cloud from this device);
 *  - thereafter, push local changes up, debounced.
 * On sign-out, wipes local so shared devices don't leak between users.
 * Renders nothing and no-ops entirely when Supabase isn't configured.
 */
export const WORKBOOK_TABLE = "workbooks";

export default function SyncProvider() {
  // Track the last-authenticated uid so we only "seed" from local on truly
  // fresh sign-ins, and never push one user's data into another user's row.
  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return;

    let active = true;
    let unsubPush: (() => void) | null = null;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;

    async function push(uid: string) {
      const { data, updatedAt } = getAllData();
      await supa!
        .from(WORKBOOK_TABLE)
        .upsert({ user_id: uid, data, updated_at: new Date(updatedAt || Date.now()).toISOString() });
    }

    async function pull(uid: string) {
      const { data: row } = await supa!
        .from(WORKBOOK_TABLE)
        .select("data, updated_at")
        .eq("user_id", uid)
        .maybeSingle();
      const cloudTs = row?.updated_at ? Date.parse(row.updated_at as string) : 0;

      if (row) {
        // Cloud row exists — always adopt on sign-in. This prevents the
        // shared-device leak where a previous user's local edits would
        // otherwise overwrite the incoming user's cloud row.
        replaceAll((row.data as Record<string, unknown>) ?? {}, cloudTs);
      } else {
        // No cloud row yet — first sign-in for this user. Push whatever is
        // local (e.g., their pre-signup local-first work). Safe because
        // sign-out already clears any prior signed-in user's data.
        await push(uid);
      }
    }

    function startPush(uid: string) {
      unsubPush?.();
      unsubPush = subscribeStore(() => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          void push(uid);
        }, 1200);
      });
    }

    async function onSession(session: Session | null) {
      if (!active) return;
      const uid = session?.user?.id ?? null;
      if (uid) {
        await pull(uid);
        if (active) {
          lastUidRef.current = uid;
          startPush(uid);
        }
      } else {
        // Session gone. Only clear the local store if this is a *sign-out*
        // transition (we had a uid before) — not on initial page load for
        // a signed-out user, which would wipe their local-first work.
        unsubPush?.();
        unsubPush = null;
        if (pushTimer) clearTimeout(pushTimer);
        if (lastUidRef.current) {
          clearAll();
          lastUidRef.current = null;
        }
      }
    }

    supa.auth.getSession().then(({ data }) => void onSession(data.session));
    const { data: authSub } = supa.auth.onAuthStateChange((_event, session) => void onSession(session));

    return () => {
      active = false;
      authSub.subscription.unsubscribe();
      unsubPush?.();
      if (pushTimer) clearTimeout(pushTimer);
    };
  }, []);

  return null;
}
