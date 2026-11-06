# Paid access blockers

This repair authorizes a reader from their Supabase session and a row in `public.entitlements`. It does not guess provider behavior that the repository does not define.

## What is enforced

- A charge qualifies only when status is `succeeded`, live mode is true, the payment-link id matches that product, and the email matches the signed-in user. That rule already lived in `lib/entitlementMatch.ts`.
- Rows this app writes use `source: ghl-payments-sync`. The documented HighLevel snippet uses `ghl:<payment link id>`. Both are rechecked, but a missing charge is not a refund. The global transaction list is not filtered to the stored charge. A completed scan, a short page, or the 1,000-row cap that simply does not contain that charge does not delete the row.
- Refund deletion is **disabled**. The read asks only for `source,purchased_at`. It does not select `raw`. A missing `raw` column must not be probed, because PostgREST would reject the whole read, and it must not be assumed present. A delete filtered only by email, product, and source could erase a newer payment row that reused `ghl-payments-sync`.
- New payment rows are inserted with `resolution=ignore-duplicates`. That does not update an existing manual, legacy, or payment row. After the insert, the row is read again; a non-payment source wins.
- A HighLevel body of HTTP 200 whose `data` is null, an object, or any non-array is a failed lookup, not an empty history. A missing charge in the global window, including a finished short page or the 1,000-row cap, does not delete a row.
- `manual:` rows, including the documented `manual:comp` insert, are kept. Any other non-payment source is kept. A live refund observation also keeps the row while deletion is disabled. A test-mode (`liveMode` not true) refund is not treated as that observation.
- Paid module text, the keepsake labels, and the Blueprint reading are returned by `/api/paid-content` only after that check. They are not imported by client components.

## Not fixed — do not treat these as policy

- **Partial refund.** If HighLevel leaves the charge `succeeded` and only changes the amount, access stays. No partial-refund status is defined here.
- **Cancellation.** The Toolkit, Audit, and Blueprint are one-time payment links. There is no cancellation field in the matcher.
- **Dispute or chargeback.** No status string for those events is defined. Access is not removed for them. That is not a dispute workflow.
- **Live row-level security.** This repo enables RLS only for `public.audit_leads`. Comments mention an entitlements “read own row” policy and a workbooks policy, but the SQL is not here. Live policies were not read. Whether `source` or `raw` is writable by `anon` or `authenticated` is unverified. Buyer workbook answers still sync through the browser client.
- **Schema, still a release prerequisite.** The unique key on `(email, product_id)`, the `source` column, and the `raw` column were not verified live. `ignore-duplicates` preserves a concurrent comp only if that unique key exists. Refund deletion stays off until `raw` is confirmed and a delete can require `raw.transaction_id` in the same statement. `docs/migrations/002-entitlement-conditional-write.sql` is an offline proposal. It was not applied and the app does not call it.
- **Rollback.** Do not return to `0c84469723007fd182a4a6478bc8f6c335c9c69c` or to production `84ae2192cf15`. The first reintroduces malformed and absence lockouts. The second puts paid lesson text back in the public bundle. A later undo has to stay forward and keep both the server-only curriculum and these non-deletion protections.

CIPHER reviews before any deploy. This document is not a release.
