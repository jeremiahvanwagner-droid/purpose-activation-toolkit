/**
 * Reader-facing names for saved answers. Prompt text is not in this module.
 * Pass the label map from /api/paid-content; without it, the fallback names
 * the module and not the exercise.
 */

const AREA: [string, string][] = [
  ["pa.", "Module 1"],
  ["dm.", "Module 2"],
  ["ata.", "Module 3"],
  ["ep.", "Module 4"],
  ["iaa.", "The Inner Alignment Audit"],
];

export function labelForField(id: string, path: string[] = [], labels: Record<string, string> = {}): string {
  if (id.startsWith("ep.deck.") && path.length > 1) {
    const nested = labels[`${id}#${path[1]}`];
    if (nested) return nested;
  }
  if (labels[id]) return labels[id];
  const area = AREA.find(([prefix]) => id.startsWith(prefix));
  return area ? `An answer in ${area[1]}` : "Saved answer";
}

export function previewValue(v: unknown, max = 90): string {
  const flat = (x: unknown): string[] => {
    if (x == null) return [];
    if (typeof x === "string") return x.trim() ? [x.trim()] : [];
    if (typeof x === "number" || typeof x === "boolean") return [String(x)];
    if (Array.isArray(x)) return x.flatMap(flat);
    if (typeof x === "object") return Object.values(x as object).flatMap(flat);
    return [];
  };
  const text = flat(v).join(" · ");
  if (!text) return "(empty)";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
