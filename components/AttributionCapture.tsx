"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Remembers the arrival attribution (utm_*, click ids) on first paint.
 *  Renders nothing. Mounted once in the root layout so a reader who lands on
 *  the homepage from a TikTok LIVE and walks to /audit is still attributed. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
