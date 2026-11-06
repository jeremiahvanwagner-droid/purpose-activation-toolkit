import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAccess } from "../lib/access/decide.ts";
import { handleEntitlementSync } from "../lib/access/entitlementSync.ts";
import type { GhlTransaction, PurchaseLookup } from "../lib/entitlementMatch.ts";

const EMAIL = "buyer@example.test";
const TOOLKIT = "696ec80453f21b434dfae38d";
const AUDIT = "696e9d90b112a056c6a3f6c5";

function tx(over: Partial<GhlTransaction> = {}): GhlTransaction {
  return {
    _id: "tx-1",
    amount: 247,
    status: "succeeded",
    liveMode: true,
    contactEmail: EMAIL,
    entitySourceId: TOOLKIT,
    createdAt: "2026-09-14T15:00:00.000Z",
    ...over,
  };
}

const found = (transaction = tx()): PurchaseLookup => ({ status: "found", transaction, pagesRead: 1 });
const missing: PurchaseLookup = { status: "not-found", pagesRead: 1 };
const down: PurchaseLookup = { status: "unavailable", reason: "lookup-http-503", pagesRead: 0 };

test("a qualifying purchase grants, and absence does not revoke a stored payment row", () => {
  const payment = { source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z", transaction_id: "tx-1" };
  assert.equal(decideAccess(null, found()).action, "grant");
  assert.equal(decideAccess(payment, missing).action, "keep");
  assert.equal(decideAccess({ ...payment, source: "ghl:696ec80453f21b434dfae38d" }, missing).action, "keep");
  assert.equal(
    decideAccess(payment, { status: "refund-observed", transaction: tx({ _id: "tx-1", status: "refunded" }), pagesRead: 1 }).action,
    "revoke"
  );
  assert.equal(
    decideAccess(payment, { status: "refund-observed", transaction: tx({ _id: "other", status: "refunded" }), pagesRead: 1 }).action,
    "keep"
  );
});

test("complimentary and unclassified sources are kept without a lookup result", () => {
  assert.deepEqual(decideAccess({ source: "manual:comp", purchased_at: null, transaction_id: null }, null), {
    action: "keep",
    access: "preserved",
  });
  assert.deepEqual(
    decideAccess({ source: "legacy-import", purchased_at: "2024-01-01T00:00:00.000Z", transaction_id: null }, missing),
    { action: "keep", access: "preserved" }
  );
  assert.equal(decideAccess({ source: null, purchased_at: null, transaction_id: null }, missing).action, "keep");
});

test("a failed or capped lookup keeps a payment row and does not invent a denial", () => {
  assert.deepEqual(
    decideAccess({ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z", transaction_id: "tx-1" }, down),
    { action: "keep", access: "unavailable" }
  );
  assert.deepEqual(decideAccess(null, down), { action: "deny", reason: "lookup-unavailable" });
  assert.deepEqual(decideAccess(null, missing), { action: "deny", reason: "not-found" });
});

const SUPA = "https://supabase.test";

function installEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = "loc-test";
}

type RouteCall = { url: string; method: string; body?: string };

function mockFetch(handler: (url: string, init: RequestInit | undefined, calls: RouteCall[]) => Response) {
  const calls: RouteCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const host = new URL(url).host;
    if (host !== "supabase.test" && host !== "services.leadconnectorhq.com") {
      throw new Error(`unexpected network: ${url}`);
    }
    calls.push({ url, method, body: typeof init?.body === "string" ? init.body : undefined });
    return handler(url, init, calls);
  };
  return { fetchImpl, calls };
}

function authed(productId?: string) {
  return new Request("https://app.test/api/entitlement-sync", {
    method: "POST",
    headers: { Authorization: "Bearer token-1", "Content-Type": "application/json" },
    body: JSON.stringify(productId === undefined ? {} : { productId, email: "someone.else@example.test" }),
  });
}

function userOk() {
  return new Response(JSON.stringify({ email: "Buyer@Example.TEST" }), { status: 200 });
}

test("route: no session, unknown product, and a session we cannot verify", async () => {
  installEnv();
  const { fetchImpl, calls } = mockFetch(() => new Response("{}", { status: 401 }));
  const unsigned = await handleEntitlementSync(new Request("https://app.test/api/entitlement-sync", { method: "POST" }), fetchImpl);
  assert.equal(unsigned.status, 401);
  assert.equal(calls.length, 0);

  const badProduct = await handleEntitlementSync(authed("not-a-product"), fetchImpl);
  assert.equal(badProduct.status, 400);

  const badSession = await handleEntitlementSync(authed(), fetchImpl);
  assert.equal(badSession.status, 401);
  assert.equal(calls.every((c) => c.url.startsWith(`${SUPA}/auth/v1/user`)), true);
});

test("route: live succeeded charge grants once; refunded and wrong product do not", async () => {
  installEnv();
  const state = { row: null as null | { source: string; purchased_at: string } };
  const { fetchImpl, calls } = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("/rest/v1/entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(state.row ? [state.row] : []), { status: 200 });
    }
    if (url.includes("leadconnectorhq.com/payments/transactions")) {
      const amount = new URL(url).searchParams.get("offset") === "0" ? [tx()] : [];
      return new Response(JSON.stringify({ data: amount }), { status: 200 });
    }
    if (url.includes("/rest/v1/entitlements") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.email, EMAIL);
      assert.equal(body.product_id, "purpose-activation-toolkit");
      assert.equal(body.source, "ghl-payments-sync");
      state.row = { source: body.source, purchased_at: body.purchased_at };
      return new Response(null, { status: 201 });
    }
    throw new Error(`unexpected network: ${url}`);
  });

  const first = await handleEntitlementSync(authed(), fetchImpl);
  assert.equal((await first.json()).entitled, true);
  const grants = calls.filter((c) => c.method === "POST" && c.url.includes("/rest/v1/entitlements"));
  assert.equal(grants.length, 1);

  calls.length = 0;
  const again = await handleEntitlementSync(authed(), fetchImpl);
  assert.equal((await again.json()).access, "purchase");
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
  assert.equal(grants[0].url.includes("on_conflict=email,product_id"), true);

  const refunded = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("/rest/v1/entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z" }]), { status: 200 });
    }
    if (url.includes("payments/transactions")) {
      return new Response(JSON.stringify({ data: [tx({ status: "refunded" }), tx({ liveMode: false, _id: "test" }), tx({ status: "pending", _id: "p" }), tx({ entitySourceId: AUDIT, _id: "audit" }), tx({ contactEmail: "other@example.test", _id: "other" })] }), { status: 200 });
    }
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    throw new Error(`unexpected network: ${init?.method} ${url}`);
  });
  const held = await handleEntitlementSync(authed("purpose-activation-toolkit"), refunded.fetchImpl);
  const heldBody = await held.json();
  assert.equal(heldBody.entitled, true);
  assert.equal(heldBody.revoked, undefined);
  assert.equal(refunded.calls.some((c) => c.method === "DELETE"), false);
});

test("route: malformed transaction payloads do not grant or delete", async () => {
  installEnv();
  for (const payload of [null, { data: null }, { data: { id: "x" } }, { data: "nope" }]) {
    const hit = mockFetch((url, init) => {
      if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
      if (url.includes("/rest/v1/entitlements") && (init?.method ?? "GET") === "GET") {
        return new Response(
          JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z", raw: { transaction_id: "tx-1" } }]),
          { status: 200 }
        );
      }
      if (url.includes("payments/transactions")) return new Response(JSON.stringify(payload), { status: 200 });
      throw new Error(`unexpected network: ${init?.method} ${url}`);
    });
    const body = await (await handleEntitlementSync(authed(), hit.fetchImpl)).json();
    assert.equal(body.entitled, true, JSON.stringify(payload));
    assert.equal(body.reason, "lookup-unavailable", JSON.stringify(payload));
    assert.equal(hit.calls.some((c) => c.method === "DELETE" || c.method === "POST"), false, JSON.stringify(payload));
  }
});

test("route: a finished scan that never sees the stored charge does not delete it", async () => {
  installEnv();
  const scan = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-01-01T00:00:00.000Z", raw: { transaction_id: "old-tx" } }]),
        { status: 200 }
      );
    }
    if (url.includes("payments/transactions")) {
      return new Response(JSON.stringify({ data: [tx({ _id: "someone-else", contactEmail: "other@example.test" })] }), { status: 200 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const body = await (await handleEntitlementSync(authed(), scan.fetchImpl)).json();
  assert.equal(body.entitled, true);
  assert.equal(body.access, "unavailable");
  assert.equal(scan.calls.some((c) => c.method === "DELETE"), false);
});

test("route: explicit refund of the stored charge deletes only that payment source", async () => {
  installEnv();
  const refunded = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z", raw: { transaction_id: "tx-1" } }]),
        { status: 200 }
      );
    }
    if (url.includes("payments/transactions")) {
      return new Response(JSON.stringify({ data: [tx({ _id: "tx-1", status: "refunded" })] }), { status: 200 });
    }
    if (init?.method === "DELETE") {
      assert.match(url, /source=eq\.ghl-payments-sync/);
      assert.match(init.headers instanceof Headers ? init.headers.get("Prefer") ?? "" : "", /return=representation/);
      return new Response(JSON.stringify([{ source: "ghl-payments-sync" }]), { status: 200 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const body = await (await handleEntitlementSync(authed(), refunded.fetchImpl)).json();
  assert.equal(body.revoked, true);
  assert.equal(body.entitled, false);
});

test("route: a source-filtered delete that misses keeps a concurrent manual comp", async () => {
  installEnv();
  let reads = 0;
  const race = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      reads += 1;
      const source = reads === 1 ? "ghl-payments-sync" : "manual:comp";
      return new Response(
        JSON.stringify([{ source, purchased_at: "2026-09-14T15:00:00.000Z", raw: { transaction_id: "tx-1" } }]),
        { status: 200 }
      );
    }
    if (url.includes("payments/transactions")) {
      return new Response(JSON.stringify({ data: [tx({ _id: "tx-1", status: "refunded" })] }), { status: 200 });
    }
    if (init?.method === "DELETE") return new Response(JSON.stringify([]), { status: 200 });
    throw new Error(`unexpected network: ${url}`);
  });
  const body = await (await handleEntitlementSync(authed(), race.fetchImpl)).json();
  assert.equal(body.entitled, true);
  assert.equal(body.access, "preserved");
  assert.equal(body.revoked, undefined);
});

test("route: grant insert does not overwrite a non-payment source", async () => {
  installEnv();
  let gets = 0;
  const compWins = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      gets += 1;
      if (gets === 1) return new Response("[]", { status: 200 });
      return new Response(JSON.stringify([{ source: "manual:comp", purchased_at: null }]), { status: 200 });
    }
    if (url.includes("payments/transactions")) return new Response(JSON.stringify({ data: [tx()] }), { status: 200 });
    if (init?.method === "POST") {
      const prefer = init.headers instanceof Headers ? init.headers.get("Prefer") ?? "" : "";
      assert.match(prefer, /ignore-duplicates/);
      assert.equal(prefer.includes("merge-duplicates"), false);
      return new Response(null, { status: 201 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const body = await (await handleEntitlementSync(authed(), compWins.fetchImpl)).json();
  assert.equal(body.entitled, true);
  assert.equal(body.access, "preserved");
  assert.equal(compWins.calls.filter((c) => c.method === "POST").length, 1);
});

test("route: wrong owner email in the body cannot claim another purchase", async () => {
  installEnv();
  let grantedEmail = "";
  const { fetchImpl } = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("/rest/v1/entitlements") && (init?.method ?? "GET") === "GET") return new Response("[]", { status: 200 });
    if (url.includes("payments/transactions")) {
      return new Response(JSON.stringify({ data: [tx({ contactEmail: "someone.else@example.test" })] }), { status: 200 });
    }
    if (init?.method === "POST") {
      grantedEmail = JSON.parse(String(init.body)).email;
      return new Response(null, { status: 201 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const res = await handleEntitlementSync(authed(), fetchImpl);
  const body = await res.json();
  assert.equal(body.reason, "not-found");
  assert.equal(grantedEmail, "");
});

test("route: manual comp skips payment lookup; lookup errors do not revoke", async () => {
  installEnv();
  const comp = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if ((init?.method ?? "GET") === "GET" && url.includes("entitlements")) {
      return new Response(JSON.stringify([{ source: "manual:comp", purchased_at: null }]), { status: 200 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const kept = await handleEntitlementSync(authed(), comp.fetchImpl);
  assert.equal((await kept.json()).access, "preserved");
  assert.equal(comp.calls.some((c) => c.url.includes("leadconnectorhq")), false);

  const broken = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z" }]), { status: 200 });
    }
    if (url.includes("payments/transactions")) return new Response("no", { status: 503 });
    throw new Error(`unexpected network: ${url}`);
  });
  const held = await handleEntitlementSync(authed(), broken.fetchImpl);
  const heldBody = await held.json();
  assert.equal(heldBody.entitled, true);
  assert.equal(heldBody.reason, "lookup-unavailable");
  assert.equal(broken.calls.some((c) => c.method === "DELETE"), false);
});

test("route: the page cap does not revoke, and a grant failure is not success", async () => {
  installEnv();
  const capped = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{ source: "ghl-payments-sync", purchased_at: "2026-09-14T15:00:00.000Z" }]), { status: 200 });
    }
    if (url.includes("payments/transactions")) {
      const rows = Array.from({ length: 100 }, (_, i) => tx({ _id: `o-${i}`, contactEmail: `o${i}@example.test` }));
      return new Response(JSON.stringify({ data: rows }), { status: 200 });
    }
    throw new Error(`unexpected network: ${url}`);
  });
  const capBody = await (await handleEntitlementSync(authed(), capped.fetchImpl)).json();
  assert.equal(capBody.entitled, true);
  assert.equal(capBody.access, "unavailable");
  const pages = capped.calls.filter((c) => c.url.includes("payments/transactions"));
  assert.equal(pages.length, 10);
  assert.equal(capped.calls.some((c) => c.method === "DELETE"), false);

  const failGrant = mockFetch((url, init) => {
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return userOk();
    if (url.includes("entitlements") && (init?.method ?? "GET") === "GET") return new Response("[]", { status: 200 });
    if (url.includes("payments/transactions")) return new Response(JSON.stringify({ data: [tx()] }), { status: 200 });
    if (init?.method === "POST") return new Response("no", { status: 500 });
    throw new Error(`unexpected network: ${url}`);
  });
  const failed = await (await handleEntitlementSync(authed(), failGrant.fetchImpl)).json();
  assert.equal(failed.entitled, false);
  assert.equal(failed.reason, "grant-failed");
  assert.equal(failed.found, true);
});
