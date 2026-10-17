import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGradeBank, gradeTypes, stemKey } from '../scripts/generate-grade-bank';
import { auditQuestion, questionVisualKey } from '../src/features/questions/quality';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { createHash } from 'node:crypto';
const config={perGrade:300,seed:20261008,batchId:'test-grade-bank',generatedAt:'2026-10-08T17:40:00.000Z'};
test('balanced bank supplies 300 distinct certified questions per grade without exhausting limited engines',()=>{
  const bank=generateGradeBank(config);
  assert.equal(bank.questions.length,1200);
  assert.equal(new Set(bank.questions.map(questionVisualKey)).size,1200);
  assert.equal(new Set(bank.questions.map(stemKey)).size,1200);
  for(const grade of [1,2,3,4] as const){
    const rows=bank.questions.filter(q=>q.targetGrade===grade);
    assert.equal(rows.length,300);
    assert.deepEqual(new Set(rows.map(q=>q.type)),new Set(gradeTypes(grade)));
    for(const q of rows){
      assert.ok(q.difficulty<=EDUCATION_PROFILES[grade].maxDifficulty);
      const report=auditQuestion(q);assert.equal(report.solverVerified,true,q.id);assert.deepEqual(report.errors,[]);assert.deepEqual(report.reviewRequired,[]);
      assert.equal(q.status,'review');assert.equal(q.batchValidation.editorReview,'pending');
      assert.equal(q.revision,1);assert.equal('reviewedBy' in q,false);
    }
  }
  assert.ok(bank.summary.redistributed.length>0);
});
test('reproducible bank excludes existing stems even when answer ordering or IDs differ',()=>{
  const small={...config,perGrade:15};
  const first=generateGradeBank(small);
  assert.deepEqual(generateGradeBank(small),first);
  const second=generateGradeBank({...small,batchId:'other-batch',existing:first.questions});
  const stems=new Set(first.questions.map(stemKey));
  assert.ok(second.questions.every(q=>!stems.has(stemKey(q))));
  assert.equal(second.questions.length,60);
});
test('hashed previous batches are excluded without downloading private question bodies',()=>{
  const first=generateGradeBank({...config,perGrade:10});
  const hashes=first.questions.map(q=>[q.batchValidation.visualKeySha256,q.batchValidation.stemKeySha256] as [string,string]);
  const next=generateGradeBank({...config,perGrade:10,batchId:'test-followup',existingHashes:hashes});
  assert.equal(next.questions.length,40);
  const used=new Set(first.questions.map(stemKey));
  assert.ok(next.questions.every(q=>!used.has(stemKey(q))));
  assert.equal(next.summary.existingCompared,40);
  assert.deepEqual(next.questions.map(q=>q.batchValidation.stemKeySha256),next.questions.map(q=>createHash('sha256').update(stemKey(q)).digest('hex')));
  assert.throws(()=>generateGradeBank({...config,perGrade:1,existingHashes:[['untrusted','hash']]}));
});
test('invalid quantity, batch metadata and seed fail before generation',()=>{
  assert.throws(()=>generateGradeBank({...config,perGrade:0}));
  assert.throws(()=>generateGradeBank({...config,seed:0}));
  assert.throws(()=>generateGradeBank({...config,batchId:'unsafe/../id'}));
});
