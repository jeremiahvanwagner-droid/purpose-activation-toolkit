/**
 * A stand-in for the Supabase endpoints the Toolkit calls, for reproducing save
 * and sync behaviour in a real browser without touching production.
 *
 *   node tests/harness/mock-supabase.mjs            (port 54399)
 *
 * Point a local dev server at it:
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
 *
 * It mimics what the app depends on: GoTrue's /user and token refresh, and
 * PostgREST reads/writes on public.workbooks and public.entitlements with the
 * same row-level rules (a user reads and writes only their own row; the
 * `updated_at` column is re-stamped on every UPDATE, like the production
 * trigger). Control endpoints under /__mock/ inject failures and simulate a
 * second device. Synthetic users only.
 */
import http from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54399);

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

export const USERS = [
  { id: "11111111-1111-4111-8111-111111111111", email: "reader.one@example.test", key: "one" },
  { id: "22222222-2222-4222-8222-222222222222", email: "reader.two@example.test", key: "two" },
];

function tokenFor(user, generation = 0) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    exp,
    gen: generation,
  })}.mock-signature`;
}

function userFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return USERS.find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function userJson(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: "2026-09-01T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
}

export function sessionFor(user, generation = 0) {
  return {
    access_token: tokenFor(user, generation),
    refresh_token: `refresh-${user.key}-${generation}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: userJson(user),
  };
}

let lastMicros = 0n;
/** Postgres-style timestamp with microseconds, strictly increasing. */
function nowStamp() {
  let micros = BigInt(Date.now()) * 1000n;
  if (micros <= lastMicros) micros = lastMicros + 1n;
  lastMicros = micros;
  const ms = Number(micros / 1000n);
  const frac = String(micros % 1000000n).padStart(6, "0");
  return new Date(ms).toISOString().slice(0, 19) + "." + frac + "+00:00";
}

function freshState() {
  return {
    workbooks: {},
    entitlements: USERS.map((u) => ({
      email: u.email,
      product_id: "purpose-activation-toolkit",
      purchased_at: "2026-09-14T00:00:00+00:00",
    })),
    fail: { read: 0, write: 0 },
    latencyMs: 0,
    log: [],
  };
}
let state = freshState();

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "authorization,apikey,content-type,prefer,accept,x-client-info,accept-profile,content-profile,x-supabase-api-version"
  );
  res.setHeader("Access-Control-Expose-Headers", "content-range");
}

function send(res, status, body, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function authUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  return userFromToken(token);
}

/** PostgREST filter `col=eq.value` pairs from the query string. */
function eqFilters(url) {
  const out = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (v.startsWith("eq.")) out[k] = v.slice(3);
  }
  return out;
}

function project(row, select) {
  if (!select || select === "*") return row;
  const cols = select.split(",").map((s) => s.trim());
  return Object.fromEntries(cols.map((c) => [c, row[c]]));
}

function shape(req, rows) {
  const accept = req.headers.accept || "";
  if (accept.includes("vnd.pgrst.object+json")) {
    if (rows.length !== 1) {
      return [406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `Results contain ${rows.length} rows`, hint: null }];
    }
    return [200, rows[0]];
  }
  return [200, rows];
}

function consumeFailure(kind) {
  const n = state.fail[kind];
  if (n === 0) return false;
  if (n > 0) state.fail[kind] = n - 1;
  return true;
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const user = authUser(req);
  const entry = { at: nowStamp(), method: req.method, path, query: url.search, user: user?.key ?? null };
  state.log.push(entry);
  if (state.log.length > 400) state.log.shift();
  if (state.latencyMs && !path.startsWith("/__mock")) await new Promise((r) => setTimeout(r, state.latencyMs));

  // ---------------------------------------------------------------- control
  if (path === "/__mock/state") return send(res, 200, { workbooks: state.workbooks, fail: state.fail, latencyMs: state.latencyMs });
  if (path === "/__mock/log") return send(res, 200, state.log.slice(-80));
  if (path === "/__mock/reset" && req.method === "POST") {
    state = freshState();
    return send(res, 200, { ok: true });
  }
  if (path === "/__mock/session") {
    const key = url.searchParams.get("user") || "one";
    const u = USERS.find((x) => x.key === key);
    return u ? send(res, 200, sessionFor(u)) : send(res, 404, { error: "no such user" });
  }
  if (path === "/__mock/fail" && req.method === "POST") {
    const body = (await readBody(req)) || {};
    if (typeof body.read === "number") state.fail.read = body.read;
    if (typeof body.write === "number") state.fail.write = body.write;
    return send(res, 200, { fail: state.fail });
  }
  if (path === "/__mock/entitle" && req.method === "POST") {
    // Grant or remove a synthetic entitlement row.
    const body = (await readBody(req)) || {};
    const product = body.product_id || "purpose-activation-toolkit";
    state.entitlements = state.entitlements.filter((e) => !(e.email === body.email && e.product_id === product));
    if (body.on) state.entitlements.push({ email: body.email, product_id: product, purchased_at: nowStamp() });
    return send(res, 200, { entitlements: state.entitlements.length });
  }
  if (path === "/__mock/latency" && req.method === "POST") {
    const body = (await readBody(req)) || {};
    state.latencyMs = Number(body.ms) || 0;
    return send(res, 200, { latencyMs: state.latencyMs });
  }
  if (path === "/__mock/write-as" && req.method === "POST") {
    // Simulates another device (or an older client) writing the row.
    const body = (await readBody(req)) || {};
    const existing = state.workbooks[body.user_id];
    state.workbooks[body.user_id] = { user_id: body.user_id, data: body.data ?? {}, updated_at: nowStamp() };
    return send(res, 200, { before: existing ?? null, after: state.workbooks[body.user_id] });
  }

  // ------------------------------------------------------------------- auth
  if (path === "/auth/v1/user" && req.method === "GET") {
    return user ? send(res, 200, userJson(user)) : send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
  }
  if (path === "/auth/v1/token" && req.method === "POST") {
    const body = (await readBody(req)) || {};
    const m = /^refresh-(\w+)-(\d+)$/.exec(body.refresh_token || "");
    const u = m && USERS.find((x) => x.key === m[1]);
    if (!u) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
    return send(res, 200, sessionFor(u, Number(m[2]) + 1));
  }
  if (path === "/auth/v1/logout") return send(res, 204);
  if (path.startsWith("/auth/v1/")) return send(res, 200, {});

  // --------------------------------------------------------------- workbooks
  if (path === "/rest/v1/workbooks") {
    const f = eqFilters(url);
    const select = url.searchParams.get("select");
    const prefer = req.headers.prefer || "";
    if (req.method === "GET") {
      if (consumeFailure("read")) return send(res, 503, { code: "PGRST000", message: "mock: read failure injected" });
      if (!user) return send(res, 200, []);
      const rows = Object.values(state.workbooks).filter(
        (r) => r.user_id === user.id && (!f.user_id || r.user_id === f.user_id)
      );
      const [status, body] = shape(req, rows.map((r) => project(r, select)));
      return send(res, status, body);
    }
    if (req.method === "POST") {
      if (consumeFailure("write")) return send(res, 503, { code: "PGRST000", message: "mock: write failure injected" });
      const body = await readBody(req);
      const rows = Array.isArray(body) ? body : [body];
      const out = [];
      for (const r of rows) {
        if (!user || r.user_id !== user.id) {
          return send(res, 403, { code: "42501", message: 'new row violates row-level security policy for table "workbooks"' });
        }
        const existing = state.workbooks[r.user_id];
        if (existing && !prefer.includes("resolution=merge-duplicates")) {
          return send(res, 409, { code: "23505", message: 'duplicate key value violates unique constraint "workbooks_pkey"' });
        }
        const next = existing
          ? { ...existing, data: r.data ?? existing.data, updated_at: nowStamp() } // UPDATE path: trigger restamps
          : { user_id: r.user_id, data: r.data ?? {}, updated_at: r.updated_at ?? nowStamp() };
        state.workbooks[r.user_id] = next;
        out.push(project(next, select));
      }
      if (prefer.includes("return=representation")) {
        const [status, b] = shape(req, out);
        return send(res, status === 200 ? 201 : status, b);
      }
      return send(res, 201);
    }
    if (req.method === "PATCH") {
      if (consumeFailure("write")) return send(res, 503, { code: "PGRST000", message: "mock: write failure injected" });
      const body = (await readBody(req)) || {};
      const matched = Object.values(state.workbooks).filter(
        (r) =>
          user &&
          r.user_id === user.id &&
          (!f.user_id || r.user_id === f.user_id) &&
          (!f.updated_at || r.updated_at === f.updated_at)
      );
      const out = matched.map((r) => {
        const next = { ...r, ...("data" in body ? { data: body.data } : {}), updated_at: nowStamp() };
        state.workbooks[r.user_id] = next;
        return project(next, select);
      });
      if (prefer.includes("return=representation")) {
        const [status, b] = shape(req, out);
        return send(res, status, b);
      }
      return send(res, 204);
    }
  }

  // ------------------------------------------------------------- entitlements
  if (path === "/rest/v1/entitlements" && req.method === "GET") {
    const f = eqFilters(url);
    const select = url.searchParams.get("select");
    const rows = state.entitlements.filter(
      (e) => user && e.email === user.email && (!f.email || e.email === f.email) && (!f.product_id || e.product_id === f.product_id)
    );
    const [status, body] = shape(req, rows.map((r) => project(r, select)));
    return send(res, status, body);
  }

  return send(res, 404, { message: `mock: no route for ${req.method} ${path}` });
});

server.listen(PORT, () => console.log(`mock supabase listening on http://localhost:${PORT}`));
