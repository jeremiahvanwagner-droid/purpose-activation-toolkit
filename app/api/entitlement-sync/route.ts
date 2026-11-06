// Entitlement sync — the bridge from "they paid" to "they can get in".
//
// Identity is the caller's Supabase session, never an email in the body.
// Payment-backed rows (source ghl-payments-sync or the documented ghl: snippet)
// are rechecked against HighLevel. A charge that is no longer succeeded,
// including the refunded status this repo already defines, revokes that row.
// manual: comps and any source this code cannot classify are kept.
// A lookup that fails or hits the page cap never deletes a row.
//
// The handler lives in lib/access/entitlementSync.ts so tests can stub fetch
// and refuse any other network. This file is the HTTP entry.

import { handleEntitlementSync } from "@/lib/access/entitlementSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleEntitlementSync(req);
}
