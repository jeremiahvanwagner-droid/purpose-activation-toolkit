import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giftEnabled } from "@/lib/access/gift";
import GiftForm from "./GiftForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gift the Toolkit",
  robots: { index: false, follow: false },
};

/** Unpublished. Not linked from any page. 404 unless TOOLKIT_GIFT_ENABLED=true. */
export default function GiftPage() {
  if (!giftEnabled()) notFound();
  return <GiftForm />;
}
