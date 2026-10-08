import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/features/questions/generators';
import { publicChallenge, answeredChallenge } from '../server/challenge-validation';

test('daily task response never contains the answer key, seed, solution or generation metadata',()=>{
  for(const grade of [1,2,3,4] as const){
    const question=generateQuestion({targetGrade:grade,seed:7351});
    const result=publicChallenge({id:'opaque-session-id',slot:1,day:'2026-10-08',question});
    assert.deepEqual(Object.keys(result.question).sort(),['difficulty','options','prompt','type','visualConfig']);
    assert.ok(!JSON.stringify(result).includes('correctOptionId'));
    assert.ok(!JSON.stringify(result).includes('fingerprint'));
    assert.equal(result.question.options.length,question.options.length);
    assert.ok(!JSON.stringify(result).includes(question.id));
    const answered=answeredChallenge({selected_option:question.correctOptionId,correct:true,points:10,question});
    assert.equal(answered.correctOptionId,question.correctOptionId);
    assert.equal(answered.explanation.summary,question.explanation.summary);
  }
});
test('tampered stored daily questions fail closed before delivery or scoring',()=>{
  const question=generateQuestion({targetGrade:2,seed:741});
  question.correctOptionId=question.options.find(o=>o.id!==question.correctOptionId)!.id;
  assert.throws(()=>publicChallenge({id:'x',slot:1,day:'2026-10-08',question}),/CHALLENGE_REVIEW_REQUIRED/);
});
