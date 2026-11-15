import "server-only";

import {
  CONTACT_ID,
  EBOOK_BUCKET,
  EBOOK_LOCATION_ID,
  EBOOK_SIGNED_URL_SECONDS,
  SUPABASE_PROJECT_URL,
  ebookObjectName,
  grantsEbook,
  type EbookFormat,
} from "@/lib/ebook/grant";

const GHL_API = "https://services.leadconnectorhq.com";
const DEFAULT_VERSION = "2021-07-28";

export type GhlContact = {
  id: string;
  locationId: string;
  tags: unknown;
};

type FetchLike = typeof fetch;

function ghlTokens(): string[] {
  return [process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB, process.env.GHL_TJB_PIT]
    .map((token) => token?.trim() ?? "")
    .filter((token, index, all) => token.length > 0 && all.indexOf(token) === index);
}

export function ghlConfigured(): boolean {
  return ghlTokens().length > 0;
}

function readContact(body: unknown): GhlContact | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { contact?: unknown };
  const contact = (record.contact && typeof record.contact === "object" ? record.contact : body) as {
    id?: unknown;
    locationId?: unknown;
    tags?: unknown;
  };
  if (typeof contact.id !== "string" || !CONTACT_ID.test(contact.id)) return null;
  return {
    id: contact.id,
    locationId: typeof contact.locationId === "string" ? contact.locationId : "",
    tags: contact.tags,
  };
}

async function ghlGet(path: string, fetchImpl: FetchLike): Promise<unknown | null> {
  const tokens = ghlTokens();
  if (tokens.length === 0) return null;
  const version = process.env.GHL_API_VERSION_TJB?.trim() || DEFAULT_VERSION;
  for (let i = 0; i < tokens.length; i += 1) {
    let response: Response;
    try {
      response = await fetchImpl(`${GHL_API}${path}`, {
        headers: {
          Authorization: `Bearer ${tokens[i]}`,
          Version: version,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return null;
    }
    if ((response.status === 401 || response.status === 403) && i + 1 < tokens.length) continue;
    if (!response.ok) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
}

/** Reads one contact and accepts it only for the TJB location plus source:ebook. */
export async function contactGrantsAccess(contactId: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  if (!CONTACT_ID.test(contactId)) return false;
  const body = await ghlGet(`/contacts/${encodeURIComponent(contactId)}`, fetchImpl);
  const contact = readContact(body);
  if (!contact) return false;
  return grantsEbook(contact, contactId);
}

/**
 * Duplicate-contact search by email, then the same tag and location check.
 * This does not create, update, or email the contact.
 */
export async function contactIdForEmail(email: string, fetchImpl: FetchLike = fetch): Promise<string | null> {
  const params = new URLSearchParams({ locationId: EBOOK_LOCATION_ID, email });
  const body = await ghlGet(`/contacts/search/duplicate?${params}`, fetchImpl);
  const found = readContact(body);
  if (!found) return null;
  const allowed = await contactGrantsAccess(found.id, fetchImpl);
  return allowed ? found.id : null;
}

export function supabaseService(): { url: string; key: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (url !== SUPABASE_PROJECT_URL || !key) return null;
  return { url, key };
}

export async function signedEbookUrl(format: EbookFormat, fetchImpl: FetchLike = fetch): Promise<string | null> {
  const service = supabaseService();
  if (!service) return null;
  const objectName = ebookObjectName(format);
  let response: Response;
  try {
    response = await fetchImpl(`${service.url}/storage/v1/object/sign/${EBOOK_BUCKET}/${objectName}`, {
      method: "POST",
      headers: {
        apikey: service.key,
        Authorization: `Bearer ${service.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: EBOOK_SIGNED_URL_SECONDS }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let body: { signedURL?: unknown; signedUrl?: unknown };
  try {
    body = (await response.json()) as { signedURL?: unknown; signedUrl?: unknown };
  } catch {
    return null;
  }
  const signed = typeof body.signedURL === "string" ? body.signedURL : body.signedUrl;
  if (typeof signed !== "string" || !signed) return null;
  const absolute = signed.startsWith("http")
    ? signed
    : `${service.url}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  if (!absolute.startsWith(`${SUPABASE_PROJECT_URL}/storage/v1/`)) return null;
  return absolute;
}

export type RateDecision = "allow" | "deny" | "unavailable";

/** Five attempts a minute and thirty a day, keyed by a hash of the IP. */
export async function takeAccessSlot(ipHash: string, fetchImpl: FetchLike = fetch): Promise<RateDecision> {
  const service = supabaseService();
  if (!service || ipHash.length < 32) return "unavailable";
  let response: Response;
  try {
    response = await fetchImpl(`${service.url}/rest/v1/rpc/ebook_access_rate_take`, {
      method: "POST",
      headers: {
        apikey: service.key,
        Authorization: `Bearer ${service.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_ip_hash: ipHash }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return "unavailable";
  }
  if (!response.ok) return "unavailable";
  try {
    const allowed = (await response.json()) as unknown;
    if (allowed === true) return "allow";
    if (allowed === false) return "deny";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
