import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'yaml';
import {exportSupportRequest} from '../server/account-export';
import {BACKUP_RETENTION_DAYS} from '../scripts/backup-manifest.mjs';

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
