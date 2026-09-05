// Entitlement sync — the bridge from "they paid" to "they can get in".
//
// The original design routed GHL's payment.received webhook through the VPS,
// which was supposed to write public.entitlements. That path was never
// finished: the VPS has never received a single payment event, its handler has
// no Supabase write, and it holds no Supabase credentials. A real buyer would
// have paid $247 and still hit the paywall.
//
// This route replaces that chain with a pull instead of a push. GHL's payments
// API already knows every transaction and who made it, so we ask it directly
// when a signed-in reader turns out to have no entitlement on file. That means:
//   - no webhook to deliver, retry, or lose
//   - no workflow anyone has to remember to publish
//   - self-healing — a purchase missed today is granted the next time they load
//     a paid page, without anyone touching a database
//
// Identity comes from the caller's Supabase session, never from the request
// body: we hand their access token back to Supabase and use the email it
// returns. A caller can therefore only ever claim their OWN purchase, and only
// if GHL genuinely records one against that address.
//
// The product is the one thing the caller may name. Each product is keyed to
// the HighLevel payment link(s) it is sold through — the link id arrives on the
// payment record as `entitySourceId` — so a discount, a promo, or a future
// price change still grants access, and one product can never unlock another.

import { AUDIT_PAYMENT_LINK_ID, BLUEPRINT_PAYMENT_LINK_ID, TOOLKIT_PAYMENT_LINK_ID } from "@/lib/links";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

/** Products this route can grant, and the payment links that sell each.
 *  Ids match lib/entitlements.ts. Historical links belong here too — someone
 *  who bought at an old price still bought the product. */
const PRODUCTS: Record<string, { sourceIds: Set<string> }> = {
  "purpose-activation-toolkit": { sourceIds: new Set([TOOLKIT_PAYMENT_LINK_ID]) },
  "inner-alignment-audit": { sourceIds: new Set([AUDIT_PAYMENT_LINK_ID]) },
  "divine-alignment-blueprint": { sourceIds: new Set([BLUEPRINT_PAYMENT_LINK_ID]) },
};

/** Old clients sent no body; they were all asking about the Toolkit. */
const DEFAULT_PRODUCT_ID = "purpose-activation-toolkit";

/** Test-mode charges must not open a paid product. Flip only to exercise the
 *  matcher against GHL's sandbox. */
const REQUIRE_LIVE_MODE = true;

type GhlTransaction = {
  _id?: string;
  amount?: number;
  status?: string;
  liveMode?: boolean;
  contactId?: string;
  contactEmail?: string | null;
  entitySourceId?: string;
  entitySourceName?: string;
  createdAt?: string;
};

/** Resolve the caller's verified email from their Supabase access token.
 *  Returns null for anything we can't positively authenticate. */
async function emailFromAccessToken(token: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
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

/** The first succeeded, live purchase of one of `sourceIds` that GHL has
 *  recorded against this email. */
async function findPurchase(email: string, sourceIds: Set<string>): Promise<GhlTransaction | null> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  if (!token || !locationId) return null;

  try {
    const qs = new URLSearchParams({
      altId: locationId,
      altType: "location",
      limit: "100",
    });
    const res = await fetch(`${GHL_BASE}/payments/transactions?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[entitlement-sync] GHL transactions failed:", res.status, (await res.text()).slice(0, 300));
      return null;
    }

    const body = (await res.json()) as { data?: GhlTransaction[] };
    const rows = Array.isArray(body.data) ? body.data : [];

    // "succeeded" is the refund guard: GHL moves a refunded charge to status
    // "refunded", so a refund stops this from ever granting. It does not take
    // back an entitlement already written — revoking on refund is a separate
    // sweep nobody has asked for yet.
    const match = rows.find((tx) => {
      if (tx.status !== "succeeded") return false;
      if (REQUIRE_LIVE_MODE && tx.liveMode !== true) return false;
      if (!tx.entitySourceId || !sourceIds.has(tx.entitySourceId)) return false;
      return (tx.contactEmail ?? "").trim().toLowerCase() === email;
    });

    return match ?? null;
  } catch (err) {
    console.error("[entitlement-sync] GHL transactions error:", err);
    return null;
  }
}

/** Write the entitlement. Idempotent on (email, product_id). */
async function grant(email: string, productId: string, tx: GhlTransaction): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[entitlement-sync] cannot grant: Supabase service role not configured.");
    return false;
  }

  try {
    const res = await fetch(`${url}/rest/v1/entitlements?on_conflict=email,product_id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
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
    if (!res.ok) {
      console.error("[entitlement-sync] grant failed:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[entitlement-sync] grant error:", err);
    return false;
  }
}

async function requestedProductId(req: Request): Promise<string | null> {
  let productId: unknown = undefined;
  try {
    const body = (await req.json()) as { productId?: unknown };
    productId = body?.productId;
  } catch {
    /* no body, or not JSON — an old client asking about the Toolkit */
  }
  if (productId === undefined || productId === null || productId === "") return DEFAULT_PRODUCT_ID;
  if (typeof productId !== "string" || !(productId in PRODUCTS)) return null;
  return productId;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return Response.json({ entitled: false, error: "Not signed in." }, { status: 401 });
  }

  const productId = await requestedProductId(req);
  if (!productId) {
    return Response.json({ entitled: false, error: "Unknown product." }, { status: 400 });
  }

  const email = await emailFromAccessToken(token);
  if (!email) {
    return Response.json({ entitled: false, error: "Could not verify your session." }, { status: 401 });
  }

  const purchase = await findPurchase(email, PRODUCTS[productId].sourceIds);
  if (!purchase) {
    // No purchase on file. Not an error — most callers are readers who haven't
    // bought yet, and the paywall's unlock screen is the correct answer.
    return Response.json({ entitled: false, checked: true, productId });
  }

  const granted = await grant(email, productId, purchase);
  return Response.json({ entitled: granted, checked: true, productId });
}
