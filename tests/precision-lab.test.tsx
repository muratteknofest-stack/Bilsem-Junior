import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PRECISION_TYPES,generatePrecisionQuestion,solvePrecision,validatePrecisionBoard,precisionValueKey,polygonArea,intersectionArea,type PrecisionValue} from '../src/features/questions/precision-lab';
import {independentlyMatchesPrecision} from '../src/features/questions/precision-proof';
import {auditQuestion,questionStimulusKey} from '../src/features/questions/quality';
import {solveQuestion} from '../src/features/questions/universal-solver';
import {EDUCATION_PROFILES} from '../src/features/questions/quality-policy';
import {QuestionRenderer} from '../src/features/questions/renderers/QuestionRenderer';
import {OptionRenderer} from '../src/features/questions/renderers/OptionRenderer';
import {publicVisualConfig} from '../src/features/questions/public-visual';
import {assertLearningQuestionFormat,currentReasoningCandidate} from '../server/learning-question-selection';
import {LEARNING_QUESTION_FORMAT,PREVIOUS_EXAM_QUESTION_FORMAT} from '../src/features/student/learning-question-format';
import {createPrecisionLearningPool} from '../server/precision-learning-pool';
import {generateQuestion} from '../src/features/questions/generators';
import {evaluateResponse} from '../src/features/questions/answer-interactions';
import {prepareLearningQuestions,learningView,answerLearningSession,finishLearningSession,type LearningSession} from '../server/learning-model';

test('hand-calculated maze walk, reversed code with zero, and exposed cube faces have exact proofs',()=>{
  const maze={displayMode:'precision_lab',kind:'maze_path',grade:1,size:3,start:0,goal:8,passages:[[0,1],[1,2],[1,4],[4,3],[4,5],[5,8],[8,7],[7,6]]};
  assert.deepEqual(solvePrecision(maze),{precision:'route',moves:['R','D','R','D']});
  assert.equal(independentlyMatchesPrecision(maze,{precision:'route',moves:['R','D','R','D']}),true);
  assert.equal(independentlyMatchesPrecision(maze,{precision:'route',moves:['R','R','D','D']}),false);
  const cipher={displayMode:'precision_lab',kind:'symbol_coding',grade:3,key:[{symbol:0,digit:0},{symbol:1,digit:5},{symbol:2,digit:8}],query:[1,0,2],reading:'backward'};
  assert.deepEqual(solvePrecision(cipher),{precision:'code',digits:[8,0,5]});assert.ok(independentlyMatchesPrecision(cipher,{precision:'code',digits:[8,0,5]}));
  for(const [heights,value] of [[[1,0,0,0],5],[[1,1,0,0],8],[[1,2,0,0],12]] as const){
    const b={displayMode:'precision_lab',kind:'cube_counting',grade:3,size:2,heights:[...heights],task:'exposed',level:1};
    assert.deepEqual(solvePrecision(b),{precision:'number',value});assert.ok(independentlyMatchesPrecision(b,{precision:'number',value}));
  }
});
test('all eight mechanics satisfy independent candidate proofs and grade limits across 2400 deterministic samples',()=>{
  let count=0;
  for(const grade of [1,2,3,4] as const)for(let difficulty=1;difficulty<=EDUCATION_PROFILES[grade].maxDifficulty;difficulty++)for(const type of PRECISION_TYPES)for(let n=1;n<=20;n++){
    const q=generatePrecisionQuestion(type,n*104729,difficulty as 1,grade),report=auditQuestion(q);count++;
    assert.deepEqual([...report.errors,...report.reviewRequired],[],`${type}/${grade}/${difficulty}/${n}`);assert.equal(report.solverVerified,true);
    assert.equal(q.options.filter(o=>independentlyMatchesPrecision(q.visualConfig,o.visualData)).length,1);
    assert.equal(new Set(q.options.map(o=>precisionValueKey(o.visualData as PrecisionValue))).size,4);
    assert.deepEqual(generatePrecisionQuestion(type,n*104729,difficulty as 1,grade),q);
  }
  assert.equal(count,2400);
});
test('mutated keys, geometry, text and hidden option data cannot inherit a proof',()=>{
  for(const type of PRECISION_TYPES){
    const q=generatePrecisionQuestion(type,81719,4,4),wrong=structuredClone(q);wrong.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;assert.equal(auditQuestion(wrong).solverVerified,false,type);
    const duplicate=structuredClone(q);duplicate.options[1].visualData=duplicate.options[0].visualData;assert.ok(auditQuestion(duplicate).errors.length,type);
    const invisible=structuredClone(q);invisible.options[0].visualData={...(invisible.options[0].visualData as object),answer:true};assert.ok(auditQuestion(invisible).errors.length,type);
    assert.ok(auditQuestion({...q,prompt:'Görsel kuralla ilgisi olmayan değiştirilmiş bir soru metni.'}).reviewRequired.length);
  }
  const q=generatePrecisionQuestion('tangram_puzzle',81719,4,4),b=structuredClone(q.visualConfig) as Record<string,unknown>;const pieces=(b.pieces as number[][][]);pieces[1]=pieces[0];assert.throws(()=>validatePrecisionBoard(b),/OVERLAPPING/);
  const symmetric=generatePrecisionQuestion('symmetry_completion',104729,3,3),answer=solvePrecision(symmetric.visualConfig);if(answer.precision==='grid'){answer.cells[0]=(answer.cells[0]+1)%4;assert.equal(independentlyMatchesPrecision(symmetric.visualConfig,answer),false);}
});
test('tangram is one genuine assembled partition, never seven independently rotated cards',()=>{
  for(let seed=1;seed<=80;seed++){
    const q=generatePrecisionQuestion('tangram_puzzle',seed*81719,3,3),b=validatePrecisionBoard(q.visualConfig);assert.equal(b.kind,'tangram_puzzle');if(b.kind!=='tangram_puzzle')throw Error('kind');
    const answer=q.options.find(o=>o.id===q.correctOptionId)!.visualData as PrecisionValue;if(answer.precision!=='piece')throw Error('piece');
    assert.equal(b.pieces.reduce((s,p)=>s+polygonArea(p),0)+polygonArea(answer.points),16);
    for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)assert.equal(intersectionArea(b.pieces[i],b.pieces[j]),0);
    assert.ok(independentlyMatchesPrecision(b,answer));
  }
});
test('student rendering, choice/place grading and old-client gating use the same complete board',()=>{
  for(const type of PRECISION_TYPES){
    const q=generatePrecisionQuestion(type,81719,3,3),markup=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} option={o}/>)}</>);
    assert.match(markup,/bj-precision-board/);assert.doesNotMatch(markup,/NaN|undefined|\[object Object\]/);
    assert.deepEqual(publicVisualConfig(q),q.visualConfig);assert.doesNotMatch(JSON.stringify(publicVisualConfig(q)),/correctOptionId|answer|seed|distractorNotes/);
    for(const format of [undefined,'reasoning-8','professional-v2','cube-lab-1',PREVIOUS_EXAM_QUESTION_FORMAT])assert.throws(()=>assertLearningQuestionFormat([q],format));
    assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));
    assert.equal(currentReasoningCandidate(q,3,true,true,true,true,true,true,true),true);assert.equal(currentReasoningCandidate(q,3,true,true,true,true,true,true,false),false);
    for(const mode of ['choice','place'] as const)assert.deepEqual(evaluateResponse(q,{mode,optionId:q.correctOptionId}),{complete:true,correct:true});
    assert.equal(solveQuestion(q).isMatch,true);
    assert.equal(generateQuestion({profile:'precision-v1',targetGrade:3,type,difficulty:3,seed:81719}).authoring?.engine,'precision-lab-1');
  }
});
test('bounded fresh pools cover focused practice without touching assigned snapshots or repeating stimuli',()=>{
  for(const type of PRECISION_TYPES){const pool=createPrecisionLearningPool({grade:3,difficulty:3,category:'mixed',topic:type,count:15,seed:81719});assert.ok(pool.length>=15,type);assert.ok(pool.length<=16);assert.equal(new Set(pool.map(questionStimulusKey)).size,pool.length);assert.ok(pool.every(q=>q.type===type&&q.targetGrade===3&&q.difficulty===3));}
  assert.deepEqual(createPrecisionLearningPool({grade:2,difficulty:2,category:'mixed',topic:'number_pattern',count:5,seed:81719}),[]);
});
test('new question snapshots cross public delivery and server scoring without disclosing keys or changing a saved answer',()=>{
  const questions=prepareLearningQuestions(PRECISION_TYPES.map(type=>generatePrecisionQuestion(type,81719,3,3)));
  let session:LearningSession={id:crypto.randomUUID(),student_id:crypto.randomUUID(),mode:'practice',title:'Soru atölyesi',questions,answers:{},created_at:'2026-11-03T10:00:00Z',expires_at:'2026-11-03T11:00:00Z',finished_at:null,revision:0,rewarded_xp:0,result:null};
  const before=learningView(session);assert.equal(before.questions.length,8);assert.doesNotMatch(JSON.stringify(before),/correctOptionId|distractorNotes|authoring|precision-lab-1-/);
  assert.ok(before.questions.every(q=>Object.keys(q).every(k=>!['seed','explanation','qualityReport'].includes(k))));
  const now=Date.parse(session.created_at)+1000;
  for(const [i,q] of questions.entries()){
    session=answerLearningSession(session,i,{mode:i%2?'place':'choice',optionId:q.correctOptionId},now+i*1000);
    const saved=session;session=answerLearningSession(session,i,{mode:'choice',optionId:q.options.find(o=>o.id!==q.correctOptionId)!.id},now+i*1000+1);assert.deepEqual(session,saved);
  }
  session=finishLearningSession(session,now+9000);assert.equal(session.result?.correctAnswers,8);assert.equal(session.result?.scorePercentage,100);assert.equal(Object.keys(learningView(session).solutions||{}).length,8);
});
