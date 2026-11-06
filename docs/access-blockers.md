# Paid access blockers

This repair authorizes a reader from their Supabase session and a row in `public.entitlements`. It does not guess provider behavior that the repository does not define.

## What is enforced

- A charge qualifies only when status is `succeeded`, live mode is true, the payment-link id matches that product, and the email matches the signed-in user. That rule already lived in `lib/entitlementMatch.ts`.
- Rows this app writes use `source: ghl-payments-sync`. The documented HighLevel snippet uses `ghl:<payment link id>`. Both are rechecked, but a missing charge is not a refund. The global transaction list is not filtered to the stored charge. A completed scan, a short page, or the 1,000-row cap that simply does not contain that charge does not delete the row.
- Deletion runs only when that scan finishes and the stored `raw.transaction_id` is present on a charge whose status is exactly `refunded`, for the same email and payment link. The delete is one request filtered by email, product, and that payment source, and it counts only when the response represents that one deleted row. A concurrent change to `manual:` or any other source matches zero rows and is kept.
- New payment rows are inserted with `resolution=ignore-duplicates`. That does not update an existing manual, legacy, or payment row. After the insert, the row is read again; a non-payment source wins.
- A HighLevel body of HTTP 200 whose `data` is null, an object, or any non-array is a failed lookup, not an empty history.
- `manual:` rows, including the documented `manual:comp` insert, are not revoked. Any other non-payment source is kept. Payment rows with no stored transaction id are not revoked.
- Paid module text, the keepsake labels, and the Blueprint reading are returned by `/api/paid-content` only after that check. They are not imported by client components.

## Not fixed — do not treat these as policy

- **Partial refund.** If HighLevel leaves the charge `succeeded` and only changes the amount, access stays. No partial-refund status is defined here.
- **Cancellation.** The Toolkit, Audit, and Blueprint are one-time payment links. There is no cancellation field in the matcher.
- **Dispute or chargeback.** No status string for those events is defined. If a dispute removes `succeeded` and no other qualifying charge exists, a payment-backed row is revoked because it no longer matches the existing succeeded-only rule. If the status stays `succeeded`, access stays. That is not a dispute workflow.
- **Live row-level security.** This repo enables RLS only for `public.audit_leads`. Comments mention an entitlements “read own row” policy and a workbooks policy, but the SQL is not here. Live policies were not read. The server uses the service role to read `source`, grant, and revoke. Buyer workbook answers still sync through the browser client; that path is unchanged and its live RLS is unverified.
- **Schema, still a release prerequisite.** Grant writes `source`, `purchased_at`, `gross_amount`, `contact_id`, and `raw`. Revocation reads `raw.transaction_id` and filters `source`. If `source` is missing, the read fails closed (lookup unavailable, no delete). The unique key on `(email, product_id)` is what makes `ignore-duplicates` preserve a concurrent comp. Neither was verified live. `docs/migrations/002-entitlement-conditional-write.sql` is an offline proposal for a single guarded statement. It was not applied and the app does not call it.
- **Client-writable `source`.** If a signed-in reader can update `source` or `raw`, they can make a payment row look manual, or the reverse. Live RLS was not read. Service-role writes do not fix a client-writable column.
- **Unconfirmed delete.** If the delete response is not an array of the one payment row, access stays. That avoids locking a buyer out when the write cannot be proven. It also means a real refund can remain entitled until a later check confirms the delete.
- **Order of events.** A confirmed refund delete is recreated only by a later insert when no row exists and a qualifying charge is found. A charge still inside an unfinished 1,000-row window is not treated as refunded.

CIPHER reviews before any deploy. This document is not a release.
