# Paid access blockers

This repair authorizes a reader from their Supabase session and a row in `public.entitlements`. It does not guess provider behavior that the repository does not define.

## What is enforced

- A charge qualifies only when status is `succeeded`, live mode is true, the payment-link id matches that product, and the email matches the signed-in user. That rule already lived in `lib/entitlementMatch.ts`.
- Rows this app writes use `source: ghl-payments-sync`. The documented HighLevel snippet uses `ghl:<payment link id>`. Both are rechecked. If no qualifying charge remains, the row is deleted. A HighLevel status of `refunded` is not `succeeded`, so a full refund in that shape revokes access on the next check.
- `manual:` rows, including the documented `manual:comp` insert, are not revoked.
- Any other source is kept. This code does not invent which legacy values are complimentary.
- If the payment lookup errors or stops at the 1,000-transaction cap, a payment-backed row is kept and new access is not granted.
- Paid module text, the keepsake labels, and the Blueprint reading are returned by `/api/paid-content` only after that check. They are not imported by client components.

## Not fixed — do not treat these as policy

- **Partial refund.** If HighLevel leaves the charge `succeeded` and only changes the amount, access stays. No partial-refund status is defined here.
- **Cancellation.** The Toolkit, Audit, and Blueprint are one-time payment links. There is no cancellation field in the matcher.
- **Dispute or chargeback.** No status string for those events is defined. If a dispute removes `succeeded` and no other qualifying charge exists, a payment-backed row is revoked because it no longer matches the existing succeeded-only rule. If the status stays `succeeded`, access stays. That is not a dispute workflow.
- **Live row-level security.** This repo enables RLS only for `public.audit_leads`. Comments mention an entitlements “read own row” policy and a workbooks policy, but the SQL is not here. Live policies were not read. The server uses the service role to read `source`, grant, and revoke. Buyer workbook answers still sync through the browser client; that path is unchanged and its live RLS is unverified.
- **Schema.** Grant writes `source`, `purchased_at`, `gross_amount`, `contact_id`, and `raw`. If `source` is missing in the live table, the read fails closed (lookup unavailable, no delete) rather than revoking everyone. Confirm those columns before release. No migration is included.
- **Order of events.** A revoked row is recreated if a later check finds a qualifying charge. Out-of-order webhook delivery is not the access path; this app pulls transactions.

CIPHER reviews before any deploy. This document is not a release.
