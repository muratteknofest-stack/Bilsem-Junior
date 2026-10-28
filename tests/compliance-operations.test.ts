import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'yaml';
import {exportSupportRequest} from '../server/account-export';
import {BACKUP_RETENTION_DAYS} from '../scripts/backup-manifest.mjs';
import {backupConfiguration} from '../scripts/backup-config.mjs';
import {randomBytes} from 'node:crypto';

const parent='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const request={id:'44444444-4444-4444-8444-444444444444',actor_id:child,kind:'question',status:'open',created_at:'2026-10-28T10:00:00Z',updated_at:'2026-10-28T10:00:00Z',payload:{reason:'answer',question:{id:'q-1',type:'matrix_2x2',prompt:'Eksik parçayı bul.',correctOptionId:'secret-answer',explanation:{summary:'not released'},options:[{id:'secret-answer'}]},audit:{internal:'private-audit'}},resolution:'private-admin-note',reviewed_by:other,request_key:'private-request-key'};

test('family export includes a child report while excluding answer keys and internal review data',()=>{
 const exported=exportSupportRequest(request,[parent,child]);
 assert.equal(exported.actor_id,child);assert.equal(exported.payload.reason,'answer');
 assert.deepEqual(exported.payload.question,{id:'q-1',type:'matrix_2x2',prompt:'Eksik parçayı bul.'});
 assert.doesNotMatch(JSON.stringify(exported),/secret-answer|not released|private-audit|private-admin-note|private-request-key/);
 assert.equal('reviewed_by' in exported,false);
});
test('an unrelated actor or malformed row aborts the request export instead of silently mixing families',()=>{
 assert.throws(()=>exportSupportRequest({...request,actor_id:other},[parent,child]));
 assert.throws(()=>exportSupportRequest({...request,actor_id:null},[parent,child]));
 assert.throws(()=>exportSupportRequest({...request,kind:'unknown'},[parent,child]));
});
test('a deletion request exports its submitted scope and timestamp without internal job state',()=>{
 const payload={scope:'family',confirmedAt:'2026-10-28T10:00:00Z',member_ids:[other],deletionJob:{internal:'not-public'}};
 const exported=exportSupportRequest({...request,actor_id:parent,kind:'deletion',payload},[parent,child]);
 assert.deepEqual(exported.payload,{scope:'family',confirmedAt:payload.confirmedAt});
});
test('archive expiration agrees with the actual encrypted backup retention configuration',async()=>{
 const workflow=parse(await readFile(new URL('../.github/workflows/backup.yml',import.meta.url),'utf8'));
 const upload=workflow.jobs.backup.steps.find((step:{name:string})=>step.name==='Retain encrypted archive');
 assert.equal(upload.with['retention-days'],BACKUP_RETENTION_DAYS);
});

test('backup preflight names all missing settings while redacting malformed database values',()=>{
 assert.throws(()=>backupConfiguration({}),error=>error instanceof Error&&/SUPABASE_DB_URL/.test(error.message)&&/BACKUP_ENCRYPTION_KEY/.test(error.message));
 const config={BACKUP_ENCRYPTION_KEY:randomBytes(32).toString('base64'),SUPABASE_DB_URL:'private-password-invalid-url'};
 assert.throws(()=>backupConfiguration(config),error=>error instanceof Error&&!error.message.includes('private-password')&&error.message.includes('biçimi geçersiz'));
});
test('backup target is pinned to this project, permits session pooling and requires verified TLS',()=>{
 const key=randomBytes(32).toString('base64');
 for(const url of ['postgresql://postgres:fixture@db.vtcsoqohkiagbwatlabk.supabase.co/postgres','postgresql://postgres.vtcsoqohkiagbwatlabk:fixture@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require']){
  const config=backupConfiguration({SUPABASE_DB_URL:url,BACKUP_ENCRYPTION_KEY:key});
  assert.ok(config.dbUrl);
  assert.equal(new URL(config.dbUrl).searchParams.get('sslmode'),'verify-full');assert.equal(config.key.length,32);
 }
});
test('libpq overrides, wrong projects and transaction poolers cannot redirect the backup connection',()=>{
 const key=randomBytes(32).toString('base64'),base='postgresql://postgres:fixture@db.vtcsoqohkiagbwatlabk.supabase.co/postgres';
 for(const url of [base+'?host=attacker.invalid',base+'?dbname=other',base+'?service=other',base.replace('vtcsoqohkiagbwatlabk','otherproject'),base+'#fragment',base.replace(/\/postgres$/,'/other'),'postgresql://postgres.otherproject:fixture@aws-0-eu-central-1.pooler.supabase.com:5432/postgres','postgresql://postgres.vtcsoqohkiagbwatlabk:fixture@aws-0-eu-central-1.pooler.supabase.com:6543/postgres']){
  assert.throws(()=>backupConfiguration({SUPABASE_DB_URL:url,BACKUP_ENCRYPTION_KEY:key}));
 }
});
