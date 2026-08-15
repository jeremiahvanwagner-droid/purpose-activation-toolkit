/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * The brand-site pages (/start, /books, /about, /connect, /legal) are
   * static HTML built by the Astro repo (truthjblue-website) and vendored
   * into public/. That repo has no Vercel project of its own, and this
   * project owns truthjblue.com — so this is how those pages get a URL.
   *
   * Next serves public/ files by exact path only: /start/index.html works,
   * /start 404s. These rewrites map each clean URL onto its index.html.
   * beforeFiles so they can't be shadowed by anything added to app/ later.
   * None of these paths exist as app routes today (verified 2026-08-13),
   * and the root sales page plus /audit, /toolkit, /module/*, /api/* are
   * deliberately untouched.
   *
   * To update the brand pages: build tjb-website (npm run build), re-copy
   * dist/{about,books,connect,legal,start,_astro} into public/, commit.
   */
  /**
   * The Divine Alignment Scorecard was a real offer roughly six months ago.
   * It has no page on the current site, but an AI responder on IG and FB DMs
   * is still sending the link, and old DMs still carry it — so real people
   * land on a 404 as their first experience of the brand.
   *
   * The Inner Alignment Audit is the current offer that does what that link
   * promises ("see where you're in alignment"), so send them there rather
   * than to a homepage where they'd have to hunt for it.
   *
   * 307, not 308: browsers cache permanent redirects hard, so if the bot is
   * fixed and this path is ever repurposed, a 308 would be unfixable for
   * anyone who clicked once. Next preserves the query string, so UTMs survive.
   *
   * Remove this once the responder's prompt no longer emits the URL AND the
   * old messages have aged out of people's inboxes — not before.
   */
  async redirects() {
    return [
      {
        source: '/divine-alignment-scorecard',
        destination: '/audit',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return {
      beforeFiles: ['start', 'books', 'about', 'connect', 'legal'].map(
        (p) => ({ source: `/${p}`, destination: `/${p}/index.html` })
      ),
    };
  },
};

export default nextConfig;
