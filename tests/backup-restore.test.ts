import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {parse} from 'yaml';
import {backupManifest,verifyBackupManifest,backupExpiry} from '../scripts/backup-manifest.mjs';
import {encryptBackup,decryptBackup} from '../scripts/backup-crypto.mjs';
import {isolatedRestoreTarget,localRestoreRoles} from '../scripts/restore-backup.mjs';
import {temporaryBackupAccess,backupConnectionEnvironment} from '../scripts/backup-access.mjs';
import {backupConfiguration} from '../scripts/backup-config.mjs';
import {BACKUP_CA_PATH,verifyBackupCaBundle} from '../scripts/backup-tls.mjs';
import {diagnosticTail,runtimeFailureCategory,runtimeFailureDetails,startRuntimeWithRetry} from '../scripts/backup-runtime-diagnostics.mjs';

test('runtime checks need no production or registry identity and production stays on main',()=>{
 for(const file of ['backup-runtime.yml','backup.yml']){
  const workflow=parse(readFileSync(resolve('.github/workflows',file),'utf8'));
  assert.deepEqual(workflow.permissions,{contents:'read'});
  const job=Object.values(workflow.jobs)[0] as {if?:string;environment?:string;steps:Array<{run?:string}>};
  assert.doesNotMatch(JSON.stringify(workflow),/docker login|GHCR_JOB_TOKEN|packages:|DOCKER_CONFIG/);
  if(file==='backup-runtime.yml')assert.doesNotMatch(JSON.stringify(workflow),/secrets\s*[.[]/);
  else {
   assert.equal(job.if,"github.ref == 'refs/heads/main'");assert.equal(job.environment,'production-backup');
   assert.deepEqual(workflow.on.push,{branches:['main'],paths:['scripts/*backup*','.github/workflows/backup.yml']});
   assert.ok(!('pull_request' in workflow.on),'PR code cannot trigger the production backup');
  }
 }
});

test('runtime diagnostics retain the final failure after long image progress without exposing private content',()=>{
 const tail=diagnosticTail('progress\n'.repeat(20000),Buffer.from('supabase_auth_fixture is not ready: private-record-do-not-log'));
 assert.equal(tail.length,65536);
 assert.equal(runtimeFailureCategory(tail),'AUTH_UNHEALTHY');
 assert.equal(runtimeFailureCategory('failed to pull private-image private-password'),'IMAGE_PULL');
 assert.equal(runtimeFailureCategory('private-host private-password'),'COMMAND_FAILED');
 assert.equal(runtimeFailureDetails('failed to pull https://public.ecr.aws/private?secret=private-password: 429 Too Many Requests'),'REGISTRY_ECR RATE_LIMIT HTTP_429');
 assert.equal(runtimeFailureDetails('private-host private-password'),'');
 assert.equal(runtimeFailureDetails('failed to pull registry-1.docker.io/private: unexpected EOF'),'REGISTRY_DOCKER EOF');
});

test('isolated startup retries only transient image transport failures, with cleanup and a fixed attempt limit',async()=>{
 const failure=(code:string)=>Object.assign(new Error('fixture'),{code});
 const events:string[]=[];let attempts=0;
 await startRuntimeWithRetry(async()=>{events.push('start');if(++attempts<3)throw failure('IMAGE_PULL');},async()=>{events.push('clean');},async ms=>{events.push(`wait:${ms}`);});
 assert.deepEqual(events,['start','clean','wait:2000','start','clean','wait:4000','start']);
 for(const code of ['AUTH_UNHEALTHY','DB_UNHEALTHY','IMAGE_UNAVAILABLE','DOCKER_UNAVAILABLE','COMMAND_FAILED']){
  let count=0;
  await assert.rejects(startRuntimeWithRetry(async()=>{count++;throw failure(code);},async()=>{throw Error('Must not retry');},async()=>{}),{code});
  assert.equal(count,1);
 }
 attempts=0;
 await assert.rejects(startRuntimeWithRetry(async()=>{attempts++;throw failure('NETWORK');},async()=>{},async()=>{}),{code:'NETWORK'});
 assert.equal(attempts,3);
 assert.equal(runtimeFailureCategory('failed to pull image: manifest unknown'),'IMAGE_UNAVAILABLE');
});

test('runtime-only acceptance uses no backup credentials and never writes a restore success receipt',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bilsem-runtime-probe-'));
 try{
  const log=join(dir,'commands.jsonl');
  const probe=`#!/usr/bin/env node
const fs=require('node:fs');
fs.appendFileSync(process.env.BILSEM_RUNTIME_PROBE_LOG,JSON.stringify({args:process.argv.slice(2),registry:process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY,dockerConfig:process.env.DOCKER_CONFIG,privateInput:['SUPABASE_ACCESS_TOKEN','BACKUP_ENCRYPTION_KEY','SUPABASE_DB_URL','RESTORE_DATABASE_URL'].some(k=>k in process.env)})+'\\n');
if(process.env.BILSEM_RUNTIME_PROBE_FAIL&&process.argv.includes(process.env.BILSEM_RUNTIME_PROBE_FAIL)){process.stderr.end('progress\\n'.repeat(20000)+(process.env.BILSEM_RUNTIME_PROBE_FAIL==='pull'?'failed to pull registry-1.docker.io/private: 429 Too Many Requests private-runtime-detail':'supabase_auth_fixture is not ready: private-runtime-detail'),()=>{process.exitCode=1;});}
`;
  for(const tool of ['npx','psql','docker'])writeFileSync(join(dir,tool),probe,{mode:0o700});
  for(const fail of ['', 'start', 'pull']){
   writeFileSync(log,'');
   const run=spawnSync(process.execPath,[resolve('scripts/verify-backup-restore.mjs'),'--runtime-check'],{cwd:dir,encoding:'utf8',timeout:20000,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,BILSEM_RUNTIME_PROBE_LOG:log,BILSEM_RUNTIME_PROBE_FAIL:fail,BACKUP_ENCRYPTION_KEY:'not-a-valid-key',SUPABASE_ACCESS_TOKEN:'private-test-token',SUPABASE_DB_URL:'private-db-url',RESTORE_DATABASE_URL:'private-restore-url'}});
   assert.equal(run.status,fail?1:0,run.stderr);
   const calls=readFileSync(log,'utf8').trim().split('\n').map(line=>JSON.parse(line));
   assert.ok(calls.every(call=>!call.privateInput&&call.registry==='docker.io'));
   assert.deepEqual(calls.filter(call=>call.args[0]==='pull').map(call=>call.args),[['pull','supabase/postgres:17.6.1.095'],...(fail==='pull'?[]:[['pull','supabase/gotrue:v2.187.0']])]);
   assert.throws(()=>readFileSync(calls[0].dockerConfig),{code:'ENOENT'},'Private Docker config is removed on success and failure');
   if(fail==='pull')assert.ok(!calls.some(call=>call.args.includes('start')),'Image failure must stop before startup or import');
   else assert.ok(calls.findIndex(call=>call.args.includes('start'))>calls.map(call=>call.args[0]).lastIndexOf('pull'));
   assert.ok(calls.at(-1).args.includes('stop'),'Failure and success must clean up the local runtime');
   assert.throws(()=>readFileSync(join(dir,'backup-restore-verification.json')),{code:'ENOENT'});
   if(fail){assert.match(run.stderr,fail==='pull'?/Postgres image pull IMAGE_PULL REGISTRY_DOCKER RATE_LIMIT HTTP_429/:/AUTH_UNHEALTHY/);assert.doesNotMatch(run.stderr,/private-runtime-detail|private-test-token|private-db-url/);}
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// Substitute only the command-line tools. Exercise the real backup/restore
// entrypoints without a network connection, database or production archive.
function databaseToolProbe(kind:'backup'|'restore',failProbe=false){
 const dir=mkdtempSync(join(tmpdir(),'bilsem-db-environment-'));
 try{
  const log=join(dir,'child-environment.jsonl'),key=randomBytes(32);
  const tools=kind==='backup'?['pg_dump','pg_dumpall']:['psql'];
  for(const tool of tools)writeFileSync(join(dir,tool),`#!/usr/bin/env node
const fs=require('node:fs');
if(process.argv.includes('--version')){console.log('PostgreSQL 17.6');process.exit(0);}
fs.appendFileSync(process.env.BILSEM_DB_PROBE_LOG,JSON.stringify({
 pg:Object.fromEntries(Object.entries(process.env).filter(([name])=>/^PG/i.test(name))),
 hasBackupKey:!!process.env.BACKUP_ENCRYPTION_KEY,
 hasBackupUrl:!!process.env.SUPABASE_DB_URL,
 hasRestoreUrl:!!process.env.RESTORE_DATABASE_URL,
 hasManagementToken:!!process.env.SUPABASE_ACCESS_TOKEN,
 args:process.argv.slice(2)
})+'\\n');
if(process.env.BILSEM_DB_PROBE_FAIL&&process.argv.includes('--single-transaction')){
 console.error('psql:/private-path/schema.sql:42: ERROR: 23503\\nDETAIL: private-record-do-not-log');process.exit(1);
}
if(process.env.BILSEM_DB_PROBE_FAIL&&process.argv.includes('--roles-only')){
 console.error('pg_dumpall: private-host private-password SSL error: certificate verify failed\\nDETAIL: private-record-do-not-log');process.exit(1);
}
if(process.argv.includes('--roles-only'))console.log('CREATE ROLE "fixture_custom";');
else if(process.argv.includes('--schema-only'))console.log('CREATE TABLE public.fixture(id text);');
else if(process.argv.includes('auth'))console.log('COPY "auth"."users" (id) FROM stdin;\\n\\\\.\\nCOPY "auth"."identities" (id) FROM stdin;\\n\\\\.');
else if(process.argv.includes('--data-only'))console.log('COPY "public"."fixture" (id) FROM stdin;\\n\\\\.');
`,{mode:0o700});
  const archive=join(dir,'fixture.enc');
  const files={'roles.sql':'roles','schema.sql':'schema','auth-data.sql':'auth','data.sql':'data'};
  writeFileSync(archive,encryptBackup(Buffer.from(JSON.stringify(backupManifest(files))),key));
  const result=spawnSync(process.execPath,[resolve(`scripts/${kind==='backup'?'backup-database':'restore-backup'}.mjs`),...(kind==='restore'?[archive]:[])],{
   cwd:dir,encoding:'utf8',timeout:20_000,env:{...process.env,
    PATH:`${dir}:${process.env.PATH}`,BILSEM_DB_PROBE_LOG:log,BILSEM_DB_PROBE_FAIL:failProbe?'1':'',
    BACKUP_ENCRYPTION_KEY:key.toString('base64'),
    SUPABASE_ACCESS_TOKEN:kind==='restore'?'sbp_'+ 'a'.repeat(40):'',
    SUPABASE_DB_URL:'postgresql://postgres:fixture@db.vtcsoqohkiagbwatlabk.supabase.co:5432/postgres',
    RESTORE_DATABASE_URL:'postgresql://fixture:local-only@127.0.0.1:54322/postgres',
    PGHOST:'external.invalid',PGHOSTADDR:'203.0.113.55',PGPORT:'6543',PGDATABASE:'wrong',
    PGUSER:'wrong',PGPASSWORD:'wrong',PGSERVICE:'redirect',PGSERVICEFILE:'/fixture/service',
    PGSYSCONFDIR:'/fixture',PGPASSFILE:'/fixture/passwords',PGOPTIONS:'-c search_path=wrong',
    PGSSLMODE:'disable',PGSSLROOTCERT:'/fixture/ca',PGSSLKEY:'/fixture/key',PGREQUIRESSL:'0'
   }
  });
  assert.equal(result.status,failProbe?1:0,result.stderr);
  if(failProbe){
   assert.match(result.stderr,kind==='restore'?/SQLSTATE=23503 schema\.sql:42/:/roles\.sql TLS_CERTIFICATE/);
   assert.doesNotMatch(result.stderr,/private-record-do-not-log|private-path|local-only|private-host|private-password/);
  }
  const records=readFileSync(log,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(records.length,kind==='backup'?(failProbe?1:4):2);
  for(const record of records){
   assert.deepEqual(record.pg,kind==='backup'?{PGHOST:'db.vtcsoqohkiagbwatlabk.supabase.co',PGPORT:'5432',PGUSER:'postgres',PGPASSWORD:'fixture',PGDATABASE:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:BACKUP_CA_PATH,PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on'}:{PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'fixture',PGPASSWORD:'local-only',PGDATABASE:'postgres',PGSSLMODE:'disable'});
   assert.equal(record.hasBackupKey,false,'Encryption key must stay in the parent process');
   assert.equal(record.hasBackupUrl,false);
   assert.equal(record.hasRestoreUrl,false);
   assert.equal(record.hasManagementToken,false);
  }
  if(kind==='backup'&&!failProbe){
   const restored=JSON.parse(decryptBackup(readFileSync(join(dir,'zekapark-database.enc')),key).toString());verifyBackupManifest(restored);
   assert.match(restored.files['auth-data.sql'],/COPY "auth"\."users"/);
   assert.ok(records[2].args.some((value:string)=>value.includes('auth')&&value.includes('storage')),'General data dump excludes managed schemas');
   assert.ok(records[3].args.includes('--exclude-table="auth"."sessions"'));
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('backup subprocesses cannot inherit libpq redirection or the archive encryption key',()=>databaseToolProbe('backup'));
test('restore preflight and execution keep the validated local target despite inherited libpq settings',()=>databaseToolProbe('restore'));
test('restore failures expose only the SQLSTATE and archive location, never server records or paths',()=>databaseToolProbe('restore',true));
test('backup TLS failures expose only a fixed category, never server messages or credentials',()=>databaseToolProbe('backup',true));

test('the official Supabase root bundle rejects tampering, additional roots and expired certificates',()=>{
 const bundle=readFileSync(BACKUP_CA_PATH);
 assert.equal(verifyBackupCaBundle(bundle),BACKUP_CA_PATH);
 const changed=Buffer.from(bundle);changed[100]^=1;
 for(const value of [changed,Buffer.concat([bundle,bundle])])assert.throws(()=>verifyBackupCaBundle(value),/CA paketi/);
 assert.throws(()=>verifyBackupCaBundle(bundle,Date.parse('2040-01-01')),/CA paketi/);
 assert.throws(()=>verifyBackupCaBundle(bundle,NaN),/CA paketi/);
});

test('temporary backup credentials are renewed per dump and confined to the pinned provider/project',async()=>{
 const ref='vtcsoqohkiagbwatlabk',token='sbp_'+'a'.repeat(40),calls:string[]=[];
 const access=temporaryBackupAccess(token,async(input,options)=>{
  const url=String(input);calls.push(url);
  assert.ok(url.startsWith(`https://api.supabase.com/v1/projects/${ref}/`));
  assert.equal(new Headers(options?.headers).get('authorization'),`Bearer ${token}`);
  assert.equal(options?.redirect,'error');assert.ok(options?.signal);
  if(url.endsWith('/pooler')){assert.equal(options?.method,'GET');return Response.json([{identifier:ref,database_type:'PRIMARY',db_name:'postgres',db_host:'aws-1-eu-central-1.pooler.supabase.com',db_port:6543}]);}
  assert.equal(options?.method,'POST');assert.deepEqual(JSON.parse(String(options?.body)),{read_only:false});
  return Response.json({role:'cli_login_postgres',password:'fixture-private-password',ttl_seconds:600});
 });
 for(let i=0;i<2;i++){
  const url=await access(),env=backupConnectionEnvironment(url);
  assert.equal(env.PGHOST,'aws-1-eu-central-1.pooler.supabase.com');assert.equal(env.PGPORT,'5432');
  assert.equal(env.PGUSER,`cli_login_postgres.${ref}`);assert.equal(env.PGSSLMODE,'verify-full');assert.equal(env.PGSSLROOTCERT,BACKUP_CA_PATH);assert.equal(env.PGOPTIONS,'-c default_transaction_read_only=on');
 }
 assert.equal(calls.filter(url=>url.endsWith('/pooler')).length,1);
 assert.equal(calls.filter(url=>url.endsWith('/login-role')).length,2);
 const config=backupConfiguration({BACKUP_ENCRYPTION_KEY:randomBytes(32).toString('base64'),SUPABASE_ACCESS_TOKEN:token});
 assert.equal(config.dbUrl,null);assert.equal(config.key.length,32);
});

test('provider redirects, hostile poolers, invalid temporary roles and response errors fail without echoing secrets',async()=>{
 const pooler=[{identifier:'vtcsoqohkiagbwatlabk',database_type:'PRIMARY',db_name:'postgres',db_host:'aws-1-eu-central-1.pooler.supabase.com'}];
 for(const response of [new Response('fixture-secret',{status:302,headers:{location:'https://attacker.invalid'}}),Response.json([{...pooler[0],identifier:'wrong-project'}]),Response.json([{...pooler[0],db_host:'attacker.invalid'}])]){
  const access=temporaryBackupAccess('fixture-secret',async()=>response);
  await assert.rejects(access(),error=>error instanceof Error&&!error.message.includes('fixture-secret'));
 }
 for(const value of [{role:'postgres',password:'fixture-secret',ttl_seconds:600},{role:'cli_login_postgres',password:'fixture-secret',ttl_seconds:0},{role:'cli_login_postgres',password:'',ttl_seconds:600}]){
  let count=0;const access=temporaryBackupAccess('fixture-secret',async()=>Response.json(count++===0?pooler:value));
  await assert.rejects(access(),error=>error instanceof Error&&!error.message.includes('fixture-secret'));
 }
});

test('a valid manifest cannot conceal session or refresh-token rows in any SQL file',()=>{
 for(const sql of ['COPY auth.sessions (id) FROM stdin;','COPY "auth"."refresh_tokens" (id) FROM stdin;','INSERT INTO "auth"."one_time_tokens" (id) VALUES (1);']){
  const archive=backupManifest({'roles.sql':'roles','schema.sql':'schema','auth-data.sql':'auth','data.sql':sql});
  assert.throws(()=>verifyBackupManifest(archive),/Oturum/);
 }
});

test('vendored migration filters preserve the reviewed source bytes and license',()=>{
 const base=resolve('scripts/vendor/supabase-cli-2.81.3');
 const sources=JSON.parse(readFileSync(join(base,'sources.json'),'utf8'));
 for(const row of sources)assert.equal(createHash('sha256').update(readFileSync(join(base,row.file))).digest('hex'),row.sha256);
 assert.match(readFileSync(join(base,'LICENSE'),'utf8'),/Supabase, Inc/);
});

test('local replay preserves the managed superuser settings without swallowing other role errors',async()=>{
 const statement='ALTER ROLE "supabase_admin" SET "statement_timeout" TO \'0\';';
 const db=new PGlite();
 try{
  await db.exec('create role supabase_admin superuser; create role restore_operator createrole; set role restore_operator;');
  await assert.rejects(()=>db.exec(statement),{code:'42501'});
  await db.exec(localRestoreRoles(statement));
  const ordinary='ALTER ROLE "authenticated" SET "statement_timeout" TO \'8s\';';
  assert.equal(localRestoreRoles(ordinary),ordinary);
  for(const unknown of ['ALTER ROLE "supabase_admin" SUPERUSER;', 'ALTER ROLE "supabase_admin" SET "search_path" TO \'public\';', 'ALTER ROLE "supabase_admin" SET "statement_timeout" TO \'0\'; SELECT invalid_statement;'])assert.equal(localRestoreRoles(unknown),unknown);
  await assert.rejects(()=>db.exec(localRestoreRoles('ALTER ROLE "missing_role" SET "statement_timeout" TO \'0\';')),{code:'42704'});
 }finally{await db.close();}
});

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
