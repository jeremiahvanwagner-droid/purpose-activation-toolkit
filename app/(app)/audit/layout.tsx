import type { Metadata } from "next";

const AUDIT_URL = "https://www.truthjblue.com/audit";
const TITLE = "Inner Alignment Audit | Truth J Blue";
const DESCRIPTION =
  "Take the free Inner Alignment Audit from Truth J Blue. In a few minutes, see where you're aligned, where there's drift, and the best place to begin across Spiritual Perception, Emotional Regulation, Identity Integration, and Life Structure.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: AUDIT_URL,
  },
  openGraph: {
    type: "website",
    siteName: "Truth J Blue",
    url: AUDIT_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
