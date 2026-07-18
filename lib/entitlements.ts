"use client";

/**
 * Entitlement lookup — has the signed-in user paid for a given product?
 *
 * Match key is EMAIL: Supabase auth signs users in by email (magic-link);
 * OpenClaw's payment.received handler writes the same email into
 * public.entitlements when a purchase completes. One clean identity, no
 * linking table.
 *
 * All local-first: when Supabase isn't configured (dev, or before env vars
 * land in prod), everyone is treated as UNENTITLED so the paywall still
 * renders. That's the safe default.
 */

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

export const PAT_PRODUCT_ID = "purpose-activation-toolkit";

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

    async function check() {
      const { data: userData } = await supa!.auth.getUser();
      const email = userData.user?.email ?? null;

      if (!email) {
        if (!cancelled) setResult({ state: "signed-out" });
        return;
      }

      const { data: row } = await supa!
        .from("entitlements")
        .select("purchased_at")
        .eq("email", email)
        .eq("product_id", productId)
        .maybeSingle();

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
