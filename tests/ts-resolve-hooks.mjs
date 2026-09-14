import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HAS_EXT = /\.(?:[cm]?[jt]sx?|json)$/;

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith("@/")) spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;

  const local = spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:");
  if (local && !HAS_EXT.test(spec) && context.parentURL) {
    const base = spec.startsWith("file:")
      ? fileURLToPath(spec)
      : path.resolve(path.dirname(fileURLToPath(context.parentURL)), spec);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(spec, context);
}
