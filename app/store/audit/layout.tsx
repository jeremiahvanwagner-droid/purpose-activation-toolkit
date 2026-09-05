import type { Metadata } from "next";

/**
 * The paid Inner Alignment Audit lives here, behind the same entitlement gate
 * as the Toolkit. Never indexed: the public face of the Audit is the store's
 * product page and the free lead magnet at /audit.
 */
export const metadata: Metadata = {
  title: "Your Inner Alignment Audit",
  robots: { index: false, follow: false },
};

export default function PaidAuditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
