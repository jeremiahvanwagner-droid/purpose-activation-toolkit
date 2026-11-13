// Called by the sign-in form before it asks Supabase for a magic link.
// Creates or confirms the auth user only for an email that has bought (or has
// a live comp row); public sign-ups stay closed. See lib/access/signinAccount.ts.

import { handlePrepareSignin } from "@/lib/access/signinAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handlePrepareSignin(req);
}
