import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import express from 'express';
import {PGlite} from '@electric-sql/pglite';
import {LESSON_CATALOG} from '../src/features/lessons/catalog';
import {lessonDocument} from '../server/lesson-content';
import lessonRoutes from '../server/routes/lesson-routes';
import {audioType,audioMetadataSchema} from '../server/lesson-audio';
import {LessonScene} from '../src/components/lessons/LessonScene';
import {requestSecurity} from '../server/request-security';

test('18 original lessons have four teaching scenes, distinct checks and honest recording status',()=>{
 assert.equal(LESSON_CATALOG.length,18);assert.equal(new Set(LESSON_CATALOG.map(c=>c.id)).size,18);assert.equal(LESSON_CATALOG.filter(c=>c.preview).length,1);
 const scenes=new Set<string>();
 for(const card of LESSON_CATALOG){const lesson=lessonDocument(card.id)!;assert.ok(lesson);assert.equal(lesson.steps.length,4);assert.equal(new Set(lesson.options).size,lesson.options.length);assert.ok(lesson.options[lesson.correctIndex]);assert.ok(lesson.explanation.length>30);assert.deepEqual(lesson.audio,[null,null,null,null]);
  for(const [n,step] of lesson.steps.entries()){assert.ok(step.narration.length>85);const html=renderToStaticMarkup(<LessonScene id={card.id} step={n} playing={false} title={step.title}/>);assert.match(html,/figure/);assert.ok(!html.includes('undefined'));if(n===2)scenes.add(html.replace(/id="[^"]*"/g,''));}
 }
 assert.equal(scenes.size,18);assert.equal(lessonDocument('constructor'),null);
});
test('audio uploads require bounded recognized formats and an explicit human/rights record',()=>{
 assert.equal(audioType(Buffer.from('<html>not audio</html>')),null);assert.equal(audioType(Buffer.alloc(4*1024*1024)),null);
 const wav=Buffer.alloc(100);wav.write('RIFF');wav.write('WAVE',8);assert.equal(audioType(wav)?.mime,'audio/wav');
 assert.equal(audioMetadataSchema.safeParse({narrator:'Anlatıcı',rightsReference:'2026-10-27 LICENSE-001',humanRecording:false}).success,false);
 assert.equal(audioMetadataSchema.safeParse({narrator:'Anlatıcı',rightsReference:'',humanRecording:true}).success,false);
});
test('narration database and Storage remain server-only even if another bucket has a broad policy',async()=>{
 const db=new PGlite();try{
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select,insert on storage.objects to anon,authenticated,service_role;create policy existing_permissive on storage.objects for all to authenticated using(true) with check(true);");
  await db.exec(await fs.readFile('supabase/migrations/20261027063559_lesson_audio.sql','utf8'));
  await db.exec("insert into storage.objects values('bilsem-lesson-audio','private.mp3'),('unrelated','public.mp3')");
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from public.lesson_audio'),/permission denied/);assert.equal((await db.query("select * from storage.objects where bucket_id='bilsem-lesson-audio'")).rows.length,0);await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal((await db.query("select * from storage.objects where bucket_id='bilsem-lesson-audio'")).rows.length,1);await db.exec('reset role');
  assert.equal((await db.query<{public:boolean}>('select public from storage.buckets')).rows[0].public,false);
 }finally{await db.close();}
});
test('lesson HTTP enforces identity, verified role, paid access and MFA before uploads',async()=>{
 const original=globalThis.fetch,env={...process.env};Object.assign(process.env,{SUPABASE_URL:'https://lessons-fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture',VERCEL:'',VERCEL_ENV:'',GOOGLE_PLAY_PAID_ACCESS_FROM:'2026-10-27T00:00:00Z',GOOGLE_PLAY_ENFORCE_PAID_ACCESS:'false',GOOGLE_PLAY_LICENSE_TEST_ENABLED:'false'});
 const student='11111111-1111-4111-8111-111111111111';let role='student',verified=true,created='2026-10-27T03:00:00Z',reads=0,uploads=0,saved:any=null;
 globalThis.fetch=async(input,init)=>{const r=new Request(input,init),u=new URL(r.url);assert.equal(u.origin,'https://lessons-fixture.invalid');let value:unknown;
  if(u.pathname==='/auth/v1/user')value={id:student,email:'fixture@example.invalid',email_confirmed_at:verified?'2026-10-27T00:00:00Z':null,app_metadata:{role}};
  else if(u.pathname==='/auth/v1/admin/users/'+student)value={id:student,created_at:created};
  else if(u.pathname==='/rest/v1/rpc/is_user_session_active'||u.pathname==='/rest/v1/rpc/consume_api_limit')value=true;
  else if(u.pathname==='/rest/v1/profiles')value={id:student,role,linked_parent_id:null};
  else if(u.pathname==='/rest/v1/lesson_audio'){reads++;if(r.method==='POST'){saved=await r.json();return new Response(null,{status:201});}value=u.searchParams.get('step')?saved:null;if(!u.searchParams.get('step'))value=saved?[{step:saved.step,narrator:saved.narrator}]:[];}
  else if(u.pathname.startsWith('/storage/v1/object/bilsem-lesson-audio/')){uploads++;value={Key:u.pathname};}
  else if(u.pathname.startsWith('/storage/v1/object/authenticated/bilsem-lesson-audio/'))return new Response('fixture-audio',{headers:{'Content-Type':'audio/mpeg'}});
  else throw Error('Unexpected endpoint '+u.pathname);
  return Response.json(value);
 };
 const app=express();app.use('/api',requestSecurity(''));app.use(express.json());app.use('/api',lessonRoutes);app.use((error:any,_req:any,res:any,_next:any)=>res.status(503).json({error:'Fixture error'}));const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
 const token=(aal='aal1')=>['fixture',Buffer.from(JSON.stringify({session_id:'99999999-9999-4999-8999-999999999999',aal})).toString('base64url'),'fixture'].join('.');
 const get=(path:string,aal:string|null='aal1')=>original(origin+'/api/'+path,{headers:aal?{Authorization:`Bearer ${token(aal)}`}:{}});
 const bytes=Buffer.alloc(100);bytes.write('RIFF');bytes.write('WAVE',8);
 const put=(aal:string,metadata:unknown)=>original(origin+'/api/admin/lesson-audio/visual_sequence/0',{method:'PUT',headers:{Authorization:`Bearer ${token(aal)}`,'Content-Type':'application/octet-stream','X-Lesson-Metadata':encodeURIComponent(JSON.stringify(metadata))},body:bytes});
 try{
  assert.equal((await get('student/lessons/visual_sequence',null)).status,401);assert.equal(reads,0);
  verified=false;assert.equal((await get('student/lessons/visual_sequence')).status,403);verified=true;
  role='parent';assert.equal((await get('student/lessons/visual_sequence')).status,403);role='student';
  assert.equal((await get('student/lessons/unknown')).status,404);
  const free=await get('student/lessons/visual_sequence');assert.equal(free.status,200);assert.equal((await free.json()).audio[0],null);
  assert.equal((await get('student/lessons/dice_unfold')).status,403);assert.equal((await get('student/lessons/dice_unfold/audio/0')).status,403);
  assert.deepEqual(await(await get('student/lessons/access')).json(),{fullAccess:false});
  created='2026-10-01T00:00:00Z';assert.equal((await get('student/lessons/dice_unfold')).status,200);
  assert.equal((await get('admin/lesson-audio','aal2')).status,403);role='admin';
  const metadata={narrator:'Fixture narrator',rightsReference:'Automated fixture only - no real license',humanRecording:true};
  assert.equal((await put('aal1',metadata)).status,403);assert.equal(uploads,0);
  assert.equal((await put('aal2',{...metadata,humanRecording:false})).status,400);assert.equal(uploads,0);
  assert.equal((await put('aal2',metadata)).status,201);assert.equal(uploads,1);assert.equal(saved.uploaded_by,student);assert.ok(!saved.object_path.includes('..'));
  role='student';const voiced=await(await get('student/lessons/visual_sequence')).json();assert.equal(voiced.audio[0].source,'human-recording');assert.ok(!JSON.stringify(voiced).includes('rights_reference'));assert.equal((await get('student/lessons/visual_sequence/audio/0')).status,200);
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
