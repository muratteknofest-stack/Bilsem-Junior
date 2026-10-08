-- Run in a test/staging project. All fixture changes roll back; no e-mails are sent.
begin;
select set_config('zekapark.test_actor',(select id::text from public.profiles where role='student' limit 1),true);
select set_config('zekapark.test_other',(select id::text from public.profiles where role='parent' limit 1),true);
set local role service_role;
do $$
declare actor uuid:=current_setting('zekapark.test_actor')::uuid;
 other_actor uuid:=current_setting('zekapark.test_other')::uuid;
 first_id uuid; next_id uuid; v jsonb; replay jsonb; n int; existing_count int;
 key_prefix text:=gen_random_uuid()::text;
 q jsonb:='{"options":[{"id":"A"},{"id":"B"}],"correctOptionId":"B"}';
begin
 if actor is null or other_actor is null then raise exception 'Need student and parent test fixtures'; end if;
 if has_table_privilege('anon','public.support_requests','SELECT') or
    has_table_privilege('authenticated','public.daily_challenge_attempts','UPDATE') or
    has_function_privilege('authenticated','public.answer_daily_challenge(uuid,uuid,text)','EXECUTE') then raise exception 'Unexpected client privilege'; end if;
 select count(*) into existing_count from public.support_requests where actor_id=actor and created_at>=now()-interval '24 hours';
 if existing_count>=10 then raise exception 'Need fixture below support quota'; end if;
 first_id:=public.submit_support_request(actor,'question',md5(key_prefix)||md5('1'),'{}');
 next_id:=public.submit_support_request(actor,'question',md5(key_prefix)||md5('1'),'{}');
 if first_id<>next_id then raise exception 'Support deduplication failed'; end if;
 for n in 2..(10-existing_count) loop perform public.submit_support_request(actor,'question',md5(key_prefix)||md5(n::text),'{}'); end loop;
 begin
   perform public.submit_support_request(actor,'question',md5(key_prefix)||md5('overflow'),'{}');
   raise exception 'Support quota failed' using errcode='XX000';
 exception when sqlstate 'P0001' then null;
 end;
 if exists(select 1 from public.daily_challenge_attempts where student_id=actor and day=(now() at time zone 'Europe/Istanbul')::date) then
   raise exception 'Use a student without daily challenges for this transaction';
 end if;
 v:=public.issue_daily_challenge(actor,2,q);
 first_id:=(v->>'id')::uuid;
 replay:=public.issue_daily_challenge(actor,2,q);
 if replay->>'id'<>v->>'id' then raise exception 'Parallel start must resume unfinished task'; end if;
 begin
   perform public.answer_daily_challenge(other_actor,first_id,'B');
   raise exception 'Cross account answer accepted' using errcode='XX000';
 exception when sqlstate 'P0002' then null;
 end;
 begin
   perform public.answer_daily_challenge(actor,first_id,'Z');
   raise exception 'Unknown option accepted' using errcode='XX000';
 exception when sqlstate '22023' then null;
 end;
 v:=public.answer_daily_challenge(actor,first_id,'A');
 replay:=public.answer_daily_challenge(actor,first_id,'B');
 if v<>replay or (replay->>'points')::int<>0 or replay->>'selected_option'<>'A' then raise exception 'Answer replay modified first answer'; end if;
 for n in 2..3 loop
   v:=public.issue_daily_challenge(actor,2,q);
   v:=public.answer_daily_challenge(actor,(v->>'id')::uuid,'B');
   if (v->>'points')::int<>10 then raise exception 'Correct answer score failed'; end if;
 end loop;
 if public.issue_daily_challenge(actor,2,q) is not null then raise exception 'Daily quota failed'; end if;
 if (select sum(points) from public.daily_challenge_attempts where student_id=actor)<>20 then raise exception 'Score total incorrect'; end if;
end $$;
rollback;
select 'PASS: isolation, hidden server tables, deduplication, quotas and first-answer scoring (rolled back)' as verification;
