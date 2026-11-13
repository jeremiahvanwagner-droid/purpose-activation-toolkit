// Stripe webhook: a full refund of a Purpose Activation Toolkit charge revokes
// Toolkit access. Logic and rules: lib/access/stripeRefund.ts.

import { handleStripeToolkitRefund } from "@/lib/access/stripeRefund";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleStripeToolkitRefund(req);
}

export async function GET() {
  return Response.json({ ok: false, error: "POST only." }, { status: 405 });
}
