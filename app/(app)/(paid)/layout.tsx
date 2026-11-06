"use client";

import PaidGate from "@/components/paid/PaidGate";

/**
 * Paid toolkit surface. Curriculum is fetched after the server confirms the
 * session and entitlement. Module text is not rendered for anyone else.
 */
export default function PaidLayout({ children }: { children: React.ReactNode }) {
  return <PaidGate>{children}</PaidGate>;
}
