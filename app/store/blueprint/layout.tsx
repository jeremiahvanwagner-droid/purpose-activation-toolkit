import type { Metadata } from "next";

/**
 * The purchased Blueprint. Never indexed: it is a reader's own document, and
 * the public face of the product is its store page.
 */
export const metadata: Metadata = {
  title: "Your Divine Alignment Blueprint",
  robots: { index: false, follow: false },
};

export default function BlueprintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
