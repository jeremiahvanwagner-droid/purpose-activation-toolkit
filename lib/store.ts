"use client";

/**
 * Local-first response store.
 *
 * Every answer saves to localStorage instantly, so nothing is ever lost.
 * When the user signs in (Supabase configured), lib/sync.ts pulls their cloud
 * copy and pushes local changes — the component API below never changes.
 */

import { useCallback, useSyncExternalStore } from "react";

const KEY = "pat:responses:v1";
const TS_KEY = "pat:updatedAt:v1";

export type Values = Record<string, unknown>;

let cache: Values | null = null;
let updatedAt = 0;
const listeners = new Set<() => void>();

function load(): Values {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Values) : {};
    updatedAt = Number(window.localStorage.getItem(TS_KEY)) || 0;
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
    window.localStorage.setItem(TS_KEY, String(updatedAt));
  } catch {
    /* storage full or blocked — the in-memory copy still works this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function now(): number {
  return typeof Date.now === "function" ? Date.now() : 0;
}

export function setResponse(id: string, value: unknown) {
  const current = load();
  cache = { ...current, [id]: value };
  updatedAt = now();
  persist();
  emit();
}

export function getResponse<T = unknown>(id: string, fallback: T): T {
  const v = load()[id];
  return v === undefined ? fallback : (v as T);
}

/** True when a saved answer counts as "completed" for progress purposes. */
export function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === "object") return Object.values(value as object).some(isFilled);
  return Boolean(value);
}

const EMPTY: Values = {};

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null; // force reload from the other tab's write
      cb();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Values {
  return load();
}
function getServerSnapshot(): Values {
  return EMPTY;
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

/* ----------------------------- cloud-sync support ----------------------------- */

/** Snapshot for pushing to the cloud. */
export function getAllData(): { data: Values; updatedAt: number } {
  return { data: load(), updatedAt };
}

/** Replace the entire store (used when the cloud copy is newer than local). */
export function replaceAll(data: Values, ts: number) {
  cache = { ...data };
  updatedAt = ts || now();
  persist();
  emit();
}

/** Wipe local state — called on sign-out so a shared device doesn't leak the
 *  previous user's workbook into the next signer's cloud row. */
export function clearAll() {
  cache = {};
  updatedAt = 0;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(TS_KEY);
    } catch {
      /* ignore */
    }
  }
  emit();
}

/** Raw (non-React) subscription to store changes, for the sync pusher. */
export function subscribeStore(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
