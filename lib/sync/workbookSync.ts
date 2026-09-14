/**
 * Workbook persistence: local-first saving, account sync, and the rules that
 * keep either from destroying a reader's answers.
 *
 * Everything here is plain TypeScript with no React, DOM, or Supabase imports,
 * so the failure paths can be exercised in tests (tests/sync.test.ts) with a
 * fake storage and a fake cloud. lib/store.ts binds it to React and
 * localStorage; lib/sync/supabaseRemote.ts binds it to public.workbooks.
 *
 * Why it exists. The previous sync (components/SyncProvider.tsx at 5eba60b)
 * shared one localStorage key between every signed-in and signed-out reader,
 * replaced the device copy with the cloud copy on every sign-in, reload, and
 * token refresh, ignored the error objects Supabase returns, and wrote the
 * whole document blindly. In a browser against a mock backend that lost
 * answers six ways: a failed cloud read on a new device overwrote the cloud
 * row with an empty workbook; a reload within the 1.2 s push delay discarded
 * what had just been typed; a failed write still showed "Synced", and the next
 * reload erased the answer everywhere; a second device's write erased the
 * first device's answer; signing out with unsynced answers deleted the only
 * copy; and answers written before signing in were replaced at sign-in.
 *
 * The rules now:
 *
 *  1. Every edit is written to this device first. The status shown to the
 *     reader comes from what actually happened: the device write succeeded or
 *     threw, the cloud write succeeded, is scheduled, or failed.
 *  2. Signed-out answers and each account's answers live under separate
 *     storage keys. An account's copy is never shown to anyone else signed in
 *     (or out) on the same browser.
 *  3. The cloud copy is never adopted wholesale. It is merged field by field
 *     against the last cloud copy this device saw (the base): a field changed
 *     only in the cloud is taken, a field changed only here is kept, and a
 *     field changed in both places keeps the more recent edit while the other
 *     version is set aside as a conflict the reader can restore.
 *  4. A cloud write only lands if the row is still at the version this device
 *     merged against (updated_at acts as the version: the production trigger
 *     restamps it on every UPDATE). Otherwise the cycle re-reads and merges.
 *  5. Nothing is written after a failed read, and an answer this device holds
 *     is never removed because the cloud document lacks the key: answers are
 *     never deleted by key, so a missing key means a reset or lost copy, and
 *     the device copy is restored to the cloud instead.
 *  6. Late results are discarded. Every change of account bumps an epoch, and
 *     a cloud response that arrives for an older epoch or another account is
 *     ignored.
 *  7. Signing out keeps an account's unsynced answers (and any set-aside
 *     versions) on this device, out of view, until that account signs in
 *     again. A fully synced account's device copy is removed on sign-out.
 */

export type Doc = Record<string, unknown>;

/** Synchronous key/value storage. `set` may throw (quota, blocked storage). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type RemoteRow = { data: Doc; version: string };

export type RemoteFailure = {
  ok: false;
  /** network: transient, retry. stale: the row moved past the expected version.
   *  exists: a row appeared while creating one. denied: the session was
   *  refused. unknown: anything else (retried with backoff). */
  kind: "network" | "stale" | "exists" | "denied" | "unknown";
  message: string;
};
export type RemoteResult<T> = { ok: true; value: T } | RemoteFailure;

export interface WorkbookRemote {
  read(userId: string): Promise<RemoteResult<RemoteRow | null>>;
  /** Insert the row. Resolves with the stored version. */
  create(userId: string, data: Doc): Promise<RemoteResult<string>>;
  /** Replace `data` only if the row is still at `expectedVersion`. */
  update(userId: string, data: Doc, expectedVersion: string): Promise<RemoteResult<string>>;
}

export type Conflict = {
  id: string;
  /** Top-level answer id, e.g. "pa.s1.here". */
  field: string;
  /** Path inside the answer for nested values, e.g. ["ep.deck.purpose", "3"]. */
  path: string[];
  /** The version now in the workbook. */
  kept: unknown;
  /** The version that was set aside. */
  other: unknown;
  otherFrom: "another-device" | "this-device" | "before-sign-in";
  at: number;
};

export type CloudState = "off" | "waiting" | "saving" | "synced" | "retrying" | "blocked";

export type SaveStatus = {
  scope: "guest" | "account";
  email: string | null;
  /** Did the most recent write to this device's storage succeed? */
  deviceSave: "ok" | "failed";
  /** off: no account sync (signed out, or Supabase not configured).
   *  waiting: signed in, first cloud read not finished yet.
   *  saving: a cloud write is scheduled or in flight.
   *  synced: the cloud holds everything on this device.
   *  retrying: the last attempt failed; another is scheduled.
   *  blocked: the account refused the write (usually an expired sign-in). */
  cloud: CloudState;
  /** Answers on this device that the cloud does not have yet. */
  pending: number;
  lastSyncedAt: number | null;
  lastError: string | null;
  nextRetryAt: number | null;
  conflicts: Conflict[];
  /** Signed-out answers on this device that differ from the account and are
   *  waiting for the reader to decide what to do with them. */
  guestAnswers: number;
  /** Signed-out answers that were added to a brand-new account automatically. */
  adoptedGuestAnswers: number;
};

export type StatusTone = "ok" | "busy" | "warn" | "error";

/* ------------------------------------------------------------------ */
/* Value helpers                                                       */
/* ------------------------------------------------------------------ */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** True when a saved answer holds anything a person wrote or chose. */
export function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === "object") return Object.values(value as object).some(isFilled);
  return Boolean(value);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

/** Same answer for sync purposes: identical, or both empty ("" and absent). */
export function sameAnswer(a: unknown, b: unknown): boolean {
  return deepEqual(a, b) || (!isFilled(a) && !isFilled(b));
}

function keysOf(...docs: (Doc | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const d of docs) if (d) for (const k of Object.keys(d)) set.add(k);
  return [...set];
}

/** Top-level answers on `doc` that `base` does not already hold. */
export function pendingFields(doc: Doc, base: Doc | null): string[] {
  const b = base ?? {};
  return keysOf(doc, b).filter((k) => !sameAnswer(doc[k], b[k]));
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

export type MergeContext = {
  /** Last local edit time (ms) per top-level field, for fields edited since base. */
  localEditTimes: Record<string, number>;
  /** When the cloud copy was written (ms), from its version stamp. */
  remoteTime: number;
  now: number;
};

export type MergeResult = {
  merged: Doc;
  conflicts: Conflict[];
  /** Fields this device kept because the cloud copy had lost them. */
  restored: string[];
};

let conflictSeq = 0;
function conflictId(now: number): string {
  conflictSeq += 1;
  return `c${now.toString(36)}${conflictSeq.toString(36)}`;
}

/**
 * Three-way merge of the cloud copy into this device's copy.
 *
 *   base   — the last cloud copy this device merged with (empty if never)
 *   local  — this device's current copy
 *   remote — the cloud copy just read
 *
 * Plain objects (a domain row, a deck's journal, a covenant) merge key by key,
 * so two devices answering different prompts in the same deck both keep their
 * answers. Arrays and scalars are single answers. When both sides changed the
 * same answer differently, the more recent edit is kept (the local edit time
 * against the cloud write time) and the other version is recorded as a
 * Conflict — never dropped.
 */
export function mergeDocs(base: Doc | null, local: Doc, remote: Doc, ctx: MergeContext): MergeResult {
  const conflicts: Conflict[] = [];
  const restored: string[] = [];
  const b0 = base ?? {};

  function mergeValue(path: string[], b: unknown, l: unknown, r: unknown): unknown {
    if (sameAnswer(l, r)) return l !== undefined ? l : r;
    const localChanged = !sameAnswer(l, b);
    const remoteChanged = !sameAnswer(r, b);
    if (!remoteChanged) return l;
    if (!localChanged) {
      // Only the cloud changed. The one exception: the cloud document no
      // longer has a top-level answer this device holds. Answers are never
      // deleted by key, so that is a reset or lost copy, not a decision.
      if (path.length === 1 && r === undefined && isFilled(l)) {
        restored.push(path[0]);
        return l;
      }
      return r;
    }
    // Both changed.
    if (isPlainObject(l) && isPlainObject(r) && (b === undefined || isPlainObject(b))) {
      const bo = isPlainObject(b) ? b : {};
      const out: Record<string, unknown> = {};
      for (const k of keysOf(bo, l, r)) {
        const v = mergeValue([...path, k], bo[k], l[k], r[k]);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    if (r === undefined) return l; // the cloud lost it; keep this device's edit
    if (l === undefined) return r;
    const localTime = ctx.localEditTimes[path[0]] ?? 0;
    const localWins = localTime > ctx.remoteTime;
    const kept = localWins ? l : r;
    const other = localWins ? r : l;
    if (isFilled(other)) {
      conflicts.push({
        id: conflictId(ctx.now),
        field: path[0],
        path,
        kept,
        other,
        otherFrom: localWins ? "another-device" : "this-device",
        at: ctx.now,
      });
    }
    return kept;
  }

  const merged: Doc = {};
  for (const k of keysOf(b0, local, remote)) {
    const v = mergeValue([k], b0[k], local[k], remote[k]);
    if (v !== undefined) merged[k] = v;
  }
  return { merged, conflicts, restored };
}

/** Set a value at a path inside a document, copying along the way. */
export function setAtPath(doc: Doc, path: string[], value: unknown): Doc {
  if (path.length === 0) return doc;
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...doc, [head]: value };
  const child = isPlainObject(doc[head]) ? (doc[head] as Doc) : {};
  return { ...doc, [head]: setAtPath(child, rest, value) };
}

/* ------------------------------------------------------------------ */
/* Status wording                                                      */
/* ------------------------------------------------------------------ */

/** What the reader is told, derived only from recorded outcomes. */
export function describeStatus(s: SaveStatus): { tone: StatusTone; text: string; detail: string | null } {
  if (s.scope === "guest") {
    return s.deviceSave === "ok"
      ? { tone: "ok", text: "Saved on this device", detail: null }
      : {
          tone: "error",
          text: "Not saved — this browser is blocking storage",
          detail: "Keep this page open, or copy your answers somewhere safe before leaving.",
        };
  }
  const unsyncedNote = s.pending === 1 ? "1 answer isn't in your account yet." : `${s.pending} answers aren't in your account yet.`;
  if (s.deviceSave === "failed") {
    if (s.cloud === "synced" && s.pending === 0) {
      return { tone: "warn", text: "Synced to your account", detail: "This browser is blocking storage, so nothing is kept on this device." };
    }
    return {
      tone: "error",
      text: "Not saved yet — keep this page open",
      detail: "This browser is blocking storage and your account hasn't received the latest answers.",
    };
  }
  switch (s.cloud) {
    case "waiting":
      return { tone: "busy", text: "Saved on this device · checking your account…", detail: null };
    case "saving":
      return { tone: "busy", text: "Saving to your account…", detail: s.pending ? unsyncedNote : null };
    case "synced":
      return s.pending === 0
        ? { tone: "ok", text: "Synced to your account", detail: null }
        : { tone: "busy", text: "Saving to your account…", detail: unsyncedNote };
    case "retrying":
      return {
        tone: "warn",
        text: "Saved on this device · not synced yet",
        detail: `${unsyncedNote} We couldn't reach your account and will keep trying.`,
      };
    case "blocked":
      return {
        tone: "warn",
        text: "Saved on this device · not synced",
        detail: `${unsyncedNote} Your sign-in needs to be renewed — sign in again to sync.`,
      };
    default:
      return { tone: "ok", text: "Saved on this device", detail: null };
  }
}

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

export const GUEST_KEY = "pat:responses:v1";
const GUEST_TS_KEY = "pat:updatedAt:v1";
export const ACCOUNT_KEY_PREFIX = "pat:account:v2:";
export const accountKey = (userId: string) => `${ACCOUNT_KEY_PREFIX}${userId}`;
/** Per account: a hash of the signed-out answers the reader chose to keep
 *  separate, so they aren't asked again. Holds no answers, and survives
 *  sign-out even when the account's device copy is removed. */
const GUEST_DECISIONS_KEY = "pat:guest-kept-separate:v2";

type AccountSlot = {
  v: 2;
  userId: string;
  email: string | null;
  doc: Doc;
  base: Doc | null;
  baseVersion: string | null;
  edits: Record<string, number>;
  conflicts: Conflict[];
  lastSyncedAt: number | null;
  /** Keep this slot on sign-out even if nothing is pending (reader asked). */
  keepOnSignOut?: boolean;
  /** Signed-out answers added automatically when the account was empty. */
  adoptedGuest?: { fields: string[]; values: Doc; at: number } | null;
};

export type AccountEvent = "initial" | "signed-in" | "token-refreshed" | "user-updated" | "signed-out";

export type SyncOptions = {
  storage: KeyValueStore;
  remote?: WorkbookRemote | null;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Delay between an edit and the cloud write. */
  debounceMs?: number;
  retryDelaysMs?: number[];
};

const MAX_CYCLE_ROUNDS = 5;

function parseDoc(raw: string | null): Doc | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return isPlainObject(v) ? (v as Doc) : null;
  } catch {
    return null;
  }
}

/** A short, non-reversible fingerprint of the filled answers in a document. */
function fingerprint(doc: Doc): string {
  const text = JSON.stringify(
    Object.keys(doc)
      .filter((k) => isFilled(doc[k]))
      .sort()
      .map((k) => [k, doc[k]])
  );
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${text.length.toString(36)}.${h1.toString(36)}.${h2.toString(36)}`;
}

function parseVersionTime(version: string | null): number {
  if (!version) return 0;
  const t = Date.parse(version);
  return Number.isFinite(t) ? t : 0;
}

export class WorkbookSync {
  private storage: KeyValueStore;
  private remote: WorkbookRemote | null;
  private now: () => number;
  private setTimer: (fn: () => void, ms: number) => unknown;
  private clearTimer: (handle: unknown) => void;
  private debounceMs: number;
  private retryDelays: number[];

  private listeners = new Set<() => void>();
  private guestDoc: Doc;
  private slot: AccountSlot | null = null;
  /** True once auth has confirmed the active account (a storage hint alone is not enough to sync). */
  private confirmed = false;
  private epoch = 0;

  private deviceSave: "ok" | "failed" = "ok";
  private cloud: CloudState = "off";
  private lastError: string | null = null;
  private nextRetryAt: number | null = null;
  private retryIndex = 0;

  private debounceHandle: unknown = null;
  private retryHandle: unknown = null;
  private inFlight: Promise<void> | null = null;
  private runAgain = false;
  private readOnce = false;
  private lastReadAt = 0;
  private guestAnswerCount = 0;

  private statusCache: SaveStatus | null = null;

  constructor(opts: SyncOptions) {
    this.storage = opts.storage;
    this.remote = opts.remote ?? null;
    this.now = opts.now ?? (() => Date.now());
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
    this.debounceMs = opts.debounceMs ?? 1200;
    this.retryDelays = opts.retryDelaysMs ?? [2000, 5000, 15000, 30000, 60000];
    this.guestDoc = this.readGuest();
  }

  /* ----------------------------- subscription ----------------------------- */

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.statusCache = null;
    this.listeners.forEach((l) => l());
  }

  setRemote(remote: WorkbookRemote | null) {
    this.remote = remote;
  }

  /* --------------------------------- data --------------------------------- */

  /** The answers currently in view (this account's copy, or signed-out answers). */
  getDoc(): Doc {
    return this.slot ? this.slot.doc : this.guestDoc;
  }

  get activeUserId(): string | null {
    return this.slot?.userId ?? null;
  }

  setField(id: string, value: unknown) {
    if (this.slot) {
      const slot = this.slot;
      slot.doc = { ...slot.doc, [id]: value };
      slot.edits = { ...slot.edits, [id]: this.now() };
      this.persistSlot(slot);
      if (this.confirmed && this.remote) {
        this.cloud = "saving";
        this.scheduleSync(this.debounceMs);
      }
    } else {
      this.guestDoc = { ...this.guestDoc, [id]: value };
      this.persistGuest();
    }
    this.emit();
  }

  /* -------------------------------- status -------------------------------- */

  getStatus(): SaveStatus {
    if (this.statusCache) return this.statusCache;
    const slot = this.slot;
    const pending = slot ? pendingFields(slot.doc, slot.base).length : 0;
    let cloud: CloudState = "off";
    if (slot && this.remote) {
      if (!this.confirmed || (!this.readOnce && this.cloud !== "retrying" && this.cloud !== "blocked")) cloud = "waiting";
      else if (this.cloud === "synced" && pending > 0) cloud = "saving";
      else cloud = this.cloud;
    }
    this.statusCache = {
      scope: slot ? "account" : "guest",
      email: slot?.email ?? null,
      deviceSave: this.deviceSave,
      cloud,
      pending,
      lastSyncedAt: slot?.lastSyncedAt ?? null,
      lastError: this.lastError,
      nextRetryAt: this.nextRetryAt,
      conflicts: slot?.conflicts ?? [],
      guestAnswers: slot ? this.guestAnswerCount : 0,
      adoptedGuestAnswers: slot?.adoptedGuest?.fields.length ?? 0,
    };
    return this.statusCache;
  }

  /** Unsynced answers or set-aside versions that signing out would put out of view. */
  unsavedOnSignOut(): { pending: number; conflicts: number } {
    const s = this.getStatus();
    return { pending: s.scope === "account" ? s.pending : 0, conflicts: s.conflicts.length };
  }

  /* --------------------------------- auth --------------------------------- */

  /**
   * Show an account's device copy before auth has finished confirming it, so a
   * signed-in reader never sees (or types into) the signed-out answers. No
   * cloud traffic happens until setAccount confirms the same account.
   */
  hintAccount(user: { id: string; email: string | null } | null) {
    if (!user || this.slot) return;
    this.activate(user, false);
    this.emit();
  }

  setAccount(user: { id: string; email: string | null } | null, event: AccountEvent) {
    if (!user) {
      if (this.slot) this.deactivate();
      this.emit();
      return;
    }
    if (this.slot && this.slot.userId === user.id) {
      if (user.email && this.slot.email !== user.email) {
        this.slot.email = user.email;
        this.persistSlot(this.slot);
      }
      const wasConfirmed = this.confirmed;
      this.confirmed = true;
      // A token refresh is not a reason to re-read anything. It only resumes
      // writes that were waiting (or blocked on the expired token).
      if (!wasConfirmed || event !== "token-refreshed" || this.cloud === "blocked" || this.getStatus().pending > 0) {
        this.scheduleSync(0);
      }
      this.emit();
      return;
    }
    if (this.slot) this.deactivate();
    this.activate(user, true);
    this.scheduleSync(0);
    this.emit();
  }

  private activate(user: { id: string; email: string | null }, confirmed: boolean) {
    this.epoch += 1;
    const existing = this.readSlot(user.id);
    this.slot = existing ?? {
      v: 2,
      userId: user.id,
      email: user.email,
      doc: {},
      base: null,
      baseVersion: null,
      edits: {},
      conflicts: [],
      lastSyncedAt: null,
    };
    if (user.email) this.slot.email = user.email;
    if (existing) this.slot.keepOnSignOut = false;
    this.confirmed = confirmed;
    this.cloud = this.remote ? "waiting" : "off";
    this.readOnce = false;
    this.lastError = null;
    this.nextRetryAt = null;
    this.retryIndex = 0;
    this.guestAnswerCount = 0;
  }

  /** Put the active account out of view, keeping its device copy only if needed. */
  private deactivate() {
    const slot = this.slot;
    if (!slot) return;
    this.epoch += 1;
    this.cancelTimers();
    const pending = pendingFields(slot.doc, slot.base).length;
    if (pending > 0 || slot.conflicts.length > 0 || slot.keepOnSignOut) {
      this.persistSlot(slot);
    } else {
      try {
        this.storage.remove(accountKey(slot.userId));
      } catch {
        /* nothing to keep; a failed removal leaves an out-of-view copy */
      }
    }
    this.slot = null;
    this.confirmed = false;
    this.cloud = "off";
    this.lastError = null;
    this.nextRetryAt = null;
    this.readOnce = false;
    this.guestAnswerCount = 0;
    this.guestDoc = this.readGuest();
  }

  /** Called by the sign-out flow when the reader chose to keep unsynced answers on this device. */
  keepOnSignOut() {
    if (!this.slot) return;
    this.slot.keepOnSignOut = true;
    this.persistSlot(this.slot);
  }

  /* ------------------------- signed-out answers ------------------------- */

  /** Add signed-out answers on this device to the active account. */
  adoptGuestAnswers() {
    const slot = this.slot;
    if (!slot) return;
    const guest = this.guestDoc;
    const t = this.now();
    let doc = slot.doc;
    const edits = { ...slot.edits };
    const conflicts: Conflict[] = [];
    for (const k of Object.keys(guest)) {
      const g = guest[k];
      if (!isFilled(g) || sameAnswer(g, doc[k])) continue;
      if (!isFilled(doc[k])) {
        doc = { ...doc, [k]: g };
        edits[k] = t;
      } else {
        conflicts.push({ id: conflictId(t), field: k, path: [k], kept: doc[k], other: g, otherFrom: "before-sign-in", at: t });
      }
    }
    slot.doc = doc;
    slot.edits = edits;
    slot.conflicts = [...slot.conflicts, ...conflicts];
    this.setGuestDecision(slot.userId, null);
    this.guestDoc = {};
    this.guestAnswerCount = 0;
    this.persistSlot(slot);
    this.clearGuestStorage();
    if (this.confirmed && this.remote) {
      this.cloud = "saving";
      this.scheduleSync(0);
    }
    this.emit();
  }

  /** Leave signed-out answers where they are; don't ask again unless they change. */
  keepGuestAnswersSeparate() {
    if (!this.slot) return;
    this.setGuestDecision(this.slot.userId, fingerprint(this.guestDoc));
    this.guestAnswerCount = 0;
    this.emit();
  }

  /** Undo an automatic adoption: return untouched answers to the signed-out copy. */
  returnAdoptedAnswers() {
    const slot = this.slot;
    const adopted = slot?.adoptedGuest;
    if (!slot || !adopted) return;
    const t = this.now();
    let doc = slot.doc;
    const edits = { ...slot.edits };
    const back: Doc = { ...this.readGuest() };
    for (const k of adopted.fields) {
      if (!sameAnswer(doc[k], adopted.values[k])) continue; // edited since; it's theirs now
      back[k] = adopted.values[k];
      doc = { ...doc, [k]: emptyLike(adopted.values[k]) };
      edits[k] = t;
    }
    slot.doc = doc;
    slot.edits = edits;
    slot.adoptedGuest = null;
    this.setGuestDecision(slot.userId, fingerprint(back));
    this.guestDoc = back;
    this.persistGuest();
    this.persistSlot(slot);
    if (this.confirmed && this.remote) this.scheduleSync(0);
    this.emit();
  }

  dismissAdoptionNotice() {
    if (!this.slot?.adoptedGuest) return;
    this.slot.adoptedGuest = null;
    this.persistSlot(this.slot);
    this.emit();
  }

  /* ------------------------------ conflicts ------------------------------ */

  /** Put the set-aside version back into the workbook (the kept one is set aside in turn). */
  useOtherVersion(conflictId_: string) {
    const slot = this.slot;
    if (!slot) return;
    const c = slot.conflicts.find((x) => x.id === conflictId_);
    if (!c) return;
    const t = this.now();
    slot.doc = setAtPath(slot.doc, c.path, c.other);
    slot.edits = { ...slot.edits, [c.field]: t };
    slot.conflicts = slot.conflicts.map((x) =>
      x.id === c.id ? { ...x, kept: c.other, other: c.kept, otherFrom: "this-device", at: t } : x
    );
    this.persistSlot(slot);
    if (this.confirmed && this.remote) {
      this.cloud = "saving";
      this.scheduleSync(this.debounceMs);
    }
    this.emit();
  }

  dismissConflict(conflictId_: string) {
    const slot = this.slot;
    if (!slot) return;
    slot.conflicts = slot.conflicts.filter((x) => x.id !== conflictId_);
    this.persistSlot(slot);
    this.emit();
  }

  /* ------------------------------ cross-tab ------------------------------ */

  /** Another tab wrote one of our keys. */
  onStorageKey(key: string | null) {
    if (key === null || key === GUEST_KEY) this.guestDoc = this.readGuest();
    if (this.slot && (key === null || key === accountKey(this.slot.userId))) {
      const fresh = this.readSlot(this.slot.userId);
      if (fresh) this.slot = { ...fresh, keepOnSignOut: this.slot.keepOnSignOut };
    }
    this.emit();
  }

  /* ------------------------------ sync cycle ------------------------------ */

  /** Try the cloud now (retry button, back online). */
  syncNow(): Promise<void> {
    if (!this.slot || !this.confirmed || !this.remote) return Promise.resolve();
    this.retryIndex = 0;
    return this.startCycle();
  }

  /** Resolves when no sync cycle is running (tests and diagnostics). */
  async whenIdle(): Promise<void> {
    while (this.inFlight) await this.inFlight;
  }

  /** Tab visible again: catch up if something is waiting or the last read is old. */
  refreshIfIdle(maxAgeMs = 60_000) {
    if (!this.slot || !this.confirmed || !this.remote || this.inFlight) return;
    const pending = pendingFields(this.slot.doc, this.slot.base).length;
    if (pending > 0 || this.cloud === "retrying" || this.cloud === "blocked" || this.now() - this.lastReadAt > maxAgeMs) {
      void this.syncNow();
    }
  }

  private scheduleSync(ms: number) {
    if (!this.slot || !this.remote) return;
    if (this.debounceHandle !== null) this.clearTimer(this.debounceHandle);
    const epoch = this.epoch;
    this.debounceHandle = this.setTimer(() => {
      this.debounceHandle = null;
      if (epoch === this.epoch) void this.startCycle();
    }, ms);
  }

  private cancelTimers() {
    if (this.debounceHandle !== null) this.clearTimer(this.debounceHandle);
    if (this.retryHandle !== null) this.clearTimer(this.retryHandle);
    this.debounceHandle = null;
    this.retryHandle = null;
  }

  private startCycle(): Promise<void> {
    if (this.inFlight) {
      this.runAgain = true;
      return this.inFlight;
    }
    const epoch = this.epoch;
    const run = this.runCycle(epoch).finally(() => {
      this.inFlight = null;
      if (this.runAgain && epoch === this.epoch) {
        this.runAgain = false;
        void this.startCycle();
      } else {
        this.runAgain = false;
      }
    });
    this.inFlight = run;
    return run;
  }

  private current(epoch: number, userId: string): boolean {
    return epoch === this.epoch && this.slot !== null && this.slot.userId === userId && this.confirmed;
  }

  private async runCycle(epoch: number): Promise<void> {
    const remote = this.remote;
    const slot0 = this.slot;
    if (!remote || !slot0 || !this.confirmed) return;
    const userId = slot0.userId;
    if (this.retryHandle !== null) {
      this.clearTimer(this.retryHandle);
      this.retryHandle = null;
    }

    for (let round = 0; round < MAX_CYCLE_ROUNDS; round++) {
      this.cloud = "saving";
      this.emit();

      const read = await remote.read(userId);
      if (!this.current(epoch, userId)) return;
      if (!read.ok) return this.failed(read);
      const row = read.value;
      this.readOnce = true;
      this.lastReadAt = this.now();

      if (row) this.foldRemote(row);
      this.considerGuestAnswers(row);

      const slot = this.slot!;
      const payload = slot.doc;
      if (row && slot.baseVersion === row.version && pendingFields(payload, slot.base).length === 0) {
        return this.succeeded();
      }
      if (!row && !isFilled(payload)) {
        // Nothing to store yet; the row is created with the first answer.
        slot.base = null;
        slot.baseVersion = null;
        return this.succeeded();
      }

      const write = row ? await remote.update(userId, payload, row.version) : await remote.create(userId, payload);
      if (!this.current(epoch, userId)) return;
      if (write.ok) {
        const s = this.slot!;
        s.base = payload;
        s.baseVersion = write.value;
        s.edits = Object.fromEntries(Object.entries(s.edits).filter(([k]) => !sameAnswer(s.doc[k], payload[k])));
        s.lastSyncedAt = this.now();
        this.persistSlot(s);
        if (pendingFields(s.doc, s.base).length > 0) {
          // More was typed while the write was in flight: save that too, on the
          // normal delay, rather than looping.
          this.lastError = null;
          this.nextRetryAt = null;
          this.retryIndex = 0;
          this.cloud = "saving";
          this.scheduleSync(this.debounceMs);
          this.emit();
          return;
        }
        return this.succeeded();
      }
      if (write.kind === "stale" || write.kind === "exists") continue; // another device wrote first
      return this.failed(write);
    }
    this.failed({ ok: false, kind: "unknown", message: "Your workbook kept changing on another device." });
  }

  /** Merge a cloud copy into this device's copy (rule 3 and 5). */
  private foldRemote(row: RemoteRow) {
    const slot = this.slot!;
    if (slot.baseVersion === row.version) return;
    const t = this.now();
    const { merged, conflicts } = mergeDocs(slot.base, slot.doc, row.data, {
      localEditTimes: slot.edits,
      remoteTime: parseVersionTime(row.version),
      now: t,
    });
    slot.doc = merged;
    if (conflicts.length) slot.conflicts = [...slot.conflicts, ...conflicts];
    slot.base = row.data;
    slot.baseVersion = row.version;
    const edits: Record<string, number> = {};
    for (const k of pendingFields(merged, row.data)) edits[k] = slot.edits[k] ?? t;
    slot.edits = edits;
    this.persistSlot(slot);
    this.emit();
  }

  /** Decide what happens to signed-out answers once the account's cloud state is known. */
  private considerGuestAnswers(row: RemoteRow | null) {
    const slot = this.slot!;
    const guest = this.guestDoc;
    const differing = Object.keys(guest).filter((k) => isFilled(guest[k]) && !sameAnswer(guest[k], slot.doc[k]));
    if (differing.length === 0) {
      this.guestAnswerCount = 0;
      // Every signed-out answer is already in this account (typically the
      // single shared copy an older version of the app kept). Nothing to lose.
      if (Object.keys(guest).some((k) => isFilled(guest[k]))) {
        this.guestDoc = {};
        this.clearGuestStorage();
      }
      return;
    }
    if (this.getGuestDecision(slot.userId) === fingerprint(guest)) {
      this.guestAnswerCount = 0;
      return;
    }
    const accountEmpty = !isFilled(slot.doc) && (!row || !isFilled(row.data));
    if (accountEmpty) {
      // A brand-new account: these are almost always the reader's own answers
      // from before they signed up (the free Audit, a first module). Add them,
      // and say so, with a way to hand them back on a shared device.
      const values: Doc = {};
      for (const k of differing) values[k] = guest[k];
      this.adoptGuestAnswers();
      this.slot!.adoptedGuest = { fields: differing, values, at: this.now() };
      this.persistSlot(this.slot!);
      return;
    }
    this.guestAnswerCount = differing.length;
  }

  private succeeded() {
    this.cloud = "synced";
    this.lastError = null;
    this.nextRetryAt = null;
    this.retryIndex = 0;
    this.emit();
  }

  private failed(f: RemoteFailure) {
    this.lastError = f.message;
    if (f.kind === "denied") {
      this.cloud = "blocked";
      this.nextRetryAt = null;
    } else {
      this.cloud = "retrying";
      const delay = this.retryDelays[Math.min(this.retryIndex, this.retryDelays.length - 1)];
      this.retryIndex += 1;
      this.nextRetryAt = this.now() + delay;
      const epoch = this.epoch;
      if (this.retryHandle !== null) this.clearTimer(this.retryHandle);
      this.retryHandle = this.setTimer(() => {
        this.retryHandle = null;
        if (epoch === this.epoch) void this.startCycle();
      }, delay);
    }
    this.emit();
  }

  /* ------------------------------- storage ------------------------------- */

  private getGuestDecision(userId: string): string | null {
    try {
      const map = parseDoc(this.storage.get(GUEST_DECISIONS_KEY)) ?? {};
      return typeof map[userId] === "string" ? (map[userId] as string) : null;
    } catch {
      return null;
    }
  }

  private setGuestDecision(userId: string, value: string | null) {
    try {
      const map = parseDoc(this.storage.get(GUEST_DECISIONS_KEY)) ?? {};
      if (value) map[userId] = value;
      else delete map[userId];
      this.storage.set(GUEST_DECISIONS_KEY, JSON.stringify(map));
    } catch {
      /* worst case the reader is asked again */
    }
  }

  private readGuest(): Doc {
    try {
      return parseDoc(this.storage.get(GUEST_KEY)) ?? {};
    } catch {
      return {};
    }
  }

  private persistGuest() {
    try {
      this.storage.set(GUEST_KEY, JSON.stringify(this.guestDoc));
      this.storage.set(GUEST_TS_KEY, String(this.now()));
      this.deviceSave = "ok";
    } catch {
      this.deviceSave = "failed";
    }
  }

  private clearGuestStorage() {
    try {
      this.storage.remove(GUEST_KEY);
      this.storage.remove(GUEST_TS_KEY);
    } catch {
      /* the in-memory copy is already cleared */
    }
  }

  private readSlot(userId: string): AccountSlot | null {
    try {
      const raw = this.storage.get(accountKey(userId));
      if (!raw) return null;
      const v = JSON.parse(raw) as AccountSlot;
      if (!v || v.v !== 2 || v.userId !== userId || !isPlainObject(v.doc)) return null;
      return {
        ...v,
        edits: isPlainObject(v.edits) ? (v.edits as Record<string, number>) : {},
        conflicts: Array.isArray(v.conflicts) ? v.conflicts : [],
      };
    } catch {
      return null;
    }
  }

  private persistSlot(slot: AccountSlot) {
    try {
      this.storage.set(accountKey(slot.userId), JSON.stringify(slot));
      this.deviceSave = "ok";
    } catch {
      this.deviceSave = "failed";
    }
    this.statusCache = null;
  }
}

/** An empty value of the same shape, so a cleared answer syncs as a change. */
function emptyLike(v: unknown): unknown {
  if (Array.isArray(v)) return [];
  if (isPlainObject(v)) return {};
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  return "";
}
