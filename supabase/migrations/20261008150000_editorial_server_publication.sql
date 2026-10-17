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
