import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// The existing account project predates the application schema. Preserve it as
// a private archive, then install the exact reviewed application SQL contracts.
export const alignmentSources = [
  'schema.sql',
  'migrations/20261005180525_admin_claim_only.sql',
  'migrations/20261008150000_editorial_server_publication.sql',
  'migrations/20261008151000_progress_patch.sql',
  'migrations/20261008165142_commercial_support_requests.sql',
  'migrations/20261008170714_verified_daily_challenges.sql',
  'migrations/20261010085952_server_verified_learning.sql',
  'migrations/20261010090133_protect_verified_progress.sql',
  'migrations/20261010091235_distributed_api_limits.sql',
  'migrations/20261010122109_private_security_helpers.sql',
  'migrations/20261011080721_platform_release_settings.sql',
  'migrations/20261011134720_learning_grade_difficulty.sql',
  'migrations/20261013150111_shopier_verified_access.sql',
  'migrations/20261013225228_resumable_account_deletion.sql',
  'migrations/20261014220748_shopier_three_access_plans.sql',
  'migrations/20261017061944_google_play_subscriptions.sql',
  'migrations/20261017183500_phase2_indexes_and_rate_limit_optimization.sql',
  'migrations/20261017232044_retire_legacy_payment_integration.sql',
];

export async function buildBilsemAlignmentSQL() {
  const preflight = `-- Account-project alignment. Generated from repository SQL; do not apply to an already modern project.
-- auth.users, passwords, verification state and session ownership remain unchanged.
begin;
select pg_advisory_xact_lock(hashtextextended('bilsem-account-project-alignment',0));
lock table auth.users in share row exclusive mode;
do $$ begin
  if to_regclass('public.learning_sessions') is not null or to_regnamespace('bilsem_legacy') is not null
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name')
    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role')
    then raise exception 'Expected legacy Bilsem project schema; migration refused'; end if;
end $$;
create schema bilsem_legacy;
revoke all on schema bilsem_legacy from public,anon,authenticated;
grant usage on schema bilsem_legacy to service_role;
create table bilsem_legacy.row_manifest(table_name text primary key,row_count bigint not null,fingerprint text not null);
create table bilsem_legacy.function_manifest(signature text primary key,definition text not null);
insert into bilsem_legacy.row_manifest
 select 'auth.users',count(*),md5(coalesce(jsonb_agg(to_jsonb(u) order by id),'[]'::jsonb)::text) from auth.users u;
do $$ declare table_name text; fn record; begin
  foreach table_name in array array['profiles','subjects','topics','exams','questions','exam_results','user_purchases','arena_challenges'] loop
    execute format('lock table public.%I in access exclusive mode',table_name);
    execute format('insert into bilsem_legacy.row_manifest select %L,count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb)::text) from public.%I t',table_name,table_name);
    execute format('alter table public.%I set schema bilsem_legacy',table_name);
  end loop;
  for fn in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in ('handle_new_user','is_admin','increment_exam_play','get_filtered_leaderboard','check_and_reset_daily_credits','consume_credit') loop
    insert into bilsem_legacy.function_manifest values(fn.proname||'('||fn.args||')',fn.definition);
    execute format('alter function public.%I(%s) set schema bilsem_legacy',fn.proname,fn.args);
  end loop;
end $$;
-- The family API creates complete profiles explicitly. Preserve the managed
-- Auth trigger and its OID, but retire its obsolete profile insert in our own
-- function. The original definition remains in function_manifest for recovery.
create or replace function bilsem_legacy.handle_new_user() returns trigger
language plpgsql security invoker set search_path='' as $$ begin return new; end $$;
revoke all on all functions in schema bilsem_legacy from public,anon,authenticated,service_role;
revoke all on all tables in schema bilsem_legacy from public,anon,authenticated;
grant select on all tables in schema bilsem_legacy to service_role;
`;
  const sources = await Promise.all(alignmentSources.map(async file => `\n-- Source: supabase/${file}\n${await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8')}`));
  const complete = `
-- Historical flags in editable legacy profiles are not authority to grant admin.
-- Only an existing provider-owned role can become an administrator or parent.
insert into public.profiles(id,email,name,role,student_code,grade,xp,level,total_points,streak,longest_streak,last_active_date,created_at,updated_at)
select p.id,u.email,coalesce(nullif(p.full_name,''),nullif(p.username,''),'Kaşif'),
 case when u.raw_app_meta_data->>'role' in ('student','parent','admin') then u.raw_app_meta_data->>'role' else 'student' end,
 case when lower(u.email) like '%@zekapark.com' then upper(split_part(u.email,'@',1)) else null end,
 case when u.raw_user_meta_data->>'grade' ~ '^[1-4]$' then (u.raw_user_meta_data->>'grade')::integer else 1 end,
 coalesce(p.xp,0),greatest(1,floor(coalesce(p.xp,0)::numeric/250)::integer+1),coalesce(p.xp,0),
 coalesce(p.login_streak,0),coalesce(p.login_streak,0),coalesce(p.last_active_date::text,''),
 extract(epoch from p.created_at)*1000,extract(epoch from now())*1000
from bilsem_legacy.profiles p join auth.users u on u.id=p.id;

-- Existing users retain access; enable the previously requested family signup.
-- Email delivery and operator acceptance checks are not asserted by this SQL.
update public.platform_settings set settings=jsonb_set(settings,'{release}','{"registrationEnabled":true}'::jsonb,true) where id=true;

do $$ declare row record; actual_count bigint; actual_fingerprint text; begin
  for row in select * from bilsem_legacy.row_manifest where table_name<>'auth.users' loop
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb)::text) from bilsem_legacy.%I t',row.table_name) into actual_count,actual_fingerprint;
    if actual_count<>row.row_count or actual_fingerprint<>row.fingerprint then raise exception 'Legacy archive changed: %',row.table_name; end if;
  end loop;
  select count(*),md5(coalesce(jsonb_agg(to_jsonb(u) order by id),'[]'::jsonb)::text) into actual_count,actual_fingerprint from auth.users u;
  if not exists(select 1 from bilsem_legacy.row_manifest where table_name='auth.users' and row_count=actual_count and fingerprint=actual_fingerprint)
    then raise exception 'Auth identities changed during alignment'; end if;
  if exists(select 1 from bilsem_legacy.profiles old left join public.profiles p on p.id=old.id where p.id is null or p.xp is distinct from coalesce(old.xp,0)::double precision or p.streak is distinct from coalesce(old.login_streak,0)::double precision)
    then raise exception 'Profile identity or progress was not preserved'; end if;
end $$;
notify pgrst,'reload schema';
commit;
`;
  return preflight + sources.join('\n') + complete;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const destination = process.argv[2];
  if (!destination || !/\d{14}_align_bilsem_account_project\.sql$/.test(destination)) throw new Error('Pass the migration path created by supabase migration new.');
  await writeFile(destination, await buildBilsemAlignmentSQL());
  console.log('Alignment SQL generated from ' + alignmentSources.length + ' reviewed source files.');
}
