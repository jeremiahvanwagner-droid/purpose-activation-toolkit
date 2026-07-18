"use client";

/**
 * Local-first response store.
 *
 * Every answer in the toolkit is saved to localStorage the instant it changes,
 * so nothing is ever lost. In Phase 2 this same store gains an optional cloud
 * sync (Supabase) for signed-in users — the component API below won't change.
 */

import { useCallback, useSyncExternalStore } from "react";

const KEY = "pat:responses:v1";

export type Values = Record<string, unknown>;

let cache: Values | null = null;
const listeners = new Set<() => void>();

function load(): Values {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Values) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
  } catch {
    /* storage full or blocked — the in-memory copy still works this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setResponse(id: string, value: unknown) {
  const current = load();
  cache = { ...current, [id]: value };
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
  const value = (all[id] === undefined ? fallback : (all[id] as T));
  const set = useCallback((v: T) => setResponse(id, v), [id]);
  return [value, set];
}

/** Count how many of the given field ids have been filled in. */
export function useFilledCount(ids: string[]): number {
  const all = useResponses();
  return ids.reduce((n, id) => (isFilled(all[id]) ? n + 1 : n), 0);
}
