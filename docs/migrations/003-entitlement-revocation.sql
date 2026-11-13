-- 003: refund revocation for payment-backed entitlements.
-- Applied to Supabase project aagqvfwuixpxtdcrdxmv on 2026-11-13 (migration
-- name: entitlement_revocation), before the app code that reads these columns.
--
-- Additive and nullable: no existing row changes. A row with revoked_at set no
-- longer opens a paid product. Rows are never deleted by the app; a refund marks
-- the row revoked so the history stays and the lazy sign-in sync cannot insert
-- a fresh grant over it (UNIQUE (email, product_id) + ignore-duplicates).
--
-- Who writes: only the service role (server). RLS on public.entitlements has no
-- UPDATE or DELETE policy for anon/authenticated, so clients cannot clear these.
--
-- Rollback: alter table public.entitlements drop column revoked_reason,
--           drop column revoked_at;  (deploy the previous app build first)

alter table public.entitlements
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

comment on column public.entitlements.revoked_at is
  'Set when the backing payment was fully refunded (Stripe charge.refunded or HighLevel status refunded). Non-null = no access.';
comment on column public.entitlements.revoked_reason is
  'Why access was revoked, e.g. stripe:charge.refunded:<charge id> or ghl:refunded:<transaction id>.';
