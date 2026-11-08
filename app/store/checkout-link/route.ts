import { NextRequest, NextResponse } from "next/server";
import { resolveMetaBookCart, type MetaBookCartResult } from "@/lib/store/meta-shop-checkout";

/**
 * Existing Commerce Manager global checkout address:
 *   https://store.truthjblue.com/checkout-link/
 *
 * The storefront host rewrites this into /store/checkout-link via middleware.
 * Meta appends ?products=RETAILER_ID:QTY,...; only real in-stock paperbacks can
 * reach Lulu. This route never collects payment, addresses or customer data.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

function explanation(kind: Exclude<MetaBookCartResult["kind"], "ready">) {
  const messages: Record<Exclude<MetaBookCartResult["kind"], "ready">, string> = {
    missing: "No book selection was provided. Please choose a paperback from our current collection.",
    invalid: "Your book selection could not be read. Nothing has been added to a cart.",
    unavailable: "One or more selected products are no longer available to order. Nothing has been added to a cart.",
    unsupported_coupon: "This checkout cannot apply a Facebook or Instagram coupon. No purchase has been started.",
  };
  const title = kind === "missing" ? "Choose a book" : "We couldn't start checkout";
  // All interpolated content is server-owned; never echo query parameters.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title} | Truth J Blue</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;
display:grid;place-items:center;background:#081f3a;color:#f5f7fa;
font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
main{max-width:640px;border:1px solid #8a8f9855;border-radius:18px;
padding:36px;background:#0a0d14}h1{line-height:1.15;margin:8px 0 18px}
p{line-height:1.65;color:#ddd}a{display:inline-block;margin-top:18px;
padding:12px 18px;border-radius:8px;background:#c9a24d;color:#0a0d14;
font-weight:700;text-decoration:none}small{color:#c9a24d;letter-spacing:.09em}
</style></head><body><main><small>TRUTH J BLUE · BOOKS IN PRINT</small>
<h1>${title}</h1><p>${messages[kind]}</p>
<p>Our printed books are purchased securely through Lulu. You can choose
a current edition and open its Lulu checkout from the book page.</p>
<a href="https://store.truthjblue.com/books">Browse available books</a>
</main></body></html>`;
}

export async function GET(req: NextRequest) {
  const result = resolveMetaBookCart(req.nextUrl.searchParams);
  if (result.kind === "ready") {
    const redirect = NextResponse.redirect(result.checkoutUrl, 307);
    for (const [key, value] of Object.entries(HEADERS)) redirect.headers.set(key, value);
    return redirect;
  }
  return new NextResponse(explanation(result.kind), {
    status: result.kind === "missing" ? 200 : 422,
    headers: { ...HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}
