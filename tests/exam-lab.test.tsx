import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EXAM_MECHANICS,examAllowed,generateExamQuestion,solveExam,independentlyMatchesExam,combineExamTiles,transformExamTile,validateExamBoard,type ExamTile} from '../src/features/questions/exam-lab';
import {auditQuestion,isQuestionReadyForStudents} from '../src/features/questions/quality';
import {EDUCATION_PROFILES} from '../src/features/questions/quality-policy';
import {QuestionRenderer} from '../src/features/questions/renderers/QuestionRenderer';
import {OptionRenderer} from '../src/features/questions/renderers/OptionRenderer';
import {AnswerWorkspace} from '../src/features/questions/renderers/AnswerWorkspace';
import {assertLearningQuestionFormat,currentReasoningCandidate,generateVariedLearningQuestion} from '../server/learning-question-selection';
import {LEARNING_QUESTION_FORMAT,PREVIOUS_REFERENCE_QUESTION_FORMAT} from '../src/features/student/learning-question-format';
const tile=(cells:number[]):ExamTile=>({exam:'tile',width:2,height:2,cells});
test('hand-computed reflection, turn, union, intersection and removal agree with cell geometry',()=>{
 const a=tile([0,1,2,3]);assert.deepEqual(transformExamTile(a,'mirror-x').cells,[1,0,3,2]);assert.deepEqual(transformExamTile(a,'mirror-y').cells,[2,3,0,1]);assert.deepEqual(transformExamTile(a,'quarter').cells,[2,0,3,1]);
 const left=tile([1,0,1,0]),right=tile([1,1,0,0]);
 assert.deepEqual(combineExamTiles(left,right,'union').cells,[1,1,1,0]);assert.deepEqual(combineExamTiles(left,right,'intersection').cells,[1,0,0,0]);assert.deepEqual(combineExamTiles(left,right,'xor').cells,[0,1,1,0]);
 const b={displayMode:'exam_lab',grade:1,mechanic:'detail-mirror',source:a,axis:'vertical'};
 assert.ok(independentlyMatchesExam(b,tile([1,0,3,2])));assert.equal(independentlyMatchesExam(b,a),false);
});
test('all supported grades, levels and six mechanics have one independently proved visible answer',()=>{
 let total=0;
 for(const g of [1,2,3,4] as const)for(let d=1;d<=EDUCATION_PROFILES[g].maxDifficulty;d++)for(const m of EXAM_MECHANICS)if(examAllowed(m,g,d))for(let i=1;i<=12;i++){
  const q=generateExamQuestion(m,i*104729,d as 1,g),r=auditQuestion(q);total++;
  assert.deepEqual([...r.errors,...r.reviewRequired],[],`${g}/${d}/${m}/${i}`);assert.equal(r.solverVerified,true);assert.ok(isQuestionReadyForStudents(q));
  assert.equal(q.options.filter(o=>independentlyMatchesExam(q.visualConfig,o.visualData)).length,1);assert.deepEqual(generateExamQuestion(m,i*104729,d as 1,g),q);
  if(i===1){assert.equal(auditQuestion({...q,correctOptionId:q.options.find(o=>o.id!==q.correctOptionId)!.id}).solverVerified,false);assert.ok(auditQuestion({...q,explanation:{...q.explanation,summary:'Yanlış açıklama'}}).reviewRequired.length);}
 }
 assert.ok(total>900);console.log('Exam seeded cases:',total);
});
test('contradictory examples, hidden answer metadata and age-inappropriate geometry are rejected',()=>{
 const patchWithNoVisibleThirdPeriodPeer={displayMode:'exam_lab',grade:1,mechanic:'context-patch',width:4,height:4,hole:{x:1,y:1,width:1,height:1},cells:Array.from({length:16},(_,i)=>i===5?null:(i%4+Math.floor(i/4))%2)};
 assert.ok(independentlyMatchesExam(patchWithNoVisibleThirdPeriodPeer,{exam:'tile',width:1,height:1,cells:[0]}));
 assert.equal(independentlyMatchesExam(patchWithNoVisibleThirdPeriodPeer,{exam:'tile',width:1,height:1,cells:[1]}),false);
 const q=generateExamQuestion('overlap-rule',104729,2,2),b=structuredClone(q.visualConfig) as Record<string,unknown>;
 assert.throws(()=>validateExamBoard({...b,answer:1}));
 assert.throws(()=>solveExam({...b,cards:Array(9).fill(tile([0,0,0,0])).map((v,i)=>i===8?null:v)}));
 const matrix=generateExamQuestion('composition-matrix',104729,3,3);assert.throws(()=>validateExamBoard({...matrix.visualConfig,grade:1}));
 const patch=generateExamQuestion('context-patch',104729,3,3);assert.throws(()=>validateExamBoard({...patch.visualConfig,grade:1}));
});
test('rendering and placement use full vector cards; old clients cannot receive the new format',()=>{
 for(const g of [1,2,3,4] as const)for(const m of EXAM_MECHANICS)if(examAllowed(m,g,2)){
  const q=generateExamQuestion(m,81719,2,g),html=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} option={o}/>)}<AnswerWorkspace question={q} response={null} preferredMode="place" onChange={()=>{}}/></>);
  assert.match(html,/bj-exam-board/);assert.match(html,/bj-exam-tile/);assert.doesNotMatch(html,/undefined|NaN|\[object Object\]|Çizim eksik/);
  assert.throws(()=>assertLearningQuestionFormat([q],PREVIOUS_REFERENCE_QUESTION_FORMAT));assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));
  assert.equal(currentReasoningCandidate(q,g,true,true,true,true,true,false),false);assert.equal(currentReasoningCandidate(q,g,true,true,true,true,true,true),true);
 }
 const q=generateVariedLearningQuestion({grade:1,category:'spatial',difficulty:2,seed:81719,typeCounts:new Map(),curriculumV2:true,exam:true,acceptCandidate:q=>q.authoring?.engine==='exam-lab-1',randomIndex:()=>0});assert.equal(q.authoring?.engine,'exam-lab-1');
});
