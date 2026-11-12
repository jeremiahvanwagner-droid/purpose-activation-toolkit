import type { Metadata } from "next";

const AUDIT_URL = "https://www.truthjblue.com/audit";
const TITLE = "Inner Alignment Audit | Truth J Blue";
const DESCRIPTION =
  "The Inner Alignment Audit from Truth J Blue ($97). See where you're aligned, where there's drift, and the best place to begin across Spiritual Perception, Emotional Regulation, Identity Integration, and Life Structure.";
const SHARE_IMAGE = {
  url: "https://www.truthjblue.com/created-to-serve/cover.jpg",
  width: 588,
  height: 833,
};

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
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
