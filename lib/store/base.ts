import { headers } from "next/headers";

/**
 * Where the storefront's links point.
 *
 * The store is one tree of routes under /store. On its own hostname the
 * middleware hides that prefix, so a link written as "/product/x" is right on
 * store.truthjblue.com and wrong everywhere else (previews, www). Pages read
 * the base once from the request host and build every internal link from it,
 * which is what lets the same build be reviewed on a preview URL and then go
 * live on the store domain with nothing changed.
 */
const STORE_HOSTS = ["store.truthjblue.com"];

/** "" on the store host, "/store" anywhere else. Server components only. */
export function storeBase(): string {
  const host = (headers().get("host") ?? "").toLowerCase().split(":")[0];
  return STORE_HOSTS.includes(host) ? "" : "/store";
}

export function storeHref(base: string, path: string): string {
  if (path === "" || path === "/") return base || "/";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The marketing site and app. Absolute on purpose — on the store host these
 *  paths do not exist. */
export const SITE_URL = "https://www.truthjblue.com";

/** Canonical origin for the storefront, used in metadata regardless of the
 *  host a page happens to be rendered on. */
export const STORE_URL = "https://store.truthjblue.com";

export const SUPPORT_EMAIL = "support@truthjblue.com";

/** Public mailing address. Two lines, exactly as it appears elsewhere. */
export const ADDRESS_LINES = ["8301 State Line Rd Ste 220 #3245", "Kansas City, MO 64114"] as const;
