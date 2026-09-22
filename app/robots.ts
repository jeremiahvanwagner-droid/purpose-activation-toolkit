import type { MetadataRoute } from "next";

/**
 * Served at /robots.txt on every host this app answers for.
 *
 * Until this file existed the domain returned a Next 404 for both robots.txt
 * and sitemap.xml (verified 2026-09-06). Google had no map of the site, and
 * its entire index of truthjblue.com was eight dead WooCommerce URLs from the
 * old store — while /store, /about and /books had never been crawled.
 *
 * /toolkit, /module and /workbook are the paid app surfaces a buyer works
 * inside (app/(app)/(paid)), not pages meant to rank; their sales pages live
 * under /store. Keep crawlers on the pages that are supposed to be found.
 *
 * /audit is NOT one of those. It is the free Inner Alignment Audit — the
 * lead magnet every social bio and ad points at, with its own title,
 * description and self-canonical — and it sat in this list from 2026-09-06
 * to 2026-09-21 by mistake, grouped with the paid app. The paid Audit lives
 * at /store/audit and keeps itself out of the index with its own robots
 * metadata, which is the right tool for that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/toolkit", "/module/", "/workbook"],
    },
    sitemap: "https://www.truthjblue.com/sitemap.xml",
  };
}
