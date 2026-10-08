-- A partial update preserves progress keys written by another device.
create or replace function public.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  saved jsonb;
  allowed text[] := array[
    'yapyap_mastery', 'yapyap_mistakes', 'yapyap_achievements',
    'yapyap_missions', 'yapyap_exam_results', 'yapyap_active_exam',
    'yapyap_weekly_questions_v1', 'bilsem_weekly_category_challenges_v1',
    'zekapark_study_favorites_v1'
  ];
begin
  if (select auth.uid()) is null or pg_catalog.jsonb_typeof(p_patch) <> 'object'
     or pg_catalog.length(p_patch::text) > 250000
     or exists (select 1 from pg_catalog.jsonb_each(p_patch) as item
       where not (item.key = any(allowed)) or (item.value <> 'null'::jsonb and pg_catalog.jsonb_typeof(item.value) <> 'string')) then
    raise exception 'Invalid progress patch' using errcode = '22023';
  end if;
  insert into public.user_private_state(user_id, values, updated_at)
  values ((select auth.uid()), pg_catalog.jsonb_strip_nulls(p_patch), now())
  on conflict (user_id) do update set
    values = (public.user_private_state.values - coalesce(
      (select pg_catalog.array_agg(item.key) from pg_catalog.jsonb_each(p_patch) as item where item.value = 'null'::jsonb),
      array[]::text[])) || pg_catalog.jsonb_strip_nulls(p_patch),
    updated_at = now()
  returning values into saved;
  return saved;
end
$$;
revoke all on function public.patch_user_progress(jsonb) from public, anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;
