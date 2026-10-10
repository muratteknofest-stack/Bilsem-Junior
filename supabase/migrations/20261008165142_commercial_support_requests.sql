create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('question', 'deletion')),
  request_key text not null,
  payload jsonb not null check (octet_length(payload::text) <= 160000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, kind, request_key)
);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant select, insert, update, delete on public.support_requests to service_role;
create index if not exists support_requests_actor_time_idx on public.support_requests(actor_id, created_at desc);
create index if not exists support_requests_status_time_idx on public.support_requests(status, created_at desc);

create or replace function public.submit_support_request(p_actor uuid, p_kind text, p_key text, p_payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if p_actor is null or p_kind not in ('question','deletion') or p_key !~ '^[a-f0-9]{64}$' or p_payload is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text, 1));
  select id into result from public.support_requests where actor_id = p_actor and kind = p_kind and request_key = p_key;
  if result is not null then return result; end if;
  if (select count(*) from public.support_requests where actor_id = p_actor and created_at >= now() - interval '24 hours') >= 10 then
    raise exception 'Daily request limit reached' using errcode = 'P0001';
  end if;
  insert into public.support_requests(actor_id, kind, request_key, payload)
    values(p_actor, p_kind, p_key, p_payload) returning id into result;
  return result;
end $$;
revoke all on function public.submit_support_request(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_support_request(uuid,text,text,jsonb) to service_role;
