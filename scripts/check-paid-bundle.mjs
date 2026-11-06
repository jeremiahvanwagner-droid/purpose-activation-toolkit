/**
 * After `npm run build`, confirm paid curriculum strings are not in the
 * browser bundles. Run: node scripts/check-paid-bundle.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const PHRASES = [
  "tjb-paid-curriculum-sentinel-7f3a9c",
  "Purpose Activation is the intentional process of discerning",
  "Your decisions are spiritual stewardship",
  "somewhere between knowing and doing, the bridge collapses",
  "A good prompt does three things at once",
  "Many people are stuck because they confuse these levels",
  "Holy Spirit, I quiet my mind and open my heart",
  "How can I live in alignment with my higher purpose today",
];

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else out.push(full);
  }
  return out;
}

const staticDir = path.join(ROOT, ".next/static");
const serverDir = path.join(ROOT, ".next/server");
if (!statSync(staticDir, { throwIfNoEntry: false })) {
  console.error("Missing .next/static. Run npm run build first.");
  process.exit(1);
}

const leaks = [];
for (const file of files(staticDir)) {
  if (!/\.(js|css|html|json|txt)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const phrase of PHRASES) {
    if (text.includes(phrase)) leaks.push(`${path.relative(ROOT, file)} contains ${phrase.slice(0, 48)}`);
  }
}

let serverHasSentinel = false;
for (const file of files(serverDir)) {
  if (!file.endsWith(".js")) continue;
  if (readFileSync(file, "utf8").includes(PHRASES[0])) {
    serverHasSentinel = true;
    break;
  }
}

if (leaks.length) {
  console.error(leaks.join("\n"));
  process.exit(1);
}
if (!serverHasSentinel) {
  console.error("Sentinel missing from .next/server. The paid payload was not built.");
  process.exit(1);
}
console.log("Paid curriculum strings are absent from .next/static and present on the server.");
