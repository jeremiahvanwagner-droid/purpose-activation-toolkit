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

import { useEffect, useState } from "react";
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
  | { state: "unentitled"; email: string }
  | { state: "entitled"; email: string; purchasedAt: string };

export function useEntitlement(productId: string): EntitlementState {
  const [result, setResult] = useState<EntitlementState>({ state: "loading" });

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) {
      // Supabase not configured — treat everyone as signed-out so the
      // paywall shows the unlock screen with a sign-in prompt.
      setResult({ state: "signed-out" });
      return;
    }

    let cancelled = false;

    /** Ask the server to reconcile this reader against GHL's payment record
     *  for this product. Best-effort: any failure just leaves them
     *  unentitled, which is the same answer they'd have got without it. */
    async function syncFromPayments(): Promise<boolean> {
      try {
        const { data } = await supa!.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return false;

        const res = await fetch("/api/entitlement-sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { entitled?: boolean };
        return body.entitled === true;
      } catch {
        return false;
      }
    }

    async function readRow(email: string) {
      const { data } = await supa!
        .from("entitlements")
        .select("purchased_at")
        .eq("email", email)
        .eq("product_id", productId)
        .maybeSingle();
      return data;
    }

    async function check() {
      const { data: userData } = await supa!.auth.getUser();
      const email = userData.user?.email ?? null;

      if (!email) {
        if (!cancelled) setResult({ state: "signed-out" });
        return;
      }

      let row = await readRow(email);
      if (cancelled) return;

      // No row yet — they may have just bought. Reconcile once, then re-read.
      if (!row && (await syncFromPayments())) {
        if (cancelled) return;
        row = await readRow(email);
      }

      if (cancelled) return;
      if (row) {
        setResult({ state: "entitled", email, purchasedAt: row.purchased_at as string });
      } else {
        setResult({ state: "unentitled", email });
      }
    }

    void check();

    const { data: sub } = supa.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [productId]);

  return result;
}
