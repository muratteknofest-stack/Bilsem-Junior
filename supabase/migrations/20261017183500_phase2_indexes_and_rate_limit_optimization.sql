-- Phase 2 Deep Audit Fixes:
-- 1. Composite lookup index for published student questions by (status, target_grade, category, difficulty)
-- 2. Partial index for active (unfinished) student learning sessions
-- 3. Probabilistic (2%) expired window cleanup in consume_api_limit() to eliminate per-request DELETE lock contention

create index if not exists questions_published_lookup_idx
  on public.questions (status, target_grade, category, difficulty);

create index if not exists learning_sessions_active_student_idx
  on public.learning_sessions (student_id, mode)
  where finished_at is null;

create or replace function public.consume_api_limit(p_key text, p_scope text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  started timestamptz;
  consumed integer;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_key !~ '^[a-f0-9]{64}$' or length(p_scope) > 60 or p_limit not between 1 and 10000 or p_seconds not between 1 and 86400 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;
  started := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds);
  insert into public.api_rate_windows(key, scope, window_start)
    values (p_key, p_scope, started)
    on conflict do nothing;
  update public.api_rate_windows
    set used = used + 1
    where key = p_key and scope = p_scope and window_start = started and used < p_limit
    returning used into consumed;
  if pg_catalog.random() < 0.02 then
    delete from public.api_rate_windows
      where ctid in (
        select ctid from public.api_rate_windows
        where window_start < now() - interval '2 days'
        order by window_start
        limit 50
      );
  end if;
  return consumed is not null;
end $$;

revoke all on function public.consume_api_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_limit(text, text, integer, integer) to service_role;
