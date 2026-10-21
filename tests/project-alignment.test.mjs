import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { buildBilsemAlignmentSQL } from '../scripts/build-bilsem-alignment.mjs';

test('legacy account alignment preserves identities, passwords, XP and historical records while enforcing current RLS', { timeout: 60000 }, async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create publication supabase_realtime; create schema auth;
      grant usage on schema auth,public to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,encrypted_password text,role text,aud text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz,updated_at timestamptz,not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
      grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
      create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text,full_name text,avatar_url text,xp integer default 0,is_admin boolean default false,created_at timestamptz default now(),coins integer default 0,login_streak integer default 0,last_active_date date);
      create table public.subjects(id uuid primary key,name text);
      create table public.topics(id uuid primary key,subject_id uuid references public.subjects(id),name text);
      create table public.exams(id uuid primary key,topic_id uuid references public.topics(id),title text);
      create table public.questions(id uuid primary key,exam_id uuid references public.exams(id),question_image_url text,correct_index integer);
      create table public.exam_results(id uuid primary key,exam_id uuid references public.exams(id),player_id uuid references public.profiles(id),score integer);
      create table public.user_purchases(id uuid primary key,user_id uuid references public.profiles(id),item_id text);
      create table public.arena_challenges(id uuid primary key,challenger_id uuid references public.profiles(id),opponent_id uuid references public.profiles(id));
      create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='public' as $$ begin insert into public.profiles(id,full_name,username) values(new.id,'Legacy explorer',split_part(new.email,'@',1)); return new; end $$;
      create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
      create function public.is_admin() returns boolean language sql stable security definer as $$ select coalesce((select is_admin from public.profiles where id=auth.uid()),false) $$;
      alter table public.profiles enable row level security;
      create policy legacy_own on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
      grant all on all tables in schema public to authenticated;
      insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy@example.invalid','fixture-password-hash',now(),'{"role":"admin","grade":4}');
      insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','guardian@example.invalid','other-fixture-hash',now(),'{"role":"parent"}');
      update public.profiles set xp=5000,login_streak=5,is_admin=true where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      insert into public.subjects values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Original subject');
      insert into public.topics values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Original topic');
      insert into public.exams values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Original exam');
      insert into public.questions values('ffffffff-ffff-4fff-8fff-ffffffffffff','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','original-image.png',2);
      insert into public.exam_results values('12345678-1234-4234-8234-123456789012','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',8);
      insert into public.user_purchases values('23456789-2345-4345-8345-234567890123','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','original-purchase');
    `);
    const before = (await db.query('select * from auth.users order by id')).rows;
    const sql = await buildBilsemAlignmentSQL();
    const committed = await readFile(new URL('../supabase/migrations/20261021060602_align_bilsem_account_project.sql', import.meta.url), 'utf8');
    assert.equal(sql, committed, 'committed migration must match its reviewed source builder');
    await db.exec(sql);
    assert.deepEqual((await db.query('select * from auth.users order by id')).rows, before);
    assert.deepEqual((await db.query('select role,grade,xp,level,streak from public.profiles order by id')).rows, [
      { role:'student', grade:4, xp:5000, level:21, streak:5 },
      { role:'parent', grade:1, xp:0, level:1, streak:0 },
    ]);
    assert.equal((await db.query('select count(*)::integer as count from bilsem_legacy.row_manifest')).rows[0].count, 9);
    assert.equal((await db.query('select score from bilsem_legacy.exam_results')).rows[0].score, 8);
    assert.equal((await db.query('select correct_index from bilsem_legacy.questions')).rows[0].correct_index, 2);
    assert.equal((await db.query('select item_id from bilsem_legacy.user_purchases')).rows[0].item_id, 'original-purchase');
    assert.equal((await db.query("select has_schema_privilege('authenticated','bilsem_legacy','usage') as allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select has_function_privilege('authenticated','bilsem_legacy.is_admin()','execute') as allowed")).rows[0].allowed, false);
    const integration = await db.exec(await readFile(new URL('./supabase-learning.integration.sql', import.meta.url), 'utf8'));
    assert.match(String(integration.at(-1)?.rows[0]?.status), /checks passed/);
    assert.deepEqual((await db.query('select * from auth.users order by id')).rows, before);
    await assert.rejects(db.exec(sql), /Expected legacy Bilsem project schema/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::integer as count from public.profiles')).rows[0].count, 2);
  } finally { await db.close(); }
});
