import { NextResponse } from "next/server";
import { RAW_PRINT_BOOKS } from "@/lib/store/lulu-books";
import { printBooksFeed } from "@/lib/store/lulu-feed";

/**
 * Meta product feed for the printed books sold through Lulu.
 *
 * Separate from /api/meta-feed on purpose, and built from a different source:
 * that feed is the ads-only catalog of digital products and must never be
 * attached to a Shop; this one carries physical paperbacks and nothing else,
 * from the committed print manifest. Neither reads the other's data.
 *
 * Nothing live is fetched to build it — not Lulu, not HighLevel — so there is
 * no upstream that can fail and leave a half-built file. The two ways it can
 * decline to answer are both deliberate, both uncached, and both leave a
 * scheduled fetch with an error rather than an empty catalog:
 *  - 500 when the manifest is invalid;
 *  - 503 while no edition has been released to the feed.
 *
 * Five minutes of shared cache, so a coordinated price change is visible to
 * the next fetch soon after the deploy that carries it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const feed = printBooksFeed(RAW_PRINT_BOOKS);

  if (!feed.ok) {
    if (feed.status === 500) console.error(`[meta-books-feed] ${feed.message}`);
    return new NextResponse(`${feed.message}\n`, {
      status: feed.status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(feed.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="truth-j-blue-print-books-feed.csv"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
