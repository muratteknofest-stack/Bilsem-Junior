-- Run against a project with both learning migrations installed.
-- All fixtures and changes are rolled back.
begin;
do $$ begin
  if to_regprocedure('public.is_admin()') is not null or to_regprocedure('public.has_active_session()') is not null then raise exception 'internal helpers exposed as public RPCs'; end if;
  if (select prosecdef from pg_proc where oid='public.patch_user_progress(jsonb)'::regprocedure) then raise exception 'public progress wrapper has definer privileges'; end if;
  if has_schema_privilege('anon','zekapark_private','USAGE') or has_function_privilege('anon','zekapark_private.is_admin()','EXECUTE') or has_function_privilege('anon','zekapark_private.has_active_session()','EXECUTE') or has_function_privilege('anon','zekapark_private.patch_user_progress(jsonb)','EXECUTE') then raise exception 'anonymous private helper access'; end if;
end $$;
insert into auth.users(id,email,role,aud,email_confirmed_at) values
('11111111-1111-4111-8111-111111111111','learning-test@example.invalid','authenticated','authenticated',now()),
('22222222-2222-4222-8222-222222222222','other-test@example.invalid','authenticated','authenticated',now());
insert into public.profiles(id,name,role,grade) values
('11111111-1111-4111-8111-111111111111','Transaction test','student',2),
('22222222-2222-4222-8222-222222222222','Other transaction test','student',2);
insert into auth.sessions(id,user_id,created_at,updated_at) values
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',now(),now());
insert into public.learning_sessions(id,student_id,mode,title,questions,expires_at) values
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','practice','Transaction test','[{"id":"opaque","category":"pattern","difficulty":2,"prompt":"Test","type":"number_pattern","seed":123}]',now()+interval '10 minutes');
insert into public.questions(id,data) values('learning-test-answer-key','{"status":"published","correctOptionId":"A","targetGrade":2}');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare changed int; begin
  update public.platform_settings set revision=revision+1, settings='{"exams":{"mini":{"count":7,"seconds":420}}}' where id=true and revision=1;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'settings update failed'; end if;
  update public.platform_settings set revision=revision+1 where id=true and revision=1;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'stale settings revision accepted'; end if;
end $$;

do $$
declare first jsonb; repeated jsonb; stale jsonb; result jsonb;
begin
  if not public.consume_api_limit(repeat('a',64),'test',2,600) or not public.consume_api_limit(repeat('a',64),'test',2,600) or public.consume_api_limit(repeat('a',64),'test',2,600) then raise exception 'distributed request limit failed'; end if;
  first:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',0,'{"0":{"response":{"mode":"choice","optionId":"A"},"correct":true,"xp":20}}',null,20,false);
  if (first->>'revision')::integer <> 1 then raise exception 'revision did not advance'; end if;
  if (select xp from public.profiles where id='11111111-1111-4111-8111-111111111111') <> 20 then raise exception 'incorrect XP'; end if;
  stale:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',0,first->'answers',null,20,false);
  if stale is not null then raise exception 'stale update accepted'; end if;
  repeated:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',1,first->'answers',null,20,false);
  if (select xp from public.profiles where id='11111111-1111-4111-8111-111111111111') <> 20 or (select total_questions_solved from public.profiles where id='11111111-1111-4111-8111-111111111111') <> 1 then raise exception 'repeated reward'; end if;
  result:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',2,first->'answers','{"totalQuestions":1,"correctAnswers":1,"wrongAnswers":0,"blankAnswers":0,"scorePercentage":100,"xp":20,"totalTimeSeconds":30}',20,true);
  repeated:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',3,'{}','{"xp":999}',999,true);
  if result is distinct from repeated then raise exception 'finished result changed'; end if;
  if (select today_sessions_completed from public.profiles where id='11111111-1111-4111-8111-111111111111') <> 1 then raise exception 'session counted twice'; end if;
  first := public.claim_learning_reward('11111111-1111-4111-8111-111111111111','badge:first_step',25,'{"id":"first_step","maxProgress":1}',null,(select updated_at from public.profiles where id='11111111-1111-4111-8111-111111111111'));
  repeated := public.claim_learning_reward('11111111-1111-4111-8111-111111111111','badge:first_step',25,'{"id":"first_step","maxProgress":1}',null,(select updated_at from public.profiles where id='11111111-1111-4111-8111-111111111111'));
  if (first->>'xpAwarded')::integer<>25 or (repeated->>'xpAwarded')::integer<>0 or (select xp from public.profiles where id='11111111-1111-4111-8111-111111111111')<>45 then raise exception 'reward not idempotent'; end if;
  if (public.learning_reward_facts('11111111-1111-4111-8111-111111111111')->>'answered')::integer<>1 then raise exception 'incorrect reward evidence'; end if;
  if not public.is_user_session_active('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333') then raise exception 'valid session rejected'; end if;
  if public.is_user_session_active('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333') then raise exception 'session owner not checked'; end if;
  begin
    perform public.commit_learning_session('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444',3,'{}',null,0,false);
    raise exception 'foreign session accepted';
  exception when no_data_found then null; end;
end $$;
do $$
declare snapshot jsonb;
begin
 update public.user_private_state set values=values || jsonb_build_object('yapyap_mistakes','[{"id":"review-test","resolved":false}]') where user_id='11111111-1111-4111-8111-111111111111';
 insert into public.learning_sessions(id,student_id,mode,title,review_mistake_id,questions,expires_at) values('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','practice','Review','review-test','[{"id":"review-q","category":"pattern","difficulty":2,"type":"number_pattern"}]',now()+interval '10 minutes');
 snapshot:=public.commit_learning_session('11111111-1111-4111-8111-111111111111','66666666-6666-4666-8666-666666666666',0,'{"0":{"response":{"mode":"choice","optionId":"A"},"correct":true,"xp":39}}',null,39,false);
 perform public.commit_learning_session('11111111-1111-4111-8111-111111111111','66666666-6666-4666-8666-666666666666',1,snapshot->'answers','{"totalQuestions":1,"correctAnswers":1,"scorePercentage":100,"xp":39,"totalTimeSeconds":10}',39,true);
 insert into public.learning_sessions(id,student_id,mode,title,review_mistake_id,questions,expires_at) values('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','practice','Concurrent review','review-test','[{"id":"review-q","category":"pattern","difficulty":2,"type":"number_pattern"}]',now()+interval '10 minutes');
 begin
   perform public.commit_learning_session('11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777',0,snapshot->'answers',null,39,false);
   raise exception 'review bonus repeated across sessions';
 exception when invalid_parameter_value then null; end;
 if (select resolved_mistakes_count from public.profiles where id='11111111-1111-4111-8111-111111111111')<>1 or (select xp from public.profiles where id='11111111-1111-4111-8111-111111111111')<>84 then raise exception 'incorrect review reward'; end if;
end $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","session_id":"33333333-3333-4333-8333-333333333333"}',true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.questions) <> 0 then raise exception 'published answer keys visible'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'other profile visible'; end if;
  if not zekapark_private.has_active_session() then raise exception 'active session rejected'; end if;
  update public.profiles set avatar='Test' where id='11111111-1111-4111-8111-111111111111';
  perform public.patch_user_progress('{"zekapark_study_favorites_v1":"[\"matrix\"]"}');
  begin
    update public.profiles set xp=99999 where id='11111111-1111-4111-8111-111111111111';
    raise exception 'forged XP accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.patch_user_progress('{"yapyap_mastery":"[]"}');
    raise exception 'forged mastery accepted';
  exception when invalid_parameter_value then null; end;
  begin
    update public.user_private_state set values='{}' where user_id='11111111-1111-4111-8111-111111111111';
    raise exception 'direct progress write accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.commit_learning_session('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',3,'{}',null,999,false);
    raise exception 'client scoring RPC accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.learning_sessions;
    raise exception 'question snapshots visible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.sessions set not_after=now()-interval '1 second' where id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
do $$ begin
 if zekapark_private.has_active_session() or (select count(*) from public.profiles)<>0 then raise exception 'expired session still authorized'; end if;
end $$;
reset role;
delete from auth.sessions where id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
do $$
begin
  if zekapark_private.has_active_session() or (select count(*) from public.profiles) <> 0 then raise exception 'revoked session still authorized'; end if;
  begin
    perform public.patch_user_progress('{"zekapark_study_favorites_v1":"[]"}');
    raise exception 'revoked session write accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- Admin question access must track current, provider-owned metadata.
update auth.users set raw_app_meta_data='{"role":"admin"}' where id='22222222-2222-4222-8222-222222222222';
insert into auth.sessions(id,user_id,created_at,updated_at) values
('88888888-8888-4888-8888-888888888888','22222222-2222-4222-8222-222222222222',now(),now());
select set_config('request.jwt.claims','{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222","session_id":"88888888-8888-4888-8888-888888888888","aal":"aal2","app_metadata":{"role":"admin"}}',true);
set local role authenticated;
select set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"aal":"aal1"}'::jsonb)::text, true);
do $$ begin if zekapark_private.is_admin() or exists(select 1 from public.questions where id='learning-test-answer-key') then raise exception 'AAL1 bypasses admin MFA'; end if; end $$;
select set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"aal":"aal2"}'::jsonb)::text, true);
do $$ begin
  if has_table_privilege('authenticated','public.platform_settings','SELECT') or has_table_privilege('anon','public.platform_settings','UPDATE') then raise exception 'platform settings exposed'; end if;
  if not zekapark_private.is_admin() or not exists(select 1 from public.questions where id='learning-test-answer-key') then raise exception 'verified admin cannot read question bank'; end if;
end $$;
reset role;
update auth.users set raw_app_meta_data='{}' where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
do $$ begin
  if zekapark_private.is_admin() or exists(select 1 from public.questions where id='learning-test-answer-key') then raise exception 'stale admin JWT still grants question access'; end if;
end $$;
reset role;
rollback;
begin;
insert into auth.users(id,email) values ('99999999-9999-4999-8999-999999999999','grade-test@example.invalid');
insert into public.profiles(id,name,role,grade,xp) values ('99999999-9999-4999-8999-999999999999','Grade test','student',1,27);
insert into public.learning_sessions(student_id,mode,title,questions,created_at,expires_at,selection) values ('99999999-9999-4999-8999-999999999999','practice','Old grade','[{"targetGrade":1}]',now()-interval '1 minute',now()+interval '10 minutes','{"grade":1}');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare p jsonb; begin
  if has_function_privilege('anon','public.change_student_grade(uuid,integer)','EXECUTE') or has_function_privilege('authenticated','public.change_student_grade(uuid,integer)','EXECUTE') then raise exception 'grade RPC exposed'; end if;
  p:=public.change_student_grade('99999999-9999-4999-8999-999999999999',4);
  if p->>'grade'<>'4' or p->>'xp'<>'27' then raise exception 'grade or XP incorrect'; end if;
  if exists(select 1 from public.learning_sessions where student_id='99999999-9999-4999-8999-999999999999' and expires_at>clock_timestamp()) then raise exception 'old grade remains active'; end if;
  begin perform public.change_student_grade('99999999-9999-4999-8999-999999999999',5); raise exception 'invalid grade accepted'; exception when invalid_parameter_value then null; end;
end $$;
rollback;
select 'learning integration checks passed; fixtures rolled back' as status;
