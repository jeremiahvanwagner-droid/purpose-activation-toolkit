import { createHash, timingSafeEqual } from "node:crypto";

import { EBOOK_BUCKET, SUPABASE_PROJECT_URL } from "@/lib/ebook/grant";
import { supabaseService } from "@/lib/ebook/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-off installer for the private eBook objects. It reads the service-role
 * key from the environment, checks the published hashes, and writes only into
 * ebook-private. Removed once the objects are in place.
 */

const PDF = {
  source: "https://www.truthjblue.com/downloads/You-Were-Created-to-Serve.pdf",
  object: "you-were-created-to-serve.pdf",
  sha256: "3af169e11865933a12cd3d64b58cfc408f21789a657edc65cf83b7f0944875b1",
  bytes: 3972270,
  contentType: "application/pdf",
} as const;

const ROLLBACK_EPUB = {
  source:
    "https://aagqvfwuixpxtdcrdxmv.supabase.co/storage/v1/object/public/project-assets/truth-j-blue/you-were-created-to-serve.epub",
  object: "rollback/you-were-created-to-serve-2026-07.epub",
  sha256: "d95df798325480708fc60777253b56a883a7c993a194c88a81de059ef4887b9d",
  bytes: 2681077,
  contentType: "application/epub+zip",
} as const;

const UPLOAD_OBJECT = "you-were-created-to-serve.epub";
const UPLOAD_ATTEMPTS = [31536000, 604800, 86400, 7200, 3600];

type FileSpec = {
  source: string;
  object: string;
  sha256: string;
  bytes: number;
  contentType: string;
};

function authorized(req: Request): boolean {
  const expected = process.env.EBOOK_PROVISION_TOKEN?.trim() ?? "";
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`download ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function serviceHeaders(key: string, contentType?: string): Headers {
  const headers = new Headers({
    apikey: key,
    Authorization: `Bearer ${key}`,
  });
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}

async function upload(url: string, key: string, spec: FileSpec, bytes: Uint8Array): Promise<void> {
  const headers = serviceHeaders(key, spec.contentType);
  headers.set("x-upsert", "true");
  headers.set("cache-control", "private, max-age=0");
  const response = await fetch(`${url}/storage/v1/object/${EBOOK_BUCKET}/${spec.object}`, {
    method: "POST",
    headers,
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`upload ${spec.object} ${response.status} ${detail}`);
  }
}

async function signedDownload(url: string, key: string, objectName: string): Promise<string> {
  const response = await fetch(`${url}/storage/v1/object/sign/${EBOOK_BUCKET}/${objectName}`, {
    method: "POST",
    headers: serviceHeaders(key, "application/json"),
    body: JSON.stringify({ expiresIn: 120 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`sign ${objectName} ${response.status}`);
  const body = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signed = body.signedURL || body.signedUrl;
  if (!signed) throw new Error(`sign ${objectName} empty`);
  const absolute = signed.startsWith("http") ? signed : `${url}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  if (!absolute.startsWith(`${SUPABASE_PROJECT_URL}/`)) throw new Error("signed host");
  return absolute;
}

async function install(spec: FileSpec, url: string, key: string) {
  const bytes = await download(spec.source);
  const digest = sha256(bytes);
  if (digest !== spec.sha256 || bytes.byteLength !== spec.bytes) {
    return { ok: false as const, object: spec.object, bytes: bytes.byteLength, sha256: digest };
  }
  await upload(url, key, spec, bytes);
  const verifiedBytes = await download(await signedDownload(url, key, spec.object));
  const verified = sha256(verifiedBytes);
  return {
    ok: verified === spec.sha256 && verifiedBytes.byteLength === spec.bytes,
    object: spec.object,
    bytes: verifiedBytes.byteLength,
    sha256: verified,
  };
}

function tokenExpiry(token: string): { expiresAt: string; seconds: number } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    if (typeof json.exp !== "number") return null;
    return {
      expiresAt: new Date(json.exp * 1000).toISOString(),
      seconds: json.exp - Math.floor(Date.now() / 1000),
    };
  } catch {
    return null;
  }
}

async function createUploadUrl(url: string, key: string) {
  let lastStatus = 0;
  let lastDetail = "";
  for (const expiresIn of UPLOAD_ATTEMPTS) {
    const headers = serviceHeaders(key, "application/json");
    headers.set("x-upsert", "true");
    const response = await fetch(`${url}/storage/v1/object/upload/sign/${EBOOK_BUCKET}/${UPLOAD_OBJECT}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ expiresIn }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      lastStatus = response.status;
      lastDetail = (await response.text()).slice(0, 180);
      continue;
    }
    const body = (await response.json()) as { url?: string; token?: string };
    if (!body.url || !body.token) {
      lastStatus = 502;
      lastDetail = "empty upload sign response";
      continue;
    }
    const absolute = new URL(
      body.url.startsWith("http")
        ? body.url
        : `${url}/storage/v1${body.url.startsWith("/") ? "" : "/"}${body.url}`,
    );
    if (!absolute.searchParams.get("token")) absolute.searchParams.set("token", body.token);
    if (!absolute.href.startsWith(`${SUPABASE_PROJECT_URL}/`)) throw new Error("upload host");
    return {
      ok: true as const,
      url: absolute.href,
      requestedExpiresIn: expiresIn,
      expiry: tokenExpiry(body.token),
    };
  }
  return { ok: false as const, status: lastStatus, detail: lastDetail };
}

export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("not found", { status: 404 });
  const service = supabaseService();
  if (!service) {
    return Response.json({ ok: false, error: "supabase service role is not configured for the umbrella project" }, { status: 503 });
  }
  try {
    const pdf = await install(PDF, service.url, service.key);
    const rollback = await install(ROLLBACK_EPUB, service.url, service.key);
    const upload = pdf.ok && rollback.ok ? await createUploadUrl(service.url, service.key) : null;
    const ok = pdf.ok && rollback.ok && upload?.ok === true;
    return Response.json({ ok, pdf, rollback, upload }, { status: ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "provision failed";
    return Response.json({ ok: false, error: message.slice(0, 300) }, { status: 502 });
  }
}

export function GET(): Response {
  return new Response("not found", { status: 404 });
}
