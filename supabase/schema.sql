-- ZekaPark fresh-project bootstrap. Apply only to a newly created Supabase project.
-- Existing projects contain live records and must use reviewed incremental migrations.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null default 'student' check (role in ('student', 'parent', 'admin')),
  student_code text unique,
  linked_student_ids text[] not null default '{}',
  linked_parent_id text,
  grade integer,
  exam_focus text,
  parent_phone text,
  recovery_email text,
  consent jsonb,
  avatar text not null default '🦊',
  level integer not null default 1,
  xp double precision not null default 0,
  streak double precision not null default 0,
  longest_streak double precision not null default 0,
  last_active_date text not null default '',
  today_practiced boolean,
  streak_freeze_count double precision not null default 0,
  claimed_streak_days double precision[] not null default '{}',
  weekly_streak_history boolean[] not null default '{f,f,f,f,f,f,f}',
  daily_goal_minutes double precision not null default 15,
  today_minutes_spent double precision not null default 0,
  daily_goal_questions double precision not null default 10,
  today_questions_solved double precision not null default 0,
  daily_goal_sessions double precision not null default 2,
  today_sessions_completed double precision not null default 0,
  sound_enabled boolean not null default true,
  total_questions_solved double precision not null default 0,
  resolved_mistakes_count double precision not null default 0,
  featured_badge_ids text[] not null default '{}',
  reminder_config jsonb,
  total_points double precision not null default 0,
  last_login_at double precision,
  created_at double precision,
  updated_at double precision
);

create index profiles_linked_parent_idx on public.profiles (linked_parent_id)
  where linked_parent_id is not null;

create table public.user_private_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  values jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  type text,
  category text,
  difficulty integer,
  target_grade integer,
  version integer not null default 1,
  revision integer not null default 0,
  is_custom boolean not null default false,
  created_at text,
  updated_at text,
  updated_by text,
  reviewed_by text,
  data jsonb not null
);
create index questions_status_idx on public.questions (status);

create table public.practice_sessions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  created_at double precision
);
create index practice_sessions_user_idx on public.practice_sessions (user_id);

create table public.test_attempts (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  created_at double precision
);
create index test_attempts_user_idx on public.test_attempts (user_id);

create table public.ai_generation_jobs (
  job_id text primary key,
  admin_id text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  config jsonb not null default '{}',
  progress jsonb not null default '{}',
  created_at double precision not null,
  completed_at double precision,
  retry_count integer not null default 0,
  claimed_at timestamptz,
  claimed_by text
);

create table public.ai_generation_logs (
  id bigint generated always as identity primary key,
  job_id text,
  admin_id text,
  model text,
  prompt_version text,
  success boolean not null default false,
  quality_score double precision,
  solver_verified boolean,
  errors text[] not null default '{}',
  warnings text[] not null default '{}',
  rejection_reasons text[] not null default '{}',
  duration_ms double precision,
  question_id text,
  timestamp double precision,
  created_at timestamptz not null default now(),
  legacy_id text unique
);

create table public.security_events (
  id bigint generated always as identity primary key,
  type text not null,
  actor_id text not null,
  student_id text,
  detail jsonb,
  created_at double precision not null,
  legacy_id text unique
);

create function public.protect_profile_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is not null and
     (new.id, new.email, new.role, new.student_code, new.linked_parent_id,
      new.linked_student_ids, new.recovery_email, new.consent, new.created_at)
     is distinct from
     (old.id, old.email, old.role, old.student_code, old.linked_parent_id,
      old.linked_student_ids, old.recovery_email, old.consent, old.created_at) then
    raise exception 'Profile identity and family links cannot be changed by the client'
      using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger protect_profile_identity before update on public.profiles
  for each row execute function public.protect_profile_identity();

create function public.sync_question_columns() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.status := coalesce(new.data->>'status', 'draft');
  new.type := new.data->>'type';
  new.category := new.data->>'category';
  new.difficulty := nullif(new.data->>'difficulty', '')::integer;
  new.target_grade := nullif(new.data->>'targetGrade', '')::integer;
  new.version := coalesce(nullif(new.data->>'version', '')::integer, 1);
  new.revision := coalesce(nullif(new.data->>'revision', '')::integer, 0);
  new.is_custom := coalesce((new.data->>'isCustom')::boolean, false);
  new.created_at := new.data->>'createdAt';
  new.updated_at := new.data->>'updatedAt';
  new.updated_by := new.data->>'updatedBy';
  new.reviewed_by := new.data->>'reviewedBy';
  return new;
end
$$;
create trigger sync_question_columns before insert or update on public.questions
  for each row execute function public.sync_question_columns();

alter table public.profiles enable row level security;
alter table public.user_private_state enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.security_events enable row level security;

-- Privileged account creation, family linkage and audit rows are server-only.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_private_state to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;
grant select, insert, update, delete on public.test_attempts to authenticated;
grant select, insert, update, delete on public.profiles, public.user_private_state,
  public.questions, public.practice_sessions, public.test_attempts,
  public.ai_generation_jobs, public.ai_generation_logs, public.security_events to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy profiles_read on public.profiles for select to authenticated
  using ((select auth.uid()) = id or linked_parent_id = (select auth.uid())::text);
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy private_state_read on public.user_private_state for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.linked_parent_id = (select auth.uid())::text
  ));
create policy private_state_insert on public.user_private_state for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy private_state_update on public.user_private_state for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy private_state_delete on public.user_private_state for delete to authenticated
  using (user_id = (select auth.uid()));

create policy questions_read on public.questions for select to authenticated
  using (status = 'published' or ((select auth.jwt())->'app_metadata'->>'role') = 'admin');
create policy questions_insert on public.questions for insert to authenticated
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');
create policy questions_update on public.questions for update to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');
create policy questions_delete on public.questions for delete to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin');

create policy practice_read on public.practice_sessions for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.linked_parent_id = (select auth.uid())::text
  ));
create policy practice_insert on public.practice_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy practice_update on public.practice_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy practice_delete on public.practice_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy attempts_read on public.test_attempts for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.linked_parent_id = (select auth.uid())::text
  ));
create policy attempts_insert on public.test_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy attempts_update on public.test_attempts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy attempts_delete on public.test_attempts for delete to authenticated
  using (user_id = (select auth.uid()));

-- The server uses the service role for AI jobs, logs and security events.
-- No client policies are intentionally defined for those three tables.

create function public.save_question(payload jsonb, p_expected_revision integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  question_id text := payload->>'id';
  current_revision integer;
  saved jsonb;
begin
  if (select auth.uid()) is null or
     (select auth.jwt()->'app_metadata'->>'role') is distinct from 'admin' then
    raise exception 'Admin session required' using errcode = '42501';
  end if;
  if question_id is null or question_id = '' or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid question or revision' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(question_id, 0));
  select revision into current_revision from public.questions where id = question_id for update;
  if coalesce(current_revision, 0) <> p_expected_revision then
    raise exception 'Question changed in another session' using errcode = '40001';
  end if;
  if (payload->>'revision')::integer is distinct from p_expected_revision + 1 then
    raise exception 'Invalid next revision' using errcode = '22023';
  end if;
  insert into public.questions (id, data) values (question_id, payload)
    on conflict (id) do update set data = excluded.data
    returning data into saved;
  return saved;
end
$$;
revoke all on function public.save_question(jsonb, integer) from public, anon;
grant execute on function public.save_question(jsonb, integer) to authenticated;

create function public.revoke_user_sessions(target_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  delete from auth.sessions where user_id = target_id;
end
$$;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- Realtime is needed for profile and question updates in the browser.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'questions', 'user_private_state'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
