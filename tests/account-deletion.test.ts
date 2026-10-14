import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {completeDeletion,deletionMembers,deletionConfirmation} from '../server/account-deletion';
const parent='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444',ticket='55555555-5555-4555-8555-555555555555',session='66666666-6666-4666-8666-666666666666';

test('deletion scope requires reciprocal links and explicit owner/scope/retention confirmation',()=>{
 const owner={id:parent,role:'parent',linked_parent_id:null,linked_student_ids:[child]},student={id:child,role:'student',linked_parent_id:parent,linked_student_ids:[]};
 assert.deepEqual(deletionMembers(owner,[student]),[parent,child]);
 assert.throws(()=>deletionMembers(owner,[{...student,linked_parent_id:other}]));
 assert.throws(()=>deletionMembers({...owner,role:'admin'},[student]));
 assert.throws(()=>deletionMembers(student,[]));
 assert.equal(deletionConfirmation.safeParse({confirmed:true,members:[parent,child]}).success,false);
 assert.equal(deletionConfirmation.safeParse({confirmed:true,retentionReviewed:true,members:[parent,parent]}).success,false);
});
test('interrupted Auth deletion never closes the request and safely retries the pinned family',async()=>{
 let removed=new Set<string>(),finished=0,fail=true;
 const ops={async prepare(){return {request_id:ticket,member_ids:[parent,child],member_count:2,status:'prepared' as const};},async removeUser(id:string){if(id===child&&fail)throw Error('provider unavailable');removed.add(id);},async finish(){finished++;return {request_id:ticket,member_ids:[],member_count:2,status:'completed' as const};}};
 await assert.rejects(()=>completeDeletion(ops));assert.equal(finished,0);assert.deepEqual([...removed],[parent]);
 fail=false;assert.deepEqual(await completeDeletion(ops),{completed:true,deletedAccounts:2});assert.equal(finished,1);
 assert.deepEqual(await completeDeletion({...ops,async prepare(){return {request_id:ticket,member_ids:[],member_count:2,status:'completed' as const};},async removeUser(){throw Error('Must not delete again');}}),{completed:true,deletedAccounts:2});
});

test('Postgres freezes sessions, prevents cross-family erasure and verifies complete data cleanup', {timeout:60_000},async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create publication supabase_realtime;create schema auth;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
 grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;`);
 for(const file of ['schema.sql','migrations/20261008165142_commercial_support_requests.sql','migrations/20261010085952_server_verified_learning.sql','migrations/20261010090133_protect_verified_progress.sql','migrations/20261010122109_private_security_helpers.sql','migrations/20261013150111_shopier_verified_access.sql','migrations/20261013225228_resumable_account_deletion.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id) values('${parent}'),('${child}'),('${admin}'),('${other}');
 insert into public.profiles(id,name,role,linked_student_ids,linked_parent_id) values('${parent}','Fixture parent','parent',array['${child}'],null),('${child}','Fixture child','student','{}','${parent}'),('${admin}','Fixture admin','admin','{}',null),('${other}','Unrelated','parent','{}',null);
 insert into auth.sessions values('${session}','${parent}',null);
 insert into public.user_private_state(user_id,values) values('${child}','{"fixture":"private progress"}');
 insert into public.practice_sessions(id,user_id,data) values('private-practice','${child}','{}');
 insert into public.support_requests(id,actor_id,kind,request_key,payload) values('${ticket}','${parent}','deletion',repeat('a',64),'{"scope":"family","confirmedAt":"2026-10-14T00:00:00Z"}'),('77777777-7777-4777-8777-777777777777','${child}','question',repeat('b',64),'{"fixture":"private report"}');
 insert into public.security_events(type,actor_id,student_id,detail,created_at) values('fixture','${parent}','${child}','{}',1);
 set request.jwt.claims='{"role":"service_role"}';`);
 const prepare=`select public.prepare_account_deletion('${ticket}','${admin}',array['${parent}','${child}']::uuid[])`,finish=`select public.finish_account_deletion('${ticket}','${admin}')`;
 await assert.rejects(()=>db.exec(`set role authenticated;${prepare}`));await db.exec('reset role');
 await assert.rejects(()=>db.exec(`select public.prepare_account_deletion('${ticket}','${admin}',array['${parent}','${other}']::uuid[])`));
 await assert.rejects(()=>db.exec(`select public.prepare_account_deletion('${ticket}','${parent}',array['${parent}','${child}']::uuid[])`));
 await db.exec(`create schema storage;create table storage.objects(owner_id text,owner uuid);insert into storage.objects values(null,'${child}');`);
 await assert.rejects(()=>db.exec(prepare));assert.equal((await db.query<{deletion_pending:boolean}>(`select deletion_pending from public.profiles where id='${parent}'`)).rows[0].deletion_pending,false);
 await db.exec('delete from storage.objects');
 await db.exec(`insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256) values('fixture-order','${parent}','${child}','fixture-product','monthly',30,29900,repeat('a',64));`);
 await assert.rejects(()=>db.exec(prepare));await db.exec("delete from public.shopier_access_orders where order_id='fixture-order'");
 await db.exec(prepare);assert.equal((await db.query<{n:number}>('select count(*)::integer n from auth.sessions')).rows[0].n,0);
 await db.exec(`insert into auth.sessions values('${session}','${parent}',null)`);
 assert.equal((await db.query<{ok:boolean}>(`select public.is_user_session_active('${parent}','${session}') ok`)).rows[0].ok,false);
 await db.exec(`set request.jwt.claims='{"role":"authenticated","sub":"${parent}","session_id":"${session}"}';set role authenticated;`);
 assert.equal((await db.query('select * from public.profiles')).rows.length,0);
 await assert.rejects(()=>db.exec(`select public.finish_account_deletion('${ticket}','${admin}')`));
 await db.exec(`reset role;set request.jwt.claims='{"role":"service_role"}';`);
 await assert.rejects(()=>db.exec(finish));
 await db.exec(`delete from auth.users where id='${child}'`);await assert.rejects(()=>db.exec(finish));
 await db.exec(prepare); // Stored scope survives one missing Auth/profile record.
 await db.exec(`delete from auth.users where id='${parent}'`);await db.exec(finish);await db.exec(finish);
 assert.equal((await db.query('select * from public.user_private_state')).rows.length,0);assert.equal((await db.query('select * from public.practice_sessions')).rows.length,0);assert.equal((await db.query('select * from public.security_events')).rows.length,0);
 const receipt=(await db.query<{actor_id:null;status:string;payload:{deletedAccounts:number}}>(`select actor_id,status,payload from public.support_requests where id='${ticket}'`)).rows[0];assert.equal(receipt.actor_id,null);assert.equal(receipt.status,'resolved');assert.equal(receipt.payload.deletedAccounts,2);
 const job=(await db.query<{member_ids:string[];related_request_ids:string[]}>(`select member_ids,related_request_ids from public.account_deletion_jobs where request_id='${ticket}'`)).rows[0];assert.deepEqual(job.member_ids,[]);assert.deepEqual(job.related_request_ids,[]);
 assert.equal((await db.query(`select * from public.profiles where id='${other}'`)).rows.length,1);
 assert.equal((await db.query('select * from public.support_requests')).rows.length,1);
 }finally{await db.close();}
});
