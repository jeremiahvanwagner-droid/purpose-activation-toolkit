import type { Metadata } from "next";
import "./store.css";
import StoreNav from "@/components/store/StoreNav";
import StoreFooter from "@/components/store/StoreFooter";
import { STORE_URL, storeBase } from "@/lib/store/base";

/**
 * The storefront shell. Lives outside the (app) group so it never gets the
 * signed-in rail, and outside the marketing landing so it has its own nav.
 * On store.truthjblue.com the middleware maps "/" onto this tree.
 */
export const metadata: Metadata = {
  title: {
    default: "The Store — Truth J Blue",
    template: "%s — Truth J Blue Store",
  },
  description:
    "Workbooks, courses, a twelve-book library, and the programs where we work together. Faith-first tools from Truth J Blue, built to be lived.",
  metadataBase: new URL(STORE_URL),
  openGraph: {
    siteName: "Truth J Blue Store",
    type: "website",
  },
};

/**
 * The brand site (truthjblue.com/about, /books …) lets a reader choose a theme
 * and remembers it in localStorage under "tjb-theme". The store honours the
 * same choice so the two feel like one place; a ?theme=light|dark parameter
 * overrides it for review. Inline and first in the tree so it applies before
 * the store paints. Without either, the system preference decides, as on the
 * rest of the site.
 */
const THEME_HOOK =
  '(function(){try{var q=new URLSearchParams(location.search).get("theme");var t=q||localStorage.getItem("tjb-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const base = storeBase();
  return (
    <div className="st">
      <script dangerouslySetInnerHTML={{ __html: THEME_HOOK }} />
      <StoreNav base={base} />
      <main>{children}</main>
      <StoreFooter base={base} />
    </div>
  );
}
