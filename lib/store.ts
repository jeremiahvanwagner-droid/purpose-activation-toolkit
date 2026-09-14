"use client";

/**
 * The response store every exercise reads and writes.
 *
 * Components keep the same small API — useResponse(id), useResponses(),
 * setResponse(id, value) — while persistence lives in lib/sync/workbookSync.ts:
 * every answer is written to this device immediately, signed-out answers and
 * each account's answers are kept apart, and signed-in answers reach the
 * account through a merge that cannot overwrite newer or unsynced work. See
 * that file for the rules and the failures they replace.
 *
 * useSaveStatus() reports what actually happened to the latest answers, so the
 * labels around the workbook ("Saved on this device", "Synced to your
 * account", "not synced yet") are outcomes, never assumptions.
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  ACCOUNT_KEY_PREFIX,
  GUEST_KEY,
  WorkbookSync,
  isFilled as isFilledValue,
  type KeyValueStore,
  type SaveStatus,
} from "./sync/workbookSync";
import { supabaseWorkbookRemote } from "./sync/supabaseRemote";
import { getSupabase } from "./supabase";

export type Values = Record<string, unknown>;

/** True when a saved answer holds anything a person wrote or chose. */
export const isFilled = isFilledValue;

const EMPTY: Values = {};

const OFF_STATUS: SaveStatus = {
  scope: "guest",
  email: null,
  deviceSave: "ok",
  cloud: "off",
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  nextRetryAt: null,
  conflicts: [],
  guestAnswers: 0,
  adoptedGuestAnswers: 0,
};

let instance: WorkbookSync | null = null;

/** localStorage, with reads that fail soft and writes that report failure. */
const browserStorage: KeyValueStore = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    window.localStorage.setItem(key, value); // throws when full or blocked — the sync records it
  },
  remove(key) {
    window.localStorage.removeItem(key);
  },
};

/** The signed-in account supabase-js last persisted in this browser, if any.
 *  Used only to show that account's device copy on first paint; nothing syncs
 *  until SyncProvider confirms the session. */
function persistedSessionUser(): { id: string; email: string | null } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw) as { user?: { id?: unknown; email?: unknown } };
    const id = session?.user?.id;
    if (typeof id !== "string" || !id) return null;
    return { id, email: typeof session.user?.email === "string" ? session.user.email : null };
  } catch {
    return null;
  }
}

/** The single browser-side store, created on first use. Null during server rendering. */
export function getWorkbookSync(): WorkbookSync | null {
  if (typeof window === "undefined") return null;
  if (!instance) {
    const supa = getSupabase();
    instance = new WorkbookSync({
      storage: browserStorage,
      remote: supa ? supabaseWorkbookRemote(supa) : null,
    });
    if (supa) instance.hintAccount(persistedSessionUser());
    const sync = instance;
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key === GUEST_KEY || e.key.startsWith(ACCOUNT_KEY_PREFIX)) sync.onStorageKey(e.key);
    });
  }
  return instance;
}

function subscribe(cb: () => void): () => void {
  const sync = getWorkbookSync();
  return sync ? sync.subscribe(cb) : () => {};
}

function getSnapshot(): Values {
  return getWorkbookSync()?.getDoc() ?? EMPTY;
}

function getServerSnapshot(): Values {
  return EMPTY;
}

export function setResponse(id: string, value: unknown) {
  getWorkbookSync()?.setField(id, value);
}

export function getResponse<T = unknown>(id: string, fallback: T): T {
  const v = getSnapshot()[id];
  return v === undefined ? fallback : (v as T);
}

/** Subscribe to the whole response map (re-renders on any change). */
export function useResponses(): Values {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Bind a single field: `const [value, setValue] = useResponse(id, "")`. */
export function useResponse<T>(id: string, fallback: T): [T, (v: T) => void] {
  const all = useResponses();
  const value = all[id] === undefined ? fallback : (all[id] as T);
  const set = useCallback((v: T) => setResponse(id, v), [id]);
  return [value, set];
}

/** Count how many of the given field ids have been filled in. */
export function useFilledCount(ids: string[]): number {
  const all = useResponses();
  return ids.reduce((n, id) => (isFilled(all[id]) ? n + 1 : n), 0);
}

/** Where the latest answers actually are: this device, the account, or neither yet. */
export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(
    subscribe,
    () => getWorkbookSync()?.getStatus() ?? OFF_STATUS,
    () => OFF_STATUS
  );
}
