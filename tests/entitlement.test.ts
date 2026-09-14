/**
 * Purchase matching for /api/entitlement-sync (lib/entitlementMatch.ts).
 * Fixtures are synthetic; nothing here touches HighLevel or charges anyone.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isQualifyingPurchase, lookupPurchase, type GhlTransaction, type PageResult } from "../lib/entitlementMatch.ts";

const TOOLKIT_LINK = "696ec80453f21b434dfae38d"; // lib/links.ts TOOLKIT_PAYMENT_LINK_ID
const AUDIT_LINK = "696e9d90b112a056c6a3f6c5";
const toolkit = new Set([TOOLKIT_LINK]);
const EMAIL = "buyer@example.test";

const tx = (over: Partial<GhlTransaction> = {}): GhlTransaction => ({
  _id: "tx-1",
  amount: 247,
  status: "succeeded",
  liveMode: true,
  contactEmail: EMAIL,
  entitySourceId: TOOLKIT_LINK,
  createdAt: "2026-09-14T15:00:00.000Z",
  ...over,
});

test("a succeeded live Toolkit charge to the same email qualifies (email case-insensitive)", () => {
  assert.equal(isQualifyingPurchase(tx(), EMAIL, toolkit), true);
  assert.equal(isQualifyingPurchase(tx({ contactEmail: "Buyer@Example.TEST " }), EMAIL, toolkit), true);
});

test("test-mode, failed, refunded, and pending charges never qualify", () => {
  assert.equal(isQualifyingPurchase(tx({ liveMode: false }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ status: "failed" }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ status: "refunded" }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ status: "pending" }), EMAIL, toolkit), false);
});

test("another product's payment link or another email never qualifies", () => {
  assert.equal(isQualifyingPurchase(tx({ entitySourceId: AUDIT_LINK }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ entitySourceId: undefined }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ contactEmail: "someone.else@example.test" }), EMAIL, toolkit), false);
  assert.equal(isQualifyingPurchase(tx({ contactEmail: null }), EMAIL, toolkit), false);
});

/** A paged transaction list, newest first, like /payments/transactions. */
function pages(rows: GhlTransaction[], opts: { failAtOffset?: number } = {}) {
  const calls: number[] = [];
  const fetchPage = async (offset: number, limit: number): Promise<PageResult> => {
    calls.push(offset);
    if (opts.failAtOffset === offset) return { ok: false, reason: "lookup-http-503" };
    return { ok: true, rows: rows.slice(offset, offset + limit) };
  };
  return { fetchPage, calls };
}

const filler = (n: number) =>
  Array.from({ length: n }, (_, i) => tx({ _id: `other-${i}`, contactEmail: `other${i}@example.test` }));

test("an older purchase beyond the first page of transactions is found", async () => {
  const rows = [...filler(130), tx({ _id: "the-purchase" })];
  const { fetchPage, calls } = pages(rows);
  const result = await lookupPurchase(fetchPage, EMAIL, toolkit, { pageSize: 100 });
  assert.equal(result.status, "found");
  assert.equal(result.status === "found" && result.transaction._id, "the-purchase");
  assert.deepEqual(calls, [0, 100]);
});

test("looking everywhere without a match is 'not-found'; failing to look is 'unavailable'", async () => {
  const none = pages(filler(150));
  assert.equal((await lookupPurchase(none.fetchPage, EMAIL, toolkit, { pageSize: 100 })).status, "not-found");

  const broken = pages([...filler(130), tx()], { failAtOffset: 100 });
  const result = await lookupPurchase(broken.fetchPage, EMAIL, toolkit, { pageSize: 100 });
  assert.equal(result.status, "unavailable");
});

test("the page cap reports 'unavailable', never 'not-found'", async () => {
  const many = pages([...filler(1000), tx()]);
  const result = await lookupPurchase(many.fetchPage, EMAIL, toolkit, { pageSize: 100, maxPages: 3 });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(many.calls, [0, 100, 200]);
});
