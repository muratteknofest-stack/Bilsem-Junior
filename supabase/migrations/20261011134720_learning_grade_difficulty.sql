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

