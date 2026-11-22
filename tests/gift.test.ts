// Buyer-pays gift: one Toolkit transaction, one seat, dark unless the flag is on.
// No real network. Refunds revoke the recipient; a failed lookup never does.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleGift } from "../lib/access/gift.ts";
import { reconcileEntitlement } from "../lib/access/entitlementSync.ts";
import { handleStripeToolkitRefund } from "../lib/access/stripeRefund.ts";
import type { GhlTransaction } from "../lib/entitlementMatch.ts";

const SUPA = "https://supabase.test";
const BUYER = "buyer@example.test";
const FRIEND = "friend@example.test";
const TOOLKIT_LINK = "696ec80453f21b434dfae38d";
const AUDIT_LINK = "696e9d90b112a056c6a3f6c5";
const LOC = "loc-test";
const SECRET = "whsec_test_only_not_a_real_secret";
const TOOLKIT = "purpose-activation-toolkit";
function flagEnv(value: string): NodeJS.ProcessEnv {
  return { ...process.env, TOOLKIT_GIFT_ENABLED: value };
}

function installEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = LOC;
  process.env.STRIPE_WEBHOOK_SECRET_TOOLKIT = SECRET;
  delete process.env.GHL_TJB_PIT;
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

type Gift = {
  id: string;
  transaction_id: string;
  order_id: string | null;
  buyer_email: string;
  buyer_contact_id: string | null;
  recipient_email: string;
  recipient_first_name: string | null;
  product_id: string;
  status: string;
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
    contactEmail: BUYER,
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
    email: BUYER,
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

function likeGift(source: string, pattern: string): boolean {
  if (pattern !== "gift:*") return false;
  return source.startsWith("gift:");
}

function world(init: { rows?: Row[]; gifts?: Gift[]; txs?: Tx[]; ghlDown?: boolean; giftsDown?: boolean; failRecipientInsert?: boolean } = {}) {
  const rows: Row[] = init.rows ?? [];
  const gifts: Gift[] = init.gifts ?? [];
  let seq = gifts.length;
  const calls: { method: string; url: string }[] = [];

  const matchRow = (row: Row, params: URLSearchParams) => {
    for (const [key, value] of params) {
      if (["select", "on_conflict", "limit"].includes(key)) continue;
      if (key === "email" && value !== `eq.${row.email}`) return false;
      if (key === "product_id" && value !== `eq.${row.product_id}`) return false;
      if (key === "raw->>transaction_id" && value !== `eq.${String(row.raw.transaction_id ?? "")}`) return false;
      if (key === "revoked_at" && value === "is.null" && row.revoked_at !== null) return false;
      if (key === "revoked_at" && value === "not.is.null" && row.revoked_at === null) return false;
      if (key === "source" && value.startsWith("like.") && !likeGift(row.source, value.slice(5))) return false;
      if (key === "or") {
        if (!(row.source === "ghl-payments-sync" || row.source.startsWith("ghl:"))) return false;
      }
    }
    return true;
  };

  const matchGift = (gift: Gift, params: URLSearchParams) => {
    for (const [key, value] of params) {
      if (["select", "limit"].includes(key)) continue;
      if (key === "transaction_id" && value !== `eq.${gift.transaction_id}`) return false;
      if (key === "id" && value !== `eq.${gift.id}`) return false;
      if (key === "status" && value !== `eq.${gift.status}`) return false;
    }
    return true;
  };

  const fetchImpl: typeof fetch = async (input, reqInit) => {
    const url = new URL(String(input));
    const method = reqInit?.method ?? "GET";
    const body = typeof reqInit?.body === "string" ? reqInit.body : undefined;
    calls.push({ method, url: url.toString() });

    if (url.host === "supabase.test" && url.pathname === "/auth/v1/user") {
      return new Response(JSON.stringify({ email: "Buyer@Example.TEST" }), { status: 200 });
    }
    if (url.host === "supabase.test" && url.pathname === "/rest/v1/entitlements") {
      const params = url.searchParams;
      if (method === "GET") return Response.json(rows.filter((r) => matchRow(r, params)));
      if (method === "PATCH") {
        const patch = JSON.parse(body!);
        const hit = rows.filter((r) => matchRow(r, params));
        for (const r of hit) Object.assign(r, patch);
        return Response.json(hit);
      }
      if (method === "POST") {
        if (init.failRecipientInsert) return new Response("no", { status: 500 });
        const prefer = new Headers(reqInit?.headers).get("Prefer") ?? "";
        assert.match(prefer, /ignore-duplicates/);
        const incoming = JSON.parse(body!) as Partial<Row>;
        if (!rows.some((r) => r.email === incoming.email && r.product_id === incoming.product_id)) {
          rows.push({
            email: incoming.email ?? "",
            product_id: incoming.product_id ?? "",
            source: incoming.source ?? "",
            purchased_at: incoming.purchased_at ?? null,
            gross_amount: incoming.gross_amount ?? null,
            contact_id: incoming.contact_id ?? null,
            raw: incoming.raw ?? {},
            revoked_at: incoming.revoked_at ?? null,
            revoked_reason: incoming.revoked_reason ?? null,
          });
        }
        return new Response(null, { status: 201 });
      }
      if (method === "DELETE") throw new Error("entitlement rows must never be deleted");
    }
    if (url.host === "supabase.test" && url.pathname === "/rest/v1/toolkit_gifts") {
      if (init.giftsDown) return new Response("no", { status: 500 });
      const params = url.searchParams;
      if (method === "GET") return Response.json(gifts.filter((g) => matchGift(g, params)));
      if (method === "POST") {
        const incoming = JSON.parse(body!) as Partial<Gift>;
        if (gifts.some((g) => g.transaction_id === incoming.transaction_id)) {
          return Response.json({ code: "23505" }, { status: 409 });
        }
        seq += 1;
        const gift: Gift = {
          id: `gift-${seq}`,
          transaction_id: incoming.transaction_id ?? "",
          order_id: incoming.order_id ?? null,
          buyer_email: incoming.buyer_email ?? "",
          buyer_contact_id: incoming.buyer_contact_id ?? null,
          recipient_email: incoming.recipient_email ?? "",
          recipient_first_name: incoming.recipient_first_name ?? null,
          product_id: incoming.product_id ?? TOOLKIT,
          status: incoming.status ?? "granted",
          revoked_at: incoming.revoked_at ?? null,
          revoked_reason: incoming.revoked_reason ?? null,
        };
        gifts.push(gift);
        return Response.json([gift], { status: 201 });
      }
      if (method === "PATCH") {
        const patch = JSON.parse(body!);
        const hit = gifts.filter((g) => matchGift(g, params));
        for (const g of hit) Object.assign(g, patch);
        return Response.json(hit);
      }
      if (method === "DELETE") {
        const id = params.get("id")?.replace(/^eq\./, "");
        const before = gifts.length;
        for (let i = gifts.length - 1; i >= 0; i -= 1) if (gifts[i].id === id) gifts.splice(i, 1);
        return new Response(null, { status: before ? 204 : 200 });
      }
    }
    if (url.host === "services.leadconnectorhq.com" && url.pathname === "/payments/transactions") {
      if (init.ghlDown) return new Response("down", { status: 503 });
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const txs = init.txs ?? [];
      return Response.json({ data: offset === 0 ? txs : [] });
    }
    const tagPath = url.pathname.match(/^\/contacts\/([^/]+)\/tags$/);
    if (url.host === "services.leadconnectorhq.com" && tagPath && method === "DELETE") {
      return Response.json({ tags: [] });
    }
    throw new Error(`unexpected network: ${method} ${url}`);
  };

  return { rows, gifts, calls, fetchImpl };
}

function post(body: unknown, auth = "Bearer t") {
  return new Request("https://app.test/api/toolkit/gift", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function capture() {
  const lines: string[] = [];
  const log = console.log;
  const err = console.error;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return {
    lines,
    restore() {
      console.log = log;
      console.error = err;
    },
  };
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

function signed(event: unknown) {
  const payload = JSON.stringify(event);
  const at = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", SECRET).update(`${at}.${payload}`).digest("hex");
  return new Request("https://app.test/api/stripe/toolkit-refund", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${at},v1=${sig}` },
    body: payload,
  });
}

describe("toolkit gifts", { concurrency: false }, () => {
  test("flag off -> 404 and no lookup", async () => {
    installEnv();
    const w = world({ txs: [tx()] });
    const res = await handleGift(post({ recipientEmail: FRIEND, buyerEmail: "nope@example.test" }), w.fetchImpl, flagEnv("false"));
    assert.equal(res.status, 404);
    assert.equal(w.calls.length, 0);
    assert.equal(w.gifts.length, 0);
  });

  test("no bearer -> 401; the buyer email is the token, never the body", async () => {
    installEnv();
    const w = world({ txs: [tx()] });
    const missing = await handleGift(post({ recipientEmail: FRIEND }, ""), w.fetchImpl, flagEnv("true"));
    assert.equal(missing.status, 401);
    assert.equal(w.calls.length, 0);

    const res = await handleGift(
      post({ recipientEmail: FRIEND, buyerEmail: "other@example.test", firstName: "Ada" }),
      w.fetchImpl,
      flagEnv("true")
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(w.gifts.length, 1);
    assert.equal(w.gifts[0].buyer_email, BUYER);
    assert.equal(w.gifts[0].recipient_email, FRIEND);
    assert.equal(w.gifts[0].recipient_first_name, "Ada");
    assert.equal(w.gifts[0].order_id, "order-1");
    const friend = w.rows.find((r) => r.email === FRIEND);
    assert.ok(friend);
    assert.equal(friend.source, "gift:ghl-tx-1");
    assert.equal(friend.gross_amount, null);
    assert.equal(friend.raw.granted_by, BUYER);
    assert.equal(friend.raw.transaction_id, "ghl-tx-1");
    assert.equal(friend.raw.gift_id, w.gifts[0].id);
    const buyer = w.rows.find((r) => r.email === BUYER);
    assert.ok(buyer);
    assert.ok(buyer.revoked_at);
    assert.equal(buyer.revoked_reason, `gifted:${w.gifts[0].id}`);
    assert.equal(buyer.raw.written_by, "gift");
  });

  test("no qualifying purchase writes nothing", async () => {
    installEnv();
    const cases: Partial<Tx>[] = [
      { liveMode: false },
      { status: "failed" },
      { status: "refunded" },
      { entitySourceId: AUDIT_LINK },
    ];
    for (const over of cases) {
      const w = world({ txs: [tx(over)] });
      const res = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
      assert.equal(res.status, 400, JSON.stringify(over));
      assert.equal(w.gifts.length, 0);
      assert.equal(w.rows.length, 0);
      assert.equal(w.calls.some((c) => c.method !== "GET"), false);
    }
  });

  test("a $0 live purchase qualifies, and a lookup failure writes nothing", async () => {
    installEnv();
    const zero = world({ txs: [tx({ amount: 0 })] });
    assert.equal((await handleGift(post({ recipientEmail: FRIEND }), zero.fetchImpl, flagEnv("true"))).status, 200);
    assert.equal(zero.gifts.length, 1);

    const down = world({ txs: [tx()], ghlDown: true });
    const res = await handleGift(post({ recipientEmail: FRIEND }), down.fetchImpl, flagEnv("true"));
    assert.equal(res.status, 503);
    assert.equal(down.gifts.length, 0);
    assert.equal(down.rows.length, 0);
  });

  test("recipient = buyer -> 400; an active recipient -> 409 and nothing changes", async () => {
    installEnv();
    const self = world({ txs: [tx()] });
    assert.equal((await handleGift(post({ recipientEmail: "Buyer@Example.TEST" }), self.fetchImpl, flagEnv("true"))).status, 400);
    assert.equal(self.gifts.length, 0);
    assert.equal(self.rows.length, 0);

    const held = paidRow({ email: FRIEND, source: "owner-complimentary", raw: {}, contact_id: null });
    const w = world({ rows: [held], txs: [tx()] });
    const res = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
    assert.equal(res.status, 409);
    assert.equal(w.gifts.length, 0);
    assert.equal(w.rows.length, 1);
    assert.equal(w.rows[0].source, "owner-complimentary");
    assert.equal(w.rows[0].revoked_at, null);
  });

  test("happy path revokes an existing buyer row; the same transaction a second time is 409", async () => {
    installEnv();
    const logs = capture();
    const w = world({ rows: [paidRow()], txs: [tx()] });
    const res = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
    assert.equal(res.status, 200);
    assert.equal(w.gifts.length, 1);
    assert.equal(w.rows.find((r) => r.email === BUYER)?.revoked_reason, `gifted:${w.gifts[0].id}`);
    assert.equal(w.rows.find((r) => r.email === BUYER)?.source, "ghl-payments-sync");
    const stamp = w.rows.find((r) => r.email === BUYER)?.revoked_at;
    const again = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
    assert.equal(again.status, 409);
    assert.equal(w.gifts.length, 1);
    assert.equal(w.rows.filter((r) => r.email === FRIEND).length, 1);
    assert.equal(w.rows.find((r) => r.email === BUYER)?.revoked_at, stamp);
    assert.equal(logs.lines.some((l) => l.includes("@")), false);
    assert.ok(logs.lines.some((l) => l.includes("gift-created")));
    logs.restore();
  });

  test("a complimentary buyer row is kept; a revoked recipient row is reopened", async () => {
    installEnv();
    const w = world({
      rows: [
        paidRow({ source: "owner-complimentary", raw: {}, contact_id: null, gross_amount: null }),
        paidRow({
          email: FRIEND,
          source: "ghl-payments-sync",
          raw: { transaction_id: "old" },
          revoked_at: "2026-11-01T00:00:00.000Z",
          revoked_reason: "stripe:charge.refunded:ch_old",
        }),
      ],
      txs: [tx()],
    });
    const res = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
    assert.equal(res.status, 200);
    const buyer = w.rows.find((r) => r.email === BUYER)!;
    assert.equal(buyer.source, "owner-complimentary");
    assert.equal(buyer.revoked_at, null);
    const friend = w.rows.find((r) => r.email === FRIEND)!;
    assert.equal(friend.source, "gift:ghl-tx-1");
    assert.equal(friend.revoked_at, null);
    assert.equal(friend.revoked_reason, null);
    assert.equal(w.rows.length, 2);
  });

  test("a failed recipient write rolls the gift back and leaves the buyer alone", async () => {
    installEnv();
    const logs = capture();
    const w = world({ rows: [paidRow()], txs: [tx()], failRecipientInsert: true });
    const res = await handleGift(post({ recipientEmail: FRIEND }), w.fetchImpl, flagEnv("true"));
    assert.equal(res.status, 500);
    assert.equal(w.gifts.length, 0);
    assert.equal(w.rows.length, 1);
    assert.equal(w.rows[0].revoked_at, null);
    assert.ok(logs.lines.some((l) => l.includes("gift-failed")));
    assert.equal(logs.lines.some((l) => l.includes("@")), false);
    logs.restore();
  });

  test("buyer sign-in denies the gifted charge and regrants a later purchase", async () => {
    installEnv();
    const denied = world({
      rows: [paidRow({ revoked_at: "2026-11-13T16:00:00.000Z", revoked_reason: "gifted:gift-1" })],
      txs: [tx()],
    });
    const no = await reconcileEntitlement(BUYER, TOOLKIT, denied.fetchImpl);
    assert.equal(no.entitled, false);
    assert.equal(no.revoked, true);
    assert.equal(denied.rows[0].revoked_at, "2026-11-13T16:00:00.000Z");
    assert.equal(denied.calls.some((c) => c.method === "POST" || c.method === "PATCH"), false);

    const rebuy = world({
      rows: [paidRow({ revoked_at: "2026-11-13T16:00:00.000Z", revoked_reason: "gifted:gift-1" })],
      txs: [tx(), tx({ _id: "ghl-tx-2", entityId: "order-2", chargeId: "pi_2" })],
    });
    const yes = await reconcileEntitlement(BUYER, TOOLKIT, rebuy.fetchImpl);
    assert.equal(yes.entitled, true);
    assert.equal(rebuy.rows[0].revoked_at, null);
    assert.equal(rebuy.rows[0].raw.transaction_id, "ghl-tx-2");
  });

  test("stripe refund revokes the recipient and the gift; the buyer tombstone stays", async () => {
    installEnv();
    const buyer = paidRow({
      revoked_at: "2026-11-13T16:00:00.000Z",
      revoked_reason: "gifted:gift-1",
      raw: { transaction_id: "ghl-tx-1", written_by: "gift" },
    });
    const friend = paidRow({
      email: FRIEND,
      source: "gift:ghl-tx-1",
      gross_amount: null,
      contact_id: null,
      raw: { transaction_id: "ghl-tx-1", gift_id: "gift-1", granted_by: BUYER },
    });
    const w = world({
      rows: [buyer, friend],
      gifts: [
        {
          id: "gift-1",
          transaction_id: "ghl-tx-1",
          order_id: "order-1",
          buyer_email: BUYER,
          buyer_contact_id: "contact-1",
          recipient_email: FRIEND,
          recipient_first_name: null,
          product_id: TOOLKIT,
          status: "granted",
          revoked_at: null,
          revoked_reason: null,
        },
      ],
      txs: [tx()],
    });
    const res = await handleStripeToolkitRefund(
      signed({ id: "evt_1", type: "charge.refunded", data: { object: charge() } }),
      w.fetchImpl
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).action, "already-revoked");
    assert.equal(w.rows[0].revoked_at, "2026-11-13T16:00:00.000Z");
    assert.equal(w.rows[0].revoked_reason, "gifted:gift-1");
    assert.ok(w.rows[1].revoked_at);
    assert.equal(w.rows[1].revoked_reason, "stripe:charge.refunded:ch_1");
    assert.equal(w.gifts[0].status, "revoked");
  });

  test("HighLevel refund during the recipient sync revokes; unavailable and not-found keep the seat", async () => {
    installEnv();
    const friend = () =>
      paidRow({
        email: FRIEND,
        source: "gift:ghl-tx-1",
        gross_amount: null,
        contact_id: null,
        raw: { transaction_id: "ghl-tx-1", gift_id: "gift-1", granted_by: BUYER },
      });
    const gift = (): Gift => ({
      id: "gift-1",
      transaction_id: "ghl-tx-1",
      order_id: "order-1",
      buyer_email: BUYER,
      buyer_contact_id: "contact-1",
      recipient_email: FRIEND,
      recipient_first_name: null,
      product_id: TOOLKIT,
      status: "granted",
      revoked_at: null,
      revoked_reason: null,
    });

    const refunded = world({
      rows: [paidRow({ revoked_at: "2026-11-13T16:00:00.000Z", revoked_reason: "gifted:gift-1" }), friend()],
      gifts: [gift()],
      txs: [tx({ _id: "ghl-tx-2", entityId: "order-2" }), tx({ status: "refunded" })],
    });
    const body = await reconcileEntitlement(FRIEND, TOOLKIT, refunded.fetchImpl);
    assert.equal(body.entitled, false);
    assert.equal(body.revoked, true);
    assert.ok(refunded.rows[1].revoked_at);
    assert.equal(refunded.gifts[0].status, "revoked");
    assert.equal(refunded.rows[0].revoked_reason, "gifted:gift-1");

    const down = world({ rows: [friend()], gifts: [gift()], txs: [tx({ status: "refunded" })], ghlDown: true });
    const kept = await reconcileEntitlement(FRIEND, TOOLKIT, down.fetchImpl);
    assert.equal(kept.entitled, true);
    assert.equal(kept.access, "unavailable");
    assert.equal(down.rows[0].revoked_at, null);
    assert.equal(down.gifts[0].status, "granted");

    const unread = world({ rows: [friend()], gifts: [gift()], ghlDown: true, giftsDown: true });
    const still = await reconcileEntitlement(FRIEND, TOOLKIT, unread.fetchImpl);
    assert.equal(still.entitled, true);
    assert.equal(unread.rows[0].revoked_at, null);

    const missing = world({ rows: [friend()], gifts: [gift()], txs: [tx({ _id: "someone-else", contactEmail: "other@example.test" })] });
    const present = await reconcileEntitlement(FRIEND, TOOLKIT, missing.fetchImpl);
    assert.equal(present.entitled, true);
    assert.equal(present.access, "preserved");
    assert.equal(missing.rows[0].revoked_at, null);
    assert.equal(missing.gifts[0].status, "granted");
    assert.equal(missing.calls.some((c) => c.method === "PATCH"), false);
  });
});
