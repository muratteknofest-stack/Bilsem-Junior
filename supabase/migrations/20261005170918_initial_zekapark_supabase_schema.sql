-- ZekaPark: apply in a new Supabase project before importing any data.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  role text generated always as (data->>'role') stored,
  linked_parent_id uuid,
  created_at timestamptz not null default now(),
  constraint valid_role check (role in ('student', 'parent', 'admin'))
);

create table public.private_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.practice_sessions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null
);

create table public.test_attempts (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null
);

create table public.ai_generation_jobs (
  id text primary key,
  data jsonb not null
);

create table public.ai_generation_logs (
  id text primary key,
  data jsonb not null
);

create table public.security_events (
  id text primary key,
  data jsonb not null
);

create index profiles_linked_parent_idx on public.profiles(linked_parent_id);
create index practice_sessions_user_idx on public.practice_sessions(user_id);
create index test_attempts_user_idx on public.test_attempts(user_id);

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create function app_private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and
    coalesce((select auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
$$;

create function app_private.can_read_student(student_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = student_id or app_private.is_admin() or exists (
    select 1 from public.profiles p
    where p.id = student_id and p.role = 'student'
      and p.linked_parent_id = auth.uid()
  ))
$$;

revoke all on function app_private.is_admin() from public;
revoke all on function app_private.can_read_student(uuid) from public;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.can_read_student(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.private_states enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.security_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (app_private.can_read_student(id));
create policy profiles_admin_write on public.profiles for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

create policy states_select on public.private_states for select to authenticated
using (app_private.can_read_student(user_id));
create policy states_self_insert on public.private_states for insert to authenticated
with check (user_id = auth.uid());
create policy states_self_update on public.private_states for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy states_admin_write on public.private_states for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

create policy questions_read on public.questions for select to anon, authenticated
using (true);
create policy questions_admin_write on public.questions for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

create policy sessions_read on public.practice_sessions for select to authenticated
using (app_private.can_read_student(user_id));
create policy sessions_insert on public.practice_sessions for insert to authenticated
with check (user_id = auth.uid());
create policy sessions_update on public.practice_sessions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_delete on public.practice_sessions for delete to authenticated
using (user_id = auth.uid() or app_private.is_admin());

create policy attempts_read on public.test_attempts for select to authenticated
using (app_private.can_read_student(user_id));
create policy attempts_insert on public.test_attempts for insert to authenticated
with check (user_id = auth.uid());
create policy attempts_update on public.test_attempts for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy attempts_delete on public.test_attempts for delete to authenticated
using (user_id = auth.uid() or app_private.is_admin());

create policy jobs_admin on public.ai_generation_jobs for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());
create policy logs_admin on public.ai_generation_logs for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());
create policy events_admin on public.security_events for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());
