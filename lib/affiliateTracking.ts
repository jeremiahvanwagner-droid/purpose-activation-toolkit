/**
 * HighLevel Affiliate Manager, shipped dark.
 *
 * NEXT_PUBLIC_HL_AFFILIATE_TRACKING must be the string "true". Unset, empty,
 * or any other value inserts nothing and sends nothing. The script also
 * refuses every host except www.truthjblue.com, so a preview deploy with the
 * flag on still does not load it.
 *
 * trackLead is the sign-in request in AccountWidget. am.js itself drops the
 * call unless both am_id and am_fingerprint cookies already exist, so a
 * visitor who did not arrive through a partner link sends no lead.
 */

export const HL_AFFILIATE_HOST = "www.truthjblue.com";

export function affiliateTrackingRequested(): boolean {
  return process.env.NEXT_PUBLIC_HL_AFFILIATE_TRACKING === "true";
}

export function shouldLoadAffiliateTracking(host: string | null | undefined): boolean {
  if (!affiliateTrackingRequested()) return false;
  const name = (host ?? "").toLowerCase().split(":")[0];
  return name === HL_AFFILIATE_HOST;
}

type AffiliateManager = {
  init?: (locationId: string, brandedUrl: string, domain: string) => void;
  trackLead?: (lead: { email: string }) => void;
};

function affiliateManager(): AffiliateManager | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { affiliateManager?: AffiliateManager }).affiliateManager;
}

/** Bind the sign-in address to the referring affiliate. Never throws. */
export function trackAffiliateLead(email: string): void {
  if (!affiliateTrackingRequested()) return;
  if (typeof window === "undefined") return;
  const trimmed = email.trim();
  if (!trimmed) return;
  try {
    affiliateManager()?.trackLead?.({ email: trimmed });
  } catch {
    /* Sign-in must succeed even when the affiliate script throws. */
  }
}
