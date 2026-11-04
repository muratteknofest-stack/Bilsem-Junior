import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateVisualQuestion, VISUAL_MECHANICS, visualAllowed, solveVisualBoard, validateVisualBoard, reflectObjects, unfoldHoles, TANGRAM_SEVEN, polygonArea, pieceMask, visualValueKey, type VisualValue } from '../src/features/questions/visual-reasoning-lab';
import { independentlyMatchesVisual } from '../src/features/questions/visual-reasoning-solver';
import { auditQuestion } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { publicVisualConfig } from '../src/features/questions/public-visual';
import { supportsVisualLabFormat, supportsExamFormat, LEARNING_QUESTION_FORMAT } from '../src/features/student/learning-question-format';
import { assertLearningQuestionFormat, currentReasoningCandidate, generateVariedLearningQuestion } from '../server/learning-question-selection';
import type { SchoolGrade } from '../src/features/questions/quality-policy';
import type { DifficultyLevel } from '../src/types';

test('eight visual mechanics prove one visible answer across all supported grade and difficulty limits',()=>{
 let checked=0;
 for(const grade of [1,2,3,4] as SchoolGrade[])for(const difficulty of [1,2,3,4,5,6] as DifficultyLevel[])for(const mechanic of VISUAL_MECHANICS)if(visualAllowed(mechanic,grade,difficulty))for(let sample=1;sample<=20;sample++){
  const q=generateVisualQuestion(mechanic,sample*7919,difficulty,grade),report=auditQuestion(q);
  assert.equal(report.solverVerified,true,JSON.stringify({grade,difficulty,mechanic,sample,report}));
  assert.equal(q.options.filter(o=>independentlyMatchesVisual(q.visualConfig,o.visualData)).length,1);
  assert.equal(new Set(q.options.map(o=>visualValueKey(o.visualData as VisualValue))).size,4);
  const inverted={...q,correctOptionId:q.options.find(o=>o.id!==q.correctOptionId)!.id};assert.equal(solveQuestion(inverted).isMatch,false);
  checked++;
 }
 assert.ok(checked>2000);
});

test('mirror geometry transforms both position and object handedness; x and y reflections are involutions',()=>{
 const objects=[{kind:'bird' as const,x:25,y:25,turn:1,flipped:false,detail:1,color:0}];
 assert.deepEqual(reflectObjects(objects,'vertical'),[{...objects[0],x:75,turn:3,flipped:true}]);
 assert.deepEqual(reflectObjects(objects,'horizontal'),[{...objects[0],y:75,turn:1,flipped:true}]);
 assert.deepEqual(reflectObjects(reflectObjects(objects,'vertical'),'vertical'),objects);
 assert.deepEqual(reflectObjects(reflectObjects(objects,'horizontal'),'horizontal'),objects);
});

test('fold punches have physical preimages, sequential unfolds, and reject holes outside the folded packet',()=>{
 assert.deepEqual(unfoldHoles(4,['x','y'],[[0,0]]),[[0,0],[3,0],[0,3],[3,3]]);
 const b={displayMode:'visual_lab',grade:2,mechanic:'fold-punch',size:6,folds:['x','y'],holes:[[0,1],[2,0]]};
 const answer=solveVisualBoard(b);assert.equal(independentlyMatchesVisual(b,answer),true);
 assert.equal(independentlyMatchesVisual(b,{lab:'holes',size:6,holes:[[0,1],[2,0]]}),false);
 assert.throws(()=>validateVisualBoard({...b,holes:[[3,1]]}));assert.throws(()=>validateVisualBoard({...b,folds:['x','x']}));
});

test('seven standard tangram pieces cover an exact square; equal-area rotations cannot pass a wrong gap',()=>{
 assert.deepEqual(TANGRAM_SEVEN.map(polygonArea),[4,4,2,1,1,2,2]);
 assert.equal(TANGRAM_SEVEN.reduce((a,p)=>a+polygonArea(p),0),16);
 assert.ok(pieceMask(TANGRAM_SEVEN).every(n=>n===1));
 const q=generateVisualQuestion('seven-piece',381,4,4);
 assert.equal(q.options.filter(o=>independentlyMatchesVisual(q.visualConfig,o.visualData)).length,1);
 const bad={...q.visualConfig as Record<string,unknown>,pieces:[TANGRAM_SEVEN[0],TANGRAM_SEVEN[0],...TANGRAM_SEVEN.slice(2,6)]};assert.throws(()=>validateVisualBoard(bad));
});

test('Raven and missing-symbol givens reject contradictions, ambiguity and hidden answer metadata',()=>{
 const latin=generateVisualQuestion('missing-symbol',37,4,4).visualConfig as Record<string,unknown>;
 assert.throws(()=>validateVisualBoard({...latin,cells:Array(16).fill(null)}));
 assert.throws(()=>validateVisualBoard({...latin,answer:2}));
 const raven=generateVisualQuestion('raven-relation',441,3,3).visualConfig as Record<string,unknown>;
 assert.throws(()=>validateVisualBoard({...raven,cards:Array.from({length:9},(_,i)=>i===8?null:{mask:1,turn:0})}));
});

test('new formats render every mechanic, retain public givens only, and cannot reach old installed APKs',()=>{
 assert.equal(supportsVisualLabFormat('exam-lab-1'),false);assert.equal(supportsExamFormat('exam-lab-1'),true);
 for(const m of VISUAL_MECHANICS){
  const q=generateVisualQuestion(m,7919,2,2),html=renderToStaticMarkup(<QuestionRenderer question={q}/>);
  assert.match(html,/<svg/);assert.doesNotMatch(html,/NaN|undefined|Infinity/);
  for(const option of q.options)assert.match(renderToStaticMarkup(<OptionRenderer option={option} questionType={q.type}/>),/svg|bj-answer-number/);
  assert.deepEqual(publicVisualConfig(q),q.visualConfig);
  assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT);assert.throws(()=>assertLearningQuestionFormat([q],'exam-lab-1'));
  assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,false),false);
  assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,true),true);
 }
});


import { generateShadowQuestion, shadowAnswer, shadowKey, independentlyMatchesShadow, validateShadowBoard, type ShadowBoard, type ShadowValue } from '../src/features/questions/composite-shadow';
import { supportsShadowFormat } from '../src/features/student/learning-question-format';
import { selectLearningQuestions } from '../server/learning-question-selection';
import { isQuestionReadyForStudents, questionStimulusKey } from '../src/features/questions/quality';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { runMultiPassQuestionTests } from '../src/features/questions/verifier';

test('compound shadows preserve a single visible union and through-holes across all supported class levels',()=>{
 let checked=0;
 for(const grade of [1,2,3,4] as const)for(let d=1;d<=EDUCATION_PROFILES[grade].maxDifficulty;d++)for(let seed=1;seed<=8;seed++){
  const q=generateShadowQuestion(8421+seed*104729,d as DifficultyLevel,grade),b=validateShadowBoard(q.visualConfig);
  assert.ok(isQuestionReadyForStudents(q),q.id);
  assert.equal(q.options.filter(o=>independentlyMatchesShadow(b,o.visualData)).length,1,q.id);
  assert.equal(new Set(q.options.map(o=>shadowKey(o.visualData as ShadowValue))).size,4);
  assert.equal(solveQuestion(q).isMatch,true,q.id);
  assert.equal(runMultiPassQuestionTests(q).isVerified,true,q.id);
  assert.equal(b.shapes.length,grade>=3&&d>=3?3:2);
  assert.ok(b.holes.length>=1&&b.holes.length<=3);
  const html=renderToStaticMarkup(<QuestionRenderer question={q}/>);
  assert.match(html,/HEDEF ŞEKİL/);assert.match(html,/maskUnits/);assert.ok(!html.includes('NaN'));
  for(const option of q.options){const svg=renderToStaticMarkup(<OptionRenderer option={option} questionType={q.type}/>);assert.match(svg,/Birleşik şeklin gölge seçeneği/);assert.match(svg,/#141d35/);}
  checked++;
 }
 assert.equal(checked,120);
});

test('shadow proof ignores colour, layer order and hidden covered edges but rejects altered answer keys or holes',()=>{
 const q=generateShadowQuestion(98617,3,3),board=q.visualConfig as ShadowBoard,answer=shadowAnswer(board);
 const recoloured=structuredClone(q);(recoloured.visualConfig as ShadowBoard).shapes.forEach(s=>s.color=(s.color+1)%5);
 assert.equal(questionStimulusKey(recoloured),questionStimulusKey(q));
 assert.equal(shadowKey({...answer,polygons:[...answer.polygons].reverse()}),shadowKey(answer));
 const first=answer.polygons[0];
 assert.equal(shadowKey({...answer,polygons:[first.map((_,i)=>first[(i+1)%first.length]),...answer.polygons.slice(1)]}),shadowKey(answer));
 const wrong=structuredClone(q);wrong.correctOptionId=wrong.options.find(o=>o.id!==q.correctOptionId)!.id;assert.equal(solveQuestion(wrong).isMatch,false);
 const missing={...answer,holes:answer.holes.slice(1)};assert.equal(independentlyMatchesShadow(board,missing),false);
 const malformed=structuredClone(board);malformed.holes[0]={x:5,y:5,r:4};assert.throws(()=>validateShadowBoard(malformed),/OUTSIDE/);
 const duplicated=structuredClone(q);duplicated.options[0].visualData=answer;duplicated.options[1].visualData=answer;assert.equal(solveQuestion(duplicated).isMatch,false);
 const changed=structuredClone(q);(changed.visualConfig as ShadowBoard).shapes[0].points[0][0]+=1;assert.ok(auditQuestion(changed).reviewRequired.length||auditQuestion(changed).errors.length);
 const publicBoard=JSON.stringify(publicVisualConfig(q));for(const hidden of ['correctOptionId','seed','fingerprint','answer'])assert.ok(!publicBoard.includes(hidden));
});

test('installed visual-lab apps keep compatible questions; only the new format receives compound shadows',()=>{
 const q=generateShadowQuestion(19771,2,2);
 assert.equal(supportsShadowFormat('visual-lab-1'),false);assert.equal(supportsShadowFormat(LEARNING_QUESTION_FORMAT),true);
 assert.throws(()=>assertLearningQuestionFormat([q],'visual-lab-1'));assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT);
 assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,true,false),false);
 assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,true,true),true);
 const old=generateVisualQuestion('object-shadow',7781,2,2);assertLearningQuestionFormat([old],'visual-lab-1');assertLearningQuestionFormat([old],LEARNING_QUESTION_FORMAT);
});

test('twenty focused compound shadow questions can be assembled without a published-bank mutation',()=>{
 let seed=1000;
 const questions=selectLearningQuestions({count:20,category:'visual_perception',candidates:[],exposure:new Map(),canUse:isQuestionReadyForStudents,requireDistinctStyles:false,repeatPolicy:'oldest-first',generate:()=>generateShadowQuestion(++seed*104729,2,2),randomIndex:()=>0});
 assert.equal(questions.length,20);assert.equal(new Set(questions.map(questionStimulusKey)).size,20);
 assert.ok(questions.every(q=>q.type==='shadow_matching'&&q.authoring?.engine==='shadow-lab-1'));
});
