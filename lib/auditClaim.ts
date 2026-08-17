"use client";

/** Shared claim state for the Inner Alignment Audit.
 *
 *  One reader "claims" once, by giving an email. That single act now does two
 *  jobs: it unlocks the Alignment Profile, and it delivers the free eBook.
 *  Before this existed the two were separate — the profile was free and the
 *  email was an optional afterthought, so 70 contacts produced one reachable
 *  lead and none of them carried the `audit-completed` tag.
 *
 *  The key and its semantics are unchanged from the original EbookClaim, so
 *  anyone who already claimed keeps their access without re-entering anything.
 *  Presence of the key IS the claim — not truthiness of its value, which is an
 *  empty string when NEXT_PUBLIC_EBOOK_URL is unset.
 */

import { useEffect, useState } from "react";

export const CLAIM_KEY = "pat:ebookClaimed:v1";

/** Fired after a successful claim so every mounted component updates at once,
 *  without prop-drilling or a context provider. `storage` only fires in *other*
 *  tabs, so same-tab listeners need this. */
export const CLAIM_EVENT = "pat:audit-claimed";

export function readClaim(): string | null {
  try {
    return localStorage.getItem(CLAIM_KEY);
  } catch {
    return null; // private browsing
  }
}

export function writeClaim(url: string): void {
  try {
    localStorage.setItem(CLAIM_KEY, url);
  } catch {
    /* non-fatal — the in-page link still works for this session */
  }
  try {
    window.dispatchEvent(new Event(CLAIM_EVENT));
  } catch {
    /* non-fatal */
  }
}

/** `null` while undetermined (server render and first paint), then boolean.
 *  Callers must treat `null` as "don't decide yet" so the gate never flashes
 *  the wrong state at a reader who has already claimed. */
export function useAuditClaim(): { claimed: boolean | null; url: string } {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const sync = () => {
      const saved = readClaim();
      setClaimed(saved !== null);
      setUrl(saved ?? "");
    };
    sync();
    window.addEventListener(CLAIM_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CLAIM_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { claimed, url };
}
