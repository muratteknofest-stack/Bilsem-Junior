-- Account-project alignment. Generated from repository SQL; do not apply to an already modern project.
-- auth.users, passwords, verification state and session ownership remain unchanged.
begin;
select pg_advisory_xact_lock(hashtextextended('bilsem-account-project-alignment',0));
lock table auth.users in share row exclusive mode;
do $$ begin
  if to_regclass('public.learning_sessions') is not null or to_regnamespace('bilsem_legacy') is not null
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name')
    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role')
    then raise exception 'Expected legacy Bilsem project schema; migration refused'; end if;
end $$;
create schema bilsem_legacy;
revoke all on schema bilsem_legacy from public,anon,authenticated;
grant usage on schema bilsem_legacy to service_role;
create table bilsem_legacy.row_manifest(table_name text primary key,row_count bigint not null,fingerprint text not null);
create table bilsem_legacy.function_manifest(signature text primary key,definition text not null);
insert into bilsem_legacy.row_manifest
 select 'auth.users',count(*),md5(coalesce(jsonb_agg(to_jsonb(u) order by id),'[]'::jsonb)::text) from auth.users u;
do $$ declare table_name text; fn record; begin
  foreach table_name in array array['profiles','subjects','topics','exams','questions','exam_results','user_purchases','arena_challenges'] loop
    execute format('lock table public.%I in access exclusive mode',table_name);
    execute format('insert into bilsem_legacy.row_manifest select %L,count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb)::text) from public.%I t',table_name,table_name);
    execute format('alter table public.%I set schema bilsem_legacy',table_name);
  end loop;
  for fn in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in ('handle_new_user','is_admin','increment_exam_play','get_filtered_leaderboard','check_and_reset_daily_credits','consume_credit') loop
    insert into bilsem_legacy.function_manifest values(fn.proname||'('||fn.args||')',fn.definition);
    execute format('alter function public.%I(%s) set schema bilsem_legacy',fn.proname,fn.args);
  end loop;
end $$;
-- The family API creates complete profiles explicitly. Preserve the managed
-- Auth trigger and its OID, but retire its obsolete profile insert in our own
-- function. The original definition remains in function_manifest for recovery.
create or replace function bilsem_legacy.handle_new_user() returns trigger
language plpgsql security invoker set search_path='' as $$ begin return new; end $$;
revoke all on all functions in schema bilsem_legacy from public,anon,authenticated,service_role;
revoke all on all tables in schema bilsem_legacy from public,anon,authenticated;
grant select on all tables in schema bilsem_legacy to service_role;

-- Source: supabase/schema.sql
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
create index questions_published_lookup_idx on public.questions (status, target_grade, category, difficulty);

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

-- Merge only changed keys so two devices cannot erase unrelated progress.
create function public.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  saved jsonb;
  allowed text[] := array[
    'yapyap_mastery', 'yapyap_mistakes', 'yapyap_achievements',
    'yapyap_missions', 'yapyap_exam_results', 'yapyap_active_exam',
    'yapyap_weekly_questions_v1', 'bilsem_weekly_category_challenges_v1',
    'zekapark_study_favorites_v1'
  ];
begin
  if (select auth.uid()) is null or pg_catalog.jsonb_typeof(p_patch) <> 'object'
     or pg_catalog.length(p_patch::text) > 250000
     or exists (select 1 from pg_catalog.jsonb_each(p_patch) as item
       where not (item.key = any(allowed)) or (item.value <> 'null'::jsonb and pg_catalog.jsonb_typeof(item.value) <> 'string')) then
    raise exception 'Invalid progress patch' using errcode = '22023';
  end if;
  insert into public.user_private_state(user_id, values, updated_at)
  values ((select auth.uid()), pg_catalog.jsonb_strip_nulls(p_patch), now())
  on conflict (user_id) do update set
    values = (public.user_private_state.values - coalesce(
      (select pg_catalog.array_agg(item.key) from pg_catalog.jsonb_each(p_patch) as item where item.value = 'null'::jsonb),
      array[]::text[])) || pg_catalog.jsonb_strip_nulls(p_patch),
    updated_at = now()
  returning values into saved;
  return saved;
end
$$;
revoke all on function public.patch_user_progress(jsonb) from public, anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;

create policy questions_read on public.questions for select to authenticated
  using (status = 'published' or ((select auth.jwt())->'app_metadata'->>'role') = 'admin');
create policy questions_insert on public.questions for insert to authenticated
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin' and status <> 'published');
create policy questions_update on public.questions for update to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin' and status <> 'published');
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
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' and
     ((select auth.uid()) is null or
      (select auth.jwt()->'app_metadata'->>'role') is distinct from 'admin') then
    raise exception 'Admin session required' using errcode = '42501';
  end if;
  if payload->>'status' = 'published' and coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception 'Publishing requires server review' using errcode = '42501';
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
grant execute on function public.save_question(jsonb, integer) to authenticated, service_role;

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



-- Source: supabase/migrations/20261005180525_admin_claim_only.sql
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.raw_app_meta_data->>'role' = 'admin'
  )
$$;


-- Source: supabase/migrations/20261008150000_editorial_server_publication.sql
-- Published questions must pass the server's TypeScript quality and review gate.
-- Authenticated editors retain direct access to drafts and archival operations.
alter policy questions_insert on public.questions
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin' and status <> 'published');

alter policy questions_update on public.questions
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin' and status <> 'published');

create or replace function public.save_question(payload jsonb, p_expected_revision integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  question_id text := payload->>'id';
  current_revision integer;
  saved jsonb;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' and
     ((select auth.uid()) is null or
      (select auth.jwt()->'app_metadata'->>'role') is distinct from 'admin') then
    raise exception 'Admin session required' using errcode = '42501';
  end if;
  if payload->>'status' = 'published' and coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception 'Publishing requires server review' using errcode = '42501';
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
grant execute on function public.save_question(jsonb, integer) to authenticated, service_role;


-- Source: supabase/migrations/20261008151000_progress_patch.sql
-- A partial update preserves progress keys written by another device.
create or replace function public.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  saved jsonb;
  allowed text[] := array[
    'yapyap_mastery', 'yapyap_mistakes', 'yapyap_achievements',
    'yapyap_missions', 'yapyap_exam_results', 'yapyap_active_exam',
    'yapyap_weekly_questions_v1', 'bilsem_weekly_category_challenges_v1',
    'zekapark_study_favorites_v1'
  ];
begin
  if (select auth.uid()) is null or pg_catalog.jsonb_typeof(p_patch) <> 'object'
     or pg_catalog.length(p_patch::text) > 250000
     or exists (select 1 from pg_catalog.jsonb_each(p_patch) as item
       where not (item.key = any(allowed)) or (item.value <> 'null'::jsonb and pg_catalog.jsonb_typeof(item.value) <> 'string')) then
    raise exception 'Invalid progress patch' using errcode = '22023';
  end if;
  insert into public.user_private_state(user_id, values, updated_at)
  values ((select auth.uid()), pg_catalog.jsonb_strip_nulls(p_patch), now())
  on conflict (user_id) do update set
    values = (public.user_private_state.values - coalesce(
      (select pg_catalog.array_agg(item.key) from pg_catalog.jsonb_each(p_patch) as item where item.value = 'null'::jsonb),
      array[]::text[])) || pg_catalog.jsonb_strip_nulls(p_patch),
    updated_at = now()
  returning values into saved;
  return saved;
end
$$;
revoke all on function public.patch_user_progress(jsonb) from public, anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;


-- Source: supabase/migrations/20261008165142_commercial_support_requests.sql
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


-- Source: supabase/migrations/20261008170714_verified_daily_challenges.sql
create table public.daily_challenge_attempts (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 slot smallint not null check (slot between 1 and 3),
 grade smallint not null check (grade between 1 and 4),
 question jsonb not null check (octet_length(question::text) <= 160000),
 selected_option text,
 correct boolean,
 points smallint not null default 0 check (points in (0,10)),
 created_at timestamptz not null default now(),
 answered_at timestamptz,
 unique(student_id,day,slot),
 check ((answered_at is null and selected_option is null and correct is null and points=0) or
        (answered_at is not null and selected_option is not null and correct is not null and points=case when correct then 10 else 0 end))
);
alter table public.daily_challenge_attempts enable row level security;
revoke all on public.daily_challenge_attempts from public,anon,authenticated;
grant select,insert,update,delete on public.daily_challenge_attempts to service_role;
create index daily_challenge_student_time_idx on public.daily_challenge_attempts(student_id,created_at desc);

create function public.issue_daily_challenge(p_student uuid,p_grade int,p_question jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_day date := (now() at time zone 'Europe/Istanbul')::date; v_row public.daily_challenge_attempts; v_slot int;
begin
 if p_student is null or p_grade is null or p_grade not between 1 and 4 or p_question is null or
    jsonb_typeof(p_question->'options') is distinct from 'array' or
    coalesce(p_question->>'correctOptionId','')='' then raise exception 'Invalid challenge' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_student::text,2));
 select * into v_row from public.daily_challenge_attempts where student_id=p_student and day=v_day and answered_at is null order by slot limit 1;
 if found then return to_jsonb(v_row); end if;
 select coalesce(max(slot),0)+1 into v_slot from public.daily_challenge_attempts where student_id=p_student and day=v_day;
 if v_slot>3 then return null; end if;
 insert into public.daily_challenge_attempts(student_id,day,slot,grade,question) values(p_student,v_day,v_slot,p_grade,p_question) returning * into v_row;
 return to_jsonb(v_row);
end $$;

create function public.answer_daily_challenge(p_student uuid,p_attempt uuid,p_option text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row public.daily_challenge_attempts; v_correct boolean;
begin
 select * into v_row from public.daily_challenge_attempts where id=p_attempt and student_id=p_student for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002'; end if;
 if v_row.answered_at is not null then return to_jsonb(v_row); end if;
 if v_row.day <> (now() at time zone 'Europe/Istanbul')::date then raise exception 'Challenge expired' using errcode='22023'; end if;
 if p_option is null or not exists (select 1 from jsonb_array_elements(v_row.question->'options') o where o->>'id'=p_option) then
   raise exception 'Invalid option' using errcode='22023';
 end if;
 v_correct := p_option = v_row.question->>'correctOptionId';
 update public.daily_challenge_attempts set selected_option=p_option,correct=v_correct,points=case when v_correct then 10 else 0 end,answered_at=now()
 where id=v_row.id returning * into v_row;
 return to_jsonb(v_row);
end $$;
revoke all on function public.issue_daily_challenge(uuid,int,jsonb) from public,anon,authenticated;
revoke all on function public.answer_daily_challenge(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.issue_daily_challenge(uuid,int,jsonb) to service_role;
grant execute on function public.answer_daily_challenge(uuid,uuid,text) to service_role;


-- Source: supabase/migrations/20261010085952_server_verified_learning.sql
-- Additive rollout: deploy this migration before the new API. No legacy permissions change here.
create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('practice','adaptive','exam')),
  title text not null,
  review_mistake_id text,
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 50),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  revision integer not null default 0,
  rewarded_xp integer not null default 0 check (rewarded_xp >= 0),
  result jsonb,
  check (expires_at > created_at),
  check ((finished_at is null) = (result is null))
);
create index learning_sessions_student_created_idx on public.learning_sessions(student_id, created_at desc);
create unique index learning_sessions_active_idx on public.learning_sessions(student_id, mode) where finished_at is null;
alter table public.learning_sessions enable row level security;
revoke all on public.learning_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.learning_sessions to service_role;

-- Scoring is computed by the authenticated API from an immutable question snapshot.
-- This RPC locks both the session and profile: answer, XP and progress commit together.
create function public.commit_learning_session(p_student uuid, p_session uuid, p_revision integer, p_answers jsonb, p_result jsonb, p_xp integer, p_finished boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.learning_sessions%rowtype; p public.profiles%rowtype;
  day_key date := (now() at time zone 'Europe/Istanbul')::date;
  week_key date := date_trunc('week', now() at time zone 'Europe/Istanbul')::date;
  prior_day date; same_day boolean; delta_xp integer; delta_answers integer := 0;
  state jsonb; masteries jsonb; mistakes jsonb; exams jsonb; weekly jsonb;
  item record; q jsonb; a jsonb; mastery jsonb; m_index integer; category text;
  attempts integer; correct_count integer; category_name text; days jsonb; day_index integer;
  category_counts jsonb; week_counts jsonb; today_counts jsonb; resolved_delta integer := 0;
  categories jsonb := '{}'; stats jsonb; exam_result jsonb;
  new_streak integer; history boolean[];
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if p_xp not between 0 and 10000 or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 100000 or (p_finished and jsonb_typeof(p_result) <> 'object') then raise exception 'invalid learning commit' using errcode='22023'; end if;
  select * into s from public.learning_sessions where id=p_session and student_id=p_student for update;
  if not found then raise exception 'session not found' using errcode='P0002'; end if;
  if s.finished_at is not null then return to_jsonb(s); end if;
  if s.revision <> p_revision then return null; end if;
  if not p_finished and now() >= s.expires_at then raise exception 'session expired' using errcode='22023'; end if;
  if p_xp < s.rewarded_xp or (s.mode='exam' and not p_finished and p_xp <> 0) then raise exception 'invalid reward' using errcode='22023'; end if;
  select * into strict p from public.profiles where id=p_student and role='student' for update;
  insert into public.user_private_state(user_id) values(p_student) on conflict do nothing;
  select values into state from public.user_private_state where user_id=p_student for update;
  masteries := coalesce((state->>'yapyap_mastery')::jsonb, '[]');
  mistakes := coalesce((state->>'yapyap_mistakes')::jsonb, '[]');
  exams := coalesce((state->>'yapyap_exam_results')::jsonb, '[]');
  weekly := coalesce((state->>'yapyap_weekly_questions_v1')::jsonb, '{}');
  if jsonb_typeof(masteries) <> 'array' then masteries := '[]'; end if;
  if jsonb_typeof(mistakes) <> 'array' then mistakes := '[]'; end if;
  if jsonb_typeof(exams) <> 'array' then exams := '[]'; end if;
  if weekly->>'weekStart' is distinct from week_key::text then
    weekly := jsonb_build_object('weekStart', week_key::text, 'thisWeekDays', '[0,0,0,0,0,0,0]'::jsonb, 'lastWeekDays', case when weekly->>'weekStart' = (week_key-7)::text then weekly->'thisWeekDays' else '[0,0,0,0,0,0,0]'::jsonb end, 'pastWeeks', '[0,0]'::jsonb);
  end if;
  category_counts := coalesce((state->>'zekapark_verified_categories_v1')::jsonb,'{}');
  week_counts := case when category_counts->>'weekStart'=week_key::text then coalesce(category_counts->'counts','{}') else '{}'::jsonb end;
  today_counts := case when category_counts->>'day'=day_key::text then coalesce(category_counts->'todayCounts','{}') else '{}'::jsonb end;
  days := weekly->'thisWeekDays'; day_index := extract(isodow from day_key)::integer-1;
  for item in select key, value from jsonb_each(p_answers) loop
    if item.key !~ '^[0-9]{1,2}$' or item.key::integer >= jsonb_array_length(s.questions) then raise exception 'invalid question index' using errcode='22023'; end if;
    if (s.mode='exam' and p_finished) or (s.mode <> 'exam' and not s.answers ? item.key) then
      q := s.questions->item.key::integer; a := item.value; category := q->>'category';
      delta_answers := delta_answers+1;
      week_counts := jsonb_set(week_counts,array[category],to_jsonb(coalesce((week_counts->>category)::integer,0)+1));
      today_counts := jsonb_set(today_counts,array[category],to_jsonb(coalesce((today_counts->>category)::integer,0)+1));
      if s.review_mistake_id is not null and (a->>'correct')::boolean then
        if exists(select 1 from jsonb_array_elements(mistakes) v where v->>'id'=s.review_mistake_id and not coalesce((v->>'resolved')::boolean,false)) then
          resolved_delta := resolved_delta+1;
          select coalesce(jsonb_agg(case when v->>'id'=s.review_mistake_id then v || jsonb_build_object('resolved',true,'reviewed',true,'resolvedAt',day_key::text) else v end),'[]') into mistakes from jsonb_array_elements(mistakes) v;
        else raise exception 'review already completed' using errcode='22023';
        end if;
      end if;
      mastery := null; m_index := null;
      select value, ordinality::integer-1 into mastery, m_index from jsonb_array_elements(masteries) with ordinality where value->>'category'=category limit 1;
      category_name := case category when 'visual_perception' then 'Görsel Algı' when 'pattern' then 'Örüntü ve Dizi' when 'matrix' then 'Matris Tamamlama' when 'spatial' then 'Uzamsal Zeka' when 'logic' then 'Mantık ve Muhakeme' when 'attention' then 'Dikkat ve Odaklanma' when 'numerical' then 'Sayısal Muhakeme' when 'coding' then 'Algoritma ve Kodlama' else category end;
      attempts := coalesce((mastery->>'attemptCount')::integer,0)+1;
      correct_count := coalesce((mastery->>'correctCount')::integer, round(coalesce((mastery->>'accuracy')::numeric,0)*(attempts-1)/100)::integer)+case when (a->>'correct')::boolean then 1 else 0 end;
      mastery := jsonb_build_object('category',category,'categoryName',category_name,'attemptCount',attempts,'correctCount',correct_count,'accuracy',round(correct_count::numeric/attempts*100),'mastery',least(100,greatest(10,coalesce((mastery->>'mastery')::integer,10)+case when (a->>'correct')::boolean then greatest(1,round((q->>'difficulty')::numeric*0.8)::integer) else -greatest(1,round((q->>'difficulty')::numeric*0.4)::integer) end)),'recentTrend',case when (a->>'correct')::boolean then 'up' else 'down' end);
      if m_index is null then masteries := masteries || jsonb_build_array(mastery); else masteries := jsonb_set(masteries,array[m_index::text],mastery); end if;
      if s.review_mistake_id is null and not (a->>'correct')::boolean then
        mistakes := jsonb_build_array(jsonb_build_object('id','learning-'||s.id::text||'-'||item.key,'questionId',q->>'id','questionSeed',q->'seed','questionType',q->>'type','difficulty',q->'difficulty','category',category,'prompt',q->>'prompt','createdAt',day_key::text,'reviewed',false,'resolved',false,'cachedQuestion',q)) || mistakes;
      end if;
    end if;
  end loop;
  if p_finished and s.mode='exam' then
    for item in select value, ordinality::integer-1 as idx from jsonb_array_elements(s.questions) with ordinality loop
      category := item.value->>'category'; stats := coalesce(categories->category,'{"total":0,"correct":0}');
      categories := jsonb_set(categories,array[category],jsonb_build_object('total',(stats->>'total')::integer+1,'correct',(stats->>'correct')::integer+case when coalesce((p_answers->item.idx::text->>'correct')::boolean,false) then 1 else 0 end));
    end loop;
    exam_result := p_result || jsonb_build_object('examId',s.id,'title',s.title,'date',day_key::text,'categoryBreakdown',categories);
    exams := jsonb_build_array(exam_result) || exams;
    state := state - 'yapyap_active_exam';
  end if;
  -- Bound derived history without pruning records in learning_sessions.
  select coalesce(jsonb_agg(value),'[]') into mistakes from (select value from jsonb_array_elements(mistakes) limit 250) bounded;
  select coalesce(jsonb_agg(value),'[]') into exams from (select value from jsonb_array_elements(exams) limit 100) bounded;
  days := jsonb_set(days,array[day_index::text],to_jsonb(coalesce((days->>day_index)::integer,0)+delta_answers));
  weekly := jsonb_set(weekly,'{thisWeekDays}',days);
  state := state || jsonb_build_object('yapyap_mastery',masteries::text,'yapyap_mistakes',mistakes::text,'yapyap_exam_results',exams::text,'yapyap_weekly_questions_v1',weekly::text,'zekapark_verified_categories_v1',jsonb_build_object('day',day_key::text,'weekStart',week_key::text,'counts',week_counts,'todayCounts',today_counts)::text);
  update public.user_private_state set values=state,updated_at=now() where user_id=p_student;
  delta_xp := p_xp-s.rewarded_xp;
  prior_day := case when p.last_active_date='' then null else (p.last_active_date::timestamptz at time zone 'Europe/Istanbul')::date end;
  same_day := coalesce(prior_day=day_key,false);
  new_streak := case when delta_answers=0 or same_day then p.streak::integer when prior_day=day_key-1 then p.streak::integer+1 else 1 end;
  history := case when date_trunc('week',prior_day::timestamp)::date=week_key then p.weekly_streak_history else array[false,false,false,false,false,false,false] end;
  if delta_answers>0 then history[day_index+1]:=true; end if;
  update public.profiles set
    xp=xp+delta_xp,total_points=xp+delta_xp,level=floor((xp+delta_xp)/250)::integer+1,
    total_questions_solved=total_questions_solved+delta_answers,resolved_mistakes_count=resolved_mistakes_count+resolved_delta,
    today_questions_solved=case when same_day then today_questions_solved else 0 end+delta_answers,
    today_minutes_spent=case when same_day then today_minutes_spent else 0 end+case when p_finished then least(60,ceil((p_result->>'totalTimeSeconds')::numeric/60)) else 0 end,
    today_sessions_completed=case when same_day then today_sessions_completed else 0 end+case when p_finished and p_answers <> '{}'::jsonb then 1 else 0 end,
    streak=new_streak,longest_streak=greatest(longest_streak,new_streak),weekly_streak_history=history,
    today_practiced=case when delta_answers>0 then true when same_day then today_practiced else false end,
    last_active_date=case when delta_answers>0 then now()::text else last_active_date end,updated_at=extract(epoch from now())*1000
    where id=p_student;
  update public.learning_sessions set answers=p_answers,result=p_result,finished_at=case when p_finished then now() else null end,revision=revision+1,rewarded_xp=p_xp where id=s.id returning * into s;
  return to_jsonb(s);
end
$$;
revoke all on function public.commit_learning_session(uuid,uuid,integer,jsonb,jsonb,integer,boolean) from public,anon,authenticated;
grant execute on function public.commit_learning_session(uuid,uuid,integer,jsonb,jsonb,integer,boolean) to service_role;

create function public.is_user_session_active(p_user uuid,p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce(auth.jwt()->>'role','')='service_role' and exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now()));
$$;
revoke all on function public.is_user_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.is_user_session_active(uuid,uuid) to service_role;

create table public.learning_reward_claims (
 student_id uuid not null references public.profiles(id) on delete cascade,
 reward_key text not null check(length(reward_key)<=150), xp integer not null check(xp between 0 and 1500),
 created_at timestamptz not null default now(), primary key(student_id,reward_key)
);
alter table public.learning_reward_claims enable row level security;
revoke all on public.learning_reward_claims from public,anon,authenticated;
grant select,insert on public.learning_reward_claims to service_role;

create function public.learning_reward_facts(p_student uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with scored as (
   select s.mode,s.created_at,s.finished_at,s.review_mistake_id,s.result,s.questions->a.key::integer as q,a.value as a
   from public.learning_sessions s cross join lateral jsonb_each(s.answers) a
   where s.student_id=p_student and (s.mode<>'exam' or s.finished_at is not null)
 ), by_category as (
   select q->>'category' as category,count(*) filter(where (a->>'correct')::boolean) as correct from scored group by q->>'category'
 )
 select case when coalesce(auth.jwt()->>'role','')<>'service_role' then null else jsonb_build_object(
  'answered',(select count(*) from scored),
  'correctCategories',(select coalesce(jsonb_object_agg(category,correct),'{}') from by_category),
  'hardCorrect',(select count(*) from scored where (a->>'correct')::boolean and (q->>'difficulty')::integer>=4),
  'reviewToday',(select count(*) from scored where review_mistake_id is not null and (a->>'correct')::boolean and (created_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),
  'exams',(select count(*) from public.learning_sessions where student_id=p_student and mode='exam' and finished_at is not null and answers<>'{}'),
  'perfect',(select count(*) from public.learning_sessions where student_id=p_student and finished_at is not null and jsonb_array_length(questions)>=5 and (result->>'scorePercentage')::integer=100),
  'weekend',(select count(distinct extract(isodow from created_at at time zone 'Europe/Istanbul')) from scored where extract(isodow from created_at at time zone 'Europe/Istanbul')>=6)
 ) end;
$$;
revoke all on function public.learning_reward_facts(uuid) from public,anon,authenticated;
grant execute on function public.learning_reward_facts(uuid) to service_role;

create function public.claim_learning_reward(p_student uuid,p_key text,p_xp integer,p_badge jsonb,p_streak_day integer,p_expected_updated_at double precision) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles%rowtype; awarded integer; state jsonb; badges jsonb; keys jsonb;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 if p_xp not between 1 and 1500 or length(p_key)>150 then raise exception 'invalid reward' using errcode='22023'; end if;
 select * into strict p from public.profiles where id=p_student and role='student' for update;
 if exists(select 1 from public.learning_reward_claims where student_id=p_student and reward_key=p_key) then return jsonb_build_object('xpAwarded',0); end if;
 if p.updated_at is distinct from p_expected_updated_at then return null; end if;
 insert into public.learning_reward_claims(student_id,reward_key,xp) values(p_student,p_key,p_xp) on conflict do nothing returning xp into awarded;
 if awarded is null then return jsonb_build_object('xpAwarded',0); end if;
 update public.profiles set xp=xp+awarded,total_points=xp+awarded,level=floor((xp+awarded)/250)::integer+1,
 claimed_streak_days=case when p_streak_day is not null and not p_streak_day=any(claimed_streak_days) then array_append(claimed_streak_days,p_streak_day::double precision) else claimed_streak_days end,
 streak_freeze_count=streak_freeze_count+case when p_streak_day=7 then 1 else 0 end,updated_at=extract(epoch from now())*1000 where id=p_student;
 insert into public.user_private_state(user_id) values(p_student) on conflict do nothing;
 select values into state from public.user_private_state where user_id=p_student for update;
 if p_badge is not null then
   badges:=coalesce((state->>'yapyap_achievements')::jsonb,'[]');
   select coalesce(jsonb_agg(value),'[]') into badges from jsonb_array_elements(badges) where value->>'id' is distinct from p_badge->>'id';
   badges:=badges || jsonb_build_array(p_badge || jsonb_build_object('unlocked',true,'progress',p_badge->'maxProgress','rewardClaimed',true,'unlockedAt',(now() at time zone 'Europe/Istanbul')::date::text));
   state:=state || jsonb_build_object('yapyap_achievements',badges::text);
 end if;
 select coalesce(jsonb_agg(reward_key),'[]') into keys from public.learning_reward_claims where student_id=p_student;
 update public.user_private_state set values=state || jsonb_build_object('zekapark_reward_claims_v1',keys::text),updated_at=now() where user_id=p_student;
 return jsonb_build_object('xpAwarded',awarded);
end $$;
revoke all on function public.claim_learning_reward(uuid,text,integer,jsonb,integer,double precision) from public,anon,authenticated;
grant execute on function public.claim_learning_reward(uuid,text,integer,jsonb,integer,double precision) to service_role;


-- Source: supabase/migrations/20261010090133_protect_verified_progress.sql
-- Activate ONLY after the learning API has been deployed and smoke-tested.
-- This removes legacy client authority over scoring and published answer keys.
-- Fresh production projects may not contain the older admin-helper migration.
-- Read provider-owned metadata, so stale/client-edited JWT metadata cannot grant admin access.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u where u.id=auth.uid()
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'role'='admin'
  );
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,service_role;

create or replace function public.protect_profile_progress() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' and
    (new.xp,new.level,new.total_points,new.streak,new.longest_streak,new.last_active_date,
     new.today_practiced,new.streak_freeze_count,new.claimed_streak_days,new.weekly_streak_history,
     new.today_minutes_spent,new.today_questions_solved,new.today_sessions_completed,
     new.total_questions_solved,new.resolved_mistakes_count)
    is distinct from
    (old.xp,old.level,old.total_points,old.streak,old.longest_streak,old.last_active_date,
     old.today_practiced,old.streak_freeze_count,old.claimed_streak_days,old.weekly_streak_history,
     old.today_minutes_spent,old.today_questions_solved,old.today_sessions_completed,
     old.total_questions_solved,old.resolved_mistakes_count) then
    raise exception 'Progress is scored by the server' using errcode='42501';
  end if;
  return new;
end
$$;
create trigger protect_profile_progress before update on public.profiles for each row execute function public.protect_profile_progress();

create function public.has_active_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())
  );
$$;
revoke all on function public.has_active_session() from public,anon;
grant execute on function public.has_active_session() to authenticated,service_role;
-- Revoked access tokens must also stop working through PostgREST and Realtime.
do $$
declare p record; statement text;
begin
  for p in select * from pg_policies where schemaname='public' and 'authenticated'=any(roles) loop
    statement := format('alter policy %I on public.%I',p.policyname,p.tablename);
    if p.qual is not null then statement := statement || ' using ((' || p.qual || ') and (select public.has_active_session()))'; end if;
    if p.with_check is not null then statement := statement || ' with check ((' || p.with_check || ') and (select public.has_active_session()))'; end if;
    execute statement;
  end loop;
end $$;
alter policy questions_read on public.questions using ((select public.is_admin()) and (select public.has_active_session()));
alter policy questions_insert on public.questions with check ((select public.is_admin()) and (select public.has_active_session()) and status<>'published');
alter policy questions_update on public.questions using ((select public.is_admin()) and (select public.has_active_session())) with check ((select public.is_admin()) and (select public.has_active_session()) and status<>'published');
alter policy questions_delete on public.questions using ((select public.is_admin()) and (select public.has_active_session()));
revoke insert,update,delete on public.user_private_state from authenticated;
revoke insert,update,delete on public.practice_sessions,public.test_attempts from authenticated;

create or replace function public.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved jsonb; allowed text[] := array['yapyap_active_exam','zekapark_study_favorites_v1'];
begin
  if not public.has_active_session() or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text)>250000 or exists(
    select 1 from jsonb_each(p_patch) item where not (item.key=any(allowed)) or (item.value<>'null'::jsonb and jsonb_typeof(item.value)<>'string')
  ) then raise exception 'Invalid progress patch' using errcode='22023'; end if;
  insert into public.user_private_state(user_id,values,updated_at) values(auth.uid(),jsonb_strip_nulls(p_patch),now())
  on conflict(user_id) do update set values=(public.user_private_state.values - coalesce((select array_agg(item.key) from jsonb_each(p_patch) item where item.value='null'::jsonb),array[]::text[])) || jsonb_strip_nulls(p_patch),updated_at=now()
  returning values into saved;
  return saved;
end $$;
revoke all on function public.patch_user_progress(jsonb) from public,anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;


-- Source: supabase/migrations/20261010091235_distributed_api_limits.sql
create table public.api_rate_windows (
 key text not null, scope text not null, window_start timestamptz not null,
 used integer not null default 0 check(used>=0), primary key(key,scope,window_start)
);
create index api_rate_windows_expiry_idx on public.api_rate_windows(window_start);
alter table public.api_rate_windows enable row level security;
revoke all on public.api_rate_windows from public,anon,authenticated;
grant select,insert,update,delete on public.api_rate_windows to service_role;
create function public.consume_api_limit(p_key text,p_scope text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare started timestamptz; consumed integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 if p_key !~ '^[a-f0-9]{64}$' or length(p_scope)>60 or p_limit not between 1 and 10000 or p_seconds not between 1 and 86400 then raise exception 'invalid limit' using errcode='22023'; end if;
 started:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into public.api_rate_windows(key,scope,window_start) values(p_key,p_scope,started) on conflict do nothing;
 update public.api_rate_windows set used=used+1 where key=p_key and scope=p_scope and window_start=started and used<p_limit returning used into consumed;
 delete from public.api_rate_windows where ctid in (select ctid from public.api_rate_windows where window_start<now()-interval '2 days' order by window_start limit 50);
 return consumed is not null;
end $$;
revoke all on function public.consume_api_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_api_limit(text,text,integer,integer) to service_role;


-- Source: supabase/migrations/20261010122109_private_security_helpers.sql
-- Keep Auth-table lookups and the checked progress mutation outside the Data API schema.
-- Policy expressions follow function OIDs when functions move schemas.
create schema if not exists zekapark_private;
revoke all on schema zekapark_private from public,anon;
grant usage on schema zekapark_private to authenticated,service_role;
alter function public.is_admin() set schema zekapark_private;
alter function public.has_active_session() set schema zekapark_private;
alter function public.patch_user_progress(jsonb) set schema zekapark_private;

create or replace function zekapark_private.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved jsonb; allowed text[] := array['yapyap_active_exam','zekapark_study_favorites_v1'];
begin
  if not zekapark_private.has_active_session() or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text)>250000 or exists(
    select 1 from jsonb_each(p_patch) item where not (item.key=any(allowed)) or (item.value<>'null'::jsonb and jsonb_typeof(item.value)<>'string')
  ) then raise exception 'Invalid progress patch' using errcode='22023'; end if;
  insert into public.user_private_state(user_id,values,updated_at) values(auth.uid(),jsonb_strip_nulls(p_patch),now())
  on conflict(user_id) do update set values=(public.user_private_state.values - coalesce((select array_agg(item.key) from jsonb_each(p_patch) item where item.value='null'::jsonb),array[]::text[])) || jsonb_strip_nulls(p_patch),updated_at=now()
  returning values into saved;
  return saved;
end $$;
revoke all on function zekapark_private.patch_user_progress(jsonb) from public,anon;
grant execute on function zekapark_private.patch_user_progress(jsonb) to authenticated;

-- Preserve the application's narrow public RPC without public SECURITY DEFINER code.
create function public.patch_user_progress(p_patch jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select zekapark_private.patch_user_progress(p_patch);
$$;
revoke all on function public.patch_user_progress(jsonb) from public,anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;


-- Source: supabase/migrations/20261011080721_platform_release_settings.sql
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


-- Source: supabase/migrations/20261011134720_learning_grade_difficulty.sql
alter table public.learning_sessions add column selection jsonb not null default '{}' check (jsonb_typeof(selection)='object');

-- Only the verified student API calls this function with its authenticated user ID.
create function public.change_student_grade(p_student uuid, p_grade integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare p public.profiles%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if p_student is null or p_grade is null or p_grade not between 1 and 4 then raise exception 'invalid grade' using errcode='22023'; end if;
  -- Match scoring's session-before-profile lock order.
  perform id from public.learning_sessions where student_id=p_student and finished_at is null order by id for update;
  select * into p from public.profiles where id=p_student and role='student' for update;
  if not found then raise exception 'student not found' using errcode='P0002'; end if;
  if p.grade is distinct from p_grade then
    update public.profiles set grade=p_grade, updated_at=floor(extract(epoch from clock_timestamp())*1000)::bigint where id=p_student returning * into p;
    -- Keep answers/history; the next start finishes the expired snapshot before issuing new questions.
    update public.learning_sessions set expires_at=greatest(created_at+interval '1 microsecond',least(expires_at,clock_timestamp())) where student_id=p_student and finished_at is null;
  end if;
  return to_jsonb(p);
end $$;
revoke all on function public.change_student_grade(uuid,integer) from public,anon,authenticated;
grant execute on function public.change_student_grade(uuid,integer) to service_role;

-- A pending daily task follows the current grade without granting extra daily slots.
create or replace function public.issue_daily_challenge(p_student uuid,p_grade int,p_question jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_day date := (now() at time zone 'Europe/Istanbul')::date; v_row public.daily_challenge_attempts; v_slot int;
begin
 if p_student is null or p_grade is null or p_grade not between 1 and 4 or p_question is null or
    jsonb_typeof(p_question->'options') is distinct from 'array' or
    coalesce(p_question->>'correctOptionId','')='' then raise exception 'Invalid challenge' using errcode='22023'; end if;
 if p_grade is distinct from (select grade from public.profiles where id=p_student and role='student') then raise exception 'Grade changed' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_student::text,2));
 select * into v_row from public.daily_challenge_attempts where student_id=p_student and day=v_day and answered_at is null order by slot limit 1;
 if found then
   if v_row.grade <> p_grade then
     update public.daily_challenge_attempts set grade=p_grade,question=p_question where id=v_row.id and answered_at is null returning * into v_row;
   end if;
   return to_jsonb(v_row);
 end if;
 select coalesce(max(slot),0)+1 into v_slot from public.daily_challenge_attempts where student_id=p_student and day=v_day;
 if v_slot>3 then return null; end if;
 insert into public.daily_challenge_attempts(student_id,day,slot,grade,question) values(p_student,v_day,v_slot,p_grade,p_question) returning * into v_row;
 return to_jsonb(v_row);
end $$;



-- Source: supabase/migrations/20261013150111_shopier_verified_access.sql
-- Server-verified Shopier receipts; clients never write or read this ledger directly.
create table public.shopier_access_orders (
  order_id text primary key check (order_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  parent_id uuid references public.profiles(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  product_id text not null,
  plan_id text not null check (plan_id in ('monthly','quarterly')),
  duration_days integer not null check (duration_days in (30,90)),
  amount_kurus integer not null check (amount_kurus in (29900,79900)),
  buyer_email_sha256 text not null check (buyer_email_sha256 ~ '^[a-f0-9]{64}$'),
  activated_at timestamptz not null default now(),
  check ((plan_id='monthly' and duration_days=30 and amount_kurus=29900) or (plan_id='quarterly' and duration_days=90 and amount_kurus=79900))
);
alter table public.shopier_access_orders enable row level security;
revoke all on public.shopier_access_orders from public,anon,authenticated;
grant select,insert on public.shopier_access_orders to service_role;
create index shopier_access_student_idx on public.shopier_access_orders(student_id,activated_at);
create index shopier_access_parent_idx on public.shopier_access_orders(parent_id);

create function public.claim_shopier_access(p_order text,p_parent uuid,p_student uuid,p_product text,p_plan text,p_buyer_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.shopier_access_orders%rowtype; parent public.profiles%rowtype; child public.profiles%rowtype;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
  if p_order is null or p_order !~ '^[A-Za-z0-9_-]{1,80}$' or p_product is null or length(p_product) not between 1 and 80
    or p_plan is null or p_plan not in ('monthly','quarterly') or p_buyer_hash is null or p_buyer_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid verified receipt' using errcode='22023'; end if;
  select * into parent from public.profiles where id=p_parent for share;
  select * into child from public.profiles where id=p_student for share;
  if parent.id is null or child.id is null or parent.role<>'parent' or child.role<>'student'
    or child.linked_parent_id is distinct from p_parent::text or not coalesce(p_student::text=any(parent.linked_student_ids),false)
    then raise exception 'Family ownership required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('shopier:'||p_order,0));
  select * into existing from public.shopier_access_orders where order_id=p_order;
  if found then
    if existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student
      or existing.product_id<>p_product or existing.plan_id<>p_plan or existing.buyer_email_sha256<>p_buyer_hash
      then raise exception 'Order already assigned' using errcode='40001'; end if;
    return to_jsonb(existing);
  end if;
  insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256)
    values(p_order,p_parent,p_student,p_product,p_plan,case p_plan when 'monthly' then 30 else 90 end,
      case p_plan when 'monthly' then 29900 else 79900 end,p_buyer_hash) returning * into existing;
  return to_jsonb(existing);
end $$;
revoke all on function public.claim_shopier_access(text,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_shopier_access(text,uuid,uuid,text,text,text) to service_role;


-- Source: supabase/migrations/20261013225228_resumable_account_deletion.sql
-- Only an MFA-verified admin API may prepare an explicitly requested deletion.
-- Auth deletion itself uses the official Admin API; no existing users are deleted by this migration.
alter table public.profiles add column deletion_pending boolean not null default false;
create function public.protect_deletion_pending() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.deletion_pending is distinct from old.deletion_pending and coalesce(auth.jwt()->>'role','')<>'service_role' then
  raise exception 'Server deletion workflow required' using errcode='42501';
 end if;
 return new;
end $$;
create trigger protect_deletion_pending before update on public.profiles for each row execute function public.protect_deletion_pending();

create table public.account_deletion_jobs (
 request_id uuid primary key references public.support_requests(id),
 member_ids uuid[] not null,
 related_request_ids uuid[] not null default '{}',
 member_count integer not null check(member_count between 1 and 21),
 status text not null default 'prepared' check(status in ('prepared','completed')),
 created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public,anon,authenticated;
grant select on public.account_deletion_jobs to service_role;

create function zekapark_private.prepare_account_deletion(p_request uuid,p_admin uuid,p_expected_members uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ticket public.support_requests%rowtype; owner public.profiles%rowtype; job public.account_deletion_jobs%rowtype;
 members uuid[]; expected uuid[]; children text[]; member uuid; object_count bigint;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not exists(select 1 from public.profiles where id=p_admin and role='admin' and not deletion_pending) then
  raise exception 'Admin server required' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request::text,17));
 select * into ticket from public.support_requests where id=p_request for update;
 if ticket.id is null or ticket.kind<>'deletion' or ticket.status not in ('open','reviewing','resolved') then raise exception 'Invalid deletion request' using errcode='22023'; end if;
 select * into job from public.account_deletion_jobs where request_id=p_request;
 if job.request_id is not null then
  if job.status='completed' then return to_jsonb(job); end if;
  members:=job.member_ids;
 else
  if ticket.status='resolved' or ticket.actor_id is null or ticket.payload->>'confirmedAt' is null then raise exception 'Owner confirmation missing' using errcode='22023'; end if;
  select * into owner from public.profiles where id=ticket.actor_id for update;
  if owner.id is null or owner.role not in ('parent','student') or owner.linked_parent_id is not null or owner.deletion_pending then raise exception 'Invalid owner' using errcode='42501'; end if;
  if owner.role='parent' then
   select coalesce(array_agg(id::text order by id::text),'{}') into children from public.profiles where linked_parent_id=owner.id::text;
   if children is distinct from (select coalesce(array_agg(v order by v),'{}') from unnest(owner.linked_student_ids) v)
    or exists(select 1 from public.profiles where linked_parent_id=owner.id::text and (role<>'student' or deletion_pending or cardinality(linked_student_ids)>0))
    or ticket.payload->>'scope'<>'family' then raise exception 'Family links changed' using errcode='40001'; end if;
   select array_agg(v::uuid order by v) into members from unnest(children||array[owner.id::text]) v;
  else
   if cardinality(owner.linked_student_ids)>0 or ticket.payload->>'scope'<>'self' then raise exception 'Invalid standalone account' using errcode='42501'; end if;
   members:=array[owner.id];
  end if;
  if cardinality(members)>21 or exists(select 1 from public.profiles where not(id=any(members)) and linked_student_ids && members::text[]) then raise exception 'Family links changed' using errcode='40001'; end if;
 end if;
 select array_agg(v order by v) into expected from unnest(p_expected_members) v;
 if expected is distinct from members then raise exception 'Deletion scope changed' using errcode='40001'; end if;
 -- Storage and paid receipts need a separately reviewed retention/removal procedure.
 -- Fail before freezing the family rather than silently delete or retain these records.
 if exists(select 1 from public.shopier_access_orders where parent_id=any(members) or student_id=any(members)) then raise exception 'Billing retention review required' using errcode='P0001'; end if;
 if to_regclass('storage.objects') is not null then
  execute 'select count(*) from storage.objects where owner_id=any($1) or owner::text=any($1)' into object_count using members::text[];
  if object_count>0 then raise exception 'Storage removal review required' using errcode='P0001'; end if;
 end if;
 perform id from public.profiles where id=any(members) order by id for update;
 if job.request_id is null then
  insert into public.account_deletion_jobs(request_id,member_ids,member_count,related_request_ids)
  values(p_request,members,cardinality(members),coalesce((select array_agg(id) from public.support_requests where actor_id=any(members)),'{}')) returning * into job;
 end if;
 update public.profiles set deletion_pending=true where id=any(members);
 delete from auth.sessions where user_id=any(members);
 update public.support_requests set status='reviewing',updated_at=now() where id=p_request;
 return to_jsonb(job);
end $$;

create function zekapark_private.finish_account_deletion(p_request uuid,p_admin uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job public.account_deletion_jobs%rowtype;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not exists(select 1 from public.profiles where id=p_admin and role='admin' and not deletion_pending) then raise exception 'Admin server required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request::text,17));
 select * into job from public.account_deletion_jobs where request_id=p_request for update;
 if job.request_id is null then raise exception 'Deletion not prepared' using errcode='22023'; end if;
 if job.status='completed' then return to_jsonb(job); end if;
 if exists(select 1 from auth.users where id=any(job.member_ids)) or exists(select 1 from public.profiles where id=any(job.member_ids)) then raise exception 'Auth deletion incomplete' using errcode='40001'; end if;
 delete from public.support_requests where id=any(job.related_request_ids) and id<>p_request;
 delete from public.security_events where actor_id=any(job.member_ids::text[]) or student_id=any(job.member_ids::text[]);
 update public.support_requests set actor_id=null,payload=jsonb_build_object('deletedAccounts',job.member_count,'completedAt',now()),status='resolved',resolution='Hesaplar ve bağlı uygulama verileri silindi.',reviewed_by=p_admin,updated_at=now() where id=p_request;
 update public.account_deletion_jobs set member_ids='{}',related_request_ids='{}',status='completed',completed_at=now() where request_id=p_request returning * into job;
 return to_jsonb(job);
end $$;

create function public.prepare_account_deletion(p_request uuid,p_admin uuid,p_expected_members uuid[]) returns jsonb language sql security invoker set search_path='' as $$ select zekapark_private.prepare_account_deletion(p_request,p_admin,p_expected_members) $$;
create function public.finish_account_deletion(p_request uuid,p_admin uuid) returns jsonb language sql security invoker set search_path='' as $$ select zekapark_private.finish_account_deletion(p_request,p_admin) $$;
revoke all on function zekapark_private.prepare_account_deletion(uuid,uuid,uuid[]),zekapark_private.finish_account_deletion(uuid,uuid),public.prepare_account_deletion(uuid,uuid,uuid[]),public.finish_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function zekapark_private.prepare_account_deletion(uuid,uuid,uuid[]),zekapark_private.finish_account_deletion(uuid,uuid),public.prepare_account_deletion(uuid,uuid,uuid[]),public.finish_account_deletion(uuid,uuid) to service_role;

-- A new login must not reopen a family during a partly completed deletion.
create or replace function zekapark_private.has_active_session() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now()))
 and exists(select 1 from public.profiles where id=auth.uid() and not deletion_pending);
$$;
create function zekapark_private.deletion_safe_session(p_user uuid,p_session uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'role','')='service_role' and exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now()))
 and exists(select 1 from public.profiles where id=p_user and not deletion_pending);
$$;
revoke all on function zekapark_private.deletion_safe_session(uuid,uuid) from public,anon,authenticated;
grant execute on function zekapark_private.deletion_safe_session(uuid,uuid) to service_role;
create or replace function public.is_user_session_active(p_user uuid,p_session uuid) returns boolean language sql stable security invoker set search_path='' as $$ select zekapark_private.deletion_safe_session(p_user,p_session) $$;

-- Counts and sample IDs are admin-only; published answer documents never reach this endpoint.
create function public.question_review_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(summary) order by grade),'[]'::jsonb) from (
  select target_grade grade,count(*) published,
   count(*) filter(where coalesce(data->>'reviewedBy','')<>'' and data->'releaseAuthorization'->>'individualHumanReview' is distinct from 'false') reviewed,
   count(*) filter(where coalesce(data->>'reviewedBy','')='' or data->'releaseAuthorization'->>'individualHumanReview'='false') pending,
   (array_agg(id order by id) filter(where coalesce(data->>'reviewedBy','')='' or data->'releaseAuthorization'->>'individualHumanReview'='false'))[1:3] samples
  from public.questions where status='published' and target_grade between 1 and 4 group by target_grade
 ) summary;
$$;
revoke all on function public.question_review_summary() from public,anon,authenticated;
grant execute on function public.question_review_summary() to service_role;


-- Source: supabase/migrations/20261014220748_shopier_three_access_plans.sql
-- Three launch plans. Keep historical 799 TL quarterly receipts and the legacy
-- server-only function valid while old deployments finish draining.
set lock_timeout = '5s';
alter table public.shopier_access_orders
  drop constraint shopier_access_orders_plan_id_check,
  drop constraint shopier_access_orders_duration_days_check,
  drop constraint shopier_access_orders_amount_kurus_check,
  drop constraint shopier_access_orders_check,
  add constraint shopier_access_orders_plan_id_check check (plan_id in ('monthly','quarterly','annual')),
  add constraint shopier_access_orders_duration_days_check check (duration_days in (30,90,365)),
  add constraint shopier_access_orders_amount_kurus_check check (amount_kurus in (29900,69900,79900,149900)),
  add constraint shopier_access_orders_check check (
    (plan_id='monthly' and duration_days=30 and amount_kurus=29900)
    or (plan_id='quarterly' and duration_days=90 and amount_kurus in (69900,79900))
    or (plan_id='annual' and duration_days=365 and amount_kurus=149900)
  );

-- A unique RPC name avoids PostgREST overload ambiguity. Only the backend can
-- submit a verified amount; browser requests still contain only order/student IDs.
create function public.claim_shopier_access_v2(p_order text,p_parent uuid,p_student uuid,p_product text,p_plan text,p_buyer_hash text,p_amount integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.shopier_access_orders%rowtype; parent public.profiles%rowtype; child public.profiles%rowtype; days integer; expected_amount integer;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
  if p_order is null or p_order !~ '^[A-Za-z0-9_-]{1,80}$' or p_product is null or length(p_product) not between 1 and 80
    or p_plan is null or p_plan not in ('monthly','quarterly','annual') or p_buyer_hash is null or p_buyer_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid verified receipt' using errcode='22023'; end if;
  days := case p_plan when 'monthly' then 30 when 'quarterly' then 90 else 365 end;
  expected_amount := case p_plan when 'monthly' then 29900 when 'quarterly' then 69900 else 149900 end;
  if p_amount is null or p_amount<>expected_amount then raise exception 'Verified amount mismatch' using errcode='22023'; end if;
  select * into parent from public.profiles where id=p_parent for share;
  select * into child from public.profiles where id=p_student for share;
  if parent.id is null or child.id is null or parent.role<>'parent' or child.role<>'student'
    or child.linked_parent_id is distinct from p_parent::text or not coalesce(p_student::text=any(parent.linked_student_ids),false)
    then raise exception 'Family ownership required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('shopier:'||p_order,0));
  select * into existing from public.shopier_access_orders where order_id=p_order;
  if found then
    if existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student
      or existing.product_id<>p_product or existing.plan_id<>p_plan or existing.amount_kurus<>p_amount or existing.duration_days<>days or existing.buyer_email_sha256<>p_buyer_hash
      then raise exception 'Order already assigned' using errcode='40001'; end if;
    return to_jsonb(existing);
  end if;
  insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256)
    values(p_order,p_parent,p_student,p_product,p_plan,days,p_amount,p_buyer_hash) returning * into existing;
  return to_jsonb(existing);
end $$;
revoke all on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) to service_role;


-- Source: supabase/migrations/20261017061944_google_play_subscriptions.sql
-- Google-authoritative expiry, never a client 'paid' flag. Tokens are encrypted by the server.
create table public.google_play_subscriptions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 parent_id uuid references public.profiles(id) on delete set null,
 student_id uuid references public.profiles(id) on delete set null,
 token_ciphertext text not null check(length(token_ciphertext) between 80 and 8300 and token_ciphertext like 'v1.%'),
 package_name text not null, product_id text not null,
 base_plan_id text not null check(base_plan_id in ('monthly','quarterly','annual')),
 subscription_state text not null check(subscription_state in ('SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED')),
 expires_at timestamptz, auto_renewing boolean not null, acknowledgement_state text not null check(acknowledgement_state in ('ACKNOWLEDGEMENT_STATE_PENDING','ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')),
 linked_token_hash text check(linked_token_hash ~ '^[a-f0-9]{64}$'), test_purchase boolean not null,
 verified_at timestamptz not null, created_at timestamptz not null default now()
);
create index google_play_student_lookup on public.google_play_subscriptions(parent_id,student_id,verified_at desc);
create index google_play_student_fk on public.google_play_subscriptions(student_id);
alter table public.google_play_subscriptions enable row level security;
revoke all on public.google_play_subscriptions from public,anon,authenticated;
grant select,insert,update on public.google_play_subscriptions to service_role;

create function public.record_google_play_subscription(p_hash text,p_parent uuid,p_student uuid,p_token text,p_package text,p_product text,p_plan text,p_state text,p_expiry timestamptz,p_renewing boolean,p_ack text,p_linked text,p_verified timestamptz,p_test boolean)
returns text language plpgsql security invoker set search_path='' as $$
declare existing public.google_play_subscriptions%rowtype; linked public.google_play_subscriptions%rowtype; changed integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
 if p_parent is null or p_student is null or p_verified is null or p_verified>now()+interval '30 seconds' or p_verified<now()-interval '5 minutes' then raise exception 'Invalid verified purchase' using errcode='22023'; end if;
 perform id from public.profiles where id in (p_parent,p_student) order by id for share;
 if not exists(select 1 from public.profiles where id=p_parent and role='parent' and not deletion_pending and p_student::text=any(linked_student_ids))
 or not exists(select 1 from public.profiles where id=p_student and role='student' and not deletion_pending and linked_parent_id=p_parent::text) then raise exception 'Family ownership mismatch' using errcode='42501'; end if;
 if not exists(select 1 from public.google_play_purchase_bindings where parent_id=p_parent and student_id=p_student) then raise exception 'Prepared binding required' using errcode='42501'; end if;
 -- Deterministic ordering also protects linked-token ownership across concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v,38)) from (select distinct v from unnest(array[p_hash,p_linked]) v where v is not null order by v) locked;
 select * into existing from public.google_play_subscriptions where token_hash=p_hash;
 if found and (existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student or existing.package_name is distinct from p_package or existing.product_id is distinct from p_product) then raise exception 'Purchase already assigned' using errcode='40001'; end if;
 if p_linked is not null then
  select * into linked from public.google_play_subscriptions where token_hash=p_linked;
  if found and (linked.parent_id is distinct from p_parent or linked.student_id is distinct from p_student) then raise exception 'Linked purchase already assigned' using errcode='40001'; end if;
 end if;
 insert into public.google_play_subscriptions(token_hash,parent_id,student_id,token_ciphertext,package_name,product_id,base_plan_id,subscription_state,expires_at,auto_renewing,acknowledgement_state,linked_token_hash,verified_at,test_purchase)
 values(p_hash,p_parent,p_student,p_token,p_package,p_product,p_plan,p_state,p_expiry,p_renewing,p_ack,p_linked,p_verified,p_test)
 on conflict(token_hash) do update set token_ciphertext=excluded.token_ciphertext,base_plan_id=excluded.base_plan_id,subscription_state=excluded.subscription_state,expires_at=excluded.expires_at,auto_renewing=excluded.auto_renewing,acknowledgement_state=excluded.acknowledgement_state,linked_token_hash=excluded.linked_token_hash,verified_at=excluded.verified_at,test_purchase=excluded.test_purchase
 where public.google_play_subscriptions.verified_at<excluded.verified_at;
 get diagnostics changed = row_count;
 if changed=0 then raise exception 'Stale verification, retry' using errcode='40001'; end if;
 return p_hash;
end $$;
revoke all on function public.record_google_play_subscription(text,uuid,uuid,text,text,text,text,text,timestamptz,boolean,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_google_play_subscription(text,uuid,uuid,text,text,text,text,text,timestamptz,boolean,text,text,timestamptz,boolean) to service_role;

-- Match the existing billing-retention review before freezing a family for deletion.
create function public.check_google_play_deletion_retention() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.deletion_pending and not old.deletion_pending then
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server deletion workflow required' using errcode='42501'; end if;
  if exists(select 1 from public.google_play_subscriptions where parent_id=new.id or student_id=new.id) then raise exception 'Billing retention review required' using errcode='P0001'; end if;
 end if;
 return new;
end $$;
revoke all on function public.check_google_play_deletion_retention() from public,anon,authenticated;
grant execute on function public.check_google_play_deletion_retention() to service_role;
create trigger check_google_play_deletion_retention before update of deletion_pending on public.profiles for each row execute function public.check_google_play_deletion_retention();

-- Prepared parent/student bindings allow RTDN recovery if the app closes before verify.
create table public.google_play_purchase_bindings (
 account_hash text not null check(account_hash ~ '^[a-f0-9]{64}$'),
 profile_hash text not null check(profile_hash ~ '^[a-f0-9]{64}$'),
 parent_id uuid not null references public.profiles(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(account_hash,profile_hash),
 unique(parent_id,student_id)
);
create index google_play_binding_student_fk on public.google_play_purchase_bindings(student_id);
alter table public.google_play_purchase_bindings enable row level security;
revoke all on public.google_play_purchase_bindings from public,anon,authenticated;
grant select,insert on public.google_play_purchase_bindings to service_role;
create function public.prepare_google_play_binding(p_parent uuid,p_student uuid,p_account text,p_profile text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server binding required' using errcode='42501'; end if;
 perform id from public.profiles where id in (p_parent,p_student) order by id for share;
 if not exists(select 1 from public.profiles where id=p_parent and role='parent' and not deletion_pending and p_student::text=any(linked_student_ids))
 or not exists(select 1 from public.profiles where id=p_student and role='student' and not deletion_pending and linked_parent_id=p_parent::text) then raise exception 'Family ownership mismatch' using errcode='42501'; end if;
 insert into public.google_play_purchase_bindings(account_hash,profile_hash,parent_id,student_id) values(p_account,p_profile,p_parent,p_student)
 on conflict(account_hash,profile_hash) do nothing;
 if not exists(select 1 from public.google_play_purchase_bindings where account_hash=p_account and profile_hash=p_profile and parent_id=p_parent and student_id=p_student) then raise exception 'Binding already assigned' using errcode='40001'; end if;
 return true;
end $$;
revoke all on function public.prepare_google_play_binding(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_google_play_binding(uuid,uuid,text,text) to service_role;


-- Source: supabase/migrations/20261017183500_phase2_indexes_and_rate_limit_optimization.sql
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


-- Source: supabase/migrations/20261017232044_retire_legacy_payment_integration.sql
-- Retire the old checkout. Preserve migration history and the empty legacy
-- ledger so existing account-deletion retention checks remain valid.
update public.platform_settings
 set settings = settings - 'shopier', revision = revision + 1, updated_at = now()
 where id = true and settings ? 'shopier';
revoke execute on function public.claim_shopier_access(text,uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
revoke execute on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) from public,anon,authenticated,service_role;
revoke insert,update,delete on public.shopier_access_orders from service_role;

-- Historical flags in editable legacy profiles are not authority to grant admin.
-- Only an existing provider-owned role can become an administrator or parent.
insert into public.profiles(id,email,name,role,student_code,grade,xp,level,total_points,streak,longest_streak,last_active_date,created_at,updated_at)
select p.id,u.email,coalesce(nullif(p.full_name,''),nullif(p.username,''),'Kaşif'),
 case when u.raw_app_meta_data->>'role' in ('student','parent','admin') then u.raw_app_meta_data->>'role' else 'student' end,
 case when lower(u.email) like '%@zekapark.com' then upper(split_part(u.email,'@',1)) else null end,
 case when u.raw_user_meta_data->>'grade' ~ '^[1-4]$' then (u.raw_user_meta_data->>'grade')::integer else 1 end,
 coalesce(p.xp,0),greatest(1,floor(coalesce(p.xp,0)::numeric/250)::integer+1),coalesce(p.xp,0),
 coalesce(p.login_streak,0),coalesce(p.login_streak,0),coalesce(p.last_active_date::text,''),
 extract(epoch from p.created_at)*1000,extract(epoch from now())*1000
from bilsem_legacy.profiles p join auth.users u on u.id=p.id;

-- Existing users retain access; enable the previously requested family signup.
-- Email delivery and operator acceptance checks are not asserted by this SQL.
update public.platform_settings set settings=jsonb_set(settings,'{release}','{"registrationEnabled":true}'::jsonb,true) where id=true;

do $$ declare row record; actual_count bigint; actual_fingerprint text; begin
  for row in select * from bilsem_legacy.row_manifest where table_name<>'auth.users' loop
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb)::text) from bilsem_legacy.%I t',row.table_name) into actual_count,actual_fingerprint;
    if actual_count<>row.row_count or actual_fingerprint<>row.fingerprint then raise exception 'Legacy archive changed: %',row.table_name; end if;
  end loop;
  select count(*),md5(coalesce(jsonb_agg(to_jsonb(u) order by id),'[]'::jsonb)::text) into actual_count,actual_fingerprint from auth.users u;
  if not exists(select 1 from bilsem_legacy.row_manifest where table_name='auth.users' and row_count=actual_count and fingerprint=actual_fingerprint)
    then raise exception 'Auth identities changed during alignment'; end if;
  if exists(select 1 from bilsem_legacy.profiles old left join public.profiles p on p.id=old.id where p.id is null or p.xp is distinct from coalesce(old.xp,0)::double precision or p.streak is distinct from coalesce(old.login_streak,0)::double precision)
    then raise exception 'Profile identity or progress was not preserved'; end if;
end $$;
notify pgrst,'reload schema';
commit;
