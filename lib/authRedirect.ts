/**
 * Where a magic link should land.
 *
 * Supabase Auth only honours redirect URLs on its allow-list; anything else
 * falls back to the project's Site URL (https://mvp.truthjblue.dev), and the
 * session tokens go there instead of to the Toolkit. toolkit.truthjblue.com is
 * not on that list (proven Nov 13 and again Nov 20, 2026: the emailed link
 * carried redirect_to=https://mvp.truthjblue.dev). www.truthjblue.com is, and
 * serves the same app, so links requested on the toolkit host land on www.
 * Remove the mapping once the toolkit host is added in Supabase Auth.
 */
const CANONICAL_FOR: Record<string, string> = {
  "toolkit.truthjblue.com": "https://www.truthjblue.com",
};

export function magicLinkOrigin(origin: string): string {
  try {
    return CANONICAL_FOR[new URL(origin).hostname] ?? origin;
  } catch {
    return origin;
  }
}
