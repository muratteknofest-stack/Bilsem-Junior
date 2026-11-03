/** Local deterministic bank production; the script does not publish or access accounts. */
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {VISUAL_MECHANICS,visualAllowed,generateVisualQuestion} from '../src/features/questions/visual-reasoning-lab';
import {EDUCATION_PROFILES} from '../src/features/questions/quality-policy';
import {isQuestionReadyForStudents,questionStimulusKey} from '../src/features/questions/quality';
import {runMultiPassQuestionTests,stampQuestionVerification} from '../src/features/questions/verifier';
const out=process.argv[2];if(!out)throw Error('Pass a local output path');
const batch='visual-20261103',at=new Date().toISOString(),seen=new Set<string>(),questions:unknown[]=[],cells:Record<string,number>={};let index=0;
for(const grade of [1,2,3,4] as const)for(let d=1;d<=EDUCATION_PROFILES[grade].maxDifficulty;d++)for(const mechanic of VISUAL_MECHANICS)if(visualAllowed(mechanic,grade,d)){
 const key=`${grade}:${d}:${mechanic}`;cells[key]=0;
 for(let retry=0;cells[key]<5&&retry<4000;retry++){
  const q=generateVisualQuestion(mechanic,(20261103+ ++index*104729)%2147483647||1,d as 1,grade),stimulus=questionStimulusKey(q);
  if(seen.has(stimulus))continue;
  const proof=runMultiPassQuestionTests(q);if(!proof.isVerified)throw Error(`UNPROVED:${q.id}:${proof.errors.join(';')}`);proof.testedAt=at;
  const row={...stampQuestionVerification(q,proof),id:`${batch}-${String(questions.length+1).padStart(5,'0')}`,status:'review' as const,revision:1,isCustom:true,sourceBatch:batch,createdAt:at,updatedAt:at,updatedBy:'canonical-question-engine',batchValidation:{automaticChecks:'passed',individualHumanReview:false,editorReview:'pending',stimulusSha256:createHash('sha256').update(stimulus).digest('hex')}};
  if(!isQuestionReadyForStudents(row))throw Error('FINAL_NOT_READY');seen.add(stimulus);questions.push(row);cells[key]++;
 }
 if(cells[key]!==5)throw Error('INCOMPLETE_CELL:'+key);
}
const data=JSON.stringify({batchId:batch,at,questions,cells});await writeFile(out,data);
console.log(JSON.stringify({total:questions.length,cells:Object.keys(cells).length,sha256:createHash('sha256').update(data).digest('hex'),individualHumanReview:false}));
