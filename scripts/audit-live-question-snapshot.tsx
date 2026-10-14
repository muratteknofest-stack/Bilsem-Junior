import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {generateQuestionByType} from '../src/features/questions/generators';
import {auditQuestion,questionVisualKey} from '../src/features/questions/quality';
import {solveQuestion} from '../src/features/questions/universal-solver';
import {analyzeQuestionMechanics} from '../src/features/questions/mechanical-quality';
import {publicVisualConfig} from '../src/features/questions/public-visual';
import {QuestionRenderer} from '../src/features/questions/renderers/QuestionRenderer';
import {OptionRenderer} from '../src/features/questions/renderers/OptionRenderer';
import type {BaseQuestion,DifficultyLevel,QuestionType} from '../src/types';
import {stemKey} from './generate-grade-bank';
import {matchesVisibleMosaic,checkArithmeticExplanations} from './question-proof-checks';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node --import tsx scripts/audit-live-question-snapshot.tsx metadata.json report.json');
type Meta={id:string;grade:1|2|3|4;type:QuestionType;seed:number;difficulty:DifficultyLevel;engine:string;core_hash:string;data_hash:string};
const snapshot=JSON.parse(await readFile(input,'utf8')) as {snapshot:{total:number;snapshot_hash:string;individually_reviewed:number};excludedKeys:string[];questions:Meta[]};
const excludedKeys=['id','status','revision','createdAt','updatedAt','updatedBy','sourceBatch','batchValidation','verificationStatus','releaseAuthorization','reviewedBy','reviewedAt','isCustom'];
if(JSON.stringify(snapshot.excludedKeys)!==JSON.stringify(excludedKeys))throw Error('Unexpected live-content projection');
const md5=(s:string)=>createHash('md5').update(s).digest('hex');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
if(snapshot.questions.length!==4000||snapshot.snapshot.total!==4000||new Set(snapshot.questions.map(q=>q.id)).size!==4000)throw Error('Incomplete snapshot');
if(md5(snapshot.questions.map(q=>q.id+':'+q.data_hash).join(','))!==snapshot.snapshot.snapshot_hash)throw Error('Snapshot changed or unordered/incomplete rows');
for(const grade of [1,2,3,4])if(snapshot.questions.filter(q=>q.grade===grade).length!==1000)throw Error('Expected 1000 questions in each grade');
const db=new PGlite();
const failures:{id:string;stage:string;details:string[]}[]=[],rows:Record<string,any>[]=[],stems=new Map<string,string>(),visuals=new Map<string,string>();
const grades:Record<number,{total:number;passed:number}>={},types:Record<string,{total:number;passed:number}>={};
const questions:BaseQuestion[]=[];
let arithmeticEqualities=0,visibleMissingTileProofs=0;
try{
 for(let offset=0;offset<snapshot.questions.length;offset+=100){
  const metas=snapshot.questions.slice(offset,offset+100),cores:Record<string,unknown>={},built:BaseQuestion[]=[];
  for(const meta of metas){
   const q=generateQuestionByType(meta.type,meta.seed,meta.difficulty);
   q.id=meta.id;q.targetGrade=meta.grade;q.targetGrades=[meta.grade];q.ageGroup=meta.grade<=2?'1-2':'3-4';
   const core=Object.fromEntries(Object.entries(q).filter(([key])=>!excludedKeys.includes(key)));
   cores[meta.id]=core;built.push(q);
  }
  // PostgreSQL itself canonicalizes JSONB. No hand-written key ordering or numeric formatting.
  const canonical=await db.query<{key:string;canonical:string}>('select key,value::text as canonical from jsonb_each($1::jsonb)',[JSON.stringify(cores)]);
  const hashes=new Map(canonical.rows.map(row=>[row.key,md5(row.canonical)]));
  for(let index=0;index<metas.length;index++){
   const meta=metas[index],q=built[index];
   if(hashes.get(meta.id)!==meta.core_hash||q.authoring?.engine!==meta.engine){failures.push({id:meta.id,stage:'live-content-match',details:['Live question differs from reconstructed content. Full row must be retrieved before audit.']});continue;}
   questions.push(q);
  }
  console.error(`Live content matched: ${Math.min(offset+100,4000)}/4000`);
 }
 for(const q of questions){
  const audit=auditQuestion(q),solve=solveQuestion(q),mechanics=analyzeQuestionMechanics(q),details=[...audit.errors,...audit.reviewRequired];
  if(!audit.solverVerified||!solve.canSolve||!solve.isMatch||solve.ambiguityDetected||!mechanics.passed)details.push('Solver/option proof failed');
  const arithmetic=checkArithmeticExplanations(q);arithmeticEqualities+=arithmetic.checked.length;details.push(...arithmetic.errors.map(e=>'Explanation arithmetic: '+e));
  if(q.type==='figure_completion'&&(q.visualConfig as any).displayMode==='colorful_board'){
   visibleMissingTileProofs++;const matches=q.options.filter(o=>matchesVisibleMosaic(q,o.visualData as any));
   if(matches.length!==1||matches[0].id!==q.correctOptionId)details.push('Missing tile not uniquely inferable from visible rows');
  }
  const stem=sha(stemKey(q)),visual=sha(questionVisualKey(q));
  for(const [set,key,label] of [[stems,stem,'duplicate-stem'],[visuals,visual,'duplicate-visual']] as const){if(set.has(key))details.push(label+': '+set.get(key));else set.set(key,q.id);}
  const visible={...q,visualConfig:publicVisualConfig(q)};
  const board=renderToStaticMarkup(<QuestionRenderer question={visible}/>);
  const choiceMarkup=q.options.map(option=>renderToStaticMarkup(<OptionRenderer option={{...option,id:'X',label:'X'}} question={q} questionType={q.type}/>));
  if(new Set(choiceMarkup).size!==4)details.push('Rendered options not distinct');
  if([board,...choiceMarkup].some(html=>/Tanımsız sembol|görünümü tanımlı değil|\[object Object\]|correctOptionId|distractorNotes/.test(html)))details.push('Render fallback or private answer metadata');
  const wrongKey=q.options.find(o=>o.id!==q.correctOptionId)!.id;
  const wrong=solveQuestion({...q,correctOptionId:wrongKey});
  if(wrong.isMatch)details.push('Incorrect answer-key mutation was accepted');
  const duplicate=analyzeQuestionMechanics({...q,options:[q.options[0],{...q.options[1],visualData:q.options[0].visualData},...q.options.slice(2)]});
  if(duplicate.passed)details.push('Duplicate-option mutation was accepted');
  const grade=grades[q.targetGrade!]||={total:0,passed:0},type=types[q.type]||={total:0,passed:0};
  grade.total++;type.total++;if(!details.length){grade.passed++;type.passed++;}else failures.push({id:q.id,stage:'content-audit',details});
  rows.push({id:q.id,grade:q.targetGrade,type:q.type,answer:q.correctOptionId,solver:solve.solverMethod,optionMatches:mechanics.matchingOptions,passed:!details.length});
 }
 const report={checkedAt:new Date().toISOString(),snapshot:snapshot.snapshot,total:snapshot.questions.length,liveContentMatched:questions.length,passed:rows.filter(r=>r.passed).length,failed:failures.length,grades,types,uniqueStems:stems.size,uniqueVisuals:visuals.size,arithmeticEqualities,visibleMissingTileProofs,mutationChecks:{wrongAnswerKey:questions.length,duplicateOption:questions.length},scope:['Live content hash match (instructions, visual, options, answer, explanation, grade and engine)','Primary calculation and separate candidate/board proof','Exactly one correct option and four distinct rendered choices','Template explanation and audience policy','Independent evaluation of explicit arithmetic equalities in explanations','Missing mosaic tiles inferred without reading the stored hidden colour','Unique visible stems/visuals','Student visual rendering without answer metadata','Reject incorrect answer keys and duplicate options'],limits:['Automated rule-family proof; finite sequences can have other mathematical continuations outside the declared curriculum.','Rendered markup checks do not certify mobile layout, eyesight/accessibility or pedagogical validity.','Template consistency is not an independent human reading of every explanation.','No individual educator review is recorded by this audit.'],failures,rows};
 await writeFile(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,rows:undefined,types:undefined},null,2));
 if(failures.length)process.exitCode=1;
}finally{await db.close();}
