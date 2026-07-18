"use client";

import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getAllData, replaceAll, subscribeStore } from "@/lib/store";

/**
 * Cloud sync (no UI). When a user is signed in:
 *  - on start, pull their cloud copy; if it's newer than local, adopt it,
 *    otherwise push local up (first sign-in seeds the cloud from this device);
 *  - thereafter, push local changes up, debounced.
 * Renders nothing and no-ops entirely when Supabase isn't configured.
 */
export const WORKBOOK_TABLE = "workbooks";

export default function SyncProvider() {
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
      const local = getAllData();
      const cloudTs = row?.updated_at ? Date.parse(row.updated_at as string) : 0;
      if (row && cloudTs > local.updatedAt) {
        replaceAll((row.data as Record<string, unknown>) ?? {}, cloudTs);
      } else {
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
      const uid = session?.user?.id;
      if (uid) {
        await pull(uid);
        if (active) startPush(uid);
      } else {
        unsubPush?.();
        unsubPush = null;
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
