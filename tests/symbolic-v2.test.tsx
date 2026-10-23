import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {generateSymbolicQuestion,solveSymbolic,independentlySolveSymbolic} from '../src/features/questions/symbolic-v2';import {solveQuestion} from '../src/features/questions/universal-solver';import {assessCandidate} from '../src/features/questions/multi-stage-quality';import {isQuestionReadyForStudents} from '../src/features/questions/quality';import {generateQuestion} from '../src/features/questions/generators';import {QuestionRenderer} from '../src/features/questions/renderers/QuestionRenderer';import {publicLearningQuestion} from '../server/learning-model';import {publicDesignView} from '../server/ai-question-pipeline-v2';import {EDUCATION_PROFILES} from '../src/features/questions/quality-policy';import {assertLearningQuestionFormat} from '../server/learning-question-selection';import {LEARNING_QUESTION_FORMAT,LEGACY_REASONING_QUESTION_FORMAT} from '../src/features/student/learning-question-format';
test('300 grade-calibrated symbolic systems have independent Gaussian/Cramer proofs, distinct distractors and seven static gates',()=>{
 const families=new Set<string>();let checked=0;
 for(const grade of [1,2,3,4] as const)for(let level=1;level<=EDUCATION_PROFILES[grade].maxDifficulty;level++)for(let sample=1;sample<=20;sample++){
  const q=generateSymbolicQuestion(sample*7919,level as 1|2|3|4|5|6,grade),board=q.visualConfig as Record<string,unknown>,primary=solveSymbolic(board);families.add(String(board.mechanic));assert.equal(independentlySolveSymbolic(board),primary);assert.equal(solveQuestion(q).isMatch,true);assert.equal(new Set(q.options.map(o=>JSON.stringify(o.visualData))).size,4);
  const report=assessCandidate(q,{grade,difficulty:q.difficulty});assert.equal(report.stages.filter(s=>s.status==='failed').length,0,q.id+': '+report.stages.flatMap(s=>s.reasons).join(' '));assert.equal(report.stages.filter(s=>s.status==='pending').length,2);assert.equal(isQuestionReadyForStudents(q),false);
  const html=renderToStaticMarkup(<QuestionRenderer question={q}/>);assert.match(html,/Semboller arası/);assert.ok(!/NaN|Infinity|undefined/.test(html));checked++;
 }
 assert.equal(checked,300);assert.ok(families.size>=5);
});
test('mutated constraints, duplicate options, wrong keys and removed review markers cannot be released',()=>{
 const q=generateSymbolicQuestion(71719,6,4),copy=structuredClone(q);const board=copy.visualConfig as {equations:number[][]};board.equations[0]=[...board.equations[1]];assert.equal(solveQuestion(copy).canSolve,false);
 const options=structuredClone(q);options.options[1].visualData=structuredClone(options.options[0].visualData);assert.equal(isQuestionReadyForStudents(options),false);
 const key=structuredClone(q);key.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;assert.equal(solveQuestion(key).isMatch,false);
 delete q.reviewPolicy;assert.equal(isQuestionReadyForStudents(q),false);
});
test('new authoring profile returns review drafts, redacts strategy and protects existing APK formats',()=>{
 const q=generateQuestion({profile:'professional-v2',type:'shape_equation',targetGrade:4,difficulty:6,seed:81719});assert.equal(q.authoring?.engine,'symbolic-v2');assert.equal(q.qualityReport?.eligible,false);assert.equal(isQuestionReadyForStudents(q),false);
 const visual=publicLearningQuestion(q).visualConfig as Record<string,unknown>;assert.equal('mechanic' in visual,false);assert.equal('queryMode' in visual,false);assert.equal('correctOptionId' in publicDesignView(q),false);
 assert.throws(()=>assertLearningQuestionFormat([q],LEGACY_REASONING_QUESTION_FORMAT));assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));
 const older=generateQuestion({type:'number_pattern',targetGrade:4,difficulty:6,seed:91719});assert.doesNotThrow(()=>assertLearningQuestionFormat([older],LEGACY_REASONING_QUESTION_FORMAT));
});
