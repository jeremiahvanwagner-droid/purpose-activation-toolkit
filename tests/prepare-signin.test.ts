import { test } from "node:test";
import assert from "node:assert/strict";
import { handlePrepareSignin, prepareSignin } from "../lib/access/signinAccount.ts";

const SUPA = "https://supabase.test";
const TOOLKIT = "696ec80453f21b434dfae38d";

function env() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = "loc-test";
}

type Call = { url: string; method: string; body?: string };
function stub(opts: { row?: boolean; txs?: unknown[]; user?: unknown; ghlStatus?: number }) {
  const calls: Call[] = [];
  const f: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.startsWith(`${SUPA}/rest/v1/entitlements`)) return Response.json(opts.row ? [{ product_id: "x" }] : []);
    if (url.startsWith("https://services.leadconnectorhq.com/")) {
      if (opts.ghlStatus) return new Response("", { status: opts.ghlStatus });
      return Response.json({ data: opts.txs ?? [], totalCount: (opts.txs ?? []).length });
    }
    if (url.startsWith(`${SUPA}/auth/v1/admin/users?`)) return Response.json({ users: opts.user ? [opts.user] : [] });
    if (url.startsWith(`${SUPA}/auth/v1/admin/users`)) return Response.json({ id: "new" });
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { f, calls };
}

const paid = (email: string, amount = 247) => ({
  _id: "t1", amount, status: "succeeded", liveMode: true, contactEmail: email,
  entitySourceId: TOOLKIT, entitySource: { id: TOOLKIT }, createdAt: "2026-11-13T15:18:00Z",
});

test("a buyer with no auth user gets one created, confirmed, with no entitlement write", async () => {
  env();
  const { f, calls } = stub({ txs: [paid("buyer@example.test")] });
  assert.equal(await prepareSignin("buyer@example.test", f), "created");
  const post = calls.find((c) => c.method === "POST");
  assert.ok(post && post.url === `${SUPA}/auth/v1/admin/users`);
  assert.deepEqual(JSON.parse(post!.body!), { email: "buyer@example.test", email_confirm: true });
  assert.ok(!calls.some((c) => c.url.includes("/rest/v1/entitlements") && c.method !== "GET"));
});

test("an unconfirmed existing user with a comp row is confirmed", async () => {
  env();
  const { f, calls } = stub({ row: true, user: { id: "u1", email: "comp@example.test", email_confirmed_at: null } });
  assert.equal(await prepareSignin("comp@example.test", f), "confirmed");
  assert.ok(calls.some((c) => c.method === "PUT" && c.url.endsWith("/auth/v1/admin/users/u1")));
});

test("a confirmed user is left alone", async () => {
  env();
  const { f, calls } = stub({ row: true, user: { id: "u1", email: "c@example.test", email_confirmed_at: "2026-01-01" } });
  assert.equal(await prepareSignin("c@example.test", f), "ready");
  assert.ok(!calls.some((c) => c.method !== "GET"));
});

test("no purchase and no row creates nothing; a HighLevel outage creates nothing", async () => {
  env();
  const a = stub({ txs: [paid("someone-else@example.test")] });
  assert.equal(await prepareSignin("stranger@example.test", a.f), "not-eligible");
  assert.ok(!a.calls.some((c) => c.method !== "GET"));
  const b = stub({ ghlStatus: 503 });
  assert.equal(await prepareSignin("stranger@example.test", b.f), "unavailable");
  assert.ok(!b.calls.some((c) => c.method !== "GET"));
});

test("the route answers the same for eligible and ineligible emails and rejects bad input", async () => {
  env();
  const yes = stub({ txs: [paid("buyer@example.test")] });
  const no = stub({});
  const req = (email: unknown) => new Request("https://x.test/api/auth/prepare-signin", { method: "POST", body: JSON.stringify({ email }) });
  const r1 = await handlePrepareSignin(req("Buyer@Example.test "), yes.f);
  const r2 = await handlePrepareSignin(req("nobody@example.test"), no.f);
  assert.deepEqual(await r1.json(), await r2.json());
  assert.equal((await handlePrepareSignin(req("not-an-email"), no.f)).status, 400);
});

test("a rejected first HighLevel token falls back to the second TJB token", async () => {
  env();
  process.env.GHL_TJB_PIT = "pit-second";
  const auths: string[] = [];
  const f: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith(`${SUPA}/rest/v1/entitlements`)) return Response.json([]);
    if (url.startsWith("https://services.leadconnectorhq.com/")) {
      const a = new Headers(init?.headers).get("authorization") ?? "";
      auths.push(a);
      if (a === "Bearer pit-test") return new Response("", { status: 401 });
      return Response.json({ data: [paid("buyer@example.test")] });
    }
    if (url.startsWith(`${SUPA}/auth/v1/admin/users?`)) return Response.json({ users: [] });
    if (url.startsWith(`${SUPA}/auth/v1/admin/users`)) return Response.json({ id: "new" });
    throw new Error(`unexpected ${url}`);
  };
  assert.equal(await prepareSignin("buyer@example.test", f), "created");
  assert.deepEqual(auths, ["Bearer pit-test", "Bearer pit-second"]);
  delete process.env.GHL_TJB_PIT;
});
