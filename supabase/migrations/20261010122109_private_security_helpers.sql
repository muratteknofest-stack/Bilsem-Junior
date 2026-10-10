-- Keep Auth-table lookups and the checked progress mutation outside the Data API schema.
-- Policy expressions follow function OIDs when functions move schemas.
create schema if not exists zekapark_private;
revoke all on schema zekapark_private from public,anon;
grant usage on schema zekapark_private to authenticated,service_role;
alter function public.is_admin() set schema zekapark_private;
alter function public.has_active_session() set schema zekapark_private;
alter function public.patch_user_progress(jsonb) set schema zekapark_private;

create or replace function zekapark_private.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved jsonb; allowed text[] := array['yapyap_active_exam','zekapark_study_favorites_v1'];
begin
  if not zekapark_private.has_active_session() or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text)>250000 or exists(
    select 1 from jsonb_each(p_patch) item where not (item.key=any(allowed)) or (item.value<>'null'::jsonb and jsonb_typeof(item.value)<>'string')
  ) then raise exception 'Invalid progress patch' using errcode='22023'; end if;
  insert into public.user_private_state(user_id,values,updated_at) values(auth.uid(),jsonb_strip_nulls(p_patch),now())
  on conflict(user_id) do update set values=(public.user_private_state.values - coalesce((select array_agg(item.key) from jsonb_each(p_patch) item where item.value='null'::jsonb),array[]::text[])) || jsonb_strip_nulls(p_patch),updated_at=now()
  returning values into saved;
  return saved;
end $$;
revoke all on function zekapark_private.patch_user_progress(jsonb) from public,anon;
grant execute on function zekapark_private.patch_user_progress(jsonb) to authenticated;

-- Preserve the application's narrow public RPC without public SECURITY DEFINER code.
create function public.patch_user_progress(p_patch jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select zekapark_private.patch_user_progress(p_patch);
$$;
revoke all on function public.patch_user_progress(jsonb) from public,anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;
