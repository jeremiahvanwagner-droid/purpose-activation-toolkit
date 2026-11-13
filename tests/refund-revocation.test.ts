// Refund revocation (approved Nov 13, 2026): a full refund of a Toolkit charge
// revokes access, by Stripe webhook or by the HighLevel recheck at sign-in.
// Rows are marked revoked, never deleted. Complimentary rows are never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { decideAccess } from "../lib/access/decide.ts";
import { handleEntitlementSync, reconcileEntitlement } from "../lib/access/entitlementSync.ts";
import { handleStripeToolkitRefund } from "../lib/access/stripeRefund.ts";
import type { GhlTransaction } from "../lib/entitlementMatch.ts";

const SUPA = "https://supabase.test";
const EMAIL = "buyer@example.test";
const TOOLKIT_LINK = "696ec80453f21b434dfae38d";
const AUDIT_LINK = "696e9d90b112a056c6a3f6c5";
const LOC = "loc-test";
const SECRET = "whsec_test_only_not_a_real_secret";
const TOOLKIT = "purpose-activation-toolkit";

function installEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = LOC;
  process.env.STRIPE_WEBHOOK_SECRET_TOOLKIT = SECRET;
}

type Row = {
  email: string;
  product_id: string;
  source: string;
  purchased_at: string | null;
  gross_amount?: number | null;
  contact_id: string | null;
  raw: Record<string, unknown>;
  revoked_at: string | null;
  revoked_reason: string | null;
};

type Tx = GhlTransaction & { chargeId?: string; entityId?: string; altId?: string };

function tx(over: Partial<Tx> = {}): Tx {
  return {
    _id: "ghl-tx-1",
    altId: LOC,
    amount: 247,
    status: "succeeded",
    liveMode: true,
    contactId: "contact-1",
    contactEmail: EMAIL,
    entitySourceId: TOOLKIT_LINK,
    entitySourceName: "Purpose Activation Toolkit",
    entityId: "order-1",
    chargeId: "pi_1",
    createdAt: "2026-11-13T15:00:00.000Z",
    ...over,
  };
}

function paidRow(over: Partial<Row> = {}): Row {
  return {
    email: EMAIL,
    product_id: TOOLKIT,
    source: "ghl-payments-sync",
    purchased_at: "2026-11-13T15:00:00.000Z",
    gross_amount: 247,
    contact_id: "contact-1",
    raw: { transaction_id: "ghl-tx-1" },
    revoked_at: null,
    revoked_reason: null,
    ...over,
  };
}

/** A small PostgREST + HighLevel double that applies the filters the code sends. */
function world(init: { rows?: Row[]; txs?: Tx[]; ghlDown?: boolean; tagFails?: boolean } = {}) {
  const rows: Row[] = init.rows ?? [];
  const txs: Tx[] = init.txs ?? [];
  const calls: { method: string; url: string; body?: string }[] = [];
  const tagDeletes: { contactId: string; tags: string[] }[] = [];

  const matches = (row: Row, params: URLSearchParams) => {
    for (const [key, value] of params) {
      if (["select", "on_conflict"].includes(key)) continue;
      if (key === "email" && value !== `eq.${row.email}`) return false;
      if (key === "product_id" && value !== `eq.${row.product_id}`) return false;
      if (key === "raw->>transaction_id" && value !== `eq.${String(row.raw.transaction_id ?? "")}`) return false;
      if (key === "revoked_at" && value === "is.null" && row.revoked_at !== null) return false;
      if (key === "revoked_at" && value === "not.is.null" && row.revoked_at === null) return false;
      if (key === "or") {
        assert.equal(value, '(source.eq.ghl-payments-sync,source.like."ghl:*")');
        if (!(row.source === "ghl-payments-sync" || row.source.startsWith("ghl:"))) return false;
      }
    }
    return true;
  };

  const fetchImpl: typeof fetch = async (input, reqInit) => {
    const url = new URL(String(input));
    const method = reqInit?.method ?? "GET";
    const body = typeof reqInit?.body === "string" ? reqInit.body : undefined;
    calls.push({ method, url: url.toString(), body });

    if (url.host === "supabase.test" && url.pathname === "/auth/v1/user") {
      return new Response(JSON.stringify({ email: "Buyer@Example.TEST" }), { status: 200 });
    }
    if (url.host === "supabase.test" && url.pathname === "/rest/v1/entitlements") {
      const params = url.searchParams;
      if (method === "GET") {
        return new Response(JSON.stringify(rows.filter((r) => matches(r, params))), { status: 200 });
      }
      if (method === "PATCH") {
        const patch = JSON.parse(body!);
        const hit = rows.filter((r) => matches(r, params));
        for (const r of hit) Object.assign(r, patch);
        return new Response(JSON.stringify(hit), { status: 200 });
      }
      if (method === "POST") {
        const prefer = new Headers(reqInit?.headers).get("Prefer") ?? "";
        assert.match(prefer, /ignore-duplicates/);
        const incoming = JSON.parse(body!);
        if (!rows.some((r) => r.email === incoming.email && r.product_id === incoming.product_id)) {
          rows.push({ revoked_at: null, revoked_reason: null, contact_id: null, raw: {}, ...incoming });
        }
        return new Response(null, { status: 201 });
      }
      if (method === "DELETE") throw new Error("entitlement rows must never be deleted");
    }
    if (url.host === "services.leadconnectorhq.com" && url.pathname === "/payments/transactions") {
      if (init.ghlDown) return new Response("down", { status: 503 });
      let data = txs;
      const entityId = url.searchParams.get("entityId");
      if (entityId) data = data.filter((t) => t.entityId === entityId);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return new Response(JSON.stringify({ data: offset === 0 ? data : [] }), { status: 200 });
    }
    const tagPath = url.pathname.match(/^\/contacts\/([^/]+)\/tags$/);
    if (url.host === "services.leadconnectorhq.com" && tagPath && method === "DELETE") {
      tagDeletes.push({ contactId: decodeURIComponent(tagPath[1]), tags: JSON.parse(body!).tags });
      return new Response(JSON.stringify({ tags: [] }), { status: init.tagFails ? 403 : 200 });
    }
    throw new Error(`unexpected network: ${method} ${url}`);
  };
  return { rows, txs, calls, tagDeletes, fetchImpl };
}

function charge(over: Record<string, unknown> = {}) {
  return {
    id: "ch_1",
    object: "charge",
    amount: 24700,
    amount_refunded: 24700,
    refunded: true,
    livemode: true,
    payment_intent: "pi_1",
    metadata: { altId: LOC, altType: "location", contactId: "contact-1", orderId: "order-1" },
    ...over,
  };
}

function signed(event: unknown, secret = SECRET, at = Math.floor(Date.now() / 1000)) {
  const payload = JSON.stringify(event);
  const sig = createHmac("sha256", secret).update(`${at}.${payload}`).digest("hex");
  return new Request("https://app.test/api/stripe/toolkit-refund", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${at},v1=${sig}` },
    body: payload,
  });
}

const refundEvent = (c = charge()) => ({ id: "evt_1", type: "charge.refunded", data: { object: c } });

// ---------------------------------------------------------------- decide

test("decide: a revoked row denies, except for a different qualifying purchase", () => {
  const revoked = { source: "ghl-payments-sync", purchased_at: null, transaction_id: "ghl-tx-1", revoked_at: "2026-11-13T16:00:00Z" };
  assert.deepEqual(decideAccess(revoked, null), { action: "deny", reason: "revoked" });
  assert.deepEqual(decideAccess(revoked, { status: "unavailable", reason: "x", pagesRead: 0 }), { action: "deny", reason: "revoked" });
  assert.deepEqual(decideAccess(revoked, { status: "not-found", pagesRead: 1 }), { action: "deny", reason: "revoked" });
  // HighLevel still says the refunded charge succeeded (lag): still denied.
  assert.deepEqual(decideAccess(revoked, { status: "found", transaction: tx(), pagesRead: 1 }), { action: "deny", reason: "revoked" });
  assert.equal(decideAccess(revoked, { status: "found", transaction: tx({ _id: "ghl-tx-2" }), pagesRead: 1 }).action, "regrant");
});

test("decide: only a refund of the stored charge revokes; comps are never revoked", () => {
  const row = { source: "ghl-payments-sync", purchased_at: null, transaction_id: "ghl-tx-1" };
  const refundOf = (id: string) => ({ status: "refund-observed" as const, transaction: tx({ _id: id, status: "refunded" }), pagesRead: 1 });
  assert.equal(decideAccess(row, refundOf("ghl-tx-1")).action, "revoke");
  assert.equal(decideAccess(row, refundOf("ghl-tx-9")).action, "keep");
  assert.equal(decideAccess({ ...row, transaction_id: null }, refundOf("ghl-tx-1")).action, "keep");
  for (const source of ["owner-complimentary", "complimentary", "manual:coaching-bonus"]) {
    assert.deepEqual(decideAccess({ ...row, source }, refundOf("ghl-tx-1")), { action: "keep", access: "preserved" });
  }
});

// ---------------------------------------------------------------- sign-in recheck

test("sign-in recheck: HighLevel shows the stored charge refunded -> row revoked, tag removed, access denied", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx({ status: "refunded" })] });
  const res = await handleEntitlementSync(
    new Request("https://app.test/api/entitlement-sync", { method: "POST", headers: { Authorization: "Bearer t" } }),
    w.fetchImpl
  );
  const body = await res.json();
  assert.equal(body.entitled, false);
  assert.equal(body.checked, true);
  assert.equal(body.reason, "not-found"); // the reader sees the existing "no purchase" state; no new copy
  assert.equal(body.revoked, true);
  assert.equal(w.rows.length, 1);
  assert.ok(w.rows[0].revoked_at);
  assert.equal(w.rows[0].revoked_reason, "ghl:refunded:ghl-tx-1");
  assert.deepEqual(w.tagDeletes, [{ contactId: "contact-1", tags: ["toolkit-buyer"] }]);

  // Next visit: still denied, no second write, no grant.
  w.calls.length = 0;
  const again = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(again.entitled, false);
  assert.equal(again.revoked, true);
  assert.equal(w.calls.some((c) => c.method === "POST" || c.method === "PATCH"), false);
});

test("sign-in recheck: a refund on another product keeps the earlier behaviour (no revoke)", async () => {
  installEnv();
  const w = world({
    rows: [paidRow({ product_id: "inner-alignment-audit" })],
    txs: [tx({ status: "refunded", entitySourceId: AUDIT_LINK })],
  });
  const body = await reconcileEntitlement(EMAIL, "inner-alignment-audit", w.fetchImpl);
  assert.equal(body.entitled, true);
  assert.equal(w.rows[0].revoked_at, null);
  assert.equal(w.calls.some((c) => c.method === "PATCH"), false);
  assert.equal(w.tagDeletes.length, 0);
});

test("sign-in recheck: a partial refund (HighLevel status not 'refunded') keeps access", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx({ status: "partially_refunded" })] });
  const body = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(body.entitled, true);
  assert.equal(w.rows[0].revoked_at, null);
});

test("sign-in sync never grants a refunded payment, even while HighLevel still says succeeded", async () => {
  installEnv();
  // Stripe webhook already wrote a revoked placeholder; HighLevel lags.
  const w = world({ rows: [paidRow({ revoked_at: "2026-11-13T16:00:00Z", revoked_reason: "stripe:charge.refunded:ch_1" })], txs: [tx()] });
  const body = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(body.entitled, false);
  assert.equal(body.revoked, true);
  assert.equal(w.calls.some((c) => c.method === "POST" || c.method === "PATCH"), false);
  assert.ok(w.rows[0].revoked_at);
});

test("a genuine re-buy after a refund reopens the same row on the new charge", async () => {
  installEnv();
  const w = world({
    rows: [paidRow({ revoked_at: "2026-11-13T16:00:00Z", revoked_reason: "stripe:charge.refunded:ch_1" })],
    txs: [tx({ _id: "ghl-tx-2", entityId: "order-2", chargeId: "pi_2" }), tx({ status: "refunded" })],
  });
  const body = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(body.entitled, true);
  assert.equal(w.rows.length, 1);
  assert.equal(w.rows[0].revoked_at, null);
  assert.equal(w.rows[0].raw.transaction_id, "ghl-tx-2");
});

test("complimentary rows are kept and never looked up or written", async () => {
  installEnv();
  const w = world({ rows: [paidRow({ source: "owner-complimentary", raw: {}, contact_id: null })], txs: [tx({ status: "refunded" })] });
  const body = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(body.entitled, true);
  assert.equal(body.access, "preserved");
  assert.equal(w.calls.some((c) => c.url.includes("leadconnectorhq") || c.method !== "GET"), false);
});

// ---------------------------------------------------------------- Stripe webhook

test("webhook: not configured -> 503; missing or bad signature -> 400; nothing written", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx({ status: "refunded" })] });
  delete process.env.STRIPE_WEBHOOK_SECRET_TOOLKIT;
  assert.equal((await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl)).status, 503);
  installEnv();
  const unsigned = new Request("https://app.test/x", { method: "POST", body: JSON.stringify(refundEvent()) });
  assert.equal((await handleStripeToolkitRefund(unsigned, w.fetchImpl)).status, 400);
  assert.equal((await handleStripeToolkitRefund(signed(refundEvent(), "whsec_wrong"), w.fetchImpl)).status, 400);
  const stale = signed(refundEvent(), SECRET, Math.floor(Date.now() / 1000) - 3600);
  assert.equal((await handleStripeToolkitRefund(stale, w.fetchImpl)).status, 400);
  assert.equal(w.calls.length, 0);
  assert.equal(w.rows[0].revoked_at, null);
});

test("webhook: full refund of a Toolkit charge revokes the row and removes the tag; a retry is idempotent", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx() /* HighLevel not yet updated */] });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, action: "revoked", tag: "removed" });
  assert.ok(w.rows[0].revoked_at);
  assert.equal(w.rows[0].revoked_reason, "stripe:charge.refunded:ch_1");
  assert.deepEqual(w.tagDeletes, [{ contactId: "contact-1", tags: ["toolkit-buyer"] }]);
  const lookup = w.calls.find((c) => c.url.includes("/payments/transactions"))!;
  const q = new URL(lookup.url).searchParams;
  assert.equal(q.get("entityId"), "order-1");
  assert.equal(q.get("altId"), LOC);
  assert.equal(q.get("paymentMode"), "live");

  const firstRevokedAt = w.rows[0].revoked_at;
  const retry = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.equal((await retry.json()).action, "already-revoked");
  assert.equal(w.rows[0].revoked_at, firstRevokedAt);

  // And the app denies access afterwards.
  const access = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(access.entitled, false);
});

test("webhook: buyer never signed in -> revoked placeholder blocks a later sign-in grant", async () => {
  installEnv();
  const w = world({ rows: [], txs: [tx()] });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.equal((await res.json()).action, "tombstoned");
  assert.equal(w.rows.length, 1);
  assert.equal(w.rows[0].source, "ghl-payments-sync");
  assert.equal(w.rows[0].raw.transaction_id, "ghl-tx-1");
  assert.equal(w.rows[0].raw.written_by, "refund-revocation");
  assert.ok(w.rows[0].revoked_at);
  assert.equal(w.tagDeletes.length, 1);

  const access = await reconcileEntitlement(EMAIL, TOOLKIT, w.fetchImpl);
  assert.equal(access.entitled, false);
  assert.equal(w.rows.length, 1);
  assert.ok(w.rows[0].revoked_at);
});

test("webhook: partial refund is logged only", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx()] });
  const res = await handleStripeToolkitRefund(signed(refundEvent(charge({ amount_refunded: 10000, refunded: false }))), w.fetchImpl);
  assert.deepEqual(await res.json(), { ok: true, action: "partial-refund-logged" });
  assert.equal(w.rows[0].revoked_at, null);
  assert.equal(w.tagDeletes.length, 0);
});

test("webhook: a complimentary row for the same email is untouched and keeps its tag", async () => {
  installEnv();
  const w = world({ rows: [paidRow({ source: "owner-complimentary", raw: {} })], txs: [tx()] });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.deepEqual(await res.json(), { ok: true, action: "kept-other-access", tag: "skipped" });
  assert.equal(w.rows[0].revoked_at, null);
  assert.equal(w.rows[0].source, "owner-complimentary");
  assert.equal(w.tagDeletes.length, 0);
});

test("webhook: ignores other events, test mode, other locations and non-Toolkit charges", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx({ entitySourceId: AUDIT_LINK })] });
  const cases: [unknown, string][] = [
    [{ id: "evt_2", type: "charge.succeeded", data: { object: charge() } }, "charge.succeeded"],
    [refundEvent(charge({ livemode: false })), "test-mode"],
    [refundEvent(charge({ metadata: { altId: "ZEvV4Nv7X9PlyDulcp22", orderId: "order-1" } })), "other-location"],
    [refundEvent(charge({ metadata: { description: "Manual Recharge for Location Wallet", entityId: LOC } })), "other-location"],
    [refundEvent(), "not-toolkit"], // order-1 is an Audit transaction in this world
  ];
  for (const [event, ignored] of cases) {
    const res = await handleStripeToolkitRefund(signed(event), w.fetchImpl);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ignored, ignored);
  }
  assert.equal(w.rows[0].revoked_at, null);
  assert.equal(w.calls.some((c) => c.method !== "GET"), false);
});

test("webhook: HighLevel down -> 500 so Stripe retries; nothing written", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx()], ghlDown: true });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.equal(res.status, 500);
  assert.equal(w.rows[0].revoked_at, null);
});

test("webhook: a refund of a different charge does not revoke the row of another purchase", async () => {
  installEnv();
  const w = world({ rows: [paidRow({ raw: { transaction_id: "ghl-tx-2" } })], txs: [tx()] });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.equal((await res.json()).action, "kept-other-access");
  assert.equal(w.rows[0].revoked_at, null);
});

test("webhook: tag removal failure still revokes and answers 200", async () => {
  installEnv();
  const w = world({ rows: [paidRow()], txs: [tx()], tagFails: true });
  const res = await handleStripeToolkitRefund(signed(refundEvent()), w.fetchImpl);
  assert.deepEqual(await res.json(), { ok: true, action: "revoked", tag: "failed" });
  assert.ok(w.rows[0].revoked_at);
});
