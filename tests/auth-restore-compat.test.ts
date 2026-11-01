import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {buildAuthRestoreCompatibility,splitAuthRestoreCompatibility} from '../scripts/auth-restore-compat.mjs';
import {isolatedRestoreTarget,isolatedAuthOwnerTarget} from '../scripts/restore-backup.mjs';

const dump=[
 'COPY "auth"."users" ("id", "is_anonymous") FROM stdin;',
 '\\.',
 'COPY "auth"."identities" ("id", "user_id") FROM stdin;',
 '\\.',
 '',
].join('\n');
const columns=[
 {table:'users',column:'id',type:'uuid'},
 {table:'users',column:'is_anonymous',type:'boolean'},
 {table:'identities',column:'id',type:'uuid'},
 {table:'identities',column:'user_id',type:'uuid'},
];

test('isolated Auth recovery adds missing source-typed columns without changing source rows',async()=>{
 const sql=buildAuthRestoreCompatibility(dump,columns);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS "is_anonymous" boolean;/);
 assert.equal(sql.slice(sql.indexOf('COPY')),dump);
 const db=new PGlite();
 try{
  await db.exec('create schema auth; create table auth.users(id uuid); create table auth.identities(id uuid);');
  await db.exec(sql.slice(0,sql.indexOf('COPY')));
  const names=(await db.query<{column_name:string}>("select column_name from information_schema.columns where table_schema='auth' and table_name='users'")).rows.map(row=>row.column_name);
  assert.ok(names.includes('is_anonymous'));
  await db.exec("insert into auth.users(id,is_anonymous) values ('11111111-1111-4111-8111-111111111111',true)");
  assert.equal((await db.query<{is_anonymous:boolean}>('select is_anonymous from auth.users')).rows[0].is_anonymous,true);
 }finally{await db.close();}
});

test('Auth compatibility refuses missing, injected, duplicated or malformed source metadata',()=>{
 assert.throws(()=>buildAuthRestoreCompatibility(dump,columns.slice(1)),/eksik/);
 assert.throws(()=>buildAuthRestoreCompatibility(dump,[...columns,{table:'users',column:'bad',type:'text; drop schema auth cascade;--'}]),/veri türü/);
 assert.throws(()=>buildAuthRestoreCompatibility(dump,[...columns,{table:'users',column:'id',type:'uuid'}]),/Tekrarlanan/);
 assert.throws(()=>buildAuthRestoreCompatibility('COPY "auth"."users" ("id") FROM stdin;',columns),/kullanıcı\/kimlik/);
});

test('managed Auth additions use their existing owner without granting privileges to the data restore role',async()=>{
 const sql=buildAuthRestoreCompatibility(dump,columns),split=splitAuthRestoreCompatibility(sql);
 assert.equal(split.dataSql,dump);
 assert.doesNotMatch(split.schemaSql,/COPY|GRANT|ALTER ROLE|OWNER TO|SET ROLE/i);
 const db=new PGlite();
 try{
  await db.exec('CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT; CREATE ROLE restore_fixture NOLOGIN NOINHERIT; CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin; SET ROLE supabase_auth_admin; CREATE TABLE auth.users(id uuid); CREATE TABLE auth.identities(id uuid); RESET ROLE; GRANT USAGE ON SCHEMA auth TO restore_fixture; GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA auth TO restore_fixture; SET ROLE restore_fixture;');
  // Even an existing column triggers the ownership check before IF NOT EXISTS.
  await assert.rejects(db.exec('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS id uuid;'),{code:'42501'});
  await db.exec('RESET ROLE; SET ROLE supabase_auth_admin;');
  await db.exec(split.schemaSql);
  await db.exec('RESET ROLE; SET ROLE restore_fixture;');
  await db.exec("INSERT INTO auth.users(id,is_anonymous) VALUES ('11111111-1111-4111-8111-111111111111',true)");
  assert.equal((await db.query<{is_anonymous:boolean}>('SELECT is_anonymous FROM auth.users')).rows[0].is_anonymous,true);
  await assert.rejects(db.exec('ALTER TABLE auth.users ADD COLUMN denied boolean;'),{code:'42501'});
 }finally{await db.close();}
});

test('owner preparation accepts only the exact generated compatibility prefix and leaves legacy data intact',()=>{
 const sql=buildAuthRestoreCompatibility(dump,columns);
 assert.deepEqual(splitAuthRestoreCompatibility(dump),{schemaSql:'',dataSql:dump});
 for(const malicious of [
  sql.replace('uuid;','uuid; SELECT 1;'),
  sql.replace('"auth"."users"','"public"."users"'),
  sql.replace('"id" uuid;','"extra" uuid;'),
  sql.replace('ADD COLUMN IF NOT EXISTS','OWNER TO'),
  sql.replace('"id" uuid;','"id" text;\nALTER ROLE postgres SUPERUSER;'),
 ])assert.throws(()=>splitAuthRestoreCompatibility(malicious));
 const split=splitAuthRestoreCompatibility(sql);
 assert.equal(split.schemaSql+dump,sql.slice(sql.indexOf('\n')+1));
});

test('Auth owner credentials are confined to the exact same local target and the managed owner role',()=>{
 const target=isolatedRestoreTarget('postgresql://postgres:fixture@127.0.0.1:54322/postgres');
 const valid='postgresql://supabase_auth_admin:owner-fixture@127.0.0.1:54322/postgres';
 assert.equal(isolatedAuthOwnerTarget(valid,target).PGUSER,'supabase_auth_admin');
 for(const value of [undefined,
  valid.replace('127.0.0.1','db.vtcsoqohkiagbwatlabk.supabase.co'),
  valid.replace('54322','54323'),valid.replace('/postgres','/other'),
  valid.replace('supabase_auth_admin','supabase_admin'),valid+'?host=external.invalid',
 ])assert.throws(()=>isolatedAuthOwnerTarget(value,target));
});
