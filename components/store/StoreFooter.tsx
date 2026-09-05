import Link from "next/link";
import Glyph from "@/components/store/Glyph";
import { BEYOND_THE_VEIL_URL, COMMUNITY_URL } from "@/lib/links";
import { ADDRESS_LINES, SITE_URL, SUPPORT_EMAIL, storeHref } from "@/lib/store/base";
import { COLLECTIONS } from "@/lib/store/overlay";

export default function StoreFooter({ base }: { base: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="st-foot">
      <div className="st-container">
        <div className="st-foot-grid">
          <div>
            <Link className="st-brand" href={storeHref(base, "/")}>
              <Glyph />
              <span>
                <span className="st-brand-name">TRUTH J BLUE</span>
                <span className="st-brand-tag">Growth by Choice</span>
              </span>
            </Link>
            <p className="st-foot-tag">Tools for the walk — made for Christians and awakened souls who intend to live what they know.</p>
          </div>

          <div>
            <p className="st-foot-h">The store</p>
            <ul className="st-foot-links">
              {COLLECTIONS.map((c) => (
                <li key={c.key}>
                  <Link href={storeHref(base, `/${c.key}`)}>{c.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="st-foot-h">Truth J Blue</p>
            <ul className="st-foot-links">
              <li><a href={SITE_URL}>truthjblue.com</a></li>
              <li><a href={`${SITE_URL}/toolkit`}>Sign in to the Toolkit</a></li>
              <li><a href={BEYOND_THE_VEIL_URL} target="_blank" rel="noreferrer">Beyond the Veil</a></li>
              <li><a href={COMMUNITY_URL} target="_blank" rel="noreferrer">Divine Path Walkers community</a></li>
              <li><a href={`${SITE_URL}/legal#privacy`}>Privacy</a></li>
              <li><a href={`${SITE_URL}/legal#terms`}>Terms</a></li>
            </ul>
            <p className="st-foot-h" style={{ marginTop: 22 }}>Reach us</p>
            <address className="st-foot-addr">
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <br />
              Truth J Blue LLC
              <br />
              {ADDRESS_LINES[0]}
              <br />
              {ADDRESS_LINES[1]}
            </address>
          </div>
        </div>

        <div className="st-foot-fine">
          <span>© {year} Truth J Blue LLC. All rights reserved.</span>
          <span>Checkout, booking and delivery are handled securely by HighLevel.</span>
        </div>
      </div>
    </footer>
  );
}
