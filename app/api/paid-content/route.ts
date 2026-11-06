// Authorized curriculum and generated documents. No public cache.
// A caller who is not entitled receives an error and none of the payload.

import { bearerEmail, reconcileEntitlement } from "@/lib/access/entitlementSync";
import { PRODUCTS } from "@/lib/access/entitlementSync";
import { blueprintDocument } from "@/lib/paid/blueprintDocument";
import { PAID_CURRICULUM_SENTINEL, toolkitCurriculum } from "@/lib/paid/catalog";
import { buildWorkbook } from "@/lib/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOLKIT = "purpose-activation-toolkit";
const BLUEPRINT = "divine-alignment-blueprint";

function denied(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorize(req: Request, productId: string) {
  const email = await bearerEmail(req);
  if (!email) return { ok: false as const, response: denied(401, "Not signed in.") };
  if (!(productId in PRODUCTS)) return { ok: false as const, response: denied(400, "Unknown product.") };
  const access = await reconcileEntitlement(email, productId);
  if (!access.entitled) {
    const status = access.reason === "revoke-failed" || access.reason === "lookup-unavailable" ? 503 : 403;
    return { ok: false as const, response: denied(status, access.reason ?? "Not entitled.") };
  }
  return { ok: true as const, email };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId") || TOOLKIT;
  const part = url.searchParams.get("part") || "curriculum";
  if (productId !== TOOLKIT) return denied(400, "Unknown product.");
  const gate = await authorize(req, productId);
  if (!gate.ok) return gate.response;

  const curriculum = toolkitCurriculum();
  if (curriculum.sentinel !== PAID_CURRICULUM_SENTINEL) return denied(500, "Curriculum unavailable.");
  if (part === "labels") {
    return Response.json({ labels: curriculum.labels }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (part !== "curriculum") return denied(400, "Unknown part.");
  return Response.json({ curriculum }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  let body: { productId?: unknown; view?: unknown; answers?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return denied(400, "Expected JSON.");
  }
  const productId = typeof body.productId === "string" ? body.productId : "";
  const view = typeof body.view === "string" ? body.view : "";
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? (body.answers as Record<string, unknown>) : null;
  if (!answers) return denied(400, "Expected answers.");

  if (view === "workbook" && productId === TOOLKIT) {
    const gate = await authorize(req, productId);
    if (!gate.ok) return gate.response;
    const dated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const curriculum = toolkitCurriculum();
    return Response.json(
      { workbook: buildWorkbook(answers, dated), epigraph: curriculum.epigraph },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (view === "blueprint" && productId === BLUEPRINT) {
    const gate = await authorize(req, productId);
    if (!gate.ok) return gate.response;
    const dated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return Response.json(
      { blueprint: blueprintDocument(answers, dated) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return denied(400, "Unknown view.");
}
