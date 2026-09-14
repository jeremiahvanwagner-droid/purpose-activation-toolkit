/**
 * Regression tests for workbook saving and sync (lib/sync/workbookSync.ts).
 *
 * Each "reproduced" case below was first reproduced against the reviewed
 * revision (5eba60b) in a real browser with tests/harness/mock-supabase.mjs;
 * the comment names what the old code did. Synthetic answers only.
 *
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WorkbookSync,
  accountKey,
  describeStatus,
  type Doc,
  type KeyValueStore,
  type RemoteResult,
  type WorkbookRemote,
} from "../lib/sync/workbookSync.ts";

const ONE = { id: "11111111-1111-4111-8111-111111111111", email: "reader.one@example.test" };
const TWO = { id: "22222222-2222-4222-8222-222222222222", email: "reader.two@example.test" };

const clock = { t: Date.parse("2026-09-14T15:00:00Z") };
const advance = (ms = 1000) => (clock.t += ms);
const tick = () => new Promise((r) => setImmediate(r));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  failWrites = false;
  get(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  set(key: string, value: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.map.set(key, value);
  }
  remove(key: string) {
    this.map.delete(key);
  }
}

/** One cloud table shared by every simulated device. */
class FakeCloud {
  rows = new Map<string, { data: Doc; version: string }>();
  failReads = 0; // -1 = until reset
  failWrites = 0;
  log: string[] = [];
  beforeUpdate: ((userId: string) => void) | null = null;
  private seq = 0;
  private readGate: Promise<void> | null = null;

  stamp(): string {
    this.seq += 1;
    const ms = clock.t;
    return new Date(ms).toISOString().slice(0, 19) + "." + String((ms % 1000) * 1000 + this.seq).padStart(6, "0") + "+00:00";
  }

  writeAs(userId: string, data: Doc) {
    this.rows.set(userId, { data: clone(data), version: this.stamp() });
  }

  holdReads(): () => void {
    let release!: () => void;
    this.readGate = new Promise((r) => (release = r));
    return () => {
      this.readGate = null;
      release();
    };
  }

  private consume(kind: "failReads" | "failWrites"): boolean {
    const n = this[kind];
    if (n === 0) return false;
    if (n > 0) this[kind] = n - 1;
    return true;
  }

  remote(): WorkbookRemote {
    const fail = (message: string): RemoteResult<never> => ({ ok: false, kind: "network", message });
    return {
      read: async (userId) => {
        this.log.push(`read ${userId}`);
        if (this.readGate) await this.readGate;
        await tick();
        if (this.consume("failReads")) return fail("read failed");
        const row = this.rows.get(userId);
        return { ok: true, value: row ? { data: clone(row.data), version: row.version } : null };
      },
      create: async (userId, data) => {
        this.log.push(`create ${userId}`);
        await tick();
        if (this.consume("failWrites")) return fail("write failed");
        if (this.rows.has(userId)) return { ok: false, kind: "exists", message: "row exists" };
        const version = this.stamp();
        this.rows.set(userId, { data: clone(data), version });
        return { ok: true, value: version };
      },
      update: async (userId, data, expected) => {
        this.log.push(`update ${userId}`);
        await tick();
        if (this.consume("failWrites")) return fail("write failed");
        this.beforeUpdate?.(userId);
        const row = this.rows.get(userId);
        if (!row || row.version !== expected) return { ok: false, kind: "stale", message: "stale" };
        const version = this.stamp();
        this.rows.set(userId, { data: clone(data), version });
        return { ok: true, value: version };
      },
    };
  }
}

/** A browser: its own storage and timers, the shared cloud. */
function device(cloud: FakeCloud, store = new MemoryStore()) {
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let id = 0;
  const sync = new WorkbookSync({
    storage: store,
    remote: cloud.remote(),
    now: () => clock.t,
    debounceMs: 5,
    retryDelaysMs: [60_000],
    setTimer: (fn, ms) => {
      id += 1;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimer: (h) => {
      timers.delete(h as number);
    },
  });
  return {
    sync,
    store,
    /** Run scheduled saves (not retries) until the device is quiet. */
    async settle() {
      for (let i = 0; i < 10; i++) {
        await sync.whenIdle();
        const due = [...timers.entries()].filter(([, t]) => t.ms < 1000);
        if (due.length === 0) break;
        for (const [h] of due) timers.delete(h);
        for (const [, t] of due) t.fn();
        await tick();
      }
      await sync.whenIdle();
    },
  };
}

const cloudData = (cloud: FakeCloud, user = ONE) => cloud.rows.get(user.id)?.data ?? {};

/* ------------------------------------------------------------------ */

test("reproduced: a failed cloud write is reported as unsynced, kept, and survives a reload", async () => {
  // Old code: "Synced" stayed on screen; the next reload adopted the empty
  // cloud copy and erased the only copy of the answer.
  const cloud = new FakeCloud();
  const store = new MemoryStore();
  let d = device(cloud, store);
  d.sync.setAccount(ONE, "initial");
  await d.settle();

  cloud.failWrites = -1;
  d.sync.setField("pa.s1.here", "written while the cloud refuses writes");
  await d.settle();

  const status = d.sync.getStatus();
  assert.equal(status.cloud, "retrying");
  assert.equal(status.pending, 1);
  assert.equal(describeStatus(status).text, "Saved on this device · not synced yet");

  d = device(cloud, store); // reload, cloud still refusing writes
  d.sync.setAccount(ONE, "initial");
  await d.settle();
  assert.equal(d.sync.getDoc()["pa.s1.here"], "written while the cloud refuses writes");

  cloud.failWrites = 0;
  await d.sync.syncNow();
  assert.equal(cloudData(cloud)["pa.s1.here"], "written while the cloud refuses writes");
  assert.equal(describeStatus(d.sync.getStatus()).text, "Synced to your account");
});

test("reproduced: a failed read on a new device never writes over the cloud copy", async () => {
  // Old code: the failed select looked like "no row", so the empty device
  // copy was upserted over the saved workbook.
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.s1.here": "saved from another device", "pa.s1.misaligned": "also saved" });
  cloud.failReads = -1;

  const d = device(cloud);
  d.sync.setAccount(ONE, "initial");
  await d.settle();

  assert.deepEqual(cloudData(cloud), { "pa.s1.here": "saved from another device", "pa.s1.misaligned": "also saved" });
  assert.equal(cloud.log.filter((l) => l.startsWith("create") || l.startsWith("update")).length, 0);
  assert.equal(d.sync.getStatus().cloud, "retrying");

  cloud.failReads = 0;
  await d.sync.syncNow();
  assert.equal(d.sync.getDoc()["pa.s1.here"], "saved from another device");
});

test("reproduced: reloading before the delayed save keeps what was just typed", async () => {
  // Old code: the reload's sign-in pull replaced the device copy with the
  // older cloud copy before the 1.2 s push had run.
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.s1.misaligned": "an earlier answer" });
  const store = new MemoryStore();
  let d = device(cloud, store);
  d.sync.setAccount(ONE, "initial");
  await d.settle();

  advance();
  d.sync.setField("pa.s1.here", "typed, then reloaded at once"); // no settle: the save hasn't run
  d = device(cloud, store);
  d.sync.setAccount(ONE, "initial");
  await d.settle();

  assert.equal(d.sync.getDoc()["pa.s1.here"], "typed, then reloaded at once");
  assert.deepEqual(cloudData(cloud), {
    "pa.s1.misaligned": "an earlier answer",
    "pa.s1.here": "typed, then reloaded at once",
  });
});

test("a token refresh neither re-reads nor replaces what is on screen", async () => {
  const cloud = new FakeCloud();
  const d = device(cloud);
  d.sync.setAccount(ONE, "initial");
  await d.settle();
  const reads = cloud.log.filter((l) => l.startsWith("read")).length;

  d.sync.setAccount(ONE, "token-refreshed");
  await d.settle();
  assert.equal(cloud.log.filter((l) => l.startsWith("read")).length, reads);

  d.sync.setField("pa.s1.here", "typed just before the refresh");
  d.sync.setAccount(ONE, "token-refreshed");
  await d.settle();
  assert.equal(d.sync.getDoc()["pa.s1.here"], "typed just before the refresh");
  assert.equal(cloudData(cloud)["pa.s1.here"], "typed just before the refresh");
});

test("reproduced: two devices answering different questions both keep their answers", async () => {
  // Old code: the second device's whole-document write erased the first
  // device's answer from the cloud, and the first device's next reload
  // erased it there too.
  const cloud = new FakeCloud();
  const a = device(cloud);
  const b = device(cloud);
  a.sync.setAccount(ONE, "initial");
  b.sync.setAccount(ONE, "initial");
  await a.settle();
  await b.settle();

  advance();
  a.sync.setField("pa.s1.here", "device A's answer");
  await a.settle();
  advance();
  b.sync.setField("pa.s1.misaligned", "device B's answer");
  await b.settle();

  assert.deepEqual(cloudData(cloud), { "pa.s1.here": "device A's answer", "pa.s1.misaligned": "device B's answer" });
  await a.sync.syncNow();
  assert.equal(a.sync.getDoc()["pa.s1.misaligned"], "device B's answer");
  assert.equal(a.sync.getDoc()["pa.s1.here"], "device A's answer");
});

test("the same answer changed on two devices: the newer edit is kept and the other is saved for review", async () => {
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.stmt.working": "original statement" });
  const a = device(cloud);
  const b = device(cloud);
  a.sync.setAccount(ONE, "initial");
  b.sync.setAccount(ONE, "initial");
  await a.settle();
  await b.settle();

  advance();
  a.sync.setField("pa.stmt.working", "device A's rewrite");
  await a.settle(); // cloud written at this time
  advance();
  b.sync.setField("pa.stmt.working", "device B's later rewrite");
  await b.settle();

  // B's edit is newer than A's cloud write, so B's version is kept...
  assert.equal(cloudData(cloud)["pa.stmt.working"], "device B's later rewrite");
  const conflicts = b.sync.getStatus().conflicts;
  assert.equal(conflicts.length, 1);
  // ...and A's version is kept too, on review.
  assert.equal(conflicts[0].other, "device A's rewrite");
  assert.equal(conflicts[0].otherFrom, "another-device");

  // The reader can put the other version back; it syncs like any edit.
  advance();
  b.sync.useOtherVersion(conflicts[0].id);
  await b.settle();
  assert.equal(cloudData(cloud)["pa.stmt.working"], "device A's rewrite");
  assert.equal(b.sync.getStatus().conflicts[0].other, "device B's later rewrite");
});

test("an older offline edit does not silently replace a newer cloud version", async () => {
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.s1.here": "original" });
  const a = device(cloud);
  const b = device(cloud);
  a.sync.setAccount(ONE, "initial");
  b.sync.setAccount(ONE, "initial");
  await a.settle();
  await b.settle();

  advance();
  cloud.failWrites = 1;
  a.sync.setField("pa.s1.here", "A, edited offline"); // A's write fails; stays pending
  await a.settle();
  advance();
  b.sync.setField("pa.s1.here", "B, edited later and saved");
  await b.settle();

  advance();
  await a.sync.syncNow();
  assert.equal(cloudData(cloud)["pa.s1.here"], "B, edited later and saved");
  const [c] = a.sync.getStatus().conflicts;
  assert.equal(c.other, "A, edited offline");
  assert.equal(c.otherFrom, "this-device");
});

test("a write racing another device re-reads and merges instead of overwriting", async () => {
  const cloud = new FakeCloud();
  const d = device(cloud);
  d.sync.setAccount(ONE, "initial");
  await d.settle();
  d.sync.setField("pa.s1.misaligned", "first answer");
  await d.settle();

  let raced = false;
  cloud.beforeUpdate = (userId) => {
    if (raced) return;
    raced = true;
    cloud.writeAs(userId, { ...cloudData(cloud), "pa.s2.reflect": "written by another device mid-save" });
  };
  advance();
  d.sync.setField("pa.s1.here", "second answer");
  await d.settle();

  assert.deepEqual(cloudData(cloud), {
    "pa.s1.misaligned": "first answer",
    "pa.s2.reflect": "written by another device mid-save",
    "pa.s1.here": "second answer",
  });
  assert.ok(cloud.log.filter((l) => l.startsWith("update")).length >= 2);
});

test("reproduced: signing out with unsynced answers keeps them out of view until that account returns", async () => {
  // Old code: sign-out wiped the only copy, with no warning.
  const cloud = new FakeCloud();
  const store = new MemoryStore();
  const d = device(cloud, store);
  d.sync.setAccount(ONE, "initial");
  await d.settle();

  cloud.failWrites = -1;
  d.sync.setField("pa.s1.here", "unsynced, then signed out");
  await d.settle();
  assert.deepEqual(d.sync.unsavedOnSignOut(), { pending: 1, conflicts: 0 });

  d.sync.setAccount(null, "signed-out");
  assert.equal(d.sync.getStatus().scope, "guest");
  assert.equal(d.sync.getDoc()["pa.s1.here"], undefined);
  assert.ok(store.get(accountKey(ONE.id)), "the account's device copy is kept");

  d.sync.setAccount(TWO, "signed-in"); // someone else on the same browser
  await d.settle();
  assert.equal(d.sync.getDoc()["pa.s1.here"], undefined);
  d.sync.setAccount(null, "signed-out");

  cloud.failWrites = 0;
  d.sync.setAccount(ONE, "signed-in");
  await d.settle();
  assert.equal(d.sync.getDoc()["pa.s1.here"], "unsynced, then signed out");
  assert.equal(cloudData(cloud)["pa.s1.here"], "unsynced, then signed out");
});

test("signing out with everything synced removes the account's device copy", async () => {
  const cloud = new FakeCloud();
  const store = new MemoryStore();
  const d = device(cloud, store);
  d.sync.setAccount(ONE, "initial");
  await d.settle();
  d.sync.setField("pa.s1.here", "synced answer");
  await d.settle();
  assert.equal(d.sync.getStatus().pending, 0);

  d.sync.setAccount(null, "signed-out");
  assert.equal(store.get(accountKey(ONE.id)), null);
  assert.equal(d.sync.getDoc()["pa.s1.here"], undefined);
});

test("reproduced: answers written before signing in are not discarded when the account already has work", async () => {
  // Old code: the account's cloud copy replaced them at sign-in.
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.s1.misaligned": "already in the account" });
  const store = new MemoryStore();
  const d = device(cloud, store);
  d.sync.setField("pa.s1.here", "written while signed out"); // guest

  d.sync.setAccount(ONE, "signed-in");
  await d.settle();
  assert.equal(d.sync.getStatus().guestAnswers, 1, "the reader is asked");
  assert.equal(cloudData(cloud)["pa.s1.here"], undefined, "nothing is added without asking");

  d.sync.keepGuestAnswersSeparate();
  d.sync.setAccount(null, "signed-out");
  assert.equal(d.sync.getDoc()["pa.s1.here"], "written while signed out", "kept separate, still there");

  d.sync.setAccount(ONE, "signed-in");
  await d.settle();
  assert.equal(d.sync.getStatus().guestAnswers, 0, "not asked again for the same answers");
  d.sync.adoptGuestAnswers();
  await d.settle();
  assert.equal(cloudData(cloud)["pa.s1.here"], "written while signed out");
  assert.equal(cloudData(cloud)["pa.s1.misaligned"], "already in the account");
});

test("a brand-new account takes the answers written before signing up, with a way to hand them back", async () => {
  const cloud = new FakeCloud();
  const d = device(cloud);
  d.sync.setField("iaa.body.q1", 4); // e.g. the free Audit, taken signed out
  d.sync.setField("pa.s1.here", "my first answer");

  d.sync.setAccount(ONE, "signed-in");
  await d.settle();
  assert.equal(d.sync.getStatus().adoptedGuestAnswers, 2);
  assert.equal(cloudData(cloud)["pa.s1.here"], "my first answer");

  advance();
  d.sync.returnAdoptedAnswers();
  await d.settle();
  assert.equal(cloudData(cloud)["pa.s1.here"], "");
  d.sync.setAccount(null, "signed-out");
  assert.equal(d.sync.getDoc()["pa.s1.here"], "my first answer");
});

test("a late cloud response for a previous account is never applied to the next account", async () => {
  const cloud = new FakeCloud();
  cloud.writeAs(ONE.id, { "pa.s1.here": "reader one's answer" });
  const d = device(cloud);

  const release = cloud.holdReads();
  d.sync.setAccount(ONE, "initial");
  const settling = d.settle(); // reader one's read is now waiting
  await tick();
  d.sync.setAccount(null, "signed-out");
  d.sync.setAccount(TWO, "signed-in");
  release();
  await settling;
  await d.settle();

  assert.equal(d.sync.getDoc()["pa.s1.here"], undefined);
  assert.equal(cloudData(cloud, TWO)["pa.s1.here"], undefined);
  assert.equal(cloudData(cloud, ONE)["pa.s1.here"], "reader one's answer");
});

test("a cloud copy that lost its answers is restored from the device, not emptied onto it", async () => {
  const cloud = new FakeCloud();
  const d = device(cloud);
  d.sync.setAccount(ONE, "initial");
  await d.settle();
  d.sync.setField("pa.s1.here", "an answer worth keeping");
  await d.settle();

  advance();
  cloud.writeAs(ONE.id, {}); // e.g. an older client writing an empty workbook
  await d.sync.syncNow();

  assert.equal(d.sync.getDoc()["pa.s1.here"], "an answer worth keeping");
  assert.equal(cloudData(cloud)["pa.s1.here"], "an answer worth keeping");
});

test("storage the browser refuses is reported, never labelled saved", async () => {
  const cloud = new FakeCloud();
  const store = new MemoryStore();
  store.failWrites = true;
  const d = device(cloud, store);
  d.sync.setField("pa.s1.here", "cannot be stored");
  const described = describeStatus(d.sync.getStatus());
  assert.equal(described.tone, "error");
  assert.doesNotMatch(described.text, /^Saved/);
});
