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
//   3. What the CRM already knows about this person is never erased. A contact
//      that arrived from a TikTok LIVE keeps its source and its tags when it
//      later completes the Audit. (Verified against the live API 2026-09-15:
//      `/contacts/upsert` REPLACES the tag list when a `tags` key is sent, and
//      overwrites `source` whenever one is sent — so this route sends neither
//      on the upsert, adds tags through the merge endpoint, and sets a source
//      only on a contact it just created.)
//
// The email itself is sent by the GHL workflow that keys off the tag applied
// here — not by this route. That keeps sending on truthjblue.com's already-
// warm GHL sender instead of requiring fresh SPF/DKIM for a new domain.

import { getTjbGhlCredentials, requestTjbGhl } from "@/lib/ghl/tjb";

/** Tags the GHL delivery workflow keys off of. */
const AUDIT_TAGS = ["audit-completed", "interest:audit"];

/** Source stamped on a contact this route CREATES. An existing contact keeps
 *  whatever source it already had (first touch). */
const DEFAULT_SOURCE = "Inner Alignment Audit";

// Where a captured lead lands in the CRM. Env-overridable because rebuilding a
// pipeline in GHL mints new ids, and a silent id mismatch would drop every
// opportunity while the contact upsert kept succeeding — the hardest kind of
// failure to notice. Defaults are the live `TJB — Funnel` ids as of 2026-08-18.
const FUNNEL_PIPELINE_ID =
  process.env.GHL_PIPELINE_ID_TJB_FUNNEL?.trim() || "g57dm2tcBSQ1vcnpu2ng";
const AUDIT_STAGE_ID =
  process.env.GHL_STAGE_ID_AUDIT_COMPLETED?.trim() || "26e8231f-4a9b-411c-8836-b160cb578dd5";

/** The Purpose Activation Toolkit is the sale this lead is worth if it converts. */
const OPPORTUNITY_VALUE = 247;

// ── Attribution ──────────────────────────────────────────────────────────────
// The browser captures utm_* / click ids on arrival (lib/attribution.ts) and
// sends them with the claim. Here they become: the contact's UTM custom fields,
// a `source:<source>-<medium>` tag (e.g. `source:tiktok-live`), a tag named
// after the campaign (e.g. `tiktok-live-2026-09-18`), and — for a brand-new
// contact only — a readable source such as "TikTok LIVE".

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ttclid",
  "fbclid",
] as const;
type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
type Attribution = Partial<Record<AttributionKey, string>>;

/** GHL custom field ids on the TJB sub-account (`locations_get-custom-fields`,
 *  2026-09-15). Env-overridable for the same reason as the pipeline ids. */
const UTM_FIELD_IDS: Partial<Record<AttributionKey, string>> = {
  utm_source: process.env.GHL_FIELD_ID_UTM_SOURCE?.trim() || "LgtTk4vZLOJiCxeXoxii",
  utm_medium: process.env.GHL_FIELD_ID_UTM_MEDIUM?.trim() || "iYNY4knSSx2TtgA74zs5",
  utm_campaign: process.env.GHL_FIELD_ID_UTM_CAMPAIGN?.trim() || "52k3EW3BaaZBoyRhFS5B",
  utm_content: process.env.GHL_FIELD_ID_UTM_CONTENT?.trim() || "lkO53b5FSNRPik2Lrpm8",
  utm_term: process.env.GHL_FIELD_ID_UTM_TERM?.trim() || "TNU5KkYMhYxm3oVBS0Uy",
};

const SOURCE_NAMES: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  pinterest: "Pinterest",
  skool: "Skool",
  email: "Email",
  google: "Google",
};

/** Only the keys we know, only strings, trimmed and bounded. Anything else in
 *  the object is ignored — this is user-controlled input from the browser. */
function cleanAttribution(raw: unknown): Attribution {
  const out: Attribution = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of ATTRIBUTION_KEYS) {
    const value = obj[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, 200);
    if (!trimmed) continue;
    out[key] = key.startsWith("utm_") && key !== "utm_campaign" ? trimmed.toLowerCase() : trimmed;
  }
  return out;
}

/** GHL lowercases tags itself; do it here so what we log matches what it keeps. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function attributionTags(a: Attribution): string[] {
  const tags: string[] = [];
  if (a.utm_source) {
    const src = slug(a.utm_source);
    const medium = a.utm_medium ? slug(a.utm_medium) : "";
    if (src) tags.push(medium ? `source:${src}-${medium}` : `source:${src}`);
  }
  if (a.utm_campaign) {
    const campaign = slug(a.utm_campaign);
    if (campaign) tags.push(campaign);
  }
  return tags;
}

/** "TikTok LIVE", "Instagram dm", "Email" … or the default when nothing came in. */
function sourceLabel(a: Attribution): string {
  if (!a.utm_source) return DEFAULT_SOURCE;
  const base = SOURCE_NAMES[a.utm_source] ?? a.utm_source;
  if (!a.utm_medium) return base;
  const medium = a.utm_medium === "live" ? "LIVE" : a.utm_medium;
  return `${base} ${medium}`;
}

function attributionCustomFields(a: Attribution): Array<{ id: string; value: string }> {
  const fields: Array<{ id: string; value: string }> = [];
  for (const key of ATTRIBUTION_KEYS) {
    const id = UTM_FIELD_IDS[key];
    const value = a[key];
    if (id && value) fields.push({ id, value });
  }
  return fields;
}

type Payload = {
  email?: unknown;
  name?: unknown;
  /** Per-domain scores, if the client has them. Stored, never required. */
  profile?: unknown;
  /** utm_* and click ids captured on arrival. Optional. */
  attribution?: unknown;
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

/** Upsert the lead into GHL, tag them so the delivery workflow fires, then
 *  put them in the pipeline so the lead is countable rather than just present.
 *
 *  Every half is best-effort and independent: a contact with no opportunity
 *  is a lead we can still email, so a pipeline failure must never cost us the
 *  contact. Never throws — returns whether the contact landed, for logging. */
async function syncToGhl(email: string, name: string | null, attribution: Attribution): Promise<boolean> {
  const credentials = getTjbGhlCredentials();
  if (!credentials) return false;

  let contactId: string | null = null;
  let isNew = false;
  try {
    const customFields = attributionCustomFields(attribution);
    // No `tags`, no `source`: see contract point 3 at the top of this file.
    const res = await requestTjbGhl("/contacts/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: credentials.locationId,
        email,
        ...(name ? { name } : {}),
        ...(customFields.length ? { customFields } : {}),
      }),
    });
    if (!res) return false;
    if (!res.ok) {
      console.error("[audit-complete] GHL upsert failed:", res.status);
      return false;
    }
    const body = (await res.json()) as { new?: boolean; contact?: { id?: string } };
    contactId = body?.contact?.id ?? null;
    isNew = body?.new === true;
  } catch (err) {
    console.error("[audit-complete] GHL upsert error:", err);
    return false;
  }
  if (!contactId) return false;

  // The contact is safe at this point. Everything below is upside, and the
  // tags come first because they are what makes the gift email go out.
  const tagged = await addTags(contactId, [...AUDIT_TAGS, ...attributionTags(attribution)]);
  if (isNew) await setSource(contactId, sourceLabel(attribution));
  await createOpportunity(credentials.locationId, contactId, name);
  return tagged;
}

/** `POST /contacts/{id}/tags` merges — the only tag write that cannot erase
 *  what another channel already stamped on this person. Never throws. */
async function addTags(contactId: string, tags: string[]): Promise<boolean> {
  try {
    const res = await requestTjbGhl(`/contacts/${encodeURIComponent(contactId)}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!res) return false;
    if (!res.ok) {
      console.error("[audit-complete] add tags failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit-complete] add tags error:", err);
    return false;
  }
}

/** First-touch source, written only on a contact this route just created. */
async function setSource(contactId: string, source: string): Promise<void> {
  try {
    const res = await requestTjbGhl(`/contacts/${encodeURIComponent(contactId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (res && !res.ok) console.error("[audit-complete] set source failed:", res.status);
  } catch (err) {
    console.error("[audit-complete] set source error:", err);
  }
}

/** Place the lead in `TJB — Funnel` at "Audit Completed".
 *
 *  Uses /opportunities/upsert, not /opportunities/, because a reader who claims
 *  twice must not produce two opportunities. Verified against the live API:
 *  the second call returns the same opportunity id with `new: false`.
 *  Never throws — a missing opportunity costs us reporting, not the lead. */
async function createOpportunity(
  locationId: string,
  contactId: string,
  name: string | null,
): Promise<void> {
  try {
    const res = await requestTjbGhl("/opportunities/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        contactId,
        pipelineId: FUNNEL_PIPELINE_ID,
        pipelineStageId: AUDIT_STAGE_ID,
        name: `${name ?? "Audit lead"} — Inner Alignment Audit`,
        status: "open",
        monetaryValue: OPPORTUNITY_VALUE,
      }),
    });
    if (!res) return;
    if (!res.ok) {
      console.error("[audit-complete] opportunity upsert failed:", res.status);
    }
  } catch (err) {
    console.error("[audit-complete] opportunity upsert error:", err);
  }
}

/** Record the lead in our own database via PostgREST + service role.
 *  Tolerates the table not existing yet, so this route is safe to deploy
 *  before the migration is applied. Never throws. */
async function recordLead(
  email: string,
  name: string | null,
  profile: unknown,
  attribution: Attribution,
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  try {
    // `on_conflict=email` is required, not optional: PostgREST infers ON CONFLICT
    // from the PRIMARY KEY unless the column is named, so without it a repeat
    // claim 409s on the unique email constraint instead of updating. Verified
    // against the live API — three repeat upserts return 200 and leave one row.
    //
    // The attribution rides inside `profile` rather than its own column so no
    // migration is needed; the column is jsonb and the shape is ours.
    const profileWithAttribution =
      Object.keys(attribution).length > 0
        ? { ...(profile && typeof profile === "object" ? (profile as object) : {}), attribution }
        : profile ?? null;
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
        profile: profileWithAttribution,
        source: attribution.utm_source ? slug(sourceLabel(attribution)) : "inner-alignment-audit",
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
  const attribution = cleanAttribution(body.attribution);

  // Both writes are best-effort and independent. Run them concurrently — the
  // reader is waiting on this response before their download appears.
  const [recorded, synced] = await Promise.all([
    recordLead(email, name, body.profile, attribution),
    syncToGhl(email, name, attribution),
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
