-- Separate Storage policy hardening. No Storage metadata DML or object deletion.
-- First review preflight.sql and external references, then make exam-images private
-- through Dashboard / Storage API. Existing public URLs will stop working.
-- Apply after production-shield.sql. Supabase supports policy DDL on storage.objects;
-- do not ALTER its managed owner/roles or disable its existing RLS.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bilsem-storage-shield-v1',0));

do $guard$
declare refs jsonb;
begin
 if to_regprocedure('zekapark_private.protect_profile_preferences()') is null then
   raise exception 'Apply and verify production-shield.sql first';
 end if;
 if not exists(select 1 from storage.buckets where id='bilsem-question-visual-drafts-v2' and not public
   and file_size_limit between 1 and 10485760 and allowed_mime_types is not null
   and cardinality(allowed_mime_types)>0 and allowed_mime_types<@array['image/png','image/webp']::text[]) then
   raise exception 'Expected private, size/MIME-limited visual bucket; review Storage configuration';
 end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) then
   raise exception 'Managed Storage objects RLS must already be enabled';
 end if;
 select jsonb_build_object(
  'questions',(select count(*) from public.questions where data::text like '%exam-images%'),
  'profiles',(select count(*) from public.profiles where avatar like '%exam-images%'),
  'learning_sessions',(select count(*) from public.learning_sessions where questions::text like '%exam-images%'),
  'user_private_state',(select count(*) from public.user_private_state where values::text like '%exam-images%'),
  'support_requests',(select count(*) from public.support_requests where payload::text like '%exam-images%')) into refs;
 if exists(select 1 from jsonb_each_text(refs) item where item.value::bigint>0) then
   raise exception 'Active legacy file references require migration first; nothing applied' using detail=refs::text;
 end if;
 if exists(select 1 from storage.buckets where id='exam-images' and public) then
   raise exception 'Make exam-images private through Dashboard / Storage API before installing policies';
 end if;
end $guard$;

-- Public buckets bypass SELECT policies for public download URLs. Policy changes
-- alone are insufficient: the guard requires the Dashboard / API change first.
drop policy if exists exam_images_public_read on storage.objects;
drop policy if exists exam_images_admin_write on storage.objects;
drop policy if exists exam_images_admin_update on storage.objects;
drop policy if exists exam_images_admin_delete on storage.objects;

-- Restrictive policies also defeat a future broad permissive allow elsewhere.
-- Other buckets retain their independent policies. Server Storage API access remains.
drop policy if exists bilsem_server_only_objects_v1 on storage.objects;
create policy bilsem_server_only_objects_v1 on storage.objects as restrictive for all to anon,authenticated
 using (bucket_id not in ('exam-images','bilsem-question-visual-drafts-v2'))
 with check (bucket_id not in ('exam-images','bilsem-question-visual-drafts-v2'));

notify pgrst,'reload schema';
commit;
