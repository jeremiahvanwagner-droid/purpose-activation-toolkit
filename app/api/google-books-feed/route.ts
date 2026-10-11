import { NextResponse } from "next/server";
import { RAW_PRINT_BOOKS } from "@/lib/store/lulu-books";
import { googleBooksFeed } from "@/lib/store/lulu-feed";

/**
 * Google Merchant Center product feed for the printed books sold through Lulu.
 *
 * Merchant Center fetches this on a schedule as a file data source. It is the
 * print manifest and nothing else: the digital products, the programs and the
 * calls are not in it, and neither this route nor the manifest reads HighLevel.
 * (HighLevel's own Merchant Center app is a different, separate data source —
 * the one that listed services at dead links and stale prices in 2026.)
 *
 * Tab-separated, one row per published edition, built from the same record
 * each book's page is built from, so the price Google is told is the price the
 * page shows. Shipping is set in Merchant Center, not here.
 *
 * Like the Meta feed it refuses rather than answer with an empty file:
 * 500 for an invalid manifest, 503 when nothing is published. Neither is cached.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const feed = googleBooksFeed(RAW_PRINT_BOOKS);

  if (!feed.ok) {
    if (feed.status === 500) console.error(`[google-books-feed] ${feed.message}`);
    return new NextResponse(`${feed.message}\n`, {
      status: feed.status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(feed.tsv, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'inline; filename="truth-j-blue-print-books-google.tsv"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
