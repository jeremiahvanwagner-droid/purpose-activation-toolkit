/**
 * Checkout email -> entitlement row. Synthetic tests drive this with a stubbed
 * fetch; nothing here opens a socket of its own.
 *
 * Identity is the Supabase user behind the bearer token. The body may name a
 * product and nothing else. Payment-backed rows are rechecked. Complimentary
 * and unclassified sources are kept. A failed lookup never deletes a row.
 */

import { decideAccess, paymentBackedSource, type EntitlementRow } from "./decide";
import { lookupPurchase, type GhlTransaction, type PageResult } from "../entitlementMatch";
import { AUDIT_PAYMENT_LINK_ID, BLUEPRINT_PAYMENT_LINK_ID, TOOLKIT_PAYMENT_LINK_ID } from "../links";

export const PRODUCTS: Record<string, { sourceIds: Set<string> }> = {
  "purpose-activation-toolkit": { sourceIds: new Set([TOOLKIT_PAYMENT_LINK_ID]) },
  "inner-alignment-audit": { sourceIds: new Set([AUDIT_PAYMENT_LINK_ID]) },
  "divine-alignment-blueprint": { sourceIds: new Set([BLUEPRINT_PAYMENT_LINK_ID]) },
};

const DEFAULT_PRODUCT_ID = "purpose-activation-toolkit";
const REQUIRE_LIVE_MODE = true;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export type SyncBody = {
  entitled: boolean;
  checked?: boolean;
  productId?: string;
  reason?: string;
  access?: "purchase" | "preserved" | "unavailable";
  revoked?: boolean;
  found?: boolean;
  error?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function supabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? null;
}

async function emailFromAccessToken(token: string, fetchImpl: FetchLike): Promise<string | null> {
  const url = supabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    const res = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { email?: unknown };
    if (typeof user.email !== "string" || !user.email) return null;
    return user.email.trim().toLowerCase();
  } catch {
    return null;
  }
}

function serviceHeaders(): { url: string; headers: Headers } | null {
  const url = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const headers = new Headers({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
  });
  return { url, headers };
}

async function readRow(email: string, productId: string, fetchImpl: FetchLike): Promise<EntitlementRow | null | "error"> {
  const svc = serviceHeaders();
  if (!svc) return "error";
  const qs = new URLSearchParams({
    email: `eq.${email}`,
    product_id: `eq.${productId}`,
    select: "source,purchased_at",
  });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const rows = (await res.json()) as { source?: unknown; purchased_at?: unknown }[];
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) return null;
    return {
      source: typeof row.source === "string" ? row.source : null,
      purchased_at: typeof row.purchased_at === "string" ? row.purchased_at : null,
    };
  } catch {
    return "error";
  }
}

async function findPurchase(email: string, sourceIds: Set<string>, fetchImpl: FetchLike) {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  const apiVersion = process.env.GHL_API_VERSION_TJB?.trim() || "2021-07-28";
  if (!token || !locationId) return { status: "unavailable" as const, reason: "lookup-not-configured", pagesRead: 0 };

  return lookupPurchase(
    async (offset, limit): Promise<PageResult> => {
      try {
        const qs = new URLSearchParams({
          altId: locationId,
          altType: "location",
          limit: String(limit),
          offset: String(offset),
        });
        if (REQUIRE_LIVE_MODE) qs.set("paymentMode", "live");
        const res = await fetchImpl(`https://services.leadconnectorhq.com/payments/transactions?${qs}`, {
          headers: { Authorization: `Bearer ${token}`, Version: apiVersion, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return { ok: false, reason: `lookup-http-${res.status}` };
        const body = (await res.json()) as { data?: GhlTransaction[] };
        return { ok: true, rows: Array.isArray(body.data) ? body.data : [] };
      } catch {
        return { ok: false, reason: "lookup-error" };
      }
    },
    email,
    sourceIds,
    { requireLive: REQUIRE_LIVE_MODE, pageSize: PAGE_SIZE, maxPages: MAX_PAGES }
  );
}

async function grant(email: string, productId: string, tx: GhlTransaction, fetchImpl: FetchLike): Promise<boolean> {
  const svc = serviceHeaders();
  if (!svc) return false;
  svc.headers.set("Content-Type", "application/json");
  svc.headers.set("Prefer", "resolution=merge-duplicates,return=minimal");
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?on_conflict=email,product_id`, {
      method: "POST",
      headers: svc.headers,
      body: JSON.stringify({
        email,
        product_id: productId,
        purchased_at: tx.createdAt ?? new Date().toISOString(),
        source: "ghl-payments-sync",
        gross_amount: tx.amount ?? null,
        contact_id: tx.contactId ?? null,
        raw: {
          transaction_id: tx._id ?? null,
          entity_source_id: tx.entitySourceId ?? null,
          entity_source_name: tx.entitySourceName ?? null,
          live_mode: tx.liveMode ?? null,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function revoke(email: string, productId: string, fetchImpl: FetchLike): Promise<boolean> {
  const svc = serviceHeaders();
  if (!svc) return false;
  const qs = new URLSearchParams({ email: `eq.${email}`, product_id: `eq.${productId}` });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, { method: "DELETE", headers: svc.headers });
    return res.ok;
  } catch {
    return false;
  }
}

async function requestedProductId(req: Request): Promise<string | null> {
  let productId: unknown = undefined;
  try {
    const body = (await req.clone().json()) as { productId?: unknown };
    productId = body?.productId;
  } catch {
    /* old clients omit the body and mean the Toolkit */
  }
  if (productId === undefined || productId === null || productId === "") return DEFAULT_PRODUCT_ID;
  if (typeof productId !== "string" || !(productId in PRODUCTS)) return null;
  return productId;
}

export async function bearerEmail(req: Request, fetchImpl: FetchLike = fetch): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return emailFromAccessToken(token, fetchImpl);
}

export async function handleEntitlementSync(req: Request, fetchImpl: FetchLike = fetch): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return Response.json({ entitled: false, error: "Not signed in." } satisfies SyncBody, { status: 401 });

  const productId = await requestedProductId(req);
  if (!productId) return Response.json({ entitled: false, error: "Unknown product." } satisfies SyncBody, { status: 400 });

  const email = await emailFromAccessToken(token, fetchImpl);
  if (!email) {
    return Response.json({ entitled: false, error: "Could not verify your session." } satisfies SyncBody, { status: 401 });
  }

  return Response.json(await reconcileEntitlement(email, productId, fetchImpl));
}

export async function reconcileEntitlement(email: string, productId: string, fetchImpl: FetchLike = fetch): Promise<SyncBody> {
  if (!(productId in PRODUCTS)) return { entitled: false, error: "Unknown product." };

  const row = await readRow(email, productId, fetchImpl);
  if (row === "error") {
    return { entitled: false, checked: false, reason: "lookup-unavailable", productId };
  }

  const lookup =
    row && !paymentBackedSource(row.source) ? null : await findPurchase(email, PRODUCTS[productId].sourceIds, fetchImpl);
  const decision = decideAccess(row, lookup);

  if (decision.action === "keep") {
    return {
      entitled: true,
      checked: decision.access !== "unavailable",
      productId,
      access: decision.access,
      ...(decision.access === "unavailable" ? { reason: "lookup-unavailable" } : {}),
    };
  }

  if (decision.action === "deny") {
    return {
      entitled: false,
      checked: decision.reason === "not-found",
      reason: decision.reason,
      productId,
    };
  }

  if (decision.action === "revoke") {
    const removed = await revoke(email, productId, fetchImpl);
    return removed
      ? { entitled: false, checked: true, reason: "not-found", revoked: true, productId }
      : { entitled: false, checked: true, reason: "revoke-failed", productId };
  }

  const granted = await grant(email, productId, decision.transaction, fetchImpl);
  return granted
    ? { entitled: true, checked: true, productId, access: "purchase" }
    : { entitled: false, checked: true, found: true, reason: "grant-failed", productId };
}
