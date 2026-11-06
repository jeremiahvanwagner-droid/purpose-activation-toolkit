"use client";

import { useEffect, useState } from "react";
import Paywall from "@/components/Paywall";
import { PaidCurriculumProvider } from "@/components/paid/CurriculumProvider";
import { PAT_PRODUCT_ID, useEntitlement } from "@/lib/entitlements";
import type { ToolkitCurriculum } from "@/lib/paid/types";
import { getSupabase } from "@/lib/supabase";

/**
 * Server authorization before any paid module renders. The curriculum JSON
 * is not part of the client bundle; a 403 returns no payload.
 */
export default function PaidGate({ children }: { children: React.ReactNode }) {
  const ent = useEntitlement(PAT_PRODUCT_ID);
  const entitled = ent.state === "entitled";
  const purchasedAt = ent.state === "entitled" ? ent.purchasedAt : "";
  const [curriculum, setCurriculum] = useState<ToolkitCurriculum | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!entitled) {
      setCurriculum(null);
      setBlocked(false);
      return;
    }
    const supa = getSupabase();
    let cancel = false;
    void (async () => {
      const { data } = await supa!.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancel) setBlocked(true);
        return;
      }
      const res = await fetch("/api/paid-content?productId=purpose-activation-toolkit", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (cancel) return;
      if (!res.ok) {
        setCurriculum(null);
        setBlocked(true);
        return;
      }
      const body = (await res.json()) as { curriculum?: ToolkitCurriculum };
      if (!body.curriculum?.sentinel) {
        setBlocked(true);
        return;
      }
      setBlocked(false);
      setCurriculum(body.curriculum);
    })();
    return () => {
      cancel = true;
    };
  }, [entitled, purchasedAt]);

  if (!entitled) return <Paywall />;
  if (blocked) {
    return (
      <div className="canvas-inner">
        <div className="paywall">
          <h1 className="paywall-title">We couldn&apos;t open your modules.</h1>
          <p className="paywall-lede">
            Your sign-in is here, but the lessons didn&apos;t load. This is on our side. Please don&apos;t buy again — try
            once more, or email support@truthjblue.com.
          </p>
        </div>
      </div>
    );
  }
  if (!curriculum) {
    return (
      <div className="canvas-inner">
        <div className="paywall-loading">Loading your access…</div>
      </div>
    );
  }
  return <PaidCurriculumProvider value={curriculum}>{children}</PaidCurriculumProvider>;
}
