/**
 * Buyer pays, recipient gets the Toolkit seat.
 *
 * One live Toolkit transaction grants one seat. Recording a gift revokes the
 * buyer's row for that transaction (or writes a revoked tombstone if they
 * never had one) and writes the recipient's row as source gift:<transaction id>.
 * Complimentary and other-purchase rows are not taken away.
 *
 * The route is dark unless TOOLKIT_GIFT_ENABLED is exactly "true".
 * Nothing here sends email. Logs carry ids only, never addresses.
 */

import type { GhlTransaction } from "../entitlementMatch";
import { PRODUCTS, bearerEmail, findPurchase, serviceHeaders } from "./entitlementSync";
import { TOOLKIT_PRODUCT_ID } from "./revoke";
import { normalizeEmail } from "./signinAccount";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type GiftResult =
  | { ok: true }
  | { ok: false; status: 400 | 409 | 500 | 503; error: string };

const TOOLKIT_SOURCES = PRODUCTS[TOOLKIT_PRODUCT_ID].sourceIds;
const FIRST_NAME_MAX = 80;

export function giftEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["TOOLKIT_GIFT_ENABLED"] === "true";
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function logGift(event: "gift-created" | "gift-failed", fields: Record<string, string | number | null>): void {
  const line = JSON.stringify({ event, ...fields });
  if (event === "gift-failed") console.error(line);
  else console.log(line);
}

/** Optional first name. null means omitted. "invalid" means the client sent something we won't store. */
function cleanFirstName(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const name = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!name) return null;
  if (name.length > FIRST_NAME_MAX) return "invalid";
  return name;
}

type GiftRow = {
  id: string;
  transaction_id: string;
  buyer_email: string;
  recipient_email: string;
  status: string;
};

type EntitlementRow = {
  source: string | null;
  transaction_id: string | null;
  revoked_at: string | null;
};

function isPaymentBacked(source: string | null): boolean {
  return !!source && (source === "ghl-payments-sync" || source.startsWith("ghl:"));
}

async function readGifts(transactionId: string, fetchImpl: FetchLike): Promise<GiftRow[] | "error"> {
  const svc = serviceHeaders();
  if (!svc) return "error";
  const qs = new URLSearchParams({
    transaction_id: `eq.${transactionId}`,
    select: "id,transaction_id,buyer_email,recipient_email,status",
  });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/toolkit_gifts?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return "error";
    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === "string" ? r.id : "",
        transaction_id: typeof r.transaction_id === "string" ? r.transaction_id : "",
        buyer_email: typeof r.buyer_email === "string" ? r.buyer_email : "",
        recipient_email: typeof r.recipient_email === "string" ? r.recipient_email : "",
        status: typeof r.status === "string" ? r.status : "",
      };
    });
  } catch {
    return "error";
  }
}

async function readEntitlement(email: string, fetchImpl: FetchLike): Promise<EntitlementRow | null | "error"> {
  const svc = serviceHeaders();
  if (!svc) return "error";
  const qs = new URLSearchParams({
    email: `eq.${email}`,
    product_id: `eq.${TOOLKIT_PRODUCT_ID}`,
    select: "source,raw,revoked_at",
  });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, { headers: svc.headers, cache: "no-store" });
    if (!res.ok) return "error";
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return "error";
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const raw = row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : {};
    return {
      source: typeof row.source === "string" ? row.source : null,
      transaction_id: typeof raw.transaction_id === "string" ? raw.transaction_id : null,
      revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
    };
  } catch {
    return "error";
  }
}

async function insertGift(
  tx: GhlTransaction,
  buyerEmail: string,
  recipientEmail: string,
  firstName: string | null,
  fetchImpl: FetchLike
): Promise<{ ok: true; id: string } | { ok: false; conflict: boolean }> {
  const svc = serviceHeaders();
  if (!svc || !tx._id) return { ok: false, conflict: false };
  const headers = new Headers(svc.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", "return=representation");
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/toolkit_gifts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transaction_id: tx._id,
        order_id: tx.entityId ?? null,
        buyer_email: buyerEmail,
        buyer_contact_id: tx.contactId ?? null,
        recipient_email: recipientEmail,
        recipient_first_name: firstName,
        product_id: TOOLKIT_PRODUCT_ID,
        status: "granted",
      }),
    });
    if (res.status === 409) return { ok: false, conflict: true };
    if (!res.ok) return { ok: false, conflict: false };
    const rows = (await res.json()) as unknown;
    const id = Array.isArray(rows) && rows[0] && typeof (rows[0] as { id?: unknown }).id === "string" ? (rows[0] as { id: string }).id : "";
    if (!id) return { ok: false, conflict: false };
    return { ok: true, id };
  } catch {
    return { ok: false, conflict: false };
  }
}

async function deleteGift(id: string, fetchImpl: FetchLike): Promise<boolean> {
  const svc = serviceHeaders();
  if (!svc) return false;
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/toolkit_gifts?id=eq.${id}`, {
      method: "DELETE",
      headers: svc.headers,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function writeRecipient(
  recipientEmail: string,
  tx: GhlTransaction,
  giftId: string,
  buyerEmail: string,
  fetchImpl: FetchLike
): Promise<"ok" | "conflict" | "failed"> {
  const txId = tx._id;
  if (!txId) return "failed";
  const source = `gift:${txId}`;
  const existing = await readEntitlement(recipientEmail, fetchImpl);
  if (existing === "error") return "failed";
  if (existing && !existing.revoked_at) {
    if (existing.source === source && existing.transaction_id === txId) return "ok";
    return "conflict";
  }

  const svc = serviceHeaders();
  if (!svc) return "failed";
  const headers = new Headers(svc.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", "return=representation");
  const raw = {
    transaction_id: txId,
    gift_id: giftId,
    granted_by: buyerEmail,
    order_id: tx.entityId ?? null,
  };
  const fields = {
    purchased_at: tx.createdAt ?? new Date().toISOString(),
    source,
    gross_amount: null,
    contact_id: null,
    raw,
    revoked_at: null,
    revoked_reason: null,
  };

  try {
    if (existing) {
      const qs = new URLSearchParams({
        email: `eq.${recipientEmail}`,
        product_id: `eq.${TOOLKIT_PRODUCT_ID}`,
        revoked_at: "not.is.null",
      });
      const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(fields),
      });
      if (!res.ok) return "failed";
      const rows = (await res.json()) as unknown;
      return Array.isArray(rows) && rows.length > 0 ? "ok" : "failed";
    }

    headers.set("Prefer", "resolution=ignore-duplicates,return=minimal");
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?on_conflict=email,product_id`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: recipientEmail, product_id: TOOLKIT_PRODUCT_ID, ...fields }),
    });
    if (!res.ok) return "failed";
  } catch {
    return "failed";
  }

  const after = await readEntitlement(recipientEmail, fetchImpl);
  if (after === "error" || !after) return "failed";
  if (after.revoked_at) return "failed";
  if (after.source === source && after.transaction_id === txId) return "ok";
  return "conflict";
}

/**
 * Revoke the buyer's seat for this transaction only.
 * An existing complimentary row, or a row for a different purchase, is left as it is.
 * No row yet: a revoked tombstone blocks a later grant of this same charge.
 */
async function markBuyerGifted(
  buyerEmail: string,
  tx: GhlTransaction,
  giftId: string,
  fetchImpl: FetchLike
): Promise<"ok" | "failed"> {
  const txId = tx._id;
  const svc = serviceHeaders();
  if (!svc || !txId) return "failed";
  const revokedAt = new Date().toISOString();
  const reason = `gifted:${giftId}`;
  const headers = new Headers(svc.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", "return=representation");
  const qs = new URLSearchParams({
    email: `eq.${buyerEmail}`,
    product_id: `eq.${TOOLKIT_PRODUCT_ID}`,
    "raw->>transaction_id": `eq.${txId}`,
    or: '(source.eq.ghl-payments-sync,source.like."ghl:*")',
    revoked_at: "is.null",
  });
  try {
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?${qs}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ revoked_at: revokedAt, revoked_reason: reason }),
    });
    if (!res.ok) return "failed";
    const updated = (await res.json()) as unknown;
    if (Array.isArray(updated) && updated.length > 0) return "ok";
  } catch {
    return "failed";
  }

  const row = await readEntitlement(buyerEmail, fetchImpl);
  if (row === "error") return "failed";
  if (row) {
    if (isPaymentBacked(row.source) && row.transaction_id === txId && !row.revoked_at) return "failed";
    return "ok";
  }

  try {
    const insertHeaders = new Headers(svc.headers);
    insertHeaders.set("Content-Type", "application/json");
    insertHeaders.set("Prefer", "resolution=ignore-duplicates,return=minimal");
    const res = await fetchImpl(`${svc.url}/rest/v1/entitlements?on_conflict=email,product_id`, {
      method: "POST",
      headers: insertHeaders,
      body: JSON.stringify({
        email: buyerEmail,
        product_id: TOOLKIT_PRODUCT_ID,
        purchased_at: tx.createdAt ?? revokedAt,
        source: "ghl-payments-sync",
        gross_amount: tx.amount ?? null,
        contact_id: tx.contactId ?? null,
        raw: {
          transaction_id: txId,
          entity_source_id: tx.entitySourceId ?? null,
          entity_source_name: tx.entitySourceName ?? null,
          live_mode: tx.liveMode ?? null,
          written_by: "gift",
        },
        revoked_at: revokedAt,
        revoked_reason: reason,
      }),
    });
    if (!res.ok) return "failed";
  } catch {
    return "failed";
  }
  const after = await readEntitlement(buyerEmail, fetchImpl);
  if (after === "error" || !after) return "failed";
  if (isPaymentBacked(after.source) && after.transaction_id === txId && !after.revoked_at) return "failed";
  return "ok";
}

export async function createGift(args: {
  buyerEmail: string;
  recipientEmail: string;
  firstName: string | null;
  fetchImpl?: FetchLike;
}): Promise<GiftResult> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const buyerEmail = normalizeEmail(args.buyerEmail);
  const recipientEmail = normalizeEmail(args.recipientEmail);
  if (!buyerEmail || !recipientEmail) {
    return { ok: false, status: 400, error: "Enter the recipient's email." };
  }
  if (buyerEmail === recipientEmail) {
    return { ok: false, status: 400, error: "Use a different email than the one that paid." };
  }

  const lookup = await findPurchase(buyerEmail, TOOLKIT_SOURCES, null, fetchImpl);
  if (lookup.status === "unavailable") {
    logGift("gift-failed", { step: "lookup", transactionId: null });
    return { ok: false, status: 503, error: "The purchase could not be confirmed. Nothing was changed." };
  }
  if (lookup.status !== "found" || !lookup.transaction._id) {
    return { ok: false, status: 400, error: "No qualifying Toolkit purchase was found for this account." };
  }
  const tx = lookup.transaction;
  const transactionId = tx._id as string;

  const existing = await readGifts(transactionId, fetchImpl);
  if (existing === "error") {
    logGift("gift-failed", { step: "read-gift", transactionId });
    return { ok: false, status: 500, error: "The gift could not be saved." };
  }
  if (existing.length > 0) {
    const prior = existing[0];
    if (prior.status === "granted" && prior.recipient_email.trim().toLowerCase() === recipientEmail && prior.id) {
      const marked = await markBuyerGifted(buyerEmail, tx, prior.id, fetchImpl);
      if (marked === "failed") {
        logGift("gift-failed", { step: "buyer", transactionId, giftId: prior.id });
        return { ok: false, status: 500, error: "The gift could not be saved." };
      }
    }
    return { ok: false, status: 409, error: "This purchase has already been gifted." };
  }

  const recipient = await readEntitlement(recipientEmail, fetchImpl);
  if (recipient === "error") {
    logGift("gift-failed", { step: "read-recipient", transactionId });
    return { ok: false, status: 500, error: "The gift could not be saved." };
  }
  if (recipient && !recipient.revoked_at) {
    return { ok: false, status: 409, error: "That email already has Toolkit access." };
  }

  const inserted = await insertGift(tx, buyerEmail, recipientEmail, args.firstName, fetchImpl);
  if (!inserted.ok) {
    if (inserted.conflict) return { ok: false, status: 409, error: "This purchase has already been gifted." };
    logGift("gift-failed", { step: "insert-gift", transactionId });
    return { ok: false, status: 500, error: "The gift could not be saved." };
  }

  const wrote = await writeRecipient(recipientEmail, tx, inserted.id, buyerEmail, fetchImpl);
  if (wrote !== "ok") {
    const removed = await deleteGift(inserted.id, fetchImpl);
    logGift("gift-failed", { step: wrote === "conflict" ? "recipient-conflict" : "recipient", transactionId, giftId: inserted.id, rolledBack: removed ? 1 : 0 });
    if (wrote === "conflict") return { ok: false, status: 409, error: "That email already has Toolkit access." };
    return { ok: false, status: 500, error: "The gift could not be saved." };
  }

  const marked = await markBuyerGifted(buyerEmail, tx, inserted.id, fetchImpl);
  if (marked === "failed") {
    logGift("gift-failed", { step: "buyer", transactionId, giftId: inserted.id });
    return { ok: false, status: 500, error: "The gift could not be saved." };
  }

  logGift("gift-created", { transactionId, giftId: inserted.id });
  return { ok: true };
}

export async function handleGift(
  req: Request,
  fetchImpl: FetchLike = fetch,
  env: NodeJS.ProcessEnv = process.env
): Promise<Response> {
  if (!giftEnabled(env)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const buyerEmail = await bearerEmail(req, fetchImpl);
  if (!buyerEmail) return json(401, { ok: false, error: "Not signed in." });

  let body: { recipientEmail?: unknown; firstName?: unknown } = {};
  try {
    const parsed = (await req.json()) as { recipientEmail?: unknown; firstName?: unknown };
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    return json(400, { ok: false, error: "Enter the recipient's email." });
  }

  const firstName = cleanFirstName(body.firstName);
  if (firstName === "invalid") return json(400, { ok: false, error: "Use a shorter first name." });

  const result = await createGift({
    buyerEmail,
    recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : "",
    firstName,
    fetchImpl,
  });
  if (result.ok) return json(200, { ok: true });
  return json(result.status, { ok: false, error: result.error });
}
