import type { MetadataRoute } from "next";

/**
 * Served at /robots.txt on every host this app answers for.
 *
 * Until this file existed the domain returned a Next 404 for both robots.txt
 * and sitemap.xml (verified 2026-09-06). Google had no map of the site, and
 * its entire index of truthjblue.com was eight dead WooCommerce URLs from the
 * old store — while /store, /about and /books had never been crawled.
 *
 * /audit, /toolkit, /module and /workbook are the paid app surfaces a buyer
 * works inside (app/(app)/(paid)), not pages meant to rank; their sales pages
 * live under /store. Keep crawlers on the pages that are supposed to be found.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/audit", "/toolkit", "/module/", "/workbook"],
    },
    sitemap: "https://www.truthjblue.com/sitemap.xml",
  };
}
