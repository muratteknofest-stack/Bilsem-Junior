-- Server-only singleton; browser roles cannot inspect or mutate release decisions.
create table public.platform_settings (
  id boolean primary key default true check (id),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object' and length(settings::text) <= 100000),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from public, anon, authenticated;
grant select, insert, update on public.platform_settings to service_role;
insert into public.platform_settings(id) values(true);
create index if not exists support_requests_reviewed_by_idx on public.support_requests(reviewed_by);
-- Tighten existing administrator policies, retaining active-session checks.
create or replace function zekapark_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and auth.jwt()->>'aal' = 'aal2' and exists (
    select 1 from auth.users u where u.id=auth.uid()
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'role'='admin'
  );
$$;
revoke all on function zekapark_private.is_admin() from public,anon;
grant execute on function zekapark_private.is_admin() to authenticated,service_role;
