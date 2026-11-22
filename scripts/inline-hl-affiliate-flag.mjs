import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = /var HL_AFFILIATE_TRACKING = (?:true|false);/g;
const ANALYTICS = join(dirname(fileURLToPath(import.meta.url)), "../public/created-to-serve/analytics.js");

/** The static funnel cannot read Next env vars. `next build` rewrites the one
 *  assignment from NEXT_PUBLIC_HL_AFFILIATE_TRACKING. The committed source
 *  stays false, which is what ships when the variable is unset. */
export function rewriteAffiliateFlag(source, enabled) {
  const matches = source.match(MARKER);
  if (!matches || matches.length !== 1) {
    throw new Error("public/created-to-serve/analytics.js must contain exactly one HL_AFFILIATE_TRACKING assignment");
  }
  return source.replace(MARKER, `var HL_AFFILIATE_TRACKING = ${enabled ? "true" : "false"};`);
}

export function inlineHlAffiliateFlag() {
  if (!process.argv.includes("build")) return;
  const enabled = process.env.NEXT_PUBLIC_HL_AFFILIATE_TRACKING === "true";
  const source = readFileSync(ANALYTICS, "utf8");
  const next = rewriteAffiliateFlag(source, enabled);
  if (next !== source) writeFileSync(ANALYTICS, next);
}
