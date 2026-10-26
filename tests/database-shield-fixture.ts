import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { buildBilsemAlignmentSQL } from '../scripts/build-bilsem-alignment.mjs';

export const databaseShieldSql = () => readFile(new URL('../supabase/security/production-shield.sql', import.meta.url), 'utf8');
export const storageShieldSql = () => readFile(new URL('../supabase/security/storage-shield.sql', import.meta.url), 'utf8');
export async function createShieldDatabase() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create publication supabase_realtime; create schema auth;
      grant usage on schema auth,public to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,encrypted_password text,role text,aud text,
        email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,
        created_at timestamptz,updated_at timestamptz,not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
      grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
      create schema storage; grant usage on schema storage to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,payload text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
      create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text,full_name text,
        avatar_url text,xp integer default 0,is_admin boolean default false,created_at timestamptz default now(),
        coins integer default 0,login_streak integer default 0,last_active_date date);
      create table public.subjects(id uuid primary key,name text);
      create table public.topics(id uuid primary key,subject_id uuid references public.subjects(id),name text);
      create table public.exams(id uuid primary key,topic_id uuid references public.topics(id),title text);
      create table public.questions(id uuid primary key,exam_id uuid references public.exams(id),question_image_url text,correct_index integer);
      create table public.exam_results(id uuid primary key,exam_id uuid references public.exams(id),player_id uuid references public.profiles(id),score integer);
      create table public.user_purchases(id uuid primary key,user_id uuid references public.profiles(id),item_id text);
      create table public.arena_challenges(id uuid primary key,challenger_id uuid references public.profiles(id),opponent_id uuid references public.profiles(id));
      create function public.is_admin() returns boolean language sql stable security definer as $$select false$$;
      grant all on all tables in schema public to anon,authenticated,service_role;
      insert into public.subjects values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Preserved legacy fixture');
    `);
    await db.exec(await buildBilsemAlignmentSQL());
    await db.exec(await readFile(new URL('../supabase/migrations/20261021062258_harden_bilsem_legacy_archive.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261021100809_professional_question_engine_v2.sql', import.meta.url), 'utf8'));
    // Reproduce the managed project's broad inherited defaults and column grants.
    await db.exec(`grant all on all tables in schema public to anon,authenticated,service_role;
      alter default privileges for role postgres grant all on tables to anon,authenticated,service_role;
      alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
      grant update(grade) on public.profiles to authenticated;
      insert into storage.buckets(id,name,public) values('exam-images','exam-images',true);
      create policy exam_images_public_read on storage.objects for select to public using(bucket_id='exam-images');
      create policy exam_images_admin_write on storage.objects for insert to public with check(bucket_id='exam-images' and bilsem_legacy.is_admin());
      create policy exam_images_admin_update on storage.objects for update to public using(bucket_id='exam-images' and bilsem_legacy.is_admin());
      create policy exam_images_admin_delete on storage.objects for delete to public using(bucket_id='exam-images' and bilsem_legacy.is_admin());
      insert into storage.objects(bucket_id,name,payload) values('exam-images','legacy-fixture.png','preserve old bytes'),
        ('bilsem-question-visual-drafts-v2','draft-fixture.png','preserve draft bytes');`);
    return db;
  } catch (error) { await db.close(); throw error; }
}

export async function applyShield(db: PGlite, sql: string) {
  try { await db.exec(sql); }
  catch (error) { await db.exec('rollback'); throw error; }
}
