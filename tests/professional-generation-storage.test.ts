import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {generateQuestion} from '../src/features/questions/generators';import {assessCandidate} from '../src/features/questions/multi-stage-quality';
const migration='20261021100809_professional_question_engine_v2.sql';
test('Postgres validates atomic drafts, replay, conflicts, private permissions and lossless rollback',{timeout:60000},async()=>{
 const db=new PGlite();try{
  // Local managed-service contract; actual database writes are verified separately.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create publication supabase_realtime;create schema auth;grant usage on schema auth,public to anon,authenticated,service_role;create table auth.users(id uuid primary key,email text,role text,aud text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/migrations/20261008150000_editorial_server_publication.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
  await db.exec(`set request.jwt.claims='{"role":"service_role"}';set role service_role;`);
  const make=(seed:number)=>{const q=generateQuestion({targetGrade:4,difficulty:4,type:'number_pattern',seed});q.id='v2-storage-'+seed;q.status='review';q.revision=1;q.reviewPolicy='professional-v2';q.qualityReport=assessCandidate(q,{grade:4,difficulty:4});return q;};
  const a=make(23341),b=make(73341),save=(qs:unknown[])=>db.query('select public.save_question_draft_batch($1::jsonb)',[JSON.stringify(qs)]);
  await save([a,b]);await save([a,b]);assert.equal((await db.query<{n:number}>('select count(*) as n from public.questions')).rows[0].n,2);
  await assert.rejects(save([make(91172),{...make(91171),status:'published'}]));assert.equal((await db.query<{n:number}>('select count(*) as n from public.questions')).rows[0].n,2);
  await assert.rejects(save([{...a,id:'cosmetic-duplicate'}]));await assert.rejects(save([{...a,prompt:a.prompt+' Changed.'}]));
  const id='00000000-0000-4000-8000-000000000001',sha='a'.repeat(64);
  const claim=()=>db.query<{result:{claimed:boolean}}>('select public.claim_professional_generation($1,null,$2,$3) as result',[id,sha,'{}']);assert.equal((await claim()).rows[0].result.claimed,true);assert.equal((await claim()).rows[0].result.claimed,false);
  await assert.rejects(db.query('select public.claim_professional_generation($1,null,$2,$3)',[id,'b'.repeat(64),'{}']));
  const q=make(81813);await assert.rejects(db.query('select public.commit_professional_generation($1,null,$2,$3,$4)',[id,sha,'{"success":true}',JSON.stringify({...q,status:'published'})]));
  await db.query('select public.commit_professional_generation($1,null,$2,$3,$4)',[id,sha,'{"success":false,"usage":[]}',JSON.stringify(q)]);
  await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from public.professional_generation_runs'));await assert.rejects(save([a]));await db.exec('reset role;');
  await db.exec(await readFile(new URL('../supabase/rollback/'+migration,import.meta.url),'utf8'));assert.equal((await db.query<{n:number}>('select count(*) as n from public.questions')).rows[0].n,3);assert.equal((await db.query<{n:number}>('select count(*) as n from bilsem_engine_v2_archive.professional_generation_runs')).rows[0].n,1);assert.equal((await db.query<{public:boolean}>("select public from storage.buckets where id='bilsem-question-visual-drafts-v2'")).rows[0].public,false);
 }finally{await db.close();}
});
