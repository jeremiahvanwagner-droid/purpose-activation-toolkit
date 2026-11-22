// Gift a Toolkit purchase to someone else.
//
// Dark unless TOOLKIT_GIFT_ENABLED is exactly "true": this route is then a 404.
// The buyer is the signed-in session, never an email in the body. No email is sent.

import { handleGift } from "@/lib/access/gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleGift(req);
}
