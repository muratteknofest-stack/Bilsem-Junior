import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {backupManifest,verifyBackupManifest} from '../scripts/backup-manifest.mjs';
import {encryptBackup,decryptBackup} from '../scripts/backup-crypto.mjs';
import {isolatedRestoreTarget} from '../scripts/restore-backup.mjs';

test('restore target refuses production, external hosts and ambiguous targets',()=>{
 assert.equal(isolatedRestoreTarget('postgresql://fixture:example@127.0.0.1:54322/postgres').PGHOST,'127.0.0.1');
 for(const value of ['postgresql://fixture:example@db.vtcsoqohkiagbwatlabk.supabase.co/postgres','postgresql://fixture:example@example.com/postgres','postgresql://fixture:example@localhost/postgres?host=example.com','postgresql://fixture@localhost/postgres'])assert.throws(()=>isolatedRestoreTarget(value));
});

test('encrypted archive restores Auth, reciprocal family, private progress and question rows into isolated Postgres',async()=>{
 const files={'roles.sql':"create role authenticated;",'schema.sql':"create schema auth;create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key references auth.users on delete cascade,role text,linked_parent_id uuid,linked_student_ids uuid[]);create table public.progress(user_id uuid references public.profiles,data jsonb);create table public.questions(id text primary key,data jsonb);alter table public.progress enable row level security;revoke all on public.progress from authenticated;",'auth-data.sql':"insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');",'data.sql':"insert into public.profiles values('11111111-1111-4111-8111-111111111111','parent',null,array['22222222-2222-4222-8222-222222222222']::uuid[]),('22222222-2222-4222-8222-222222222222','student','11111111-1111-4111-8111-111111111111','{}');insert into public.progress values('22222222-2222-4222-8222-222222222222','{\"answers\":2}');insert into public.questions values('fixture-q','{\"grade\":1}');"};
 const key=randomBytes(32),encrypted=encryptBackup(Buffer.from(JSON.stringify(backupManifest(files))),key),restored=JSON.parse(decryptBackup(encrypted,key).toString());verifyBackupManifest(restored);
 const db=new PGlite();try{
 for(const file of ['roles.sql','schema.sql','auth-data.sql','data.sql'])await db.exec(restored.files[file]);
 assert.equal((await db.query('select * from auth.users')).rows.length,2);assert.equal((await db.query('select * from public.profiles')).rows.length,2);
 assert.equal((await db.query('select * from public.profiles p join public.profiles c on c.linked_parent_id=p.id and c.id=any(p.linked_student_ids)')).rows.length,1);
 assert.deepEqual((await db.query<{data:object}>('select data from public.progress')).rows[0].data,{answers:2});assert.equal((await db.query('select * from public.questions')).rows.length,1);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from public.progress'));
 }finally{await db.close();}
});
test('restore rejects missing Auth, altered manifests, wrong keys and corrupt archives',()=>{
 const files={'roles.sql':'roles','schema.sql':'schema','data.sql':'data','auth-data.sql':'auth'},manifest=backupManifest(files),key=randomBytes(32),archive=encryptBackup(Buffer.from(JSON.stringify(manifest)),key);
 assert.throws(()=>verifyBackupManifest({...manifest,authIncluded:false}));assert.throws(()=>verifyBackupManifest({...manifest,files:{...manifest.files,'auth-data.sql':''}}));assert.throws(()=>verifyBackupManifest({...manifest,files:{...manifest.files,'data.sql':'tampered'}}));assert.throws(()=>decryptBackup(archive,randomBytes(32)));
 const damaged=Buffer.from(archive);damaged[damaged.length-1]^=1;assert.throws(()=>decryptBackup(damaged,key));assert.throws(()=>verifyBackupManifest({format:'zekapark-db-v1',files}));
});
