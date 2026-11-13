# Toolkit refund revocation

Approved by Truth on Nov 13, 2026 (card t549s2153): a refund removes Purpose
Activation Toolkit access automatically.

## How access is granted
1. Buyer pays on HighLevel payment link `696ec80453f21b434dfae38d` (TJB location,
   Stripe account `acct_1SnoinQ5Ji82xb2j`). HighLevel records a transaction:
   `entityId` = order id, `chargeId` = Stripe payment intent, `entitySourceId` = the link.
2. On the buyer's magic-link sign-in at toolkit.truthjblue.com,
   `reconcileEntitlement` (lib/access/entitlementSync.ts) looks up a live,
   `succeeded` HighLevel transaction on that link for the session email and inserts
   `public.entitlements` (source `ghl-payments-sync`, `raw.transaction_id`).
3. Every paid request (`/api/entitlement-sync`, `/api/paid-content`) runs the same
   check server-side. Complimentary/manual rows are kept without a lookup.

The HighLevel `toolkit-buyer` tag is bookkeeping only; the app never reads it.

## How a refund revokes it (two independent paths)
- **Stripe webhook** `POST /api/stripe/toolkit-refund` (lib/access/stripeRefund.ts),
  event `charge.refunded`, verified with `STRIPE_WEBHOOK_SECRET_TOOLKIT`. Live mode,
  `metadata.altId` = TJB location, full refund only. The charge is mapped to the
  HighLevel transaction by `metadata.orderId` (= transaction `entityId`) and must be
  on the Toolkit link. Then:
  - the active payment-backed row whose `raw.transaction_id` is that transaction gets
    `revoked_at` / `revoked_reason` (never deleted);
  - if the buyer never signed in, a revoked placeholder row is written so a later
    sign-in cannot grant the refunded payment;
  - a row for another payment, or a complimentary row, is left alone;
  - when access was lost, the `toolkit-buyer` tag is removed from the contact.
  Partial refunds are logged and change nothing.
- **Sign-in recheck**: when HighLevel shows the row's stored transaction `refunded`
  and no other qualifying purchase exists, the row is revoked the same way and the
  tag removed. (Toolkit only; other products keep the earlier behaviour.)

A revoked row denies access (shown as the existing "no purchase found" state).
It reopens only for a different qualifying purchase (a genuine re-buy).

## Readers of public.entitlements
Revenue/scoreboard queries must count `revoked_at is null` only.

## Rollback
Revert the commit (the columns can stay; old code ignores them). Disable the Stripe
endpoint in the dashboard if needed. To restore one buyer's access:
`update public.entitlements set revoked_at = null, revoked_reason = null where email = :email and product_id = 'purpose-activation-toolkit';`
