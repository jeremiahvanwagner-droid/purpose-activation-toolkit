/**
 * Lets a buyer receive a magic link while public sign-ups stay closed.
 *
 * The Supabase project has "Allow new users to sign up" off, so signInWithOtp
 * for an email with no confirmed auth user fails with `signup_disabled` and no
 * link is sent. Before the browser asks for a link, this checks that the email
 * has a live entitlement row or a qualifying HighLevel purchase, and if so
 * creates (or confirms) its auth user with the service role. It never writes
 * an entitlement row: access is still decided by reconcileEntitlement after
 * sign-in. The response is the same either way, so it reveals nothing about
 * who has bought.
 */

import { PRODUCTS, findPurchase, serviceHeaders } from "./entitlementSync";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type PrepareResult = "created" | "confirmed" | "ready" | "not-eligible" | "unavailable";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

async function hasLiveRow(email: string, fetchImpl: FetchLike): Promise<boolean | "error"> {
  const svc = serviceHeaders();
  if (!svc) return "error";
  const qs = new URLSearchParams({ email: `eq.${email}`, revoked_at: "is.null", select: "product_id", limit: "1" });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return "error";
  }
}

async function hasPurchase(email: string, fetchImpl: FetchLike): Promise<boolean | "error"> {
  const sourceIds = new Set<string>();
  for (const p of Object.values(PRODUCTS)) for (const id of p.sourceIds) sourceIds.add(id);
  const lookup = await findPurchase(email, sourceIds, null, fetchImpl);
  if (lookup.status === "found") return true;
  if (lookup.status === "unavailable") return "error";
  return false;
}

type AdminUser = { id?: string; email?: string; email_confirmed_at?: string | null };

async function findAuthUser(email: string, fetchImpl: FetchLike): Promise<AdminUser | null | "error"> {
  const svc = serviceHeaders();
  if (!svc) return "error";
  try {
    const qs = new URLSearchParams({ filter: email, per_page: "50" });
    const res = await fetchImpl(`${svc.url}/auth/v1/admin/users?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const body = (await res.json()) as { users?: AdminUser[] };
    const users = Array.isArray(body.users) ? body.users : [];
    return users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
  } catch {
    return "error";
  }
}

export async function prepareSignin(email: string, fetchImpl: FetchLike = fetch): Promise<PrepareResult> {
  const svc = serviceHeaders();
  if (!svc) return "unavailable";

  let eligible = await hasLiveRow(email, fetchImpl);
  if (eligible !== true) {
    const bought = await hasPurchase(email, fetchImpl);
    if (bought === true) eligible = true;
    else if (bought === "error" || eligible === "error") return "unavailable";
    else return "not-eligible";
  }

  const existing = await findAuthUser(email, fetchImpl);
  if (existing === "error") return "unavailable";
  svc.headers.set("Content-Type", "application/json");
  try {
    if (!existing) {
      const res = await fetchImpl(`${svc.url}/auth/v1/admin/users`, {
        method: "POST",
        headers: svc.headers,
        body: JSON.stringify({ email, email_confirm: true }),
      });
      return res.ok ? "created" : "unavailable";
    }
    if (!existing.email_confirmed_at && existing.id) {
      const res = await fetchImpl(`${svc.url}/auth/v1/admin/users/${encodeURIComponent(existing.id)}`, {
        method: "PUT",
        headers: svc.headers,
        body: JSON.stringify({ email_confirm: true }),
      });
      return res.ok ? "confirmed" : "unavailable";
    }
    return "ready";
  } catch {
    return "unavailable";
  }
}

export async function handlePrepareSignin(req: Request, fetchImpl: FetchLike = fetch): Promise<Response> {
  let raw: unknown;
  try {
    raw = ((await req.json()) as { email?: unknown })?.email;
  } catch {
    raw = undefined;
  }
  const email = normalizeEmail(raw);
  if (!email) return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  const result = await prepareSignin(email, fetchImpl);
  console.log(JSON.stringify({ event: "prepare-signin", result }));
  // Same body for every outcome, so the endpoint does not reveal who has bought.
  return Response.json({ ok: true });
}
