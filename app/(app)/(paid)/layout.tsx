import type { Metadata } from "next";
import PaidGate from "@/components/paid/PaidGate";

/**
 * Paid toolkit surface. Curriculum is fetched after the server confirms the
 * session and entitlement. Module text is not rendered for anyone else.
 * Search engines are told not to index these routes. The gate is unchanged.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PaidLayout({ children }: { children: React.ReactNode }) {
  return <PaidGate>{children}</PaidGate>;
}
