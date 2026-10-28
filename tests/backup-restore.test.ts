import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {backupManifest,verifyBackupManifest,backupExpiry} from '../scripts/backup-manifest.mjs';
import {encryptBackup,decryptBackup} from '../scripts/backup-crypto.mjs';
import {isolatedRestoreTarget} from '../scripts/restore-backup.mjs';

// Substitute only the command-line tools. Exercise the real backup/restore
// entrypoints without a network connection, database or production archive.
function databaseToolProbe(kind:'backup'|'restore'){
 const dir=mkdtempSync(join(tmpdir(),'bilsem-db-environment-'));
 try{
  const log=join(dir,'child-environment.jsonl'),key=randomBytes(32);
  const tool=kind==='backup'?'npx':'psql';
  writeFileSync(join(dir,tool),`#!/usr/bin/env node
const fs=require('node:fs');
fs.appendFileSync(process.env.BILSEM_DB_PROBE_LOG,JSON.stringify({
 pg:Object.fromEntries(Object.entries(process.env).filter(([name])=>/^PG/i.test(name))),
 hasBackupKey:!!process.env.BACKUP_ENCRYPTION_KEY,
 hasBackupUrl:!!process.env.SUPABASE_DB_URL,
 hasRestoreUrl:!!process.env.RESTORE_DATABASE_URL
})+'\\n');
const fileIndex=process.argv.indexOf('--file');
if(process.argv.includes('dump'))fs.writeFileSync(process.argv[fileIndex+1],
 'COPY auth.users(id) FROM stdin;\\n\\\\.\\nCOPY auth.identities(id) FROM stdin;\\n\\\\.\\n');
`,{mode:0o700});
  const archive=join(dir,'fixture.enc');
  const files={'roles.sql':'roles','schema.sql':'schema','auth-data.sql':'auth','data.sql':'data'};
  writeFileSync(archive,encryptBackup(Buffer.from(JSON.stringify(backupManifest(files))),key));
  const result=spawnSync(process.execPath,[resolve(`scripts/${kind==='backup'?'backup-database':'restore-backup'}.mjs`),...(kind==='restore'?[archive]:[])],{
   cwd:dir,encoding:'utf8',timeout:20_000,env:{...process.env,
    PATH:`${dir}:${process.env.PATH}`,BILSEM_DB_PROBE_LOG:log,
    BACKUP_ENCRYPTION_KEY:key.toString('base64'),
    SUPABASE_DB_URL:'postgresql://postgres:fixture@db.vtcsoqohkiagbwatlabk.supabase.co:5432/postgres',
    RESTORE_DATABASE_URL:'postgresql://fixture:local-only@127.0.0.1:54322/postgres',
    PGHOST:'external.invalid',PGHOSTADDR:'203.0.113.55',PGPORT:'6543',PGDATABASE:'wrong',
    PGUSER:'wrong',PGPASSWORD:'wrong',PGSERVICE:'redirect',PGSERVICEFILE:'/fixture/service',
    PGSYSCONFDIR:'/fixture',PGPASSFILE:'/fixture/passwords',PGOPTIONS:'-c search_path=wrong',
    PGSSLMODE:'disable',PGSSLROOTCERT:'/fixture/ca',PGSSLKEY:'/fixture/key',PGREQUIRESSL:'0'
   }
  });
  assert.equal(result.status,0,result.stderr);
  const records=readFileSync(log,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(records.length,kind==='backup'?4:2);
  for(const record of records){
   assert.deepEqual(record.pg,kind==='backup'?{}:{PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'fixture',PGPASSWORD:'local-only',PGDATABASE:'postgres',PGSSLMODE:'disable'});
   assert.equal(record.hasBackupKey,false,'Encryption key must stay in the parent process');
   assert.equal(record.hasBackupUrl,false);
   assert.equal(record.hasRestoreUrl,false);
  }
  if(kind==='backup')verifyBackupManifest(JSON.parse(decryptBackup(readFileSync(join(dir,'zekapark-database.enc')),key).toString()));
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('backup subprocesses cannot inherit libpq redirection or the archive encryption key',()=>databaseToolProbe('backup'));
test('restore preflight and execution keep the validated local target despite inherited libpq settings',()=>databaseToolProbe('restore'));

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

test('backup restoration enforces the configured lifetime including legacy archives and exact expiry',()=>{
 const created='2028-02-01T12:00:00.000Z',expires='2028-03-02T12:00:00.000Z';
 const files={'roles.sql':'roles','schema.sql':'schema','data.sql':'data','auth-data.sql':'auth'};
 const archive=backupManifest(files,created);
 assert.equal(backupExpiry(created),expires);
 verifyBackupManifest(archive,{now:Date.parse(expires)-1});
 assert.throws(()=>verifyBackupManifest(archive,{now:Date.parse(expires)}),/30 günlük/);
 const {expiresAt,...legacy}=archive;
 verifyBackupManifest(legacy,{now:Date.parse(expires)-1});
 assert.throws(()=>verifyBackupManifest(legacy,{now:Date.parse(expires)+1}),/30 günlük/);
 assert.throws(()=>verifyBackupManifest({...archive,expiresAt:'2030-01-01T00:00:00.000Z'},{now:Date.parse(created)}),/değiştirilemez/);
 assert.throws(()=>verifyBackupManifest(archive,{now:Date.parse(created)-6*60_000}),/gelecekte/);
 assert.throws(()=>verifyBackupManifest(archive,{now:NaN}));
 assert.throws(()=>backupExpiry('not-a-date'));
});
