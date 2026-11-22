-- 004: Toolkit gifts. Additive; no existing row changes. Service role only.
-- Apply to Supabase project aagqvfwuixpxtdcrdxmv (migration name: toolkit_gifts)
-- BEFORE the app build that reads public.toolkit_gifts.
--
-- One row per paid HighLevel transaction. The recipient's entitlement is
-- source gift:<transaction_id>. RLS is on and there are no policies, so the
-- anon and authenticated roles see nothing. The service role writes.
--
-- Rollback: drop table public.toolkit_gifts;  (deploy the previous app build
--           first; gift entitlement rows, if any, are then plain kept rows;
--           revoke them by hand)

create table if not exists public.toolkit_gifts (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,          -- HighLevel transaction _id (the paid order)
  order_id text,
  buyer_email text not null,
  buyer_contact_id text,
  recipient_email text not null,
  recipient_first_name text,
  product_id text not null default 'purpose-activation-toolkit',
  status text not null default 'granted' check (status in ('granted','revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  check (lower(buyer_email) <> lower(recipient_email))
);
create index if not exists toolkit_gifts_recipient_idx on public.toolkit_gifts (lower(recipient_email));
alter table public.toolkit_gifts enable row level security;   -- no policies: anon/authenticated get nothing
comment on table public.toolkit_gifts is 'Buyer-paid Toolkit gifts: one per paid transaction; recipient gets entitlements row source gift:<transaction_id>.';
