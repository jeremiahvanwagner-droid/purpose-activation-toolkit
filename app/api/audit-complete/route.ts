// Audit completion — the app's first server route.
//
// The rest of this app is client-only (Supabase-JS straight from the browser).
// This route exists because two things here MUST NOT ship to the browser: the
// GHL Private Integration Token and the Supabase service-role key.
//
// Contract, in priority order:
//   1. The reader always gets their book. Every downstream write is best-effort;
//      a GHL outage or a missing table can never block the download. The caller
//      shows the link on any 200, and this route returns 200 whenever the email
//      itself was well-formed.
//   2. The lead is durably recorded twice — once in Supabase (our record) and
//      once in GHL (the CRM that actually sends the follow-up email). Either can
//      fail independently without taking the other down.
//
// The email itself is sent by the GHL workflow that keys off the tag applied
// here — not by this route. That keeps sending on truthjblue.com's already-
// warm GHL sender instead of requiring fresh SPF/DKIM for a new domain.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

/** Tags the GHL delivery workflow keys off of. */
const AUDIT_TAGS = ["audit-completed", "interest:audit"];

type Payload = {
  email?: unknown;
  name?: unknown;
  /** Per-domain scores, if the client has them. Stored, never required. */
  profile?: unknown;
  /** Honeypot — real users never fill this. */
  website?: unknown;
};

/** Deliberately permissive: we would rather store a odd-looking real address
 *  than reject a valid one we failed to anticipate. */
function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

/** Upsert the lead into GHL and tag them so the delivery workflow fires.
 *  Never throws — returns whether it landed, for logging only. */
async function syncToGhl(email: string, name: string | null): Promise<boolean> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  if (!token || !locationId) return false;

  try {
    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locationId,
        email,
        ...(name ? { name } : {}),
        tags: AUDIT_TAGS,
        source: "Inner Alignment Audit",
      }),
    });
    if (!res.ok) {
      console.error("[audit-complete] GHL upsert failed:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit-complete] GHL upsert error:", err);
    return false;
  }
}

/** Record the lead in our own database via PostgREST + service role.
 *  Tolerates the table not existing yet, so this route is safe to deploy
 *  before the migration is applied. Never throws. */
async function recordLead(email: string, name: string | null, profile: unknown): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  try {
    // `on_conflict=email` is required, not optional: PostgREST infers ON CONFLICT
    // from the PRIMARY KEY unless the column is named, so without it a repeat
    // claim 409s on the unique email constraint instead of updating. Verified
    // against the live API — three repeat upserts return 200 and leave one row.
    const res = await fetch(`${url}/rest/v1/audit_leads?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email,
        name,
        profile: profile ?? null,
        source: "inner-alignment-audit",
      }),
    });
    if (!res.ok) {
      console.error("[audit-complete] lead insert failed:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit-complete] lead insert error:", err);
    return false;
  }
}

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Honeypot: bots fill every field. Return a normal-looking success so they
  // don't learn they were caught, but write nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true, ebookUrl: process.env.NEXT_PUBLIC_EBOOK_URL ?? null });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : null;

  // Both writes are best-effort and independent. Run them concurrently — the
  // reader is waiting on this response before their download appears.
  const [recorded, synced] = await Promise.all([
    recordLead(email, name, body.profile),
    syncToGhl(email, name),
  ]);

  if (!recorded && !synced) {
    // Both sinks failed. Still hand over the book — a lost lead is bad, a
    // broken promise on a live page is worse — but say so in the logs.
    console.error("[audit-complete] BOTH sinks failed for a real submission.");
  }

  return Response.json({
    ok: true,
    ebookUrl: process.env.NEXT_PUBLIC_EBOOK_URL ?? null,
    recorded,
    synced,
  });
}
