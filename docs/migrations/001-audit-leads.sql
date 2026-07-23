-- audit_leads — durable record of everyone who claimed the free eBook after
-- completing the Inner Alignment Audit.
--
-- Run against the Umbrella project (aagqvfwuixpxtdcrdxmv).
--
-- Why this table exists even though GHL is the CRM: the two sinks fail
-- independently. If GHL is down or the PIT is rotated, we still keep the lead.
-- app/api/audit-complete/route.ts writes to both and tolerates either failing.
--
-- Security posture: written ONLY by the service role from the server route.
-- RLS is enabled with no policy for anon/authenticated, which in Postgres means
-- deny-all to those roles while the service role bypasses RLS entirely. This is
-- deliberate — it is the opposite of the `rls_policy_always_true` problem on the
-- older public tables in this project, which is why spam_quarantine_* exists.

create table if not exists public.audit_leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  profile     jsonb,
  source      text not null default 'inner-alignment-audit',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per person. This MUST be a unique CONSTRAINT, not an expression index
-- on lower(email): PostgREST can only infer ON CONFLICT from a real constraint,
-- and the route must also pass ?on_conflict=email or PostgREST falls back to the
-- primary key and 409s on every repeat claim. Both were found the hard way and
-- verified against the live API.
-- The route lowercases and trims before writing, so plain `email` is equivalent.
alter table public.audit_leads
  add constraint audit_leads_email_key unique (email);

create index if not exists audit_leads_created_at_idx
  on public.audit_leads (created_at desc);

alter table public.audit_leads enable row level security;

-- No policies are created on purpose. anon and authenticated get nothing;
-- the service role bypasses RLS. If a future in-app "your saved result" view
-- needs read access, add a narrowly-scoped SELECT policy keyed on
-- auth.jwt() ->> 'email', matching the pattern already used by
-- public.entitlements ("users read own entitlements").

comment on table public.audit_leads is
  'Free-eBook claims from the Inner Alignment Audit. Written by the toolkit''s /api/audit-complete route via service role. Mirrored to GHL as a tagged contact.';
