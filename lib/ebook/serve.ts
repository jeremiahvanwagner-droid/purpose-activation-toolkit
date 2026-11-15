import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { accessPageHtml } from "@/lib/ebook/accessPage";
import { signEbookCookie, verifyEbookCookie } from "@/lib/ebook/cookie";
import {
  ACCESS_MIN_DELAY_MS,
  CONTACT_ID,
  EBOOK_COOKIE_MAX_AGE_SECONDS,
  EBOOK_COOKIE_NAME,
  clientIp,
  cookieSecret,
  ebookGateEnforced,
  isCrossSitePost,
  normalizeEbookEmail,
  parseEbookFormat,
  rateLimitHash,
  readEbookCookie,
} from "@/lib/ebook/grant";
import { gateResourceHtml } from "@/lib/ebook/resourceHtml";
import {
  contactGrantsAccess,
  contactIdForEmail,
  signedEbookUrl,
  takeAccessSlot,
  type RateDecision,
} from "@/lib/ebook/upstream";

type FetchLike = typeof fetch;

export type EbookDeps = {
  fetchImpl?: FetchLike;
  now?: () => number;
  secret?: string;
  enforce?: boolean;
  minDelayMs?: number;
  html?: string;
  rateTake?: (ipHash: string) => Promise<RateDecision>;
  contactAllowed?: (contactId: string) => Promise<boolean>;
  emailToContact?: (email: string) => Promise<string | null>;
  signUrl?: (format: "pdf" | "epub") => Promise<string | null>;
};

function nowMs(deps: EbookDeps): number {
  return deps.now ? deps.now() : Date.now();
}

function secretOf(deps: EbookDeps): string {
  return deps.secret ?? cookieSecret();
}

function landing(req: Request, status: 302 | 303): NextResponse {
  const response = NextResponse.redirect(new URL("/created-to-serve", req.url), status);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function withCookie(response: NextResponse, contactId: string, deps: EbookDeps): Promise<NextResponse | null> {
  const secret = secretOf(deps);
  const expiresAt = Math.floor(nowMs(deps) / 1000) + EBOOK_COOKIE_MAX_AGE_SECONDS;
  const value = await signEbookCookie(contactId, secret, expiresAt);
  if (!value) return null;
  response.cookies.set({
    name: EBOOK_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: EBOOK_COOKIE_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function proofFromCookie(req: Request, deps: EbookDeps): Promise<string | null> {
  const proof = await verifyEbookCookie(
    readEbookCookie(req),
    secretOf(deps),
    Math.floor(nowMs(deps) / 1000),
    EBOOK_COOKIE_MAX_AGE_SECONDS,
  );
  if (!proof || !CONTACT_ID.test(proof.contactId)) return null;
  return proof.contactId;
}

async function allowContact(contactId: string, deps: EbookDeps): Promise<boolean> {
  if (deps.contactAllowed) return deps.contactAllowed(contactId);
  return contactGrantsAccess(contactId, deps.fetchImpl);
}

/** GET /api/ebook — a contact id or a valid cookie, then a five-minute signed URL. */
export async function downloadEbook(req: Request, deps: EbookDeps = {}): Promise<Response> {
  const format = parseEbookFormat(new URL(req.url).searchParams.get("f"));
  if (!format) return landing(req, 302);
  const supplied = new URL(req.url).searchParams.get("c");
  let contactId: string | null = null;
  if (supplied) {
    if (!(await allowContact(supplied, deps))) return landing(req, 302);
    contactId = supplied;
  } else {
    contactId = await proofFromCookie(req, deps);
    if (!contactId) return landing(req, 302);
  }
  const signed = deps.signUrl ? await deps.signUrl(format) : await signedEbookUrl(format, deps.fetchImpl);
  if (!signed) return landing(req, 302);
  const response = NextResponse.redirect(signed, 302);
  return (await withCookie(response, contactId, deps)) ?? landing(req, 302);
}

/** GET /created-to-serve/get?c= — validate, set the cookie, drop the id from the next URL. */
export async function openFromEmail(req: Request, deps: EbookDeps = {}): Promise<Response> {
  const contactId = new URL(req.url).searchParams.get("c") ?? "";
  if (!(await allowContact(contactId, deps))) return landing(req, 302);
  const response = NextResponse.redirect(new URL("/created-to-serve/resource", req.url), 302);
  return (await withCookie(response, contactId, deps)) ?? landing(req, 302);
}

function resourceFile(): string {
  return readFileSync(join(process.cwd(), "public/created-to-serve/resource/index.html"), "utf8");
}

/** The resource page. Enforcement is off unless EBOOK_GATE_ENFORCE is set. */
export async function serveResource(req: Request, deps: EbookDeps = {}): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.has("c")) {
    url.searchParams.delete("c");
    const clean = new URL("/created-to-serve/resource", url.origin);
    const search = url.searchParams.toString();
    if (search) clean.search = search;
    const response = NextResponse.redirect(clean, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  const html = deps.html ?? resourceFile();
  const enforce = deps.enforce ?? ebookGateEnforced();
  if (!enforce) {
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Ebook-Gate": "open",
      },
    });
  }
  const contactId = await proofFromCookie(req, deps);
  if (!contactId) return landing(req, 302);
  let gated: string;
  try {
    gated = gateResourceHtml(html);
  } catch {
    return landing(req, 302);
  }
  return new Response(gated, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Ebook-Gate": "enforced",
    },
  });
}

export function serveAccessPage(): Response {
  return new Response(accessPageHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

async function pad(started: number, deps: EbookDeps): Promise<void> {
  const minimum = deps.minDelayMs ?? ACCESS_MIN_DELAY_MS;
  const wait = minimum - (nowMs(deps) - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/**
 * POST /created-to-serve/access. A matching contact and a miss both leave
 * through a redirect, after the same minimum wait. Nothing is written to HighLevel.
 */
export async function lookupAccess(req: Request, deps: EbookDeps = {}): Promise<Response> {
  const started = nowMs(deps);
  const fail = async () => {
    await pad(started, deps);
    return landing(req, 303);
  };
  if (isCrossSitePost(req)) return fail();
  const ipHash = await rateLimitHash(clientIp(req));
  const decision = deps.rateTake ? await deps.rateTake(ipHash) : await takeAccessSlot(ipHash, deps.fetchImpl);
  if (decision !== "allow") return fail();
  let email: string | null = null;
  try {
    const form = await req.formData();
    email = normalizeEbookEmail(form.get("email"));
  } catch {
    email = null;
  }
  if (!email) return fail();
  const contactId = deps.emailToContact
    ? await deps.emailToContact(email)
    : await contactIdForEmail(email, deps.fetchImpl);
  if (!contactId) return fail();
  await pad(started, deps);
  const response = NextResponse.redirect(new URL("/created-to-serve/resource", req.url), 303);
  return (await withCookie(response, contactId, deps)) ?? fail();
}
