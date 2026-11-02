/** Local-only generation. No database credentials or network access. */
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {EXAM_MECHANICS,examAllowed,generateExamQuestion} from '../src/features/questions/exam-lab';
import {EDUCATION_PROFILES} from '../src/features/questions/quality-policy';
import {isQuestionReadyForStudents,questionStimulusKey} from '../src/features/questions/quality';
import {runMultiPassQuestionTests,stampQuestionVerification} from '../src/features/questions/verifier';
const out=process.argv[2];if(!out)throw Error('Pass a private output path');
const at=new Date().toISOString(),seen=new Set<string>(),questions:Array<ReturnType<typeof stampQuestionVerification>&{sourceBatch:string;revision:number}>=[],cells:Record<string,number>={};
let index=0;
for(const grade of [1,2,3,4] as const)for(let difficulty=1;difficulty<=EDUCATION_PROFILES[grade].maxDifficulty;difficulty++)for(const m of EXAM_MECHANICS)if(examAllowed(m,grade,difficulty)){
 const key=`${grade}:${difficulty}:${m}`;cells[key]=0;
 for(let retry=0;cells[key]<10&&retry<10000;retry++){
  const q=generateExamQuestion(m,(20261103+ ++index*104729)%2147483647||1,difficulty as 1,grade),stimulus=questionStimulusKey(q);
  if(seen.has(stimulus))continue;
  const proof=runMultiPassQuestionTests(q);if(!proof.isVerified)throw Error(`UNPROVED:${q.id}`);proof.testedAt=at;
  const row={...stampQuestionVerification(q,proof),id:`exam-20261102-${String(questions.length+1).padStart(5,'0')}`,status:'review' as const,revision:1,isCustom:true,sourceBatch:'exam-20261102',createdAt:at,updatedAt:at,updatedBy:'canonical-question-engine',batchValidation:{automaticChecks:'passed',individualHumanReview:false,editorReview:'pending',stimulusSha256:createHash('sha256').update(stimulus).digest('hex')}};
  if(!isQuestionReadyForStudents(row))throw Error('FINAL_NOT_READY');seen.add(stimulus);questions.push(row);cells[key]++;
 }
 if(cells[key]!==10)throw Error('INCOMPLETE_CELL:'+key);
}
const data=JSON.stringify({batchId:'exam-20261102',at,questions,cells});await writeFile(out,data);
console.log(JSON.stringify({total:questions.length,cells: Object.keys(cells).length,grades:[1,2,3,4].map(g=>({grade:g,n:questions.filter(q=>q.targetGrade===g).length})),sha256:createHash('sha256').update(data).digest('hex'),individualHumanReview:false}));
