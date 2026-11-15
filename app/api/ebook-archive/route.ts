import { createHash, timingSafeEqual } from "node:crypto";

import { EBOOK_BUCKET, SUPABASE_PROJECT_URL } from "@/lib/ebook/grant";
import { supabaseService } from "@/lib/ebook/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-off move of the public EPUB into the private rollback folder.
 * Removed after the public object is deleted. Reads the service-role key
 * from the environment and does not touch any other project-assets object.
 */

const SOURCE_BUCKET = "project-assets";
const SOURCE_KEY = "truth-j-blue/you-were-created-to-serve.epub";
const DEST_KEY = "rollback/project-assets-truth-j-blue-you-were-created-to-serve.epub";
const EXPECTED_SHA = "d95df798325480708fc60777253b56a883a7c993a194c88a81de059ef4887b9d";
const EXPECTED_BYTES = 2681077;

function authorized(req: Request): boolean {
  const expected = process.env.EBOOK_PROVISION_TOKEN?.trim() ?? "";
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function headers(key: string, contentType?: string): Headers {
  const result = new Headers({ apikey: key, Authorization: `Bearer ${key}` });
  if (contentType) result.set("Content-Type", contentType);
  return result;
}

async function signedGet(url: string, key: string, objectName: string): Promise<Uint8Array> {
  const sign = await fetch(`${url}/storage/v1/object/sign/${EBOOK_BUCKET}/${objectName}`, {
    method: "POST",
    headers: headers(key, "application/json"),
    body: JSON.stringify({ expiresIn: 120 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!sign.ok) throw new Error(`sign ${sign.status}`);
  const body = (await sign.json()) as { signedURL?: string; signedUrl?: string };
  const signed = body.signedURL || body.signedUrl;
  if (!signed) throw new Error("sign empty");
  const absolute = signed.startsWith("http") ? signed : `${url}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  const file = await fetch(absolute, { signal: AbortSignal.timeout(30000) });
  if (!file.ok) throw new Error(`download ${file.status}`);
  return new Uint8Array(await file.arrayBuffer());
}

export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("not found", { status: 404 });
  const service = supabaseService();
  if (!service) return Response.json({ ok: false, error: "supabase service role is not configured" }, { status: 503 });

  try {
    const copyHeaders = headers(service.key, "application/json");
    copyHeaders.set("x-upsert", "true");
    const copy = await fetch(`${service.url}/storage/v1/object/copy`, {
      method: "POST",
      headers: copyHeaders,
      body: JSON.stringify({
        bucketId: SOURCE_BUCKET,
        sourceKey: SOURCE_KEY,
        destinationBucket: EBOOK_BUCKET,
        destinationKey: DEST_KEY,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!copy.ok) {
      const detail = (await copy.text()).slice(0, 180);
      return Response.json({ ok: false, step: "copy", status: copy.status, detail }, { status: 502 });
    }

    const bytes = await signedGet(service.url, service.key, DEST_KEY);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== EXPECTED_SHA || bytes.byteLength !== EXPECTED_BYTES) {
      return Response.json({ ok: false, step: "verify", bytes: bytes.byteLength, sha256 }, { status: 502 });
    }

    const remove = await fetch(`${service.url}/storage/v1/object/${SOURCE_BUCKET}/${SOURCE_KEY}`, {
      method: "DELETE",
      headers: headers(service.key),
      signal: AbortSignal.timeout(20000),
    });
    if (!remove.ok) {
      const detail = (await remove.text()).slice(0, 180);
      return Response.json({ ok: false, step: "delete", status: remove.status, detail, sha256 }, { status: 502 });
    }

    const rest = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/`, { signal: AbortSignal.timeout(15000) });
    return Response.json({
      ok: true,
      copied: DEST_KEY,
      bytes: bytes.byteLength,
      sha256,
      deleted: SOURCE_KEY,
      restStatus: rest.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "archive failed";
    return Response.json({ ok: false, error: message.slice(0, 300) }, { status: 502 });
  }
}

export function GET(): Response {
  return new Response("not found", { status: 404 });
}
