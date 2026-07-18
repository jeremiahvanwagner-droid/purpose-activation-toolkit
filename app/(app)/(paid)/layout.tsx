import Paywall from "@/components/Paywall";

/**
 * Access gate for the paid toolkit surface — modules and the keepsake
 * workbook. The Inner Alignment Audit (/audit) and toolkit dashboard
 * (/toolkit) are intentionally OUTSIDE this group so free visitors can
 * still take the Audit and glimpse the dashboard shell.
 */
export default function PaidLayout({ children }: { children: React.ReactNode }) {
  return <Paywall>{children}</Paywall>;
}
