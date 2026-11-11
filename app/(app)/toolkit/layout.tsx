import type { Metadata } from "next";

/** The toolkit page H1, used as this route's document title. */
const TITLE = "Your purpose, activated.";

export const metadata: Metadata = {
  title: TITLE,
  alternates: { canonical: "https://www.truthjblue.com/toolkit" },
};

export default function ToolkitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
