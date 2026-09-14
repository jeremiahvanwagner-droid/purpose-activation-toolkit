"use client";

import { useSaveStatus } from "@/lib/store";
import { describeStatus } from "@/lib/sync/workbookSync";

/**
 * Where the latest answers are, in words. The text comes from recorded
 * outcomes (the device write, the last cloud write, a scheduled retry), so
 * it never says "Synced" because someone happens to be signed in.
 */
export default function SaveStatus() {
  const status = useSaveStatus();
  const { tone, text, detail } = describeStatus(status);
  return (
    <span className={`saved tone-${tone}`} role="status" aria-live="polite" title={detail ?? undefined}>
      <span className="pip" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
