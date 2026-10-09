import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../src/types';
import { generateQuestion } from '../src/features/questions/generators';
import { STUDENT_TYPES } from '../src/features/questions/professional-engine';
import { auditQuestion, questionVisualKey } from '../src/features/questions/quality';
import { generateVisualFingerprint } from '../src/features/questions/fingerprint';
import { EDUCATION_PROFILES, inspectEducation, type SchoolGrade } from '../src/features/questions/quality-policy';
import { runMultiPassQuestionTests, stampQuestionVerification } from '../src/features/questions/verifier';

export const BATCH_POLICY = 'balanced-bank-1';
export const stemKey = (q: BaseQuestion) => generateVisualFingerprint({ prompt:q.prompt?.trim(),board:q.visualConfig });
export function gradeTypes(grade:SchoolGrade):QuestionType[]{
  return STUDENT_TYPES.filter(type=>grade!==1 || !['operation_machine','matrix_3x3','raven_matrix'].includes(type));
}
export type BankQuestion = BaseQuestion & {revision:number;updatedBy:string;updatedAt:string;sourceBatch:string;batchValidation:{policy:string;automaticChecks:'passed';editorReview:'pending';visualKeySha256:string;stemKeySha256:string}};
export function generateGradeBank(options:{perGrade:number;seed:number;batchId:string;generatedAt:string;existing?:BaseQuestion[]}){
  if(!Number.isInteger(options.perGrade)||options.perGrade<1||options.perGrade>1000)throw Error('perGrade must be 1–1000');
  if(!Number.isSafeInteger(options.seed)||options.seed<1||options.seed>2147483646)throw Error('Invalid seed');
  if(!/^[a-z0-9-]{1,70}$/.test(options.batchId)||!Number.isFinite(Date.parse(options.generatedAt)))throw Error('Invalid batch metadata');
  const existing=options.existing||[];
  const seen=new Set<string>(),stems=new Set<string>();
  for(const q of existing){try{seen.add(questionVisualKey(q));stems.add(stemKey(q));}catch{/* Malformed old drafts cannot be novelty evidence. */}}
  const questions:BankQuestion[]=[];
  const rejected={generation:0,quality:0,duplicate:0};let attempts=0;
  const redistributed:{grade:number;type:QuestionType;difficulty:number;reason:string}[]=[];
  const distribution:Record<string,{count:number;types:Record<string,number>;difficulty:Record<string,number>;category:Record<string,number>}>= {};
  for(const grade of [1,2,3,4] as const){
    const types=gradeTypes(grade),max=EDUCATION_PROFILES[grade].maxDifficulty;
    const counts={count:0,types:{} as Record<string,number>,difficulty:{} as Record<string,number>,category:{} as Record<string,number>};
    distribution[grade]=counts;
    const exhausted=new Set<string>();let smallSymmetryCount=0;
    for(let index=0;index<options.perGrade;index++){
      // Round robin by type; rotating difficulty on each cycle covers every type/level pair.
      const preferredType=types[index%types.length];
      const difficulty=(1+((Math.floor(index/types.length)+index%types.length)%max)) as DifficultyLevel;
      let accepted:BankQuestion|undefined;
      const candidates=[preferredType,...types.filter(t=>t!==preferredType).sort((a,b)=>(counts.types[a]||0)-(counts.types[b]||0))];
      for(const type of candidates){
      const cell=type+':'+difficulty;
      if(exhausted.has(cell))continue;
      // 3×3 symmetry has only 2^4 visible stems. Reserve up to four per grade.
      if(type==='symmetry_completion'&&difficulty<4&&smallSymmetryCount>=4){
        exhausted.add(cell);redistributed.push({grade,type,difficulty,reason:'limited-visible-stems'});continue;
      }
      for(let retry=0;retry<250;retry++){
        const seed=(options.seed+(++attempts)*104729)%2147483647||1;
        let q:BaseQuestion;
        try{q=generateQuestion({targetGrade:grade,type,difficulty,seed});}catch{rejected.generation++;continue;}
        const audit=auditQuestion(q),education=inspectEducation(q,grade);
        if(!audit.solverVerified||audit.errors.length||audit.reviewRequired.length||education.audience.length||education.difficulty.length||education.visual.length){rejected.quality++;continue;}
        const visual=questionVisualKey(q),stem=stemKey(q);
        if(seen.has(visual)||stems.has(stem)){rejected.duplicate++;continue;}
        const verification=runMultiPassQuestionTests(q);
        if(!verification.isVerified){rejected.quality++;continue;}
        verification.testedAt=options.generatedAt;
        q=stampQuestionVerification(q,verification);
        accepted={...q,id:`${options.batchId}-g${grade}-${String(index+1).padStart(4,'0')}`,
          status:'review',revision:1,isCustom:true,createdAt:options.generatedAt,updatedAt:options.generatedAt,
          updatedBy:'question-robot',sourceBatch:options.batchId,
          batchValidation:{policy:BATCH_POLICY,automaticChecks:'passed',editorReview:'pending',
            visualKeySha256:createHash('sha256').update(visual).digest('hex'),stemKeySha256:createHash('sha256').update(stem).digest('hex')}};
        seen.add(visual);stems.add(stem);if(type==='symmetry_completion'&&difficulty<4)smallSymmetryCount++;break;
      }
      if(accepted)break;
      exhausted.add(cell);redistributed.push({grade,type,difficulty,reason:'no-unique-certified-candidate-in-250-attempts'});
      }
      if(!accepted)throw Error(`Bank incomplete: grade ${grade}, difficulty ${difficulty}; quality thresholds unchanged`);
      questions.push(accepted);counts.count++;
      for(const [bucket,key] of [[counts.types,accepted.type],[counts.difficulty,String(difficulty)],[counts.category,accepted.category]] as const)bucket[key]=(bucket[key]||0)+1;
    }
  }
  return {batchId:options.batchId,policy:BATCH_POLICY,seed:options.seed,generatedAt:options.generatedAt,
    summary:{total:questions.length,existingCompared:existing.length,attempts,rejected,redistributed,distribution},questions};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).reduce<string[][]>((a,v,i,all)=>{if(v.startsWith('--'))a.push([v.slice(2),all[i+1]]);return a;},[]));
  if(!args.existing||!args.output||!args.batch)throw Error('Usage: --existing bank.json --output result.json --batch robot-YYYYMMDD --per-grade 300 --seed 20261008');
  const data=JSON.parse(await readFile(args.existing,'utf8'));
  const existing=Array.isArray(data)?data:data.questions;if(!Array.isArray(existing))throw Error('Existing bank must be an array');
  const result=generateGradeBank({existing,perGrade:Number(args['per-grade']||300),seed:Number(args.seed||20261008),batchId:args.batch,generatedAt:args.at||new Date().toISOString()});
  await writeFile(args.output,JSON.stringify(result));
  console.log(JSON.stringify({batchId:result.batchId,...result.summary},null,2));
}
