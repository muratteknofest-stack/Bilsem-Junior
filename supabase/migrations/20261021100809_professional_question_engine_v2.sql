begin;
-- Legacy JSON and user data are preserved. Only professional-v2 gets a new key.
alter table public.questions add column professional_stimulus_sha256 text;
create unique index questions_professional_stimulus_unique on public.questions(target_grade,professional_stimulus_sha256) where professional_stimulus_sha256 is not null and status in ('draft','review','published');
create index questions_professional_batch on public.questions((data->>'sourceBatch'),id) where data->>'reviewPolicy'='professional-v2';
create table public.professional_generation_runs (
 id uuid primary key,actor_id uuid references auth.users(id) on delete set null,request_sha256 text not null check(request_sha256 ~ '^[0-9a-f]{64}$'),
 status text not null default 'running' check(status in ('running','completed','failed')),config jsonb not null check(jsonb_typeof(config)='object' and octet_length(config::text)<=20000),
 result jsonb check(result is null or (jsonb_typeof(result)='object' and octet_length(result::text)<=250000)),question_id text references public.questions(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index professional_generation_runs_actor_created on public.professional_generation_runs(actor_id,created_at desc);
alter table public.professional_generation_runs enable row level security;
revoke all on public.professional_generation_runs from public,anon,authenticated;
grant select,insert,update on public.professional_generation_runs to service_role;
create table public.question_visual_assets (
 id uuid primary key,question_id text references public.questions(id) on delete set null,actor_id uuid references auth.users(id) on delete set null,
 bucket text not null check(bucket='bilsem-question-visual-drafts-v2'),object_path text not null unique,sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 purpose text not null check(purpose='decoration'),status text not null default 'draft' check(status in ('draft','approved','rejected')),
 content_type text not null check(content_type in ('image/png','image/webp')),bytes integer not null check(bytes>0 and bytes<=10485760),provider text not null,model text not null,usage jsonb,created_at timestamptz not null default now(),
 check(object_path=id::text||case when content_type='image/png' then '.png' else '.webp' end)
);
create index question_visual_assets_question_created on public.question_visual_assets(question_id,created_at desc);
alter table public.question_visual_assets enable row level security;
revoke all on public.question_visual_assets from public,anon,authenticated;
grant select,insert,update,delete on public.question_visual_assets to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bilsem-question-visual-drafts-v2','bilsem-question-visual-drafts-v2',false,10485760,array['image/png','image/webp']) on conflict(id) do nothing;
do $$begin if exists(select 1 from storage.buckets where id='bilsem-question-visual-drafts-v2' and public) then raise exception 'Visual drafts bucket must be private';end if;end$$;
CREATE OR REPLACE FUNCTION public.claim_professional_generation(p_id uuid, p_actor uuid, p_sha256 text, p_config jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare inserted integer; row public.professional_generation_runs%rowtype;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server role required' using errcode='42501'; end if;
  insert into public.professional_generation_runs(id,actor_id,request_sha256,config) values(p_id,p_actor,p_sha256,p_config) on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  select * into strict row from public.professional_generation_runs where id=p_id for update;
  if row.actor_id is distinct from p_actor or row.request_sha256 is distinct from p_sha256 then raise exception 'Generation request conflict' using errcode='40001'; end if;
  return jsonb_build_object('claimed',inserted=1,'status',row.status,'result',row.result);
end$function$
;

CREATE OR REPLACE FUNCTION public.commit_professional_generation(p_id uuid, p_actor uuid, p_sha256 text, p_result jsonb, p_question jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare row public.professional_generation_runs%rowtype; saved jsonb;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server role required' using errcode='42501'; end if;
  select * into strict row from public.professional_generation_runs where id=p_id for update;
  if row.actor_id is distinct from p_actor or row.request_sha256 is distinct from p_sha256 then raise exception 'Generation request conflict' using errcode='40001'; end if;
  if row.status<>'running' then return row.result; end if;
  if jsonb_typeof(p_result) is distinct from 'object' then raise exception 'Invalid generation result' using errcode='22023'; end if;
  if p_result->>'success'='true' and (p_question is null or jsonb_typeof(p_question)<>'object') then raise exception 'Successful generation requires a stored draft' using errcode='22023'; end if;
  if p_question is not null and jsonb_typeof(p_question)='object' then
    if p_question->>'status' is null or p_question->>'status' not in ('draft','review') then raise exception 'Generation cannot publish questions' using errcode='22023'; end if;
    saved:=public.save_question(p_question,0);
    p_result:=jsonb_set(p_result,'{question}',saved,true);
  else p_result:=p_result-'question'; end if;
  update public.professional_generation_runs set result=p_result,status=case when p_result->>'success'='true' then 'completed' else 'failed' end,
    question_id=saved->>'id',updated_at=now() where id=p_id;
  return p_result;
end$function$
;

CREATE OR REPLACE FUNCTION public.save_question_draft_batch(p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q jsonb; previous public.questions%rowtype; saved jsonb; output jsonb:='[]'::jsonb;
  volatile_fields text[]:=array['createdAt','updatedAt','updatedBy','revision','isCustom'];
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server role required' using errcode='42501'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 20 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(p_questions) item)<>jsonb_array_length(p_questions) then raise exception 'Repeated question ID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(p_questions) order by value->>'id' loop
    if q->>'status' is null or q->>'status' not in ('draft','review') or (q->>'revision')::integer is distinct from 1 or coalesce(length(q->>'id'),0) not between 1 and 200 then raise exception 'Only new drafts may be saved' using errcode='22023'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(q->>'id',0));
    select * into previous from public.questions where id=q->>'id' for update;
    if found then
      if previous.revision<>1 or previous.status not in ('draft','review') or (previous.data-volatile_fields) is distinct from (q-volatile_fields) then raise exception 'Question already changed' using errcode='40001'; end if;
      saved:=previous.data;
    else saved:=public.save_question(q,0);
    end if;
    output:=output||jsonb_build_array(saved);
  end loop;
  return jsonb_build_object('questions',output);
end$function$
;

CREATE OR REPLACE FUNCTION public.sync_professional_stimulus()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.professional_stimulus_sha256:=case when new.data->>'reviewPolicy'='professional-v2'
    and new.data#>>'{qualityReport,similarity,stimulusKey}' is not null
    then pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(new.data#>>'{qualityReport,similarity,stimulusKey}','UTF8')),'hex') else null end;
  return new;
end$function$
;
create trigger sync_professional_stimulus before insert or update on public.questions for each row execute function public.sync_professional_stimulus();
revoke all on function public.sync_professional_stimulus() from public,anon,authenticated;
revoke all on function public.save_question_draft_batch(jsonb),public.claim_professional_generation(uuid,uuid,text,jsonb),public.commit_professional_generation(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_question_draft_batch(jsonb),public.claim_professional_generation(uuid,uuid,text,jsonb),public.commit_professional_generation(uuid,uuid,text,jsonb,jsonb) to service_role;
commit;
