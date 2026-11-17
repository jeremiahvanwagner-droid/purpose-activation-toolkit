-- First-party funnel counter for the public /created-to-serve pages.
-- One row per page view or checkout-button click, sent by
-- public/created-to-serve/analytics.js through POST /api/funnel-event.
-- No contact fields, IP address or user agent are stored. Service role only.

create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null check (event in ('view', 'checkout_click')),
  page text not null check (page in ('created-to-serve', 'toolkit', 'audit', 'resource', 'access', 'purchase-support', 'community')),
  product text check (product in ('toolkit', 'audit')),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  utm_content text check (char_length(utm_content) <= 100),
  utm_term text check (char_length(utm_term) <= 100),
  referrer_host text check (char_length(referrer_host) <= 255),
  device text check (device in ('mobile', 'desktop'))
);

create index if not exists funnel_events_page_event_created_idx
  on public.funnel_events (page, event, created_at desc);

alter table public.funnel_events enable row level security;

revoke all on table public.funnel_events from public, anon, authenticated;
grant select, insert on table public.funnel_events to service_role;
