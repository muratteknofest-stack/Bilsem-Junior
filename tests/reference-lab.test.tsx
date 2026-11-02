import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
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
 const generated=generateVariedLearningQuestion({grade:2,category:'coding',difficulty:2,seed:104729,typeCounts:new Map(),curriculumV2:true,perceptual:true,cube:true,reference:true,acceptCandidate:q=>q.authoring?.engine==='reference-lab-1',randomIndex:()=>0});assert.equal(generated.authoring?.engine,'reference-lab-1');assert.ok(isQuestionReadyForStudents(generated));
 const other=generateReferenceQuestion('texture-patch',81719,2,2);assert.notEqual(questionStimulusKey(q),questionStimulusKey(other));
});
