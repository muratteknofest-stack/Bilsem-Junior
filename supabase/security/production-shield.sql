-- Bilsem Junior, reviewed incremental shield for the aligned account project.
-- SQL Editor deliverable; NOT a bootstrap and NOT automatically deployed.
-- No application/Auth/archive rows are rewritten or deleted by this file.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bilsem-production-shield-v1', 0));

do $guard$
declare expected text[] := array[
 'account_deletion_jobs','ai_generation_jobs','ai_generation_logs','api_rate_windows',
 'daily_challenge_attempts','google_play_purchase_bindings','google_play_subscriptions',
 'learning_reward_claims','learning_sessions','platform_settings','practice_sessions',
 'professional_generation_runs','profiles','question_visual_assets','questions',
 'security_events','shopier_access_orders','support_requests','test_attempts','user_private_state'];
 actual text[];
begin
 select array_agg(c.relname::text order by c.relname) into actual from pg_class c
 join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p');
 if actual is distinct from expected or to_regnamespace('bilsem_legacy') is null
    or to_regprocedure('zekapark_private.has_active_session()') is null
    or to_regprocedure('public.change_student_grade(uuid,integer)') is null then
   raise exception 'Expected aligned Bilsem schema; review the current inventory before applying this shield';
 end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('v','m')) then
   raise exception 'Unreviewed public view; inspect its RLS/security_invoker behavior first';
 end if;
end $guard$;

-- Small immutable validators. UTF-16 units preserve the client string length caps.
create or replace function zekapark_private.text_units(value text) returns integer
language sql immutable strict parallel safe set search_path='' as $$
 select char_length(value) + regexp_count(value, U&'[\+010000-\+10FFFF]');
$$;
create or replace function zekapark_private.trim_profile_text(value text) returns text
language sql immutable strict parallel safe set search_path='' as $$
 select btrim(value,U&'\0020\0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
create or replace function zekapark_private.valid_badge_ids(value text[]) returns boolean
language sql immutable parallel safe set search_path='' as $$
 select coalesce(value is not null and cardinality(value)<=3
   and (cardinality(value)=0 or array_ndims(value)=1)
   and not exists(select 1 from unnest(value) item where item is null or item !~ '^[a-z][a-z0-9_]{0,63}$')
   and cardinality(value)=(select count(distinct item) from unnest(value) item),false);
$$;
create or replace function zekapark_private.valid_reminder(value jsonb) returns boolean
language plpgsql immutable parallel safe set search_path='' as $$
declare item text; number_value numeric;
begin
 if value is null then return true; end if;
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>2048 then return false; end if;
 if not value ?& array['enabled','reminderTime','frequency','browserPushEnabled','soundAlert','weekendIncluded']
    or exists(select 1 from jsonb_object_keys(value) k where not k=any(array[
       'enabled','reminderTime','frequency','browserPushEnabled','soundAlert','weekendIncluded',
       'customMessage','snoozeUntil','lastNotifiedDate','lastNotifiedHour'])) then return false; end if;
 foreach item in array array['enabled','browserPushEnabled','soundAlert','weekendIncluded'] loop
   if jsonb_typeof(value->item) is distinct from 'boolean' then return false; end if;
 end loop;
 if jsonb_typeof(value->'reminderTime') is distinct from 'string'
    or (value->>'reminderTime') !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
    or jsonb_typeof(value->'frequency') is distinct from 'string'
    or (value->>'frequency') not in ('daily_fixed','interval_3h','smart_goal') then return false; end if;
 if value ? 'customMessage' then
   if jsonb_typeof(value->'customMessage') is distinct from 'string'
      or zekapark_private.text_units(value->>'customMessage')>120
      or (value->>'customMessage') ~ '[[:cntrl:]]' then return false; end if;
 end if;
 if value ? 'snoozeUntil' and value->'snoozeUntil'<>'null'::jsonb then
   if jsonb_typeof(value->'snoozeUntil') is distinct from 'number' then return false; end if;
   number_value:=(value->>'snoozeUntil')::numeric;
   if number_value<0 or number_value>8640000000000000 or number_value<>trunc(number_value) then return false; end if;
 end if;
 if value ? 'lastNotifiedDate' then
   if jsonb_typeof(value->'lastNotifiedDate') is distinct from 'string'
      or (value->>'lastNotifiedDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or not pg_input_is_valid(value->>'lastNotifiedDate','date') then return false; end if;
 end if;
 if value ? 'lastNotifiedHour' then
   if jsonb_typeof(value->'lastNotifiedHour') is distinct from 'number' then return false; end if;
   number_value:=(value->>'lastNotifiedHour')::numeric;
   if number_value<0 or number_value>23 or number_value<>trunc(number_value) then return false; end if;
 end if;
 return true;
end $$;

-- Refuse incompatible existing data, reporting only aggregate categories.
-- Any error rolls back this entire transaction; never silently clamp/regrade users.
do $preflight$
declare issues jsonb;
begin
 select jsonb_build_object(
  'name',count(*) filter(where name is null or zekapark_private.text_units(name)>50
    or zekapark_private.text_units(zekapark_private.trim_profile_text(name))<2 or name ~ '[[:cntrl:]]'),
  'avatar',count(*) filter(where avatar is null or zekapark_private.text_units(avatar)>32
    or zekapark_private.text_units(zekapark_private.trim_profile_text(avatar))<1 or avatar ~ '[[:cntrl:]]'),
  'grade',count(*) filter(where (role='student' and grade is null) or (grade is not null and grade not between 1 and 4)),
  'goals',count(*) filter(where not coalesce(daily_goal_minutes between 5 and 180 and daily_goal_minutes=trunc(daily_goal_minutes)
    and daily_goal_questions between 5 and 200 and daily_goal_questions=trunc(daily_goal_questions)
    and daily_goal_sessions between 1 and 10 and daily_goal_sessions=trunc(daily_goal_sessions),false)),
  'badges',count(*) filter(where not zekapark_private.valid_badge_ids(featured_badge_ids)),
  'reminder',count(*) filter(where not zekapark_private.valid_reminder(reminder_config)))
 into issues from public.profiles;
 if exists(select 1 from jsonb_each_text(issues) item where item.value::bigint>0) then
   raise exception 'Existing profile data needs review; no changes applied' using detail=issues::text,errcode='23514';
 end if;
end $preflight$;

alter table public.profiles drop constraint if exists bilsem_profile_text_bounds_v1;
alter table public.profiles add constraint bilsem_profile_text_bounds_v1 check (
 name is not null and zekapark_private.text_units(name)<=50 and zekapark_private.text_units(zekapark_private.trim_profile_text(name))>=2
 and name !~ '[[:cntrl:]]' and avatar is not null and zekapark_private.text_units(avatar)<=32
 and zekapark_private.text_units(zekapark_private.trim_profile_text(avatar))>=1 and avatar !~ '[[:cntrl:]]');
alter table public.profiles drop constraint if exists bilsem_profile_grade_v1;
alter table public.profiles add constraint bilsem_profile_grade_v1 check (
 (role<>'student' or grade is not null) and (grade is null or grade between 1 and 4));
alter table public.profiles drop constraint if exists bilsem_profile_goals_v1;
alter table public.profiles add constraint bilsem_profile_goals_v1 check (coalesce(
 daily_goal_minutes between 5 and 180 and daily_goal_minutes=trunc(daily_goal_minutes)
 and daily_goal_questions between 5 and 200 and daily_goal_questions=trunc(daily_goal_questions)
 and daily_goal_sessions between 1 and 10 and daily_goal_sessions=trunc(daily_goal_sessions),false));
alter table public.profiles drop constraint if exists bilsem_profile_badges_v1;
alter table public.profiles add constraint bilsem_profile_badges_v1 check (zekapark_private.valid_badge_ids(featured_badge_ids));
alter table public.profiles drop constraint if exists bilsem_profile_reminder_v1;
alter table public.profiles add constraint bilsem_profile_reminder_v1 check (zekapark_private.valid_reminder(reminder_config));

-- Preserve old Android preference PATCH payloads, but make their timestamps server-owned.
-- Grade/identity/score changes are not preference mutations, even for admin clients.
create or replace function zekapark_private.protect_profile_preferences() returns trigger
language plpgsql security invoker set search_path='' as $$
declare allowed text[]:=array['name','avatar','daily_goal_minutes','daily_goal_questions','daily_goal_sessions',
 'sound_enabled','featured_badge_ids','reminder_config','updated_at','last_login_at'];
begin
 if auth.uid() is not null and coalesce(auth.jwt()->>'role','')<>'service_role' then
   if (to_jsonb(new)-allowed) is distinct from (to_jsonb(old)-allowed) then
     raise exception 'Only profile preferences may be changed by clients; use the grade API' using errcode='42501';
   end if;
   if new.last_login_at is distinct from old.last_login_at then
     new.last_login_at:=floor(extract(epoch from clock_timestamp())*1000);
   end if;
   new.updated_at:=floor(extract(epoch from clock_timestamp())*1000);
 end if;
 return new;
end $$;
drop trigger if exists bilsem_profile_preferences_v1 on public.profiles;
create trigger bilsem_profile_preferences_v1 before update on public.profiles
 for each row execute function zekapark_private.protect_profile_preferences();

-- Current Auth rows, live sessions, verified mail and deletion state, never user_metadata.
create or replace function zekapark_private.has_active_session() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(auth.uid() is not null and exists(
  select 1 from auth.sessions s join auth.users u on u.id=s.user_id
  join public.profiles p on p.id=u.id
  where s.id=case when auth.jwt()->>'session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (auth.jwt()->>'session_id')::uuid else null end
  and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now())
  and u.email_confirmed_at is not null and not p.deletion_pending),false);
$$;
create or replace function zekapark_private.is_linked_child(child_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(zekapark_private.has_active_session() and exists(
  select 1 from public.profiles child join public.profiles parent on parent.id=auth.uid()
  where child.id=child_id and child.role='student' and not child.deletion_pending
  and parent.role='parent' and not parent.deletion_pending
  and child.linked_parent_id=parent.id::text and child.id::text=any(parent.linked_student_ids)),false);
$$;
create or replace function zekapark_private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(auth.uid() is not null and auth.jwt()->>'aal'='aal2' and exists(
  select 1 from auth.users u join public.profiles p on p.id=u.id
  where u.id=auth.uid() and u.email_confirmed_at is not null and u.raw_app_meta_data->>'role'='admin'
  and p.role='admin' and not p.deletion_pending),false);
$$;

-- Reset table AND column grants; table REVOKE alone leaves explicit column ACLs.
-- Clear old permissive policies before installing the exact reviewed access model.
do $tables$
declare rel record; pol record; columns text;
begin
 for rel in select n.nspname,c.relname,c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname in ('public','bilsem_legacy') and c.relkind in ('r','p') loop
   execute format('alter table %I.%I enable row level security',rel.nspname,rel.relname);
   execute format('revoke all on table %I.%I from public,anon,authenticated,service_role',rel.nspname,rel.relname);
   select string_agg(quote_ident(attname),',') into columns from pg_attribute
    where attrelid=rel.oid and attnum>0 and not attisdropped;
   execute format('revoke all (%s) on table %I.%I from public,anon,authenticated,service_role',columns,rel.nspname,rel.relname);
   for pol in select policyname from pg_policies where schemaname=rel.nspname and tablename=rel.relname loop
     execute format('drop policy %I on %I.%I',pol.policyname,rel.nspname,rel.relname);
   end loop;
 end loop;
end $tables$;

revoke all on schema public,zekapark_private,bilsem_legacy from public,anon,authenticated,service_role;
grant usage on schema public to anon,authenticated,service_role;
grant usage on schema zekapark_private to authenticated,service_role;
-- bilsem_legacy is operator-only. No archived records/functions are rewritten.
revoke all on all sequences in schema public,bilsem_legacy from public,anon,authenticated,service_role;
grant usage,select on all sequences in schema public to service_role;

-- Server table permissions follow current invoker RPCs and backend access paths.
grant select on all tables in schema public to service_role;
grant insert,update on public.profiles,public.learning_sessions,public.daily_challenge_attempts,
 public.google_play_subscriptions,public.google_play_purchase_bindings,public.professional_generation_runs,
 public.support_requests,public.ai_generation_logs,public.security_events to service_role;
grant insert,update,delete on public.questions,public.question_visual_assets to service_role;
grant update on public.platform_settings to service_role;
-- Ledgers/private progress/deletion jobs are mutated only by existing checked SECURITY DEFINER RPCs.

grant select on public.profiles,public.user_private_state,public.practice_sessions,public.test_attempts to authenticated;
grant update(name,avatar,daily_goal_minutes,daily_goal_questions,daily_goal_sessions,
 sound_enabled,featured_badge_ids,reminder_config,updated_at,last_login_at) on public.profiles to authenticated;
grant select,insert,update,delete on public.questions to authenticated;

create policy bilsem_profiles_select_v1 on public.profiles for select to authenticated using (
 (select zekapark_private.has_active_session()) and (id=(select auth.uid()) or zekapark_private.is_linked_child(id)));
create policy bilsem_profiles_update_v1 on public.profiles for update to authenticated
 using (id=(select auth.uid()) and (select zekapark_private.has_active_session()))
 with check (id=(select auth.uid()) and (select zekapark_private.has_active_session()));
create policy bilsem_private_select_v1 on public.user_private_state for select to authenticated using (
 (select zekapark_private.has_active_session()) and (user_id=(select auth.uid()) or zekapark_private.is_linked_child(user_id)));
create policy bilsem_practice_select_v1 on public.practice_sessions for select to authenticated using (
 (select zekapark_private.has_active_session()) and (user_id=(select auth.uid()) or zekapark_private.is_linked_child(user_id)));
create policy bilsem_attempts_select_v1 on public.test_attempts for select to authenticated using (
 (select zekapark_private.has_active_session()) and (user_id=(select auth.uid()) or zekapark_private.is_linked_child(user_id)));
create policy bilsem_questions_select_v1 on public.questions for select to authenticated using (
 (select zekapark_private.has_active_session()) and (select zekapark_private.is_admin()));
create policy bilsem_questions_insert_v1 on public.questions for insert to authenticated with check (
 (select zekapark_private.has_active_session()) and (select zekapark_private.is_admin()) and status<>'published');
create policy bilsem_questions_update_v1 on public.questions for update to authenticated
 using ((select zekapark_private.has_active_session()) and (select zekapark_private.is_admin()))
 with check ((select zekapark_private.has_active_session()) and (select zekapark_private.is_admin()) and status<>'published');
create policy bilsem_questions_delete_v1 on public.questions for delete to authenticated using (
 (select zekapark_private.has_active_session()) and (select zekapark_private.is_admin()));
-- All other SELECT/INSERT/UPDATE/DELETE paths are denied by absent grants/policies.
-- In particular, no permissive client policy exists on payment, answers, ledgers or archives.

revoke all on all functions in schema public,zekapark_private,bilsem_legacy from public,anon,authenticated,service_role;
do $functions$
declare fn record;
begin
 for fn in select p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array[
  'answer_daily_challenge','change_student_grade','claim_learning_reward','claim_professional_generation',
  'commit_learning_session','commit_professional_generation','consume_api_limit','finish_account_deletion',
  'is_user_session_active','issue_daily_challenge','learning_reward_facts','patch_user_progress',
  'prepare_account_deletion','prepare_google_play_binding','question_review_summary',
  'record_google_play_subscription','revoke_user_sessions','save_question','save_question_draft_batch','submit_support_request']) loop
   execute format('grant execute on function %I.%I(%s) to service_role',fn.nspname,fn.proname,fn.args);
 end loop;
end $functions$;
grant execute on function public.patch_user_progress(jsonb),public.save_question(jsonb,integer) to authenticated;
grant execute on function zekapark_private.has_active_session(),zekapark_private.is_admin(),
 zekapark_private.is_linked_child(uuid),zekapark_private.patch_user_progress(jsonb),
 zekapark_private.text_units(text),zekapark_private.trim_profile_text(text),
 zekapark_private.valid_badge_ids(text[]),zekapark_private.valid_reminder(jsonb)
 to authenticated,service_role;
grant execute on function zekapark_private.deletion_safe_session(uuid,uuid),
 zekapark_private.prepare_account_deletion(uuid,uuid,uuid[]),zekapark_private.finish_account_deletion(uuid,uuid) to service_role;

-- Future objects start closed; each future migration must grant its reviewed access.
-- Per-schema REVOKE cannot subtract PostgreSQL's global PUBLIC EXECUTE default.
alter default privileges for role postgres revoke all on functions from public,anon,authenticated,service_role;
alter default privileges for role postgres revoke all on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,zekapark_private,bilsem_legacy
 revoke all on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,zekapark_private,bilsem_legacy
 revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,zekapark_private,bilsem_legacy
 revoke all on functions from public,anon,authenticated,service_role;

notify pgrst,'reload schema';
commit;
