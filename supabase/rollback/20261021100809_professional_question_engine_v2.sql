begin;
-- Preserve every generated question and private asset. Archive new metadata.
drop function if exists public.commit_professional_generation(uuid,uuid,text,jsonb,jsonb);
drop function if exists public.claim_professional_generation(uuid,uuid,text,jsonb);
drop function if exists public.save_question_draft_batch(jsonb);
drop trigger if exists sync_professional_stimulus on public.questions;
drop function if exists public.sync_professional_stimulus();
drop index if exists public.questions_professional_stimulus_unique;
drop index if exists public.questions_professional_batch;
alter table public.questions drop column if exists professional_stimulus_sha256;
create schema if not exists bilsem_engine_v2_archive;
revoke all on schema bilsem_engine_v2_archive from public,anon,authenticated;
alter table public.professional_generation_runs set schema bilsem_engine_v2_archive;
alter table public.question_visual_assets set schema bilsem_engine_v2_archive;
revoke all on all tables in schema bilsem_engine_v2_archive from public,anon,authenticated;
commit;
