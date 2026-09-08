"use client";

/**
 * Tells the Meta Pixel which catalog item this page is about.
 *
 * PageView says someone was here; ViewContent with content_ids says what they
 * looked at, using the same id the product feed (/api/meta-feed) gives the
 * catalog — the HighLevel product id. That match is what lets Meta show a
 * visitor the exact item they viewed and lets Advantage+ catalog ads optimise
 * on real browsing rather than page loads. Renders nothing.
 */

import { useEffect } from "react";
import { CURRENCY, trackWhenReady } from "@/lib/metaPixel";

export default function ViewContent({
  id,
  name,
  category,
  amount,
}: {
  id: string;
  name: string;
  category: string;
  amount?: number | null;
}) {
  useEffect(
    () =>
      trackWhenReady("ViewContent", {
        content_ids: [id],
        content_type: "product",
        content_name: name,
        content_category: category,
        ...(typeof amount === "number" ? { value: amount, currency: CURRENCY } : {}),
      }),
    [id, name, category, amount]
  );
  return null;
}
