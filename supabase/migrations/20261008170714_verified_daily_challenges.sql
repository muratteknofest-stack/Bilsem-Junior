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
