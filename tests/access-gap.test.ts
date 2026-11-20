// Nov 20, 2026: a paying Toolkit buyer is unlocked at sign-in request time and
// from a signed order webhook, using the same HighLevel lookup and rules as
// /api/entitlement-sync. No real network: every call goes to the stub.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareSignin } from "../lib/access/signinAccount.ts";
import { toolkitAccessFromOrder } from "../lib/access/orderWebhookAccess.ts";

const SUPA = "https://supabase.test";
const TOOLKIT = "696ec80453f21b434dfae38d";
const AUDIT = "696e9d90b112a056c6a3f6c5";

function env() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = "loc-test";
  delete process.env.GHL_TJB_PIT;
}

type Row = { email: string; product_id: string; source: string; purchased_at: string | null; raw: Record<string, unknown>; revoked_at: string | null; contact_id: string | null; gross_amount?: unknown };

/** A tiny in-memory entitlements table plus HighLevel transactions and auth admin. */
function world(opts: { rows?: Row[]; txs?: unknown[]; ghlStatus?: number; users?: unknown[] } = {}) {
  const rows: Row[] = [...(opts.rows ?? [])];
  const writes: { method: string; body: unknown }[] = [];
  const f: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (url.origin === SUPA && url.pathname === "/rest/v1/entitlements") {
      const eq = (k: string) => url.searchParams.get(k)?.replace(/^eq\./, "");
      if (method === "GET") {
        let out = rows.filter((r) => (!eq("email") || r.email === eq("email")) && (!eq("product_id") || r.product_id === eq("product_id")));
        if (url.searchParams.get("revoked_at") === "is.null") out = out.filter((r) => !r.revoked_at);
        return Response.json(out);
      }
      if (method === "POST") {
        const body = JSON.parse(String(init?.body)) as Row;
        writes.push({ method, body });
        if (!rows.some((r) => r.email === body.email && r.product_id === body.product_id)) rows.push({ ...body, revoked_at: body.revoked_at ?? null });
        return new Response(null, { status: 201 });
      }
      writes.push({ method, body: init?.body ? JSON.parse(String(init.body)) : null });
      return Response.json([]);
    }
    if (url.origin === "https://services.leadconnectorhq.com") {
      assert.equal(url.searchParams.get("paymentMode"), "live");
      if (opts.ghlStatus) return new Response("", { status: opts.ghlStatus });
      const txs = opts.txs ?? [];
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return Response.json({ data: txs.slice(offset, offset + 100), totalCount: txs.length });
    }
    if (url.origin === SUPA && url.pathname === "/auth/v1/admin/users" && method === "GET") return Response.json({ users: opts.users ?? [] });
    if (url.origin === SUPA && url.pathname.startsWith("/auth/v1/admin/users")) return Response.json({ id: "new" });
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { f, rows, writes };
}

const tx = (email: string, over: Record<string, unknown> = {}) => ({
  _id: "t-paid", amount: 247, status: "succeeded", liveMode: true, contactEmail: email, contactId: "c1",
  entitySourceId: TOOLKIT, entitySource: { id: TOOLKIT }, createdAt: "2026-11-20T18:00:00Z", ...over,
});

test("sign-in request writes the Toolkit row for a live buyer before the link is sent", async () => {
  env();
  const w = world({ txs: [tx("buyer@example.test")] });
  assert.equal(await prepareSignin("buyer@example.test", w.f), "created");
  const row = w.rows.find((r) => r.email === "buyer@example.test" && r.product_id === "purpose-activation-toolkit");
  assert.ok(row, "entitlement row written");
  assert.equal(row!.source, "ghl-payments-sync");
  assert.equal((row!.raw as { transaction_id: string }).transaction_id, "t-paid");
});

test("a $0 live 100%-coupon order qualifies (Truth, Nov 13)", async () => {
  env();
  const w = world({ txs: [tx("coupon@example.test", { amount: 0, _id: "t-zero" })] });
  assert.equal(await prepareSignin("coupon@example.test", w.f), "created");
  assert.ok(w.rows.some((r) => r.email === "coupon@example.test" && r.gross_amount === 0));
});

test("a test-mode order grants nothing and creates no user", async () => {
  env();
  const w = world({ txs: [tx("tester@example.test", { liveMode: false })] });
  assert.equal(await prepareSignin("tester@example.test", w.f), "not-eligible");
  assert.equal(w.writes.length, 0);
});

test("a refunded Toolkit charge grants nothing at sign-in", async () => {
  env();
  const w = world({ txs: [tx("refund@example.test", { status: "refunded" })] });
  assert.equal(await prepareSignin("refund@example.test", w.f), "not-eligible");
  assert.equal(w.writes.length, 0);
});

test("an Audit-only buyer still gets a sign-in user but no Toolkit row", async () => {
  env();
  const w = world({ txs: [tx("audit@example.test", { entitySourceId: AUDIT, entitySource: { id: AUDIT } })] });
  assert.equal(await prepareSignin("audit@example.test", w.f), "created");
  assert.ok(!w.rows.some((r) => r.product_id === "purpose-activation-toolkit"));
});

test("a revoked owner-test row stays revoked at sign-in when HighLevel has no purchase", async () => {
  env();
  const revoked: Row = { email: "owner@example.test", product_id: "purpose-activation-toolkit", source: "manual:owner-test-2026-11-20", purchased_at: null, raw: {}, revoked_at: "2026-11-20T19:00:00Z", contact_id: null };
  const w = world({ rows: [revoked] });
  assert.equal(await prepareSignin("owner@example.test", w.f), "not-eligible");
  assert.equal(w.writes.length, 0);
});

test("an existing live row skips the lookup entirely", async () => {
  env();
  const comp: Row = { email: "comp@example.test", product_id: "purpose-activation-toolkit", source: "manual:comp", purchased_at: null, raw: {}, revoked_at: null, contact_id: null };
  let ghl = 0;
  const w = world({ rows: [comp], users: [{ id: "u", email: "comp@example.test", email_confirmed_at: "2026-01-01" }] });
  const f: typeof fetch = async (i, init) => { if (String(i).includes("leadconnectorhq")) ghl += 1; return w.f(i, init); };
  assert.equal(await prepareSignin("comp@example.test", f), "ready");
  assert.equal(ghl, 0);
});

test("order webhook: the email is checked against HighLevel, never trusted", async () => {
  env();
  const real = world({ txs: [tx("buyer@example.test")] });
  assert.equal(await toolkitAccessFromOrder(" Buyer@Example.test ", real.f), "granted");
  assert.ok(real.rows.some((r) => r.email === "buyer@example.test"));
  const forged = world({ txs: [tx("someone-else@example.test")] });
  assert.equal(await toolkitAccessFromOrder("forged@example.test", forged.f), "not-entitled");
  assert.equal(forged.writes.length, 0);
  const down = world({ ghlStatus: 503 });
  assert.equal(await toolkitAccessFromOrder("buyer@example.test", down.f), "unavailable");
  assert.equal(await toolkitAccessFromOrder(null, down.f), "no-email");
  assert.equal(await toolkitAccessFromOrder("not-an-email", down.f), "no-email");
});

test("magic links requested on the toolkit host land on www (Supabase allow-list)", async () => {
  const { magicLinkOrigin } = await import("../lib/authRedirect.ts");
  assert.equal(magicLinkOrigin("https://toolkit.truthjblue.com"), "https://www.truthjblue.com");
  assert.equal(magicLinkOrigin("https://www.truthjblue.com"), "https://www.truthjblue.com");
  assert.equal(magicLinkOrigin("https://store.truthjblue.com"), "https://store.truthjblue.com");
  assert.equal(magicLinkOrigin("http://localhost:3000"), "http://localhost:3000");
});
