/** Truth J Blue location. Access is refused for every other location. */
export const EBOOK_LOCATION_ID = "TW8JsPW5NMnA3tfK2XLn";

/** The free eBook form. A recorded submission of this form is enough for access. */
export const EBOOK_FORM_ID = "ABcYghQi26TIMoynS0YC";

/**
 * Either tag is enough. Consent tags are not required, and a purchase tag is
 * not enough on its own. Buyers are not added unless they submitted the form.
 */
export const EBOOK_ACCESS_TAGS = ["source:ebook", "ywcts-resource-send-attempted"] as const;

/** Kept for callers that still name the original tag. */
export const EBOOK_TAG = "source:ebook";

export const EBOOK_COOKIE_NAME = "tjb_ebook";
export const EBOOK_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const EBOOK_SIGNED_URL_SECONDS = 300;
export const EBOOK_BUCKET = "ebook-private";
export const SUPABASE_PROJECT_URL = "https://aagqvfwuixpxtdcrdxmv.supabase.co";
export const ACCESS_MIN_DELAY_MS = 450;

/** HighLevel contact ids are opaque and short. Anything else is not looked up. */
export const CONTACT_ID = /^[A-Za-z0-9]{10,30}$/;

export type EbookFormat = "pdf" | "epub";

export function parseEbookFormat(value: string | null): EbookFormat | null {
  if (value === "pdf" || value === "epub") return value;
  return null;
}

export function ebookObjectName(format: EbookFormat): string {
  switch (format) {
    case "pdf":
      return "you-were-created-to-serve.pdf";
    case "epub":
      return "you-were-created-to-serve.epub";
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}

export function ebookGateEnforced(raw = process.env.EBOOK_GATE_ENFORCE): boolean {
  const value = raw?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function cookieSecret(raw = process.env.EBOOK_COOKIE_SECRET): string {
  return raw?.trim() ?? "";
}

function tagName(tag: unknown): string {
  if (typeof tag === "string") return tag.trim().toLowerCase();
  if (tag && typeof tag === "object" && "name" in tag && typeof tag.name === "string") {
    return tag.name.trim().toLowerCase();
  }
  return "";
}

export function hasEbookAccessTag(tags: unknown): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => (EBOOK_ACCESS_TAGS as readonly string[]).includes(tagName(tag)));
}

/** True when this contact is in the TJB location and carries either access tag. */
export function grantsEbook(
  contact: { id?: string; locationId?: string; tags?: unknown },
  expectedId?: string,
): boolean {
  if (expectedId && contact.id !== expectedId) return false;
  if (contact.locationId !== EBOOK_LOCATION_ID) return false;
  return hasEbookAccessTag(contact.tags);
}

/** A form-submission payload counts only when this contact submitted this form. */
export function submissionIncludesContact(body: unknown, contactId: string): boolean {
  if (!body || typeof body !== "object") return false;
  const submissions = (body as { submissions?: unknown }).submissions;
  if (!Array.isArray(submissions)) return false;
  return submissions.some((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as { contactId?: unknown; formId?: unknown };
    return row.contactId === contactId && row.formId === EBOOK_FORM_ID;
  });
}

export function normalizeEbookEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = req.headers.get("x-real-ip")?.trim();
  return real || "unknown";
}

export async function rateLimitHash(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tjb-ebook-access\n${ip}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A posted form from another site is refused. A browser navigation and curl omit Origin. */
export function isCrossSitePost(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(req.url).host;
  } catch {
    return true;
  }
}

export function readEbookCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== EBOOK_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return null;
    }
  }
  return null;
}
