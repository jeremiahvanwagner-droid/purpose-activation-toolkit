import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const BANNED = [
  "lib/content/purposeActivation",
  "lib/content/decisionMaking",
  "lib/content/alignmentToAction",
  "lib/content/executionPrompts",
  "lib/content/alignmentBlueprint",
  "lib/paid/catalog",
  "lib/paid/pageCopy",
  "lib/paid/labels",
  "lib/paid/blueprintDocument",
  "lib/workbook",
];

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "legacy") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

test("client and app surfaces do not import paid curriculum modules", () => {
  const offenders: string[] = [];
  for (const file of files(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (rel.startsWith("lib/paid/") || rel.startsWith("lib/content/") || rel.startsWith("lib/workbook.ts") || rel.startsWith("tests/") || rel.startsWith("app/api/")) {
      continue;
    }
    const text = readFileSync(file, "utf8");
    const clientish = text.includes('"use client"') || rel.startsWith("components/") || rel.startsWith("app/");
    if (!clientish) continue;
    for (const banned of BANNED) {
      if (text.includes(banned)) offenders.push(`${rel} -> ${banned}`);
    }
  }
  assert.deepEqual(offenders, []);
});
