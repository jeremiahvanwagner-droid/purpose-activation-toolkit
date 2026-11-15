-- Rate limit for POST /created-to-serve/access. Service role only.
-- Five lookups a minute and thirty a day, keyed by a hash of the client IP.

create table if not exists public.ebook_access_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists ebook_access_attempts_ip_created_idx
  on public.ebook_access_attempts (ip_hash, created_at desc);

alter table public.ebook_access_attempts enable row level security;

revoke all on table public.ebook_access_attempts from public, anon, authenticated;

create or replace function public.ebook_access_rate_take(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  minute_count integer;
  day_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 or length(p_ip_hash) > 128 then
    return false;
  end if;
  delete from public.ebook_access_attempts
    where ip_hash = p_ip_hash
      and created_at < now() - interval '2 days';
  select count(*) into minute_count
    from public.ebook_access_attempts
    where ip_hash = p_ip_hash
      and created_at > now() - interval '1 minute';
  select count(*) into day_count
    from public.ebook_access_attempts
    where ip_hash = p_ip_hash
      and created_at > now() - interval '1 day';
  if minute_count >= 5 or day_count >= 30 then
    return false;
  end if;
  insert into public.ebook_access_attempts (ip_hash) values (p_ip_hash);
  return true;
end;
$$;

revoke all on function public.ebook_access_rate_take(text) from public, anon, authenticated;
grant execute on function public.ebook_access_rate_take(text) to service_role;
