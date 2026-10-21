import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import type {BaseQuestion} from '../src/types';import {generateQuestion,generateDiverseQuestion} from '../src/features/questions/generators';
import {inspectQuestionNovelty} from '../src/features/questions/novelty';import {assessCandidate} from '../src/features/questions/multi-stage-quality';import {isQuestionReadyForStudents} from '../src/features/questions/quality';
import {recommendDifficulty,adaptDifficultyPlan,type AnswerEvidence} from '../src/features/questions/adaptive-difficulty';
import {contextIsNonMathematical,publicDesignView,runDesignedQuestionPipeline} from '../server/ai-question-pipeline-v2';import {defaultAiRoleModels,estimateConfiguredCost} from '../server/ai-prompts/role-config';
import {solveQuestion} from '../src/features/questions/universal-solver';
test('cosmetic options and reused IDs cannot bypass task novelty',()=>{
 const q=generateQuestion({type:'number_pattern',seed:9271,targetGrade:4,difficulty:5}),copy=structuredClone(q);copy.id='new';copy.options.find(o=>o.id!==copy.correctOptionId)!.visualData={textNumber:999};assert.equal(inspectQuestionNovelty(copy,[q]).duplicateIds.length,1);
 const next=generateDiverseQuestion({type:'number_pattern',seed:9271,targetGrade:4,difficulty:5},[q]);assert.equal(inspectQuestionNovelty(next,[q]).duplicateIds.length,0);assert.equal(isQuestionReadyForStudents(next),true);
});
test('adaptive difficulty uses sufficient same-grade evidence and stays bounded',()=>{
 const answers:AnswerEvidence[]=Array.from({length:20},()=>({grade:4,difficulty:5,correct:true}));assert.equal(recommendDifficulty(4,answers.slice(0,7)).adjustment,0);assert.equal(recommendDifficulty(3,answers).adjustment,0);assert.deepEqual(adaptDifficultyPlan(4,[4,5,6],recommendDifficulty(4,answers)),[5,6,6]);assert.deepEqual(adaptDifficultyPlan(1,[1,2],{adjustment:-1,sampleSize:20,accuracy:0,reason:'more-support'}),[1,1]);
});
test('blind reviewer receives no answer key, proofs or explanations',()=>{
 const q=generateQuestion({type:'number_pattern',seed:9271,targetGrade:4,difficulty:5}),view=publicDesignView(q);assert.equal('correctOptionId' in view,false);assert.equal('explanation' in view,false);assert.equal('authoring' in view,false);assert.equal(contextIsNonMathematical('Orman yolu','Meraklı kaşif yeni bir yere ulaştı.'),true);assert.equal(contextIsNonMathematical('Orman','Cevap 3.'),false);
});
test('missing real provider configuration fails closed and has no invented cost',async()=>{
 assert.equal(estimateConfiguredCost({provider:'openai',model:'unpriced'},100,20),null);
 const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{const selection={provider:'openai' as const,model:'unconfigured'};const result=await runDesignedQuestionPipeline({targetGrade:4,difficulty:5,roleModels:{designer:selection,solver:selection,pedagogue:selection}});assert.equal(result.success,false);assert.equal(result.question,undefined);assert.equal(result.usage?.length,0);assert.match(result.validationErrors.join(' '),/AI_NOT_CONFIGURED/);}finally{if(key!==undefined)process.env.OPENAI_API_KEY=key;}
});
test('100 durable pilot questions have independent solutions and await real AI and human review',async()=>{
 const pilot=JSON.parse(await readFile(new URL('../docs/question-engine-v2/pilot-100.json',import.meta.url),'utf8')) as {questions:BaseQuestion[]};assert.equal(pilot.questions.length,100);
 const history:BaseQuestion[]=[];
 for(const q of pilot.questions){const s=solveQuestion(q);assert.equal(s.canSolve&&s.isMatch&&!s.ambiguityDetected,true,q.id);const report=assessCandidate(q,{grade:q.targetGrade!,difficulty:q.difficulty},history);assert.equal(report.stages.filter(s=>s.status==='failed').length,0,q.id);assert.equal(report.stages.filter(s=>s.status==='pending').length,2);assert.equal(q.status,'review');assert.equal(isQuestionReadyForStudents(q),false);history.push(q);}
 for(const grade of [1,2,3,4])assert.equal(history.filter(q=>q.targetGrade===grade).length,25);
});
