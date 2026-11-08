import { NextResponse } from "next/server";
import { RAW_PRINT_BOOKS } from "@/lib/store/lulu-books";
import { legacyBookFeed } from "@/lib/store/legacy-meta-books";

/**
 * Compatibility updates for Meta's historical WooCommerce physical-goods catalog.
 * Contains existing book retailer IDs only; this feed must use an UPDATE schedule.
 * It must never replace /api/meta-feed (ads-only digital products) or
 * /api/meta-books-feed (the independent print-only catalog pilot).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = legacyBookFeed(RAW_PRINT_BOOKS);
  if (!result.ok) {
    console.error(`[meta-legacy-books-feed] ${result.message}`);
    return new NextResponse(`${result.message}\n`, {
      status: result.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="tjb-meta-legacy-book-updates.csv"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
