import { NextResponse, type NextRequest } from "next/server";

/**
 * Host routing for the storefront.
 *
 * The store is built under /store so it lives in the same app, with the same
 * design tokens, as truthjblue.com. On its own hostname the "/store" prefix
 * would be noise — store.truthjblue.com/store/product/x — so requests that
 * arrive on the store host are rewritten onto the /store tree invisibly, and
 * anyone who types the prefixed form on that host is sent to the clean one.
 *
 * Only the hostnames listed here get this treatment. Preview deployments and
 * www keep the /store prefix, which is how the storefront is reviewed before
 * DNS moves — nothing here touches the marketing site or the app surface.
 */
const STORE_HOSTS = new Set(["store.truthjblue.com"]);

/**
 * The WooCommerce store that used to answer on store.truthjblue.com is gone,
 * but its URLs are still what search engines hold for this domain: on
 * 2026-09-06 every indexed result was /product/*, /product-tag/* or
 * /inner-alignment-audit, and every one returned 404. Permanent redirects
 * hand that standing to the pages that replaced them. This runs before the
 * host check so it covers www and the store host alike. 301 on purpose —
 * unlike the scorecard redirect in next.config.mjs, nothing here is ever
 * coming back, and search engines only transfer standing on a permanent code.
 *
 * Product paths are matched exactly, never by prefix: on the store host,
 * /product/<slug> is the live route for every current product, so a
 * "/product/" prefix rule redirects the storefront itself. (It did, for the
 * minutes 28c2795 was live.) /product-tag/ has no live equivalent on any
 * host, so the prefix is safe there.
 */
const LEGACY_AUDIT_PATH = "/inner-alignment-audit";
const LEGACY_TAG_PREFIX = "/product-tag/";
const LEGACY_PRODUCT_PATHS = new Set([
  "/product/mastering-mental-clarity",
  "/product/a-voyage-into-ancient-wisdom",
  "/product/emotional-alchemy-transforming-inner-barriers-into-bridges-of-growth",
  "/product/empowerment-collection-growth-and-success-bundle",
  "/product/living_abundantly_unleashing_the_power_within",
  "/product/unlocking-success-mastering-effective-communication-and-social-skills",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === LEGACY_AUDIT_PATH) {
    return NextResponse.redirect(new URL("/store/audit", "https://www.truthjblue.com"), 301);
  }
  if (LEGACY_PRODUCT_PATHS.has(pathname) || pathname.startsWith(LEGACY_TAG_PREFIX)) {
    return NextResponse.redirect(new URL("https://store.truthjblue.com/"), 301);
  }

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!STORE_HOSTS.has(host)) return NextResponse.next();

  // The paid Audit is taken on www: a reader's sign-in session and saved
  // answers live per origin, and the magic link lands on www. Sending the
  // store hostname's /audit there keeps one identity for one buyer.
  if (pathname === "/audit" || pathname === "/blueprint") {
    return NextResponse.redirect(
      new URL(`/store${pathname}${req.nextUrl.search}`, "https://www.truthjblue.com"),
      307
    );
  }

  if (pathname === "/store" || pathname.startsWith("/store/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice("/store".length) || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/store" : `/store${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next internals, API routes, and static files with an
  // extension (favicon.svg, the vendored _astro css, images).
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
