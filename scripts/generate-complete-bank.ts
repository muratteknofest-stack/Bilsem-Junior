import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { BaseQuestion, QuestionType } from '../src/types';
import { ALL_TOPIC_TYPES, TOPIC_CATEGORY } from '../src/features/questions/topic-catalog';
import { generateQuestion } from '../src/features/questions/generators';
import { auditQuestion, questionVisualKey } from '../src/features/questions/quality';
import { EDUCATION_PROFILES, type SchoolGrade } from '../src/features/questions/quality-policy';
import { professionalDifficulty } from '../src/features/questions/reasoning-profile';
import { runMultiPassQuestionTests, stampQuestionVerification } from '../src/features/questions/verifier';
import { stemKey, type BankQuestion } from './generate-grade-bank';
export const COMPLETE_BANK_POLICY='complete-curriculum-bank-1';
export function generateCompleteBank(options:{perGrade:number;seed:number;batchId:string;generatedAt:string;existingHashes?:[string,string][];onProgress?:(grade:number,n:number)=>void}){
  if(!Number.isInteger(options.perGrade)||options.perGrade<ALL_TOPIC_TYPES.length||options.perGrade>2000||!Number.isSafeInteger(options.seed)||options.seed<1||!/^[a-z0-9-]{1,70}$/.test(options.batchId)||!Number.isFinite(Date.parse(options.generatedAt)))throw Error('Invalid complete bank configuration');
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  const stems=new Set<string>(),visuals=new Set<string>();
  for(const pair of options.existingHashes||[]){if(pair.length!==2||pair.some(s=>!/^[a-f0-9]{64}$/.test(s)))throw Error('Invalid historical hashes');visuals.add(pair[0]);stems.add(pair[1]);}
  const questions:BankQuestion[]=[],distribution:Record<number,{count:number;types:Record<string,number>;difficulty:Record<string,number>;category:Record<string,number>;cells:Record<string,number>}>={};
  const rejections={generation:0,quality:0,duplicate:0};let attempts=0;
  for(const grade of [1,2,3,4] as SchoolGrade[]){
    const counts={count:0,types:{} as Record<string,number>,difficulty:{} as Record<string,number>,category:{} as Record<string,number>,cells:{} as Record<string,number>};distribution[grade]=counts;
    for(let i=0;i<options.perGrade;i++){
      const type:QuestionType=ALL_TOPIC_TYPES[i%ALL_TOPIC_TYPES.length];
      // First rounds guarantee every class-appropriate type/level cell.
      const cycle=Math.floor(i/ALL_TOPIC_TYPES.length),max=EDUCATION_PROFILES[grade].maxDifficulty;
      const difficulty=cycle<max?cycle+1:professionalDifficulty(grade,cycle*13+i%ALL_TOPIC_TYPES.length);
      let accepted:BaseQuestion|undefined,visualHash='',stemHash='';
      for(let retry=0;retry<1000;retry++){
        const seed=(options.seed+(++attempts)*104729)%2147483647||1;
        try{const q=generateQuestion({profile:'complete',type,targetGrade:grade,difficulty:difficulty as 1|2|3|4|5|6,seed});
          const audit=auditQuestion(q);if(!audit.solverVerified||audit.errors.length||audit.reviewRequired.length){rejections.quality++;continue;}
          visualHash=hash(questionVisualKey(q));stemHash=hash(stemKey(q));
          if(visuals.has(visualHash)||stems.has(stemHash)){rejections.duplicate++;continue;}
          const proof=runMultiPassQuestionTests(q);if(!proof.isVerified){rejections.quality++;continue;}proof.testedAt=options.generatedAt;
          accepted=stampQuestionVerification(q,proof);break;
        }catch{rejections.generation++;}
      }
      if(!accepted)throw Error(`Kapsam eksik: sınıf ${grade}, konu ${type}, zorluk ${difficulty}. Kota başka konuya aktarılamaz.`);
      questions.push({...accepted,id:`${options.batchId}-g${grade}-${String(i+1).padStart(4,'0')}`,status:'review',revision:1,isCustom:true,createdAt:options.generatedAt,updatedAt:options.generatedAt,updatedBy:'question-robot',sourceBatch:options.batchId,batchValidation:{policy:COMPLETE_BANK_POLICY,automaticChecks:'passed',editorReview:'pending',visualKeySha256:visualHash,stemKeySha256:stemHash}});
      visuals.add(visualHash);stems.add(stemHash);counts.count++;
      for(const [bucket,k] of [[counts.types,type],[counts.difficulty,String(difficulty)],[counts.category,TOPIC_CATEGORY[type]],[counts.cells,`${type}:${difficulty}`]] as const)bucket[k]=(bucket[k]||0)+1;
      if((i+1)%100===0)options.onProgress?.(grade,i+1);
    }
    if(Object.keys(counts.types).length!==44)throw Error('44 konu zorunlu.');
    for(const type of ALL_TOPIC_TYPES)for(let d=1;d<=EDUCATION_PROFILES[grade].maxDifficulty;d++)if(!counts.cells[`${type}:${d}`])throw Error(`Konu/zorluk hücresi eksik: ${grade}/${type}/${d}`);
  }
  return {batchId:options.batchId,policy:COMPLETE_BANK_POLICY,seed:options.seed,generatedAt:options.generatedAt,summary:{total:questions.length,perGrade:options.perGrade,topicCount:44,existingCompared:options.existingHashes?.length||0,attempts,rejections,distribution},questions};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
  if(!args.output||!args.batch)throw Error('Usage: --output private-bank.json --batch robot-YYYYMMDD --per-grade 2000 --existing-hashes private-hashes.json');
  const existingHashes=args['existing-hashes']?JSON.parse(await readFile(args['existing-hashes'],'utf8')):[];
  const result=generateCompleteBank({perGrade:Number(args['per-grade']||2000),seed:Number(args.seed||20261014),batchId:args.batch,generatedAt:args.at||new Date().toISOString(),existingHashes,onProgress:(g,n)=>process.stderr.write(`Sınıf ${g}: ${n}\n`)});
  await writeFile(args.output,JSON.stringify(result));console.log(JSON.stringify(result.summary));
}
