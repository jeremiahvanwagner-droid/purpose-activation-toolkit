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
  async rewrites() {
    return {
      beforeFiles: ['start', 'books', 'about', 'connect', 'legal'].map(
        (p) => ({ source: `/${p}`, destination: `/${p}/index.html` })
      ),
    };
  },
};

export default nextConfig;
