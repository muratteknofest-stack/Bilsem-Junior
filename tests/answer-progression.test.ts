import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/features/questions/generators';
import { AnswerRequestGate, nextUnansweredIndex, saveAndAdvance } from '../src/features/student/answer-progression';
import { answerLearningSession, finishLearningSession, learningView, prepareLearningQuestions, type LearningSession } from '../server/learning-model';
import type { QuestionResponse } from '../src/features/questions/answer-interactions';

const now = Date.parse('2026-10-11T12:00:00Z');
function setup(mode: LearningSession['mode'] = 'practice', count = 3) {
  let stored: LearningSession = { id: crypto.randomUUID(), student_id: crypto.randomUUID(), mode, title: 'Test',
    questions: prepareLearningQuestions(Array.from({ length: count }, (_, i) => generateQuestion({ targetGrade: 2, type: 'number_pattern', seed: 8934 + i }))),
    answers: {}, created_at: new Date(now).toISOString(), expires_at: new Date(now + 600_000).toISOString(), finished_at: null, revision: 0, rewarded_xp: 0, result: null };
  let writes = 0, finishes = 0;
  const api = {
    async answer(id: string, index: number, response: QuestionResponse) {
      assert.equal(id, stored.id); writes++;
      stored = answerLearningSession(stored, index, response, now + 1000);
      return learningView(stored);
    },
    async finish(id: string) { assert.equal(id, stored.id); finishes++; stored = finishLearningSession(stored, now + 2000); return learningView(stored); },
  };
  return { api, view: () => learningView(stored), stored: () => stored, writes: () => writes, finishes: () => finishes };
}

for (const correct of [true, false]) test(`a ${correct ? 'correct' : 'wrong'} choice is saved before advancing; review cannot score again`, async () => {
  const fixture = setup(), q = fixture.stored().questions[0];
  const response: QuestionResponse = { mode: 'choice', optionId: correct ? q.correctOptionId : q.options.find(o => o.id !== q.correctOptionId)!.id };
  let acknowledged = false;
  const advanced = await saveAndAdvance(fixture.view(), 0, response, fixture.api, saved => {
    assert.deepEqual(saved.answers['0'].response, response); acknowledged = true;
  });
  assert.ok(acknowledged); assert.equal(advanced.index, 1);
  assert.equal(advanced.session.answers['0'].correct, correct);
  const xp = advanced.session.answers['0'].xp;
  const review = await saveAndAdvance(advanced.session, 0, { mode: 'choice', optionId: q.correctOptionId }, fixture.api, () => assert.fail('Review must not submit'));
  assert.deepEqual(review.session.answers['0'].response, response);
  assert.equal(review.session.answers['0'].xp, xp); assert.equal(fixture.writes(), 1); assert.equal(fixture.finishes(), 0);
});

test('the final choice completes the test and exposes both correct and wrong answers for review', async () => {
  const fixture = setup();
  let current = fixture.view();
  for (let i = 0; i < 3; i++) {
    const q = fixture.stored().questions[i];
    const response: QuestionResponse = { mode: 'choice', optionId: i === 1 ? q.options.find(o => o.id !== q.correctOptionId)!.id : q.correctOptionId };
    current = (await saveAndAdvance(current, i, response, fixture.api, () => undefined)).session;
  }
  assert.equal(current.result?.correctAnswers, 2); assert.equal(current.result?.wrongAnswers, 1);
  assert.equal(current.result?.blankAnswers, 0); assert.equal(fixture.finishes(), 1);
  assert.equal(Object.keys(current.solutions!).length, 3);
});

test('exam choices advance to the next blank question and reveal solutions only after completion', async () => {
  const fixture = setup('exam');
  const choose = (i: number) => ({ mode: 'choice' as const, optionId: fixture.stored().questions[i].correctOptionId });
  let step = await saveAndAdvance(fixture.view(), 2, choose(2), fixture.api, () => undefined);
  assert.equal(step.index, 0); assert.deepEqual(Object.keys(step.session.answers['2']), ['response']);
  assert.equal(step.session.solutions, undefined);
  step = await saveAndAdvance(step.session, 0, choose(0), fixture.api, () => undefined);
  assert.equal(step.index, 1);
  step = await saveAndAdvance(step.session, 1, choose(1), fixture.api, () => undefined);
  assert.equal(step.session.result?.correctAnswers, 3); assert.equal(Object.keys(step.session.solutions!).length, 3);
});

test('failed answer saves never acknowledge or advance; failed finish preserves the saved answer and is retryable', async () => {
  const fixture = setup('practice', 1), response = { mode: 'choice' as const, optionId: fixture.stored().questions[0].correctOptionId };
  const initial = fixture.view();
  await assert.rejects(saveAndAdvance(initial, 0, response, { ...fixture.api, answer: async () => { throw new Error('Kayıt hatası'); } }, () => assert.fail('Failed save cannot advance')), /Kayıt hatası/);
  assert.equal(nextUnansweredIndex(initial), 0);
  let acknowledged = initial;
  await assert.rejects(saveAndAdvance(initial, 0, response, { ...fixture.api, finish: async () => { throw new Error('Bağlantı kesildi'); } }, saved => { acknowledged = saved; }), /Bağlantı kesildi/);
  assert.deepEqual(acknowledged.answers['0'].response, response);
  assert.equal((await fixture.api.finish(initial.id)).result?.correctAnswers, 1);
  assert.equal(fixture.writes(), 1);
});

test('rapid repeated clicks cannot start a second answer transaction, and errors release the lock', async () => {
  const gate = new AnswerRequestGate();
  let resolve!: (value: string) => void;
  const first = gate.run(() => new Promise<string>(done => { resolve = done; }));
  const second = await gate.run(async () => assert.fail('Second click must not write'));
  assert.equal(second, null); resolve('saved'); assert.equal(await first, 'saved');
  await assert.rejects(gate.run(async () => { throw new Error('Offline'); }), /Offline/);
  assert.equal(await gate.run(async () => 'retry'), 'retry');
});

test('adaptive answers finish their one-question session so the next adapted question can be requested', async () => {
  const fixture = setup('adaptive', 1), q = fixture.stored().questions[0];
  const step = await saveAndAdvance(fixture.view(), 0, { mode: 'choice', optionId: q.correctOptionId }, fixture.api, () => undefined);
  assert.ok(step.session.result); assert.equal(step.session.answers['0'].correctOptionId, q.correctOptionId);
  assert.equal(nextUnansweredIndex(step.session), -1);
});
