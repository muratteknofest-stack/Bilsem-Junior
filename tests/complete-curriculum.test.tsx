import type {BaseQuestion} from '../src/types';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateQuestion } from '../src/features/questions/generators';
import { ALL_TOPIC_TYPES } from '../src/features/questions/topic-catalog';
import { EDUCATION_PROFILES, type SchoolGrade } from '../src/features/questions/quality-policy';
import { auditQuestion, questionVisualKey } from '../src/features/questions/quality';
import { generateCompleteBank } from '../scripts/generate-complete-bank';
import { stemKey } from '../scripts/generate-grade-bank';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { checkArithmeticExplanations } from '../scripts/question-proof-checks';
import { visibleOptionKey } from '../src/features/questions/mechanical-quality';

test('all 44 topics have a certified, renderable variant at every class-appropriate level',()=>{
  let checked=0;
  for(const grade of [1,2,3,4] as SchoolGrade[])for(const type of ALL_TOPIC_TYPES)for(let difficulty=1;difficulty<=EDUCATION_PROFILES[grade].maxDifficulty;difficulty++){
    let q:BaseQuestion|undefined;
    for(let seed=1;seed<=100&&!q;seed++){try{q=generateQuestion({profile:'complete',type,targetGrade:grade,difficulty:difficulty as 1|2|3|4|5|6,seed:seed*104729});}catch{}}
    assert.ok(q,`${grade}/${type}/${difficulty}`);
    const r=auditQuestion(q);assert.equal(r.solverVerified,true);assert.deepEqual([...r.errors,...r.reviewRequired],[]);
    assert.deepEqual(checkArithmeticExplanations(q).errors,[],q.id);
    assert.equal(new Set(q.options.map(o=>visibleOptionKey(o.visualData))).size,4);
    const html=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} option={o} questionType={type}/>)}</>);
    assert.doesNotMatch(html,/Müfredat çizimi eksik|görünümü tanımlı değil|Tanımsız sembol|\[object Object\]|NaN|correctOptionId|distractorNotes/);
    const wrong:BaseQuestion={...q,correctOptionId:q.options.find(o=>o.id!==q!.correctOptionId)!.id};assert.equal(auditQuestion(wrong).solverVerified,false);
    const duplicate={...q,options:q.options.map((o,i)=>i===1?{...o,visualData:q!.options[0].visualData}:o)};assert.ok(auditQuestion(duplicate).errors.length>0);
    checked++;
  }
  assert.equal(checked,660);
});
test('complete quotas cannot silently redistribute a missing topic or level',()=>{
  const options={perGrade:300,seed:20261014,batchId:'test-complete-quota',generatedAt:'2026-10-14T11:00:00Z'};
  const bank=generateCompleteBank(options);
  assert.equal(bank.questions.length,1200);
  assert.equal(new Set(bank.questions.map(stemKey)).size,1200);
  for(const g of [1,2,3,4]){
    const rows=bank.questions.filter(q=>q.targetGrade===g);
    assert.equal(rows.length,300);assert.equal(new Set(rows.map(q=>q.type)).size,44);
    for(const q of rows){assert.equal(q.status,'review');assert.equal(q.batchValidation.editorReview,'pending');assert.equal('reviewedBy' in q,false);}
  }
  assert.throws(()=>generateCompleteBank({...options,perGrade:10}));
});
test('changing invisible class metadata never establishes novelty',()=>{
  const q=generateQuestion({profile:'complete',type:'paper_folding',targetGrade:1,difficulty:1,seed:51073});
  const relabel:BaseQuestion={...q,targetGrade:2,visualConfig:{...q.visualConfig,grade:2}};
  assert.equal(stemKey(q),stemKey(relabel));assert.equal(questionVisualKey(q),questionVisualKey(relabel));
  const extra={...q,options:q.options.map((o,i)=>i===0?{...o,visualData:{...o.visualData as object,hiddenMarker:1}}:o)};
  assert.ok(auditQuestion(extra).errors.length>0);
});
