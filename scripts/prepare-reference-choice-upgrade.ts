/** Prepares independently verified updates. Never connects to a remote database. */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {generateReferenceQuestion,type ReferenceBoard} from '../src/features/questions/reference-lab';
import {auditQuestion,isQuestionReadyForStudents,questionStimulusKey,questionVisualKey} from '../src/features/questions/quality';
import {runMultiPassQuestionTests,stampQuestionVerification} from '../src/features/questions/verifier';
import type{BaseQuestion}from'../src/types';
import {verifyReferenceBank,type ReferenceBankQuestion} from './generate-reference-bank';

const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const SOURCE_SHA='f4ca6f92bfa13864461f30b294ca0567370b664bbb7a0feaf6183e39b7a72679';
export interface UpgradeRow {id:string;expectedSha256:string;nextSha256:string;data:Record<string,unknown>}
const literal=(v:string)=>"'"+v.replaceAll("'","''")+"'";
export function buildReferenceUpgradeSql(rows:UpgradeRow[],commit:string){
 if(!/^[a-f0-9]{40}$/.test(commit)||!rows.length||rows.length>20||new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!/^reference-20261102-\d{5}$/.test(r.id)||!(/^[a-f0-9]{64}$/).test(r.expectedSha256)||!(/^[a-f0-9]{64}$/).test(r.nextSha256)))throw Error('INVALID_UPGRADE_BATCH');
 return `WITH input(id,old_sha,new_sha,data) AS (VALUES ${rows.map(r=>`(${literal(r.id)},${literal(r.expectedSha256)},${literal(r.nextSha256)},${literal(JSON.stringify(r.data))}::jsonb)`).join(',')}),
 locked AS MATERIALIZED (SELECT q.id,q.data,q.revision,q.status,q.reviewed_by FROM public.questions q JOIN input i ON i.id=q.id FOR UPDATE OF q),
 changed AS (UPDATE public.questions q SET data=i.data FROM input i,locked l WHERE q.id=i.id AND l.id=q.id
 AND (SELECT count(*) FROM locked)=${rows.length}
 AND NOT EXISTS(SELECT 1 FROM locked x JOIN input y ON x.id=y.id WHERE x.status<>'published' OR x.revision<>2 OR x.reviewed_by IS NOT NULL OR x.data->'authoring'->>'engine' IS DISTINCT FROM 'reference-lab-1' OR encode(sha256(convert_to(x.data::text,'UTF8')),'hex')<>y.old_sha)
 AND NOT EXISTS(SELECT 1 FROM input y JOIN locked x ON x.id=y.id WHERE encode(sha256(convert_to(y.data::text,'UTF8')),'hex')<>y.new_sha OR y.data->>'id' IS DISTINCT FROM y.id OR y.data->>'status' IS DISTINCT FROM 'published' OR y.data->>'revision' IS DISTINCT FROM '3' OR y.data->'authoring'->>'engine' IS DISTINCT FROM 'reference-lab-2' OR y.data->'visualConfig' IS DISTINCT FROM x.data->'visualConfig' OR y.data->'targetGrade' IS DISTINCT FROM x.data->'targetGrade' OR y.data->'type' IS DISTINCT FROM x.data->'type' OR y.data->'seed' IS DISTINCT FROM x.data->'seed' OR y.data->'batchValidation'->>'automaticChecks' IS DISTINCT FROM 'passed' OR y.data->'releaseAuthorization'->>'individualHumanReview' IS DISTINCT FROM 'false' OR y.data->>'sourceBatch' IS DISTINCT FROM 'reference-20261102' OR y.data->'batchValidation'->>'individualHumanReview' IS DISTINCT FROM 'false' OR y.data->'batchValidation'->>'editorReview' IS DISTINCT FROM 'pending' OR y.data->'releaseAuthorization'->>'sourceCommit' IS DISTINCT FROM ${literal(commit)})
 RETURNING q.id,q.revision)
 SELECT count(*) updated,min(revision) min_revision,max(revision) max_revision FROM changed;`;
}
export async function prepareReferenceChoiceUpgrade(source:string,commit:string,at:string){
 if(!/^[a-f0-9]{40}$/.test(commit)||!Number.isFinite(Date.parse(at)))throw Error('INVALID_RELEASE');
 const bytes=await readFile(source,'utf8');if(sha(bytes)!==SOURCE_SHA)throw Error('UNEXPECTED_SOURCE_BANK');
 const bank=JSON.parse(bytes);verifyReferenceBank(bank);
 const db=new PGlite();
 try{
  await db.exec('create table upgrade_rows(id text primary key,old_data jsonb,next_data jsonb)');
  for(const old of bank.questions as ReferenceBankQuestion[]){
   const b=old.visualConfig as ReferenceBoard,q=generateReferenceQuestion(b.mechanic,old.seed,old.difficulty,old.targetGrade as 1|2|3|4),proof=runMultiPassQuestionTests(q);
   if(!proof.isVerified||!auditQuestion(old).solverVerified||questionStimulusKey(q)!==questionStimulusKey(old))throw Error('UPGRADE_PROOF_FAILED:'+old.id);
   proof.testedAt=at;const verified=stampQuestionVerification(q,proof),stimulus=sha(questionStimulusKey(q));
   const previousRelease={source:'owner-request-2026-11-02-reference-question-structures-all-grades',releasedAt:'2026-11-02T14:23:58.182Z',sourceCommit:'ac67ec5f199a55e88e0fa70d2b02df838f477687',automaticChecks:'passed',sourceFileSha256:SOURCE_SHA,individualHumanReview:false};
   const prior={...old,status:'published',revision:2,updatedAt:previousRelease.releasedAt,updatedBy:'owner-authorized-release',releaseAuthorization:previousRelease};
   const next={...verified,id:old.id,status:'published',revision:3,isCustom:true,sourceBatch:old.sourceBatch,createdAt:old.createdAt,updatedAt:at,updatedBy:'owner-authorized-choice-upgrade',
    batchValidation:{...old.batchValidation,policy:'reference-choice-quality-2',stimulusSha256:stimulus,stemKeySha256:stimulus,visualKeySha256:sha(questionVisualKey(q)),individualHumanReview:false,editorReview:'pending'},
    releaseAuthorization:{source:'owner-continue-2026-11-02-reference-choice-quality',releasedAt:at,sourceCommit:commit,automaticChecks:'passed',sourceFileSha256:SOURCE_SHA,individualHumanReview:false},
    qualityUpgrade:{previousEngine:'reference-lab-1',previousRevision:2,previousReleaseAuthorization:previousRelease,preservedGivenSha256:stimulus}};
   if(!isQuestionReadyForStudents(next))throw Error('FINAL_UPGRADE_NOT_READY:'+old.id);
   await db.query('insert into upgrade_rows values($1,$2::jsonb,$3::jsonb)',[old.id,JSON.stringify(prior),JSON.stringify(next)]);
  }
  const rows=await db.query<{id:string;expectedSha256:string;nextSha256:string;data:Record<string,unknown>}>(`select id,encode(sha256(convert_to(old_data::text,'UTF8')),'hex') "expectedSha256",encode(sha256(convert_to(next_data::text,'UTF8')),'hex') "nextSha256",next_data data from upgrade_rows order by id`);
  const hashes=await db.query(`select (old_data->>'targetGrade')::int grade,count(*) n,encode(sha256(convert_to(string_agg(old_data::text,E'\n' order by id),'UTF8')),'hex') h from upgrade_rows group by grade order by grade`);
  return {commit,at,sourceFileSha256:SOURCE_SHA,total:rows.rows.length,originalGradeHashes:hashes.rows,individualHumanReview:false,rows:rows.rows};
 }finally{await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
 if(!args.source||!args.commit||!args.at||!args.output)throw Error('Usage: --source original-bank.json --commit SHA --at ISO --output private-plan.json');
 const plan=await prepareReferenceChoiceUpgrade(args.source,args.commit,args.at);await writeFile(args.output,JSON.stringify(plan));console.log(JSON.stringify({...plan,rows:undefined}));
}
