/**
 * Signed HttpOnly cookie for the free eBook. The value is
 * v1.<contactId>.<exp>.<hmac>, so a stolen or edited id fails closed.
 * Web Crypto keeps this usable from a Node route. The secret stays in
 * EBOOK_COOKIE_SECRET and is never written into the cookie.
 */

const VERSION = "v1";

export type CookieProof = {
  contactId: string;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(signed);
}

export async function signEbookCookie(
  contactId: string,
  secret: string,
  expiresAt: number,
): Promise<string | null> {
  if (!secret || !Number.isInteger(expiresAt)) return null;
  const payload = `${VERSION}.${contactId}.${expiresAt}`;
  const signature = bytesToBase64Url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

export async function verifyEbookCookie(
  value: string | null | undefined,
  secret: string,
  nowSeconds: number,
  maxAgeSeconds: number,
): Promise<CookieProof | null> {
  if (!value || !secret) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [version, contactId, expRaw, signature] = parts;
  if (version !== VERSION || !expRaw || !signature) return null;
  if (!/^[0-9]{1,12}$/.test(expRaw)) return null;
  const expiresAt = Number(expRaw);
  if (expiresAt <= nowSeconds || expiresAt > nowSeconds + maxAgeSeconds + 120) return null;
  const payload = `${version}.${contactId}.${expRaw}`;
  const expected = await hmac(secret, payload);
  const given = base64UrlToBytes(signature);
  if (!given || !sameBytes(expected, given)) return null;
  return { contactId, expiresAt };
}
