import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {buildAuthRestoreCompatibility} from '../scripts/auth-restore-compat.mjs';

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
