-- Read-only inventory. No personal rows, file names, tokens or hashes are returned.
-- Run before BOTH the application SQL and any Dashboard Storage setting change.
begin read only;
set local statement_timeout='30s';
select current_database() as database_name,current_user,current_setting('server_version') as postgres_version;
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls,
 pg_get_userbyid(c.relowner) as owner
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','bilsem_legacy') and c.relkind in ('r','p') order by 1,2;
select jsonb_build_object(
 'name_basic_bounds',count(*) filter(where name is null or char_length(name)>50 or char_length(btrim(name))<2 or name ~ '[[:cntrl:]]'),
 'avatar_basic_bounds',count(*) filter(where avatar is null or char_length(avatar)>32 or char_length(btrim(avatar))<1 or avatar ~ '[[:cntrl:]]'),
 'grade',count(*) filter(where (role='student' and grade is null) or (grade is not null and grade not between 1 and 4)),
 'goals',count(*) filter(where not coalesce(daily_goal_minutes between 5 and 180 and daily_goal_minutes=trunc(daily_goal_minutes)
  and daily_goal_questions between 5 and 200 and daily_goal_questions=trunc(daily_goal_questions)
  and daily_goal_sessions between 1 and 10 and daily_goal_sessions=trunc(daily_goal_sessions),false)),
 'badges_basic_shape',count(*) filter(where featured_badge_ids is null or cardinality(featured_badge_ids)>3),
 'reminder_basic_shape',count(*) filter(where reminder_config is not null and
  (jsonb_typeof(reminder_config)<>'object' or octet_length(reminder_config::text)>2048))) as initial_profile_checks
 from public.profiles;
-- These initial checks are deliberately limited. production-shield.sql performs
-- the complete UTF-16 / Unicode whitespace / badge / reminder validation atomically.
select b.id,b.public,b.file_size_limit,b.allowed_mime_types,
 (select count(*) from storage.objects o where o.bucket_id=b.id) as object_count
 from storage.buckets b where b.id in ('exam-images','bilsem-question-visual-drafts-v2') order by b.id;
select jsonb_build_object(
 'questions',(select count(*) from public.questions where data::text like '%exam-images%'),
 'profiles',(select count(*) from public.profiles where avatar like '%exam-images%'),
 'learning_sessions',(select count(*) from public.learning_sessions where questions::text like '%exam-images%'),
 'user_private_state',(select count(*) from public.user_private_state where values::text like '%exam-images%'),
 'support_requests',(select count(*) from public.support_requests where payload::text like '%exam-images%')) as active_legacy_file_references;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
 from pg_policies where schemaname in ('public','bilsem_legacy','storage') order by 1,2,3;
rollback;
