import type { Metadata } from "next";
import "./globals.css";
import Rail from "@/components/Rail";
import SyncProvider from "@/components/SyncProvider";

export const metadata: Metadata = {
  title: "Purpose Activation Toolkit — Truth J Blue",
  description:
    "An interactive, faith-first digital workbook to help you recognize your Divine design, align with your Higher Self in Christ, and walk in your purpose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SyncProvider />
        <div className="app">
          <Rail />
          <main className="canvas">{children}</main>
        </div>
      </body>
    </html>
  );
}
