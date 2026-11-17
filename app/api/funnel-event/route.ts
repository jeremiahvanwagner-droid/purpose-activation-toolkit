// Beacon sink for public/created-to-serve/analytics.js. See lib/funnelEvents.ts.
// Always 204: a page view or a click on the way to checkout must never wait on,
// or fail because of, this counter.

import { FUNNEL_ORIGINS, parseFunnelEvent } from "@/lib/funnelEvents";
import { supabaseService } from "@/lib/ebook/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const done = () => new Response(null, { status: 204 });
  const origin = req.headers.get("origin");
  if (!origin || !FUNNEL_ORIGINS.has(origin)) return done();
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return done();
  }
  const row = parseFunnelEvent(raw, req.headers.get("user-agent"));
  const service = supabaseService();
  if (!row || !service) return done();
  try {
    const response = await fetch(`${service.url}/rest/v1/funnel_events`, {
      method: "POST",
      headers: {
        apikey: service.key,
        Authorization: `Bearer ${service.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.warn("funnel-event insert failed", response.status);
  } catch {
    console.warn("funnel-event insert unavailable");
  }
  return done();
}
