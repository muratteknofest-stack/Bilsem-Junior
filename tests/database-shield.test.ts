import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { PGlite } from '@electric-sql/pglite';
import { createShieldDatabase, applyShield, databaseShieldSql, storageShieldSql } from './database-shield-fixture';

const parentA='11111111-1111-4111-8111-111111111111',childA='22222222-2222-4222-8222-222222222222';
const parentB='33333333-3333-4333-8333-333333333333',childB='44444444-4444-4444-8444-444444444444';
const admin='55555555-5555-4555-8555-555555555555',oneWay='66666666-6666-4666-8666-666666666666';
const unverified='77777777-7777-4777-8777-777777777777',orphan='88888888-8888-4888-8888-888888888888';
const session=(id:string)=>'a'+id.slice(1);
const reminder={enabled:true,reminderTime:'18:30',frequency:'daily_fixed',browserPushEnabled:false,soundAlert:true,weekendIncluded:true,
 customMessage:'Keşfe devam!',snoozeUntil:null,lastNotifiedDate:'2026-10-25',lastNotifiedHour:18};

async function seed(db:PGlite) {
 for(const [id,role] of [[parentA,'parent'],[childA,'student'],[parentB,'parent'],[childB,'student'],[admin,'admin'],[oneWay,'student'],[unverified,'student'],[orphan,'student']]) {
  await db.query(`insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_app_meta_data)
   values($1,$2,'fixture-password-hash',case when $3 then now() else null end,$4)`,[id,`fixture-${id[0]}@example.invalid`,id!==unverified,JSON.stringify(role==='admin'?{role:'admin'}:{})]);
  await db.query('insert into auth.sessions(id,user_id,not_after) values($1,$2,now()+interval \'1 day\')',[session(id),id]);
  if(id===orphan)continue;
  const linked= id===childA||id===oneWay?parentA:id===childB?parentB:null;
  const children=id===parentA?[childA]:id===parentB?[childB]:[];
  await db.query(`insert into public.profiles(id,email,name,role,grade,xp,linked_parent_id,linked_student_ids)
   values($1,$2,'Fixture Explorer',$3,$4,$5,$6,$7)`,[id,`fixture-${id[0]}@example.invalid`,role,role==='student'?1:null,id===childA?25:0,linked,children]);
 }
 for(const id of [childA,childB,oneWay])await db.query(`insert into public.user_private_state(user_id,values) values($1,'{"yapyap_mastery":"[]"}')`,[id]);
 for(const table of ['practice_sessions','test_attempts'])for(const id of [childA,childB,oneWay])
  await db.query(`insert into public.${table}(id,user_id,data) values($1,$2,'{}')`,[table+id,id]);
 await db.exec(`insert into public.questions(id,data) values('fixture-question','{"id":"fixture-question","status":"draft","revision":1}');`);
}
async function withRole<T>(db:PGlite,role:'authenticated'|'anon'|'service_role',uid:string|undefined,fn:()=>Promise<T>,extra:Record<string,unknown>={}) {
 await db.exec('reset role');
 await db.query(`select set_config('request.jwt.claims',$1,false)`,[JSON.stringify({role,...(uid?{sub:uid,session_id:session(uid),aal:'aal1'}:{}),...extra})]);
 await db.exec(`set role ${role}`);
 try{return await fn();}finally{await db.exec('reset role');await db.query(`select set_config('request.jwt.claims','{}',false)`);}
}
const denied=(operation:()=>Promise<unknown>)=>assert.rejects(operation,(error:unknown)=>
 typeof error==='object'&&error!==null&&'code' in error&&['42501','23514','23502','22023'].includes(String(error.code)));

test('production database shield enforces complete ACL/RLS, family isolation and existing business RPCs', {timeout:120_000},async t=>{
 const db=await createShieldDatabase();
 try{
  await seed(db);
  const before={users:(await db.query('select * from auth.users order by id')).rows,
   profiles:(await db.query('select * from public.profiles order by id')).rows,
   archive:(await db.query('select * from bilsem_legacy.subjects')).rows,
   objects:(await db.query('select * from storage.objects order by name')).rows};
  await applyShield(db,await databaseShieldSql());
  await applyShield(db,await databaseShieldSql());

  await t.test('reapplication preserves Auth identities, profiles, archives and stored objects',async()=>{
   assert.deepEqual((await db.query('select * from auth.users order by id')).rows,before.users);
   assert.deepEqual((await db.query('select * from public.profiles order by id')).rows,before.profiles);
   assert.deepEqual((await db.query('select * from bilsem_legacy.subjects')).rows,before.archive);
   assert.deepEqual((await db.query('select * from storage.objects order by name')).rows,before.objects);
  });
  await t.test('all 30 app/archive tables have RLS and no API role has TRUNCATE, REFERENCES, TRIGGER or MAINTAIN',async()=>{
   const tables=(await db.query<{schema:string;name:string;rls:boolean}>(`select n.nspname as schema,c.relname as name,c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','bilsem_legacy') and c.relkind='r'`)).rows;
   assert.equal(tables.length,30);assert.ok(tables.every(row=>row.rls));
   for(const row of tables)for(const role of ['anon','authenticated','service_role'])for(const privilege of ['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN'])
    assert.equal((await db.query<{allowed:boolean}>('select has_table_privilege($1,$2,$3) as allowed',[role,`${row.schema}.${row.name}`,privilege])).rows[0].allowed,false);
   for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query<{allowed:boolean}>(`select has_schema_privilege($1,'bilsem_legacy','USAGE') as allowed`,[role])).rows[0].allowed,false);
   assert.equal((await db.query<{allowed:boolean}>(`select has_column_privilege('authenticated','public.profiles','grade','UPDATE') as allowed`)).rows[0].allowed,false);
   assert.equal((await db.query<{allowed:boolean}>(`select has_column_privilege('authenticated','public.profiles','name','UPDATE') as allowed`)).rows[0].allowed,true);
  });
  await t.test('students see only their own profile and parents only reciprocally linked children',async()=>{
   await withRole(db,'authenticated',childA,async()=>{
    assert.deepEqual((await db.query('select id from public.profiles')).rows,[{id:childA}]);
    assert.equal((await db.query('select user_id from public.user_private_state')).rows.length,1);
    assert.equal((await db.query(`update public.profiles set name='Foreign edit' where id=$1 returning id`,[childB])).rows.length,0);
    await denied(()=>db.query('delete from public.profiles where id=$1',[childA]));
    await denied(()=>db.query(`insert into public.profiles(id,name,role,grade) values($1,'Injected','student',1)`,[orphan]));
   });
   await withRole(db,'authenticated',parentA,async()=>{
    assert.deepEqual((await db.query('select id from public.profiles order by id')).rows,[{id:parentA},{id:childA}]);
    for(const table of ['user_private_state','practice_sessions','test_attempts'])
     assert.deepEqual((await db.query(`select user_id from public.${table}`)).rows,[{user_id:childA}]);
    assert.equal((await db.query(`update public.profiles set name='Parent edit' where id=$1 returning id`,[childA])).rows.length,0);
   });
   await withRole(db,'anon',undefined,async()=>{await denied(()=>db.query('select * from public.profiles'));});
  });
  await t.test('old Android preference payloads work but timestamps come from the database',async()=>{
   await withRole(db,'authenticated',childA,async()=>{
    const start=Date.now();
    const result=await db.query<{updated_at:number;last_login_at:number;avatar:string}>(`update public.profiles set name='Junior Explorer',avatar='🦊',daily_goal_minutes=20,
     daily_goal_questions=15,daily_goal_sessions=3,sound_enabled=false,updated_at=9000000000000000,last_login_at=9000000000000000,
     featured_badge_ids=array['first_step'],reminder_config=$1 where id=$2 returning updated_at,last_login_at,avatar`,[JSON.stringify(reminder),childA]);
    assert.equal(result.rows[0].avatar,'🦊');
    for(const value of [result.rows[0].updated_at,result.rows[0].last_login_at])assert.ok(value>=start&&value<=Date.now());
    for(const column of ['role','xp','grade','linked_parent_id','email','consent'])
     assert.equal((await db.query<{allowed:boolean}>('select has_column_privilege(current_user,\'public.profiles\',$1,\'UPDATE\') as allowed',[column])).rows[0].allowed,false);
   });
  });
  await t.test('invalid settings and nested reminder mass assignment are rejected by database constraints',async()=>{
   await withRole(db,'authenticated',childA,async()=>{
    for(const [column,value] of [['name','x'],['name','\u00a0\u00a0'],['avatar','\u00a0'],['name','🦊'.repeat(26)],['avatar','x'.repeat(33)],['daily_goal_minutes',4],
     ['daily_goal_minutes',181],['daily_goal_questions',2.5],['daily_goal_sessions',0]] as const)
     await denied(()=>db.query(`update public.profiles set ${column}=$1 where id=$2`,[value,childA]));
    for(const value of [{...reminder,role:'admin'},{...reminder,enabled:'true'},{...reminder,reminderTime:'24:30'},
     {...reminder,lastNotifiedDate:'2026-02-30'},{...reminder,lastNotifiedHour:24},{...reminder,snoozeUntil:-1},
     {...reminder,customMessage:'🦊'.repeat(61)},[],'invalid'])
     await denied(()=>db.query('update public.profiles set reminder_config=$1 where id=$2',[JSON.stringify(value),childA]));
    await denied(()=>db.query(`update public.profiles set featured_badge_ids=array['first_step','first_step'] where id=$1`,[childA]));
   });
  });
  await t.test('trigger blocks grade changes even if a future column grant is accidentally loosened',async()=>{
   await db.exec('grant update(grade) on public.profiles to authenticated');
   try{await withRole(db,'authenticated',childA,()=>denied(()=>db.query('update public.profiles set grade=4 where id=$1',[childA])));}
   finally{await db.exec('revoke update(grade) on public.profiles from authenticated');}
  });
  await t.test('dedicated service grade RPC expires the old session while keeping earned XP',async()=>{
   await db.query(`insert into public.learning_sessions(student_id,mode,title,questions,created_at,expires_at,selection)
    values($1,'practice','Grade fixture','[{"targetGrade":1}]',now()-interval '1 minute',now()+interval '10 minutes','{"grade":1}')`,[childA]);
   await withRole(db,'service_role',undefined,async()=>{
    const result=await db.query<{profile:{grade:number;xp:number}}>('select public.change_student_grade($1,4) as profile',[childA]);
    assert.equal(result.rows[0].profile.grade,4);assert.equal(result.rows[0].profile.xp,25);
    await denied(()=>db.query('select public.change_student_grade($1,5)',[childA]));
   });
   assert.equal((await db.query<{active:boolean}>('select expires_at>clock_timestamp() as active from public.learning_sessions where student_id=$1',[childA])).rows[0].active,false);
  });
  await t.test('narrow progress RPC still merges allowed client state without exposing protected progress writes',async()=>{
   await withRole(db,'authenticated',childA,async()=>{
    const saved=await db.query<{value:Record<string,string>}>(`select public.patch_user_progress('{"zekapark_study_favorites_v1":"[]"}') as value`);
    assert.equal(saved.rows[0].value.yapyap_mastery,'[]');assert.equal(saved.rows[0].value.zekapark_study_favorites_v1,'[]');
    await denied(()=>db.query(`select public.patch_user_progress('{"yapyap_mastery":"forged"}')`));
    await denied(()=>db.query(`update public.user_private_state set values='{}' where user_id=$1`,[childA]));
   });
  });
  await t.test('ordinary users and stale administrator claims cannot read answers or invoke server RPCs',async()=>{
   await withRole(db,'authenticated',childA,async()=>{
    assert.equal((await db.query('select id from public.questions')).rows.length,0);
    for(const signature of ['public.change_student_grade(uuid,integer)','public.consume_api_limit(text,text,integer,integer)',
     'public.claim_learning_reward(uuid,text,integer,jsonb,integer,double precision)','public.revoke_user_sessions(uuid)'])
     assert.equal((await db.query<{allowed:boolean}>('select has_function_privilege(current_user,$1,\'EXECUTE\') as allowed',[signature])).rows[0].allowed,false);
    for(const table of ['learning_sessions','learning_reward_claims','api_rate_windows','platform_settings','google_play_subscriptions','google_play_purchase_bindings','support_requests'])
     await denied(()=>db.query(`select * from public.${table}`));
   },{aal:'aal2',app_metadata:{role:'admin'},user_metadata:{role:'admin'}});
   await withRole(db,'authenticated',admin,async()=>assert.equal((await db.query('select id from public.questions')).rows.length,0),{app_metadata:{role:'admin'}});
   await withRole(db,'authenticated',admin,async()=>{
    assert.ok((await db.query('select id from public.questions')).rows.length>0);
    await denied(()=>db.query(`insert into public.questions(id,data) values('forged-publication','{"id":"forged-publication","status":"published"}')`));
    await db.query(`select public.save_question('{"id":"admin-draft","status":"review","revision":1}',0)`);
   },{aal:'aal2',app_metadata:{role:'admin'}});
   await db.query(`update auth.users set raw_app_meta_data='{}' where id=$1`,[admin]);
   await withRole(db,'authenticated',admin,async()=>assert.equal((await db.query('select id from public.questions')).rows.length,0),{aal:'aal2',app_metadata:{role:'admin'}});
   await db.query(`update auth.users set raw_app_meta_data='{"role":"admin"}' where id=$1`,[admin]);
  });
  await t.test('service quota, editorial, billing, daily challenge and generation RPCs retain required permissions',async()=>{
   await withRole(db,'service_role',undefined,async()=>{
    assert.equal((await db.query<{allowed:boolean}>('select public.consume_api_limit($1,\'shield-fixture\',1,60) as allowed',['a'.repeat(64)])).rows[0].allowed,true);
    assert.equal((await db.query<{allowed:boolean}>('select public.consume_api_limit($1,\'shield-fixture\',1,60) as allowed',['a'.repeat(64)])).rows[0].allowed,false);
    await denied(()=>db.query(`delete from public.api_rate_windows`));
    await db.query(`select public.save_question('{"id":"service-publication","status":"published","revision":1,"reviewedBy":"fixture"}',0)`);
    await db.query(`insert into public.security_events(type,actor_id,created_at) values('fixture',$1,1)`,[parentA]);
    assert.equal((await db.query<{ready:boolean}>('select public.prepare_google_play_binding($1,$2,$3,$4) as ready',
     [parentB,childB,'a'.repeat(64),'b'.repeat(64)])).rows[0].ready,true);
    const billing=await db.query<{hash:string}>(`select public.record_google_play_subscription($1,$2,$3,$4,
     'com.quantumtech.bilsemjunior','fixture_product','monthly','SUBSCRIPTION_STATE_ACTIVE',now()+interval '1 month',
     true,'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',null,now(),true) as hash`,['c'.repeat(64),parentB,childB,'v1.'+'x'.repeat(90)]);
    assert.equal(billing.rows[0].hash,'c'.repeat(64));
    const issued=await db.query<{attempt:{id:string}}>('select public.issue_daily_challenge($1,1,$2) as attempt',
     [childB,JSON.stringify({id:'fixture-daily',correctOptionId:'A',options:[{id:'A'},{id:'B'}]})]);
    const answered=await db.query<{attempt:{correct:boolean}}> (`select public.answer_daily_challenge($1,$2,'A') as attempt`,[childB,issued.rows[0].attempt.id]);
    assert.equal(answered.rows[0].attempt.correct,true);
    await db.query(`select public.submit_support_request($1,'question',$2,'{"fixture":true}')`,[parentA,'d'.repeat(64)]);
    const generation='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await db.query(`select public.claim_professional_generation($1,$2,$3,'{}')`,[generation,admin,'e'.repeat(64)]);
    await db.query(`select public.commit_professional_generation($1,$2,$3,'{"success":false}',null)`,[generation,admin,'e'.repeat(64)]);
   });
  });
  await t.test('unverified, profileless, expired, revoked and deletion-pending sessions see no rows',async()=>{
   for(const id of [unverified,orphan])await withRole(db,'authenticated',id,async()=>assert.equal((await db.query('select id from public.profiles')).rows.length,0));
   for(const claims of [{session_id:'invalid'},{session_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'}])
    await withRole(db,'authenticated',childB,async()=>assert.equal((await db.query('select id from public.profiles')).rows.length,0),claims);
   await db.query('update auth.sessions set not_after=now()-interval \'1 minute\' where id=$1',[session(childB)]);
   await withRole(db,'authenticated',childB,async()=>assert.equal((await db.query('select id from public.profiles')).rows.length,0));
   await db.query('delete from auth.sessions where id=$1',[session(oneWay)]);
   await withRole(db,'authenticated',oneWay,async()=>assert.equal((await db.query('select id from public.profiles')).rows.length,0));
   await withRole(db,'service_role',undefined,()=>db.query('update public.profiles set deletion_pending=true where id=$1',[childA]));
   await withRole(db,'authenticated',childA,async()=>assert.equal((await db.query('select id from public.profiles')).rows.length,0));
   await withRole(db,'authenticated',parentA,async()=>assert.deepEqual((await db.query('select id from public.profiles')).rows,[{id:parentA}]));
  });
  await t.test('private Storage restrictions override broad future allows while preserving unrelated buckets and all files',async()=>{
   const objects=(await db.query('select * from storage.objects order by name')).rows;
   await assert.rejects(applyShield(db,await storageShieldSql()),/Make exam-images private through Dashboard/);
   // Local-only stand-in for the separately authorized Dashboard / Storage API setting.
   await db.exec("update storage.buckets set public=false where id='exam-images'");
   await applyShield(db,await storageShieldSql());await applyShield(db,await storageShieldSql());
   assert.equal((await db.query<{public:boolean}>(`select public from storage.buckets where id='exam-images'`)).rows[0].public,false);
   assert.deepEqual((await db.query('select * from storage.objects order by name')).rows,objects);
   await db.exec(`insert into storage.buckets(id,name,public) values('unrelated-fixture','unrelated-fixture',false);
    insert into storage.objects(bucket_id,name) values('unrelated-fixture','allowed-fixture');
    create policy future_broad_allow on storage.objects for all to anon,authenticated using(true) with check(true);`);
   for(const role of ['anon','authenticated'] as const)await withRole(db,role,role==='authenticated'?parentA:undefined,async()=>{
    assert.deepEqual((await db.query('select bucket_id from storage.objects')).rows,[{bucket_id:'unrelated-fixture'}]);
    await denied(()=>db.query(`insert into storage.objects(bucket_id,name) values('exam-images','forged-upload')`));
    await denied(()=>db.query(`insert into storage.objects(bucket_id,name) values('bilsem-question-visual-drafts-v2','forged-upload')`));
    assert.equal((await db.query(`delete from storage.objects where bucket_id='exam-images' returning id`)).rows.length,0);
   });
   await withRole(db,'service_role',undefined,async()=>assert.equal((await db.query('select id from storage.objects')).rows.length,3));
   const verified=await db.exec(await readFile(new URL('../supabase/security/verify-shield.sql',import.meta.url),'utf8'));
   assert.ok(verified.some(result=>(result.rows[0] as {database_shield?:{status:string}}|undefined)?.database_shield?.status==='verified'));
  });
  await t.test('future tables and functions inherit no implicit client or service privileges',async()=>{
   await db.exec(`create table public.future_shield_fixture(id integer); create function public.future_shield_fixture_fn() returns integer language sql as $$select 1$$;`);
   for(const role of ['anon','authenticated','service_role']){
    assert.equal((await db.query<{allowed:boolean}>(`select has_table_privilege($1,'public.future_shield_fixture','SELECT') as allowed`,[role])).rows[0].allowed,false);
    assert.equal((await db.query<{allowed:boolean}>(`select has_function_privilege($1,'public.future_shield_fixture_fn()','EXECUTE') as allowed`,[role])).rows[0].allowed,false);
   }
   await assert.rejects(applyShield(db,await databaseShieldSql()),/Expected aligned Bilsem schema/);
  });
 }finally{await db.close();}
});

test('invalid existing profiles abort the whole shield without rewriting data or partially changing grants',{timeout:120_000},async()=>{
 const db=await createShieldDatabase();try{
  await seed(db);await db.query('update public.profiles set daily_goal_minutes=0 where id=$1',[childA]);
  await assert.rejects(applyShield(db,await databaseShieldSql()),(error:unknown)=>{
   const e=error as {message?:string;detail?:string};return /Existing profile data needs review/.test(e.message||'')&&!!e.detail?.includes('"goals": 1');
  });
  assert.equal((await db.query<{daily_goal_minutes:number}>('select daily_goal_minutes from public.profiles where id=$1',[childA])).rows[0].daily_goal_minutes,0);
  assert.equal((await db.query<{f:string|null}>(`select to_regprocedure('zekapark_private.valid_reminder(jsonb)')::text as f`)).rows[0].f,null);
  assert.equal((await db.query<{allowed:boolean}>(`select has_table_privilege('anon','public.profiles','TRUNCATE') as allowed`)).rows[0].allowed,true);
 }finally{await db.close();}
});

test('Storage retirement refuses active references and retains every object and the current bucket flag',{timeout:120_000},async()=>{
 const db=await createShieldDatabase();try{
  await seed(db);await applyShield(db,await databaseShieldSql());
  await db.query(`insert into public.questions(id,data) values('live-reference','{"id":"live-reference","status":"draft","image":"exam-images/fixture.png"}')`);
  await assert.rejects(applyShield(db,await storageShieldSql()),/Active legacy file references/);
  assert.equal((await db.query<{public:boolean}>(`select public from storage.buckets where id='exam-images'`)).rows[0].public,true);
  assert.equal((await db.query<{n:number}>('select count(*)::integer as n from storage.objects')).rows[0].n,2);
 }finally{await db.close();}
});
