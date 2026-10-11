import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/features/questions/generators';
import { isResponseComplete } from '../src/features/questions/answer-interactions';
import { prepareLearningQuestions, publicLearningQuestion, learningView, answerLearningSession, finishLearningSession, learningTotals, type LearningSession } from '../server/learning-model';
const now = Date.parse('2026-10-10T08:00:00Z');
function fixture(mode: LearningSession['mode'] = 'practice'): LearningSession {
  return { id: crypto.randomUUID(), student_id: crypto.randomUUID(), mode, title: 'Test', questions: prepareLearningQuestions([generateQuestion({ targetGrade: 2, type: 'number_pattern', seed: 8934 })]), answers: {}, created_at: new Date(now).toISOString(), expires_at: new Date(now + 600_000).toISOString(), finished_at: null, revision: 0, rewarded_xp: 0, result: null };
}
test('public learning snapshots omit seed, bank identity, correctness and explanation', () => {
  const s = fixture(); const full = s.questions[0], q = publicLearningQuestion(full);
  assert.match(full.id, /^[a-f0-9-]{36}$/); assert.ok(!full.id.includes(String(full.seed)));
  for (const secret of ['seed', 'correctOptionId', 'explanation', 'authoring', 'fingerprint', 'verification']) assert.ok(!Object.hasOwn(q, secret), secret);
  assert.equal(q.options.length, full.options.length);
  assert.equal(isResponseComplete(q as typeof full, { mode: 'choice', optionId: q.options[0].id }), true);
  assert.equal(isResponseComplete(q as typeof full, { mode: 'choice', optionId: 'FORGED' }), false);
});
test('practice scoring survives opaque IDs and cannot reward retries or overwrite a wrong answer', () => {
  const initial = fixture(), q = initial.questions[0];
  const correct = answerLearningSession(initial, 0, { mode: 'choice', optionId: q.correctOptionId }, now+1000);
  assert.equal(correct.answers['0'].correct, true); assert.ok(learningTotals(correct).xp > 0);
  assert.equal(answerLearningSession(correct, 0, { mode: 'choice', optionId: q.correctOptionId }, now+2000), correct);
  const wrong = answerLearningSession(initial, 0, { mode: 'choice', optionId: q.options.find(o=>o.id!==q.correctOptionId)!.id }, now+1000);
  assert.equal(wrong.answers['0'].correct, false); assert.equal(learningTotals(wrong).xp, 0);
  assert.equal(answerLearningSession(wrong, 0, { mode: 'choice', optionId: q.correctOptionId }, now+2000), wrong);
  const done = finishLearningSession(correct, now+3000);
  assert.equal(finishLearningSession(done, now+4000), done); assert.equal(done.result!.correctAnswers, 1);
});
test('exam answers are revisable but reveal no key or correctness until one final result', () => {
  const s = fixture('exam'), q = s.questions[0];
  const wrong = answerLearningSession(s, 0, { mode: 'choice', optionId: q.options.find(o=>o.id!==q.correctOptionId)!.id }, now+1000);
  assert.deepEqual(Object.keys(learningView(wrong).answers['0']), ['response']);
  assert.equal(learningTotals(wrong).xp, 0); assert.equal(learningTotals(wrong).answered, 0);
  const correct = answerLearningSession(wrong, 0, { mode: 'choice', optionId: q.correctOptionId }, now+2000);
  assert.equal(correct.answers['0'].correct, true);
  const done = finishLearningSession(correct, now+3000);
  assert.equal(done.result!.xp, 65); assert.equal(learningView(done).answers['0'].correctOptionId, q.correctOptionId);
  assert.equal(answerLearningSession(done, 0, { mode: 'choice', optionId: q.options[0].id }, now+4000), done);
  assert.equal(finishLearningSession(fixture('exam'), now+3000).result!.xp, 0);
});
test('forged, incomplete, out-of-order and late submissions fail closed', () => {
  const s = fixture(), q = s.questions[0];
  assert.throws(()=>answerLearningSession(s, 0, { mode: 'choice', optionId: 'FORGED' }, now+1000));
  assert.throws(()=>answerLearningSession(s, 0, { mode: 'number', value: '1.5' }, now+1000));
  assert.throws(()=>answerLearningSession(s, -1, { mode: 'choice', optionId: q.correctOptionId }, now+1000));
  assert.throws(()=>answerLearningSession(s, 0, { mode: 'choice', optionId: q.correctOptionId }, now+600_000));
  s.questions.push(structuredClone(q));
  assert.throws(()=>answerLearningSession(s, 1, { mode: 'choice', optionId: q.correctOptionId }, now+1000));
  s.questions[0].correctOptionId = q.options.find(o=>o.id!==q.correctOptionId)!.id;
  assert.throws(()=>answerLearningSession(s, 0, { mode: 'choice', optionId: q.correctOptionId }, now+1000));
});

test('finished exams also reveal solutions for blank questions', () => {
  const s = fixture('exam'), done = finishLearningSession(s, now+3000);
  assert.equal(learningView(done).solutions?.['0'].correctOptionId, s.questions[0].correctOptionId);
  assert.equal(learningView(s).solutions, undefined);
});

test('review bonus comes only from a server-linked review session and cannot repeat within it', () => {
  const s = { ...fixture(), review_mistake_id: 'server-mistake' }, q = s.questions[0];
  const answer = { mode: 'choice' as const, optionId: q.correctOptionId };
  const reviewed = answerLearningSession(s, 0, answer, now+1000);
  const ordinary = answerLearningSession({ ...s, review_mistake_id: null }, 0, answer, now+1000);
  assert.equal(reviewed.answers['0'].xp, ordinary.answers['0'].xp+25);
  assert.equal(answerLearningSession(reviewed, 0, answer, now+2000), reviewed);
});

test('exam answers can be cleared before finish without revealing correctness', () => {
  const s = fixture('exam'), q = s.questions[0];
  const answered = answerLearningSession(s, 0, { mode: 'choice', optionId: q.correctOptionId }, now+1000);
  const cleared = answerLearningSession(answered, 0, null, now+2000);
  assert.deepEqual(cleared.answers, {});
  assert.equal(finishLearningSession(cleared, now+3000).result!.blankAnswers, 1);
  assert.throws(() => answerLearningSession(fixture(), 0, null, now+1000));
});
import { difficultyChoices, fitsLearningSelection, learningStartSchema, sameLearningSelection, ACTIVE_BANK_VERSION, type LearningSelection } from '../src/features/student/learning-selection';
test('grade and difficulty selections reject stale sessions and out-of-scope questions', () => {
  const selection: LearningSelection = { grade: 2, difficulty: 2, category: 'mixed', exam: 'mini', count: 15, bankVersion: ACTIVE_BANK_VERSION };
  const q = generateQuestion({ targetGrade: 2, difficulty: 2, seed: 213546, type: 'visual_sequence' });
  assert.equal(fitsLearningSelection(q, selection), true);
  assert.equal(fitsLearningSelection({ ...q, targetGrade: 1 }, selection), false);
  assert.equal(fitsLearningSelection({ ...q, difficulty: 3 }, selection), false);
  for (const override of [{ grade: 3 }, { difficulty: 'mixed' }, { category: 'pattern' }, { exam: 'standard' }, { bankVersion: 'old' }]) assert.equal(sameLearningSelection({ ...selection, ...override } as LearningSelection, selection), false);
  assert.equal(sameLearningSelection(undefined, selection), false);
  assert.equal(sameLearningSelection(selection, selection), true);
  assert.deepEqual([1,2,3,4].map(g => difficultyChoices(g as 1|2|3|4).length), [2,3,4,6]);
  assert.equal(learningStartSchema.safeParse({ mode: 'exam', difficulty: 7 }).success, false);
  assert.equal(learningStartSchema.safeParse({ mode: 'practice', expectedGrade: 5 }).success, false);
  assert.equal(learningStartSchema.safeParse({ mode: 'practice', studentId: 'other' }).success, false);
  assert.equal(learningStartSchema.parse({ mode: 'exam' }).difficulty, 'mixed');
});
