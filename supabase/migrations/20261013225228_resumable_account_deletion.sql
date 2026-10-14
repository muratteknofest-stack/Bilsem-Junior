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
