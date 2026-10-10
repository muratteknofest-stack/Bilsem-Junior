-- Activate ONLY after the learning API has been deployed and smoke-tested.
-- This removes legacy client authority over scoring and published answer keys.
-- Fresh production projects may not contain the older admin-helper migration.
-- Read provider-owned metadata, so stale/client-edited JWT metadata cannot grant admin access.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u where u.id=auth.uid()
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'role'='admin'
  );
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,service_role;

create or replace function public.protect_profile_progress() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' and
    (new.xp,new.level,new.total_points,new.streak,new.longest_streak,new.last_active_date,
     new.today_practiced,new.streak_freeze_count,new.claimed_streak_days,new.weekly_streak_history,
     new.today_minutes_spent,new.today_questions_solved,new.today_sessions_completed,
     new.total_questions_solved,new.resolved_mistakes_count)
    is distinct from
    (old.xp,old.level,old.total_points,old.streak,old.longest_streak,old.last_active_date,
     old.today_practiced,old.streak_freeze_count,old.claimed_streak_days,old.weekly_streak_history,
     old.today_minutes_spent,old.today_questions_solved,old.today_sessions_completed,
     old.total_questions_solved,old.resolved_mistakes_count) then
    raise exception 'Progress is scored by the server' using errcode='42501';
  end if;
  return new;
end
$$;
create trigger protect_profile_progress before update on public.profiles for each row execute function public.protect_profile_progress();

create function public.has_active_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())
  );
$$;
revoke all on function public.has_active_session() from public,anon;
grant execute on function public.has_active_session() to authenticated,service_role;
-- Revoked access tokens must also stop working through PostgREST and Realtime.
do $$
declare p record; statement text;
begin
  for p in select * from pg_policies where schemaname='public' and 'authenticated'=any(roles) loop
    statement := format('alter policy %I on public.%I',p.policyname,p.tablename);
    if p.qual is not null then statement := statement || ' using ((' || p.qual || ') and (select public.has_active_session()))'; end if;
    if p.with_check is not null then statement := statement || ' with check ((' || p.with_check || ') and (select public.has_active_session()))'; end if;
    execute statement;
  end loop;
end $$;
alter policy questions_read on public.questions using ((select public.is_admin()) and (select public.has_active_session()));
alter policy questions_insert on public.questions with check ((select public.is_admin()) and (select public.has_active_session()) and status<>'published');
alter policy questions_update on public.questions using ((select public.is_admin()) and (select public.has_active_session())) with check ((select public.is_admin()) and (select public.has_active_session()) and status<>'published');
alter policy questions_delete on public.questions using ((select public.is_admin()) and (select public.has_active_session()));
revoke insert,update,delete on public.user_private_state from authenticated;
revoke insert,update,delete on public.practice_sessions,public.test_attempts from authenticated;

create or replace function public.patch_user_progress(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved jsonb; allowed text[] := array['yapyap_active_exam','zekapark_study_favorites_v1'];
begin
  if not public.has_active_session() or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text)>250000 or exists(
    select 1 from jsonb_each(p_patch) item where not (item.key=any(allowed)) or (item.value<>'null'::jsonb and jsonb_typeof(item.value)<>'string')
  ) then raise exception 'Invalid progress patch' using errcode='22023'; end if;
  insert into public.user_private_state(user_id,values,updated_at) values(auth.uid(),jsonb_strip_nulls(p_patch),now())
  on conflict(user_id) do update set values=(public.user_private_state.values - coalesce((select array_agg(item.key) from jsonb_each(p_patch) item where item.value='null'::jsonb),array[]::text[])) || jsonb_strip_nulls(p_patch),updated_at=now()
  returning values into saved;
  return saved;
end $$;
revoke all on function public.patch_user_progress(jsonb) from public,anon;
grant execute on function public.patch_user_progress(jsonb) to authenticated;
