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
