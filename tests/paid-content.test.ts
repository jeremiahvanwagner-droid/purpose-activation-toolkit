import { test } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/paid-content/route.ts";
import { PAID_CURRICULUM_SENTINEL } from "../lib/paid/catalog.ts";

const SUPA = "https://supabase.test";
const EMAIL = "buyer@example.test";

function installEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB = "pit-test";
  process.env.GHL_LOCATION_ID_TJB = "loc-test";
}

function mockFetch(row: { source: string; purchased_at: string | null } | null) {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const host = new URL(url).host;
    if (host !== "supabase.test" && host !== "services.leadconnectorhq.com") {
      throw new Error(`unexpected network: ${url}`);
    }
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return new Response(JSON.stringify({ email: EMAIL }), { status: 200 });
    if (url.includes("/rest/v1/entitlements") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(row ? [row] : []), { status: 200 });
    }
    if (url.includes("leadconnectorhq.com/payments/transactions")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    throw new Error(`unexpected network: ${url}`);
  };
  return fetchImpl;
}

test("paid content is withheld without a session and from a buyer of nothing", async () => {
  installEnv();
  const previous = globalThis.fetch;
  globalThis.fetch = mockFetch({ source: "manual:comp", purchased_at: null });
  try {
    const unsigned = await GET(new Request("https://app.test/api/paid-content"));
    assert.equal(unsigned.status, 401);
    const unsignedBody = await unsigned.text();
    assert.equal(unsignedBody.includes(PAID_CURRICULUM_SENTINEL), false);
    assert.equal(unsignedBody.includes("Purpose Activation is the intentional process"), false);

    globalThis.fetch = mockFetch(null);
    const denied = await GET(new Request("https://app.test/api/paid-content", { headers: { Authorization: "Bearer t" } }));
    assert.equal(denied.status, 403);
    assert.equal((await denied.text()).includes(PAID_CURRICULUM_SENTINEL), false);
  } finally {
    globalThis.fetch = previous;
  }
});

test("an entitled reader receives the curriculum, and a comp skips the payment network", async () => {
  installEnv();
  const previous = globalThis.fetch;
  globalThis.fetch = mockFetch({ source: "manual:comp", purchased_at: null });
  try {
    const res = await GET(new Request("https://app.test/api/paid-content?productId=purpose-activation-toolkit", { headers: { Authorization: "Bearer t" } }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.curriculum.sentinel, PAID_CURRICULUM_SENTINEL);
    assert.match(body.curriculum.page.purposeActivation.s1Body, /intentional process/);
    assert.equal(typeof body.curriculum.purposeActivation.domainField, "undefined");

    const labels = await GET(
      new Request("https://app.test/api/paid-content?part=labels", { headers: { Authorization: "Bearer t" } })
    );
    const labelBody = await labels.json();
    assert.equal(typeof labelBody.curriculum, "undefined");
    assert.equal(typeof labelBody.labels["pa.s1.here"], "string");
  } finally {
    globalThis.fetch = previous;
  }
});

test("workbook and blueprint documents are authorized, and the wrong view is refused", async () => {
  installEnv();
  const previous = globalThis.fetch;
  globalThis.fetch = mockFetch({ source: "manual:comp", purchased_at: null });
  try {
    const workbook = await POST(
      new Request("https://app.test/api/paid-content", {
        method: "POST",
        headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "purpose-activation-toolkit",
          view: "workbook",
          answers: { "pa.s1.here": "To serve" },
        }),
      })
    );
    assert.equal(workbook.status, 200);
    const built = await workbook.json();
    assert.equal(built.workbook.anyContent, true);
    assert.match(built.epigraph, /Child of God/);

    const missing = await POST(
      new Request("https://app.test/api/paid-content", {
        method: "POST",
        headers: { Authorization: "Bearer t" },
        body: JSON.stringify({ productId: "divine-alignment-blueprint", view: "blueprint", answers: {} }),
      })
    );
    const empty = await missing.json();
    assert.equal(empty.blueprint.ready, false);
    assert.match(empty.blueprint.emptyBody, /four domain scores/);

    const bad = await POST(
      new Request("https://app.test/api/paid-content", {
        method: "POST",
        headers: { Authorization: "Bearer t" },
        body: JSON.stringify({ productId: "purpose-activation-toolkit", view: "blueprint", answers: {} }),
      })
    );
    assert.equal(bad.status, 400);
  } finally {
    globalThis.fetch = previous;
  }
});
