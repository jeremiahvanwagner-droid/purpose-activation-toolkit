"use client";

/**
 * Entitlement lookup — has the signed-in user paid for a given product?
 *
 * Match key is EMAIL: Supabase auth signs users in by email (magic-link), and
 * a purchase is recorded against the same address in public.entitlements. One
 * clean identity, no linking table.
 *
 * When there's no row, that is not necessarily a no. The row is written by
 * /api/entitlement-sync, which asks GHL whether this address has actually paid
 * for THIS product — so a first miss triggers one sync and a re-read before we
 * show the reader a paywall. That is what makes a fresh buyer's first visit
 * work: they come back from checkout, sign in, and the entitlement is created
 * on the spot rather than waiting on a webhook that may never come.
 *
 * All local-first: when Supabase isn't configured (dev, or before env vars
 * land in prod), everyone is treated as UNENTITLED so the paywall still
 * renders. That's the safe default.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";

/** The $247 Purpose Activation Toolkit. */
export const PAT_PRODUCT_ID = "purpose-activation-toolkit";

/** The $97 Inner Alignment Audit as sold in the store. The same audit is the
 *  free lead magnet at /audit; this id gates the paid delivery at /store/audit
 *  (profile, follow-up call, eBook, sync) for buyers of the store product. */
export const IAA_PRODUCT_ID = "inner-alignment-audit";

/** The $27 Divine Alignment Blueprint — the written reading of an Audit
 *  result, generated at /store/blueprint from the buyer's own answers. */
export const DAB_PRODUCT_ID = "divine-alignment-blueprint";

export type EntitlementState =
  | { state: "loading" }
  | { state: "signed-out" }
  | {
      state: "unentitled";
      email: string;
      /** not-found: we looked and there is no qualifying purchase for this email.
       *  unavailable: we could not look (network, payment lookup, or a purchase
       *  found but not yet recorded) — never presented as "you haven't paid". */
      lookup: "not-found" | "unavailable";
      checking: boolean;
      checkedAt: number;
    }
  | { state: "entitled"; email: string; purchasedAt: string };

export type EntitlementHandle = EntitlementState & {
  /** Ask again: re-read the entitlement and re-check the payment record. */
  recheck: () => void;
};

type SyncAnswer = "entitled" | "not-found" | "unavailable";

/** A returning buyer's tab regains focus: re-check at most this often. */
const FOCUS_RECHECK_MS = 20_000;

export function useEntitlement(productId: string): EntitlementHandle {
  const [result, setResult] = useState<EntitlementState>({ state: "loading" });
  const resultRef = useRef(result);
  resultRef.current = result;
  const [nonce, setNonce] = useState(0);
  const recheck = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) {
      // Supabase not configured — treat everyone as signed-out so the
      // paywall shows the unlock screen with a sign-in prompt.
      setResult({ state: "signed-out" });
      return;
    }

    let cancelled = false;
    let seq = 0;
    let current: EntitlementState = resultRef.current;
    const publish = (next: EntitlementState) => {
      current = next;
      setResult(next);
    };

    /** Ask the server to reconcile this reader against GHL's payment record
     *  for this product. Any failure is reported as "unavailable" rather than
     *  folded into "not found". */
    async function syncFromPayments(): Promise<SyncAnswer> {
      try {
        const { data } = await supa!.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return "unavailable";

        const res = await fetch("/api/entitlement-sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) return "unavailable";
        const body = (await res.json()) as { entitled?: boolean; checked?: boolean; reason?: string };
        if (body.entitled === true) return "entitled";
        if (body.checked === true && body.reason === "not-found") return "not-found";
        return "unavailable";
      } catch {
        return "unavailable";
      }
    }

    async function readRow(email: string): Promise<{ ok: true; purchasedAt: string | null } | { ok: false }> {
      const { data, error } = await supa!
        .from("entitlements")
        .select("purchased_at")
        .eq("email", email)
        .eq("product_id", productId)
        .maybeSingle();
      if (error) return { ok: false };
      return { ok: true, purchasedAt: data ? (data.purchased_at as string) : null };
    }

    async function check() {
      const mine = ++seq;
      const stale = () => cancelled || mine !== seq;
      const { data: userData } = await supa!.auth.getUser();
      const email = userData.user?.email ?? null;
      if (stale()) return;

      if (!email) {
        publish({ state: "signed-out" });
        return;
      }

      if (current.state === "unentitled" && current.email === email) publish({ ...current, checking: true });

      let row = await readRow(email);
      if (stale()) return;
      if (row.ok && row.purchasedAt) {
        publish({ state: "entitled", email, purchasedAt: row.purchasedAt });
        return;
      }

      // No row yet — they may have just bought. Reconcile, then re-read.
      const answer = await syncFromPayments();
      if (stale()) return;
      if (answer === "entitled") {
        row = await readRow(email);
        if (stale()) return;
        if (row.ok && row.purchasedAt) {
          publish({ state: "entitled", email, purchasedAt: row.purchasedAt });
          return;
        }
      }
      const lookup: "not-found" | "unavailable" =
        answer === "not-found" && row.ok ? "not-found" : "unavailable";
      publish({ state: "unentitled", email, lookup, checking: false, checkedAt: Date.now() });
    }

    void check();

    const { data: sub } = supa.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION is the check above; a token refresh doesn't change who
      // is signed in or what they bought.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      setTimeout(() => void check(), 0);
    });

    // Checkout opens in a new tab. When the buyer comes back to this one,
    // look again instead of leaving them on a stale "unlock" screen.
    let lastFocusCheck = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFocusCheck < FOCUS_RECHECK_MS) return;
      if (current.state !== "unentitled") return;
      lastFocusCheck = Date.now();
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [productId, nonce]);

  return { ...result, recheck };
}
