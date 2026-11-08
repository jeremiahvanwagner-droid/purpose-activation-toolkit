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
 * shop.truthjblue.com is the address printed on the imprint page of the ten
 * Life Enhancement books, including every Lulu print copy already sold — text
 * that can never be re-issued. The domain joined this project on 2026-09-08,
 * but on its own it answers with the Toolkit homepage, because only the store
 * host is rewritten onto /store. Send it to the store's canonical host with
 * the path intact, so a reader typing the printed URL lands in the store and
 * search engines see one store rather than two. 308 so the method and path
 * survive; nothing else will ever live on this hostname.
 */
const SHOP_HOST = "shop.truthjblue.com";
const STORE_ORIGIN = "https://store.truthjblue.com";

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
 * Match book product paths exactly and redirect each to its /books/<slug>
 * page. Preserve social tracking query parameters. Never redirect all
 * /product/* paths: current store products live there too.
 * /product-tag/ has no live equivalent, so its prefix rule stays safe.
 */
const LEGACY_AUDIT_PATH = "/inner-alignment-audit";
const LEGACY_TAG_PREFIX = "/product-tag/";
/** Exact WooCommerce book URL aliases, without touching live /product routes. */
const LEGACY_BOOK_PATHS: Record<string, string> = {
  "/product/living_abundantly_unleashing_the_power_within": "living-abundantly",
  "/product/the-alchemy-of-intention-mastering-thought-word-and-action": "the-alchemy-of-intention",
  "/product/emotional-alchemy-transforming-inner-barriers-into-bridges-of-growth": "emotional-alchemy",
  "/product/empower-yourself-mastering-the-art-of-personal-growth": "empower-yourself",
  "/product/empower-and-prosper-a-guide-to-entrepreneurship": "empower-and-prosper",
  "/product/unlocking-success-mastering-effective-communication-and-social-skills": "unlocking-success",
  "/product/mastering-mental-clarity": "mastering-mental-clarity",
  "/product/a-voyage-into-ancient-wisdom": "a-voyage-into-ancient-wisdom-and-inner-empowerment",
  "/product/a-voyage-into-ancient-wisdom-and-inner-empowerment": "a-voyage-into-ancient-wisdom-and-inner-empowerment",
  "/product/we-are-without-excuse-succeeding-as-children-of-god": "we-are-without-excuse",
  "/product/from-seeds-to-success-the-divine-guide-to-cultivating-your-best-life": "from-seeds-to-success",
};

/** The former bundle has no direct equivalent in the new store. */
const LEGACY_PRODUCT_PATHS = new Set([
  "/product/empowerment-collection-growth-and-success-bundle",
]);

/**
 * HighLevel still believes its own storefront answers on store.truthjblue.com,
 * and writes product links in that storefront's shape —
 * /product-details/product/<product id>?variant=<price id> — into what it
 * generates. Its Google Merchant Center app pushed twelve of them: on
 * 2026-10-11 every one returned 404, Google reported "landing page error" on
 * the listings, and the account carried a Misrepresentation flag.
 *
 * The store already answers /product/<product id> for any product it sells
 * (catalog.ts looks a product up by id as well as by slug), and that page names
 * its slug address as canonical. So the old shape is sent there. An id the
 * store does not sell lands on the store's own 404, as it should.
 *
 * A prefix is safe here for the reason it is safe for /product-tag/: nothing
 * on any host lives under /product-details/. The variant is dropped — the
 * store shows one price per product. 301, because this shape is never coming
 * back to this hostname.
 */
const GHL_STORE_PRODUCT_PREFIX = "/product-details/product/";
const GHL_ID = /^[0-9a-f]{24}$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith(GHL_STORE_PRODUCT_PREFIX)) {
    const id = pathname.slice(GHL_STORE_PRODUCT_PREFIX.length).replace(/\/+$/, "");
    if (GHL_ID.test(id)) {
      return NextResponse.redirect(new URL(`/product/${id}`, STORE_ORIGIN), 301);
    }
  }

  if (pathname === LEGACY_AUDIT_PATH) {
    return NextResponse.redirect(new URL("/store/audit", "https://www.truthjblue.com"), 301);
  }
  // Match an old WooCommerce book with or without its historical trailing slash.
  const legacyProductPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const legacyBookSlug = LEGACY_BOOK_PATHS[legacyProductPath];
  if (legacyBookSlug) {
    const destination = new URL(`/books/${legacyBookSlug}`, STORE_ORIGIN);
    destination.search = req.nextUrl.search;
    return NextResponse.redirect(destination, 301);
  }
  if (LEGACY_PRODUCT_PATHS.has(legacyProductPath) || pathname.startsWith(LEGACY_TAG_PREFIX)) {
    return NextResponse.redirect(new URL("https://store.truthjblue.com/"), 301);
  }

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];

  if (host === SHOP_HOST) {
    return NextResponse.redirect(new URL(`${pathname}${req.nextUrl.search}`, STORE_ORIGIN), 308);
  }

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
