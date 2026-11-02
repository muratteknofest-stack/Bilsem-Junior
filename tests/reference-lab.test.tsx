import './exam-lab.test';
import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
import {createHash}from'node:crypto';
import {PGlite}from'@electric-sql/pglite';
import {buildReferenceUpgradeSql,type UpgradeRow}from'../scripts/prepare-reference-choice-upgrade';
import{generateReferenceQuestionV1,TOOL_PAIRS}from'../src/features/questions/reference-lab';
import{REFERENCE_MECHANICS,REFERENCE_TOPICS,referenceAllowed,generateReferenceQuestion,solveReference,independentlyMatchesReference,validateReferenceBoard,visibleReferenceKey,type ReferenceBoard}from'../src/features/questions/reference-lab';
import{auditQuestion,isQuestionReadyForStudents,questionStimulusKey}from'../src/features/questions/quality';
import{QuestionRenderer}from'../src/features/questions/renderers/QuestionRenderer';import{OptionRenderer}from'../src/features/questions/renderers/OptionRenderer';import{AnswerWorkspace}from'../src/features/questions/renderers/AnswerWorkspace';import{MemoryStudy}from'../src/features/questions/renderers/MemoryStudy';
import{assertLearningQuestionFormat,currentReasoningCandidate,generateVariedLearningQuestion}from'../server/learning-question-selection';
import{LEARNING_QUESTION_FORMAT,PREVIOUS_CUBE_QUESTION_FORMAT,PREVIOUS_PERCEPTUAL_QUESTION_FORMAT}from'../src/features/student/learning-question-format';import{generateCubeQuestion}from'../src/features/questions/cube-lab';
const common={displayMode:'reference_lab',grade:2}as const;
test('hand-calculated semantic, wrong-position, memory and substitution rules have one visible answer',()=>{
 const fixtures:Array<[unknown,unknown]>=[
 [{...common,mechanic:'semantic-analogy',examples:[['key','lock']],query:'scissors',reverse:false},{reference:'object',id:'paper'}],
 [{...common,mechanic:'broken-pattern',unit:['key','lock'],sequence:['key','lock','key','lock','lock','lock']},{textNumber:5}],
 [{...common,mechanic:'paired-memory',pairs:[['key','paper'],['brush','lock'],['spoon','nail']],query:'brush'},{reference:'object',id:'lock'}],
 [{...common,mechanic:'number-memory',digits:[8,2,6,3],position:3},{textNumber:6}],
 [{...common,mechanic:'symbol-code',key:[['key',7],['paper',2],['lock',5]],query:['paper','key','paper']},{textNumber:'272'}],
 [{...common,mechanic:'word-code',examples:[['KAR','527'],['ARKA','2752']],query:'KARA'},{textNumber:'5272'}],
 ];
 for(const[b,v]of fixtures){assert.deepEqual(solveReference(b),v);assert.ok(independentlyMatchesReference(b,v));}
});
test('texture hole phase and exact union of named parts reject near matches and ambiguity',()=>{
 const patch={...common,mechanic:'texture-patch',size:3,motifSize:2,motif:[0,1,2,3],cells:[0,1,0,2,null,null,0,1,0],hole:{x:1,y:1,width:2,height:1}};
 const v={reference:'patch',width:2,height:1,cells:[3,2]};assert.deepEqual(solveReference(patch),v);assert.ok(independentlyMatchesReference(patch,v));assert.equal(independentlyMatchesReference(patch,{...v,cells:[2,3]}),false);
 const parts={...common,mechanic:'parts-union',size:2,pieces:[{size:2,cells:[1,0,0,0]},{size:2,cells:[0,1,0,0]},{size:2,cells:[0,0,1,0]},{size:2,cells:[0,0,0,1]}],target:[1,0,1,0],use:2};
 const answer=solveReference(parts);assert.ok('reference'in answer&&answer.reference==='parts');assert.deepEqual(answer.pieces.map(p=>p.index),[1,3]);assert.ok(independentlyMatchesReference(parts,answer));
 const corrupted=structuredClone(answer);corrupted.pieces[0].cells=[1,1,0,0];assert.equal(independentlyMatchesReference(parts,corrupted),false);
 assert.throws(()=>solveReference({...parts,pieces:[...parts.pieces,{size:2,cells:[1,0,1,0]}]}),/PARTS_NOT_UNIQUE/);
});
test('layer choices compare visible top materials and preserve both shape and order',()=>{
 const b={...common,mechanic:'layered-top',layers:[{shape:'square',color:0},{shape:'circle',color:1},{shape:'triangle',color:2}]};
 const v=solveReference(b);assert.ok(independentlyMatchesReference(b,v));assert.ok('reference'in v&&v.reference==='layers');
 assert.equal(independentlyMatchesReference(b,{...v,layers:[...v.layers].reverse()}),false);
 const changed={...v,layers:v.layers.map((l,i)=>i===2?{...l,shape:'circle'}:l)};assert.notEqual(visibleReferenceKey(v),visibleReferenceKey(changed as typeof v));
});
test('hidden keys, invalid holes, conflicting or incomplete code examples and excessive first-grade memory fail',()=>{
 for(const b of [{...common,mechanic:'word-code',examples:[['KAR','123'],['ARKA','2441']],query:'KARA'},
  {...common,mechanic:'word-code',examples:[['KAR','123'],['ARKA','2312']],query:'KALEM'},
  {...common,mechanic:'number-memory',digits:[1,2,3],position:4},
  {...common,grade:1,mechanic:'number-memory',digits:[1,2,3,4],position:2},
  {...common,mechanic:'broken-pattern',unit:['key','lock'],sequence:['key','lock','key','lock','key','lock']},
  {...common,mechanic:'layered-top',layers:[{shape:'circle',color:0},{shape:'square',color:1}],answer:2}])assert.throws(()=>validateReferenceBoard(b));
});
test('every supported grade/difficulty/mechanic passes two proofs and rejects forged answers, duplicate choices and changed explanations',()=>{
 let total=0;
 for(const g of[1,2,3,4]as const)for(let d=1;d<=6;d++)for(const m of REFERENCE_MECHANICS)if(referenceAllowed(m,g,d))for(let i=1;i<=20;i++){
  const q=generateReferenceQuestion(m,104729*i,d as 1,g),r=auditQuestion(q);total++;
  assert.deepEqual([...r.errors,...r.reviewRequired],[],`${g}/${d}/${m}/${i}`);assert.equal(r.solverVerified,true);assert.equal(q.type,REFERENCE_TOPICS[m]);
  assert.equal(new Set(q.options.map(o=>visibleReferenceKey(o.visualData as ReturnType<typeof solveReference>))).size,4);assert.equal(q.options.filter(o=>independentlyMatchesReference(q.visualConfig,o.visualData)).length,1);
  assert.deepEqual(generateReferenceQuestion(m,104729*i,d as 1,g),q);
  if(i===1){assert.equal(auditQuestion({...q,correctOptionId:q.options.find(o=>o.id!==q.correctOptionId)!.id}).solverVerified,false);const changed=structuredClone(q);changed.options[1].visualData=changed.options[0].visualData;assert.equal(auditQuestion(changed).solverVerified,false);assert.ok(auditQuestion({...q,explanation:{...q.explanation,summary:'Yanlış açıklama'}}).reviewRequired.length);}
 }
 assert.ok(total>=1800);
});
test('memory hides response controls until study ends; other diagrams contain no missing renderer or hidden-key output',()=>{
 for(const m of REFERENCE_MECHANICS){const d=m==='semantic-analogy'?2:3,q=generateReferenceQuestion(m,81719,d,3),html=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} option={o}/>)}</>);assert.match(html,/bj-reference-lab/);assert.doesNotMatch(html,/undefined|NaN|\[object Object\]|Çizim eksik/);
  assert.doesNotMatch(JSON.stringify(q.visualConfig),/answer|correctOptionId|distractorNotes|seed/);
  for(const o of q.options){const v=o.visualData as {textNumber?:string};if(typeof v.textNumber==='string'&&v.textNumber.length>4){const choice=renderToStaticMarkup(<OptionRenderer option={o}/>);assert.match(choice,/bj-answer-number/);assert.doesNotMatch(choice,/bj-answer-text/);}}
  if(q.type==='visual_memory'){const locked=renderToStaticMarkup(<MemoryStudy question={q}><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={null} onChange={()=>{}}/></MemoryStudy>);assert.match(locked,/data-locked="true"/);assert.doesNotMatch(locked,/zp-answer-option/);assert.match(locked,/Deseni gizle ve cevapla/);}
 }
});
test('new questions are gated from old clients, while current clients retain cube and prior visuals',()=>{
 const q=generateReferenceQuestion('texture-patch',104729,2,2);
 for(const format of[undefined,'reasoning-lab-2',PREVIOUS_PERCEPTUAL_QUESTION_FORMAT,PREVIOUS_CUBE_QUESTION_FORMAT])assert.throws(()=>assertLearningQuestionFormat([q],format));
 assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true),true);assert.equal(currentReasoningCandidate(q,2,true,true,true,true,false),false);
 const cube=generateCubeQuestion('total',104729,2,2);assert.doesNotThrow(()=>assertLearningQuestionFormat([cube],PREVIOUS_CUBE_QUESTION_FORMAT));assert.doesNotThrow(()=>assertLearningQuestionFormat([cube],LEARNING_QUESTION_FORMAT));
 const generated=generateVariedLearningQuestion({grade:2,category:'coding',difficulty:2,seed:104729,typeCounts:new Map(),curriculumV2:true,perceptual:true,cube:true,reference:true,acceptCandidate:q=>q.authoring?.engine==='reference-lab-2',randomIndex:()=>0});assert.equal(generated.authoring?.engine,'reference-lab-2');assert.ok(isQuestionReadyForStudents(generated));
 const other=generateReferenceQuestion('texture-patch',81719,2,2);assert.notEqual(questionStimulusKey(q),questionStimulusKey(other));
});
test('published version-one canonical questions remain byte-identical and pass the current auditor',()=>{
 const fixtures=[
 ['semantic-analogy',20365831,1,1,'7161ecb88e03be4c26213d7a02a37b338f0e3f4f0d738bb38faa76712c2febe0'],
 ['broken-pattern',21413121,1,1,'2ceaafac9486eebab0bf8d469957d4a44149400e48e349be22f6bf2454c4d300'],
 ['paired-memory',22460411,1,1,'d766a5ddf35bac69b712a303448843ad5129e2ee188e3ef14d83adeeaf4ff501'],
 ['number-memory',23507701,1,1,'3bc2caaf3d949d539a60c3dfc8f02fc306ae63ec930df7c52bb43d8ae821d638'],
 ['symbol-code',24554991,1,1,'cf61c4769a9c080e993a03c45476906bf6c3888ee96aaea11ba432a81cfd98d6'],
 ['texture-patch',25602281,1,1,'8e77d76b5a4aebfca574cd1811f66f904459b7ff67758f8363b423e73fa5672d'],
 ['parts-union',26649571,1,1,'72a60023b82c9c033f7b0c97e645a4c8c49d380903b6f5b31fd1dacea15e3c95'],
 ['layered-top',27696861,1,1,'bab3b433f97da02d7b3a3d9caea37f6fc342d86bf3499d94665d5018278c0d53'],
 ['word-code',52517634,2,2,'96c83b4d47e6ce367ec8f6102dd1fc2b3a306b90f1fa2dd6e220ab9c961bf71a'],
 ]as const;
 for(const[m,seed,d,g,hash]of fixtures){const q=generateReferenceQuestionV1(m,seed,d,g),fields=['prompt','secondaryPrompt','explanation','visualConfig','category','options','authoring']as const;
  assert.equal(createHash('sha256').update(JSON.stringify(Object.fromEntries(fields.filter(k=>q[k]!==undefined).map(k=>[k,q[k]])))).digest('hex'),hash);
  const proof=auditQuestion(q);assert.deepEqual([...proof.errors,...proof.reviewRequired],[]);assert.ok(proof.solverVerified);
 }
});
test('codes and patches cannot be solved by any single option position; familiar distractors retain the memory and relation task',()=>{
 for(const g of[1,2,3,4]as const)for(let d=1;d<=4;d++)for(const m of REFERENCE_MECHANICS)if(referenceAllowed(m,g,d))for(let i=1;i<=8;i++){
  const q=generateReferenceQuestion(m,104729*i,d as 1,g),old=generateReferenceQuestionV1(m,104729*i,d as 1,g),b=q.visualConfig as ReferenceBoard,answer=solveReference(b);
  assert.equal(questionStimulusKey(q),questionStimulusKey(old),'Better options do not create a new task');
  assert.deepEqual(b,old.visualConfig);assert.equal(q.authoring?.engine,'reference-lab-2');
  const values=q.options.map(o=>o.visualData as ReturnType<typeof solveReference>);
  if('textNumber'in answer&&typeof answer.textNumber==='string')for(let j=0;j<answer.textNumber.length;j++)assert.ok(values.filter(v=>'textNumber'in v&&String(v.textNumber)[j]===String(answer.textNumber)[j]).length>=2,`${m}: position ${j} is a shortcut`);
  if('reference'in answer&&answer.reference==='patch')for(let j=0;j<answer.cells.length;j++)assert.ok(values.filter(v=>'reference'in v&&v.reference==='patch'&&v.cells[j]===answer.cells[j]).length>=2);
  if(b.mechanic==='paired-memory')for(const v of values)assert.ok('reference'in v&&v.reference==='object'&&b.pairs.flat().includes(v.id));
  if(b.mechanic==='number-memory')assert.ok(values.filter(v=>'textNumber'in v&&b.digits.includes(Number(v.textNumber))).length>=Math.min(4,b.digits.length));
  if(b.mechanic==='semantic-analogy')for(const v of values)assert.ok('reference'in v&&v.reference==='object'&&TOOL_PAIRS.some(p=>p[b.reverse?0:1]===v.id));
  if(b.mechanic==='layered-top')for(let j=0;j<b.layers.length;j++)assert.ok(values.some(v=>'reference'in v&&v.reference==='layers'&&JSON.stringify(v.layers[j])!==JSON.stringify(b.layers[j])),'No layer is irrelevant to all four choices');
  assert.equal(Object.keys(q.authoring!.distractorNotes!).length,3);
  assert.doesNotMatch(Object.values(q.authoring!.distractorNotes!).join(' '),/undefined|NaN|en az biri sağlanmıyor/);
 }
});
test('part distractors are the closest wrong complete unions, and changing engine identity cannot bypass canonical review',()=>{
 const q=generateReferenceQuestion('parts-union',81719,4,4),b=q.visualConfig as Extract<ReferenceBoard,{mechanic:'parts-union'}>;
 const score=(ids:number[])=>b.target.filter((v,i)=>v!==Number(ids.some(j=>b.pieces[j].cells[i]))).length;
 const scores:number[]=[];for(let a=0;a<b.pieces.length;a++)for(let d=a+1;d<b.pieces.length;d++)for(let e=d+1;e<b.pieces.length;e++){const n=score([a,d,e]);if(n)scores.push(n);}
 const actual=q.options.filter(o=>o.id!==q.correctOptionId).map(o=>{const v=o.visualData as Extract<ReturnType<typeof solveReference>,{reference:'parts'}>;return score(v.pieces.map(p=>p.index-1));});
 assert.deepEqual(actual.sort((a,b)=>a-b),scores.sort((a,b)=>a-b).slice(0,3));
 const report=auditQuestion({...q,authoring:{...q.authoring!,engine:'reference-lab-7'}});assert.ok(report.errors.length+report.reviewRequired.length>0);
});
test('guarded bank upgrades reject an entire stale or malformed batch, preserve givens, and cannot replay a revision',async()=>{
 const db=new PGlite(),commit='ac67ec5f199a55e88e0fa70d2b02df838f477687';
 try{
  await db.exec(`create table public.questions(id text primary key,data jsonb not null,revision int,status text,reviewed_by text);
   create function sync_question_test() returns trigger language plpgsql as $$begin new.revision:=(new.data->>'revision')::int;new.status:=new.data->>'status';return new;end$$;
   create trigger sync_test before insert or update on public.questions for each row execute function sync_question_test();`);
  const rows:UpgradeRow[]=[];
  for(const [i,seed]of[104729,81719].entries()){
   const id=`reference-20261102-${String(i+1).padStart(5,'0')}`,old={...generateReferenceQuestionV1('symbol-code',seed,3,3),id,status:'published',revision:2,sourceBatch:'reference-20261102'};
   const next={...generateReferenceQuestion('symbol-code',seed,3,3),id,status:'published',revision:3,sourceBatch:old.sourceBatch,batchValidation:{automaticChecks:'passed',individualHumanReview:false,editorReview:'pending'},releaseAuthorization:{sourceCommit:commit,individualHumanReview:false}};
   await db.query('insert into public.questions(id,data) values($1,$2::jsonb)',[id,JSON.stringify(old)]);
   const hashes=await db.query<{before:string;after:string}>("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') before,encode(sha256(convert_to($2::jsonb::text,'UTF8')),'hex') after",[JSON.stringify(old),JSON.stringify(next)]);
   rows.push({id,expectedSha256:hashes.rows[0].before,nextSha256:hashes.rows[0].after,data:next});
  }
  const stale=structuredClone(rows);stale[1].expectedSha256='0'.repeat(64);
  assert.equal((await db.query<{updated:number}>(buildReferenceUpgradeSql(stale,commit))).rows[0].updated,0);
  const missing=structuredClone(rows);delete (missing[0].data.batchValidation as Record<string,unknown>).individualHumanReview;
  missing[0].nextSha256=(await db.query<{h:string}>("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') h",[JSON.stringify(missing[0].data)])).rows[0].h;
  assert.equal((await db.query<{updated:number}>(buildReferenceUpgradeSql(missing,commit))).rows[0].updated,0);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.questions where revision=2')).rows[0].n,2);
  assert.equal((await db.query<{updated:number}>(buildReferenceUpgradeSql(rows,commit))).rows[0].updated,2);
  assert.equal((await db.query<{updated:number}>(buildReferenceUpgradeSql(rows,commit))).rows[0].updated,0);
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.questions where revision=3 and status='published' and reviewed_by is null")).rows[0].n,2);
 }finally{await db.close();}
});
