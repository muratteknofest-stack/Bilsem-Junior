-- Read-only post-application assertions. No fake users, data writes or JWT impersonation.
begin read only;
do $verify$
declare bad bigint;
begin
 if to_regprocedure('zekapark_private.protect_profile_preferences()') is null then
   raise exception 'Production shield has not been installed';
 end if;
 select count(*) into bad from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','bilsem_legacy') and c.relkind in ('r','p') and not c.relrowsecurity;
 if bad>0 then raise exception 'RLS missing on % app/archive tables',bad; end if;
 select count(*) into bad from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated'),('service_role')) roles(name)
  where n.nspname in ('public','bilsem_legacy') and c.relkind in ('r','p')
  and (has_table_privilege(roles.name,c.oid,'TRUNCATE') or has_table_privilege(roles.name,c.oid,'TRIGGER')
       or has_table_privilege(roles.name,c.oid,'REFERENCES') or has_table_privilege(roles.name,c.oid,'MAINTAIN'));
 if bad>0 then raise exception 'Unexpected DDL-like table grants on % role/table pairs',bad; end if;
 if exists(select 1 from (values('anon'),('authenticated'),('service_role')) roles(name)
   where has_schema_privilege(roles.name,'bilsem_legacy','USAGE')
      or has_schema_privilege(roles.name,'public','CREATE')
      or has_schema_privilege(roles.name,'zekapark_private','CREATE')) then
   raise exception 'Archive access or application schema CREATE privilege remains';
 end if;
 if has_column_privilege('authenticated','public.profiles','grade','UPDATE')
   or has_column_privilege('authenticated','public.profiles','role','UPDATE')
   or has_column_privilege('authenticated','public.profiles','xp','UPDATE')
   or not has_column_privilege('authenticated','public.profiles','name','UPDATE') then
   raise exception 'Profile column privilege mismatch';
 end if;
 select count(*) into bad from pg_constraint where conrelid='public.profiles'::regclass
  and convalidated and conname in ('bilsem_profile_text_bounds_v1','bilsem_profile_grade_v1',
  'bilsem_profile_goals_v1','bilsem_profile_badges_v1','bilsem_profile_reminder_v1');
 if bad<>5 then raise exception 'Five validated profile constraints are required'; end if;
 select count(*) into bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  and (has_function_privilege('anon',p.oid,'EXECUTE') or (has_function_privilege('authenticated',p.oid,'EXECUTE')
       and p.proname not in ('patch_user_progress','save_question')));
 if bad>0 then raise exception 'Unexpected client-callable public functions: %',bad; end if;
 if not has_function_privilege('authenticated','public.patch_user_progress(jsonb)','EXECUTE')
    or not has_function_privilege('service_role','public.consume_api_limit(text,text,integer,integer)','EXECUTE')
    or not has_function_privilege('service_role','public.change_student_grade(uuid,integer)','EXECUTE') then
   raise exception 'Required checked RPC privilege is missing';
 end if;
 -- Global PUBLIC EXECUTE must be removed, not just per-schema grants.
 if exists(select 1 from pg_roles creator cross join lateral aclexplode(coalesce(
   (select d.defaclacl from pg_default_acl d where d.defaclrole=creator.oid and d.defaclnamespace=0 and d.defaclobjtype='f'),
   acldefault('f',creator.oid))) acl
   where creator.rolname='postgres' and acl.grantee=0 and acl.privilege_type='EXECUTE') then
   raise exception 'Global default PUBLIC EXECUTE remains for postgres-created functions';
 end if;
 if exists(select 1 from storage.buckets where id='exam-images' and public) then
   raise exception 'Legacy exam-images bucket is still public; review/apply storage-shield.sql';
 end if;
 if not exists(select 1 from storage.buckets where id='bilsem-question-visual-drafts-v2' and not public
   and file_size_limit between 1 and 10485760 and allowed_mime_types is not null
   and cardinality(allowed_mime_types)>0 and allowed_mime_types<@array['image/png','image/webp']::text[]) then
   raise exception 'Visual bucket configuration mismatch';
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
   and policyname='bilsem_server_only_objects_v1' and permissive='RESTRICTIVE' and cmd='ALL') then
   raise exception 'Server-only application Storage policy missing';
 end if;
end $verify$;

select jsonb_build_object('status','verified',
 'application_tables',(select count(*) from pg_tables where schemaname='public'),
 'archive_tables',(select count(*) from pg_tables where schemaname='bilsem_legacy'),
 'profile_constraints',5) as database_shield;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
 from pg_policies where schemaname='public' or (schemaname='storage' and policyname='bilsem_server_only_objects_v1')
 order by schemaname,tablename,policyname;
rollback;
