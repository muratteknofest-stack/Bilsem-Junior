import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withRequestDeadline, RequestDeadlineError } from '../src/lib/request-deadline';
import { AnswerRequestGate, canSubmitLearningAnswer } from '../src/features/student/answer-progression';
import { LearningRefreshQueue } from '../src/features/student/learning-refresh';
import { generateQuestion } from '../src/features/questions/generators';
import { learningView, answerLearningSession, finishLearningSession, type LearningSession } from '../server/learning-model';
import { FocusedAnswerChoices } from '../src/components/FocusedAnswerChoices';
import { LearningExpiryNotice } from '../src/components/LearningExpiryNotice';

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
function session(mode: LearningSession['mode'] = 'practice'): LearningSession {
  return { id: crypto.randomUUID(), student_id: crypto.randomUUID(), mode, title: 'Ağ testi',
    questions: [generateQuestion({ targetGrade: 2, type: 'figure_completion', difficulty: 2, seed: 42 })],
    answers: {}, created_at: '2026-10-13T10:00:00Z', expires_at: '2026-10-13T11:00:00Z', finished_at: null,
    revision: 0, rewarded_xp: 0, result: null };
}

test('successful requests clear their deadline and keep their signal usable', async () => {
  let signal!: AbortSignal;
  assert.equal(await withRequestDeadline(async s => { signal = s; return 'saved'; }, 10), 'saved');
  await pause(20);
  assert.equal(signal.aborted, false);
});

test('a stalled transport that ignores cancellation still releases the caller', async () => {
  let signal!: AbortSignal;
  await assert.rejects(withRequestDeadline(s => { signal = s; return new Promise(() => {}); }, 10), RequestDeadlineError);
  assert.equal(signal.aborted, true);
});

test('an abort-aware transport cannot replace the useful timeout message with AbortError', async () => {
  await assert.rejects(withRequestDeadline(s => new Promise((_, reject) => {
    s.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }), 10), error => error instanceof RequestDeadlineError && /yeniden dene/.test(error.message));
});

test('the deadline includes a stalled response body after headers arrive', async () => {
  let headersReceived = false;
  await assert.rejects(withRequestDeadline(async () => {
    headersReceived = true;
    return await new Promise(() => {});
  }, 10), RequestDeadlineError);
  assert.equal(headersReceived, true);
});

test('a lost acknowledgement releases the answer gate and retry does not score a saved answer twice', async () => {
  const original = session(), gate = new AnswerRequestGate();
  const response = { mode: 'choice' as const, optionId: original.questions[0].correctOptionId };
  const now = Date.parse(original.created_at) + 1000;
  let server = original;
  await assert.rejects(gate.run(() => withRequestDeadline(async () => {
    server = answerLearningSession(server, 0, response, now);
    return await new Promise(() => {});
  }, 10)), RequestDeadlineError);
  const revision = server.revision;
  const retry = await gate.run(async () => {
    server = answerLearningSession(server, 0, response, now + 1000);
    return finishLearningSession(server, now + 2000);
  });
  assert.ok(retry?.result);
  assert.equal(server.revision, revision);
  assert.equal(Object.keys(server.answers).length, 1);
});

test('a timed-out refresh permits a queued refresh and a late old read cannot overwrite it', async () => {
  let release!: () => void, calls = 0;
  const applied: number[] = [];
  const queue = new LearningRefreshQueue(() => 'student', () => withRequestDeadline(async signal => {
    const call = ++calls;
    if (call === 1) await new Promise<void>(resolve => { release = resolve; });
    if (!signal.aborted) applied.push(call);
  }, 10));
  queue.schedule(); queue.schedule();
  await pause(30);
  assert.equal(queue.getStatus(), 'idle');
  assert.deepEqual(applied, [2]);
  release(); await pause(1);
  assert.deepEqual(applied, [2]);
});

test('an unqueued refresh timeout becomes a retryable error', async () => {
  let stalled = true;
  const queue = new LearningRefreshQueue(() => 'student', () => withRequestDeadline(async () => {
    if (stalled) await new Promise(() => {});
  }, 10));
  queue.schedule(); await pause(25); assert.equal(queue.getStatus(), 'error');
  stalled = false; queue.schedule(); await pause(1); assert.equal(queue.getStatus(), 'idle');
});

test('answers stop at the precise expiry boundary and invalid session coordinates fail closed', () => {
  const view = learningView(session()), deadline = Date.parse(view.expiresAt);
  assert.equal(canSubmitLearningAnswer(view, 0, deadline - 1), true);
  for (const now of [deadline, deadline + 1]) assert.equal(canSubmitLearningAnswer(view, 0, now), false);
  for (const index of [-1, 1, 0.5]) assert.equal(canSubmitLearningAnswer(view, index, deadline - 1), false);
  assert.equal(canSubmitLearningAnswer({ ...view, expiresAt: 'invalid' }, 0, deadline - 1), false);
  assert.equal(canSubmitLearningAnswer(null, 0, deadline - 1), false);
});

test('saved practice answers stay immutable while exam answers remain editable only before finish', () => {
  for (const mode of ['practice', 'exam'] as const) {
    const original = session(mode), now = Date.parse(original.created_at) + 1000;
    const saved = answerLearningSession(original, 0, { mode: 'choice', optionId: original.questions[0].correctOptionId }, now);
    assert.equal(canSubmitLearningAnswer(learningView(saved), 0, now), mode === 'exam');
    assert.equal(canSubmitLearningAnswer(learningView(finishLearningSession(saved, now + 1000)), 0, now), false);
  }
});

test('expired and busy answer fields are disabled without removing the selected response', () => {
  const question = session().questions[0];
  for (const flags of [{ busy: true, submitted: false }, { busy: false, submitted: false, expired: true }, { busy: false, submitted: true }]) {
    const html = renderToStaticMarkup(<FocusedAnswerChoices question={question}
      response={{ mode: 'choice', optionId: question.options[0].id }} onChange={() => {}} {...flags}/>);
    assert.match(html, /<fieldset[^>]*disabled=""/);
    assert.match(html, /aria-pressed="true"/);
    assert.equal((html.match(/aria-pressed=/g) || []).length, question.options.length);
  }
  const active = renderToStaticMarkup(<FocusedAnswerChoices question={question} response={null} onChange={() => {}} busy={false} submitted={false}/>);
  assert.doesNotMatch(active, /<fieldset[^>]*disabled/);
});

test('expiry exposes an accessible direct result action and prevents concurrent reloads', () => {
  const idle = renderToStaticMarkup(<LearningExpiryNotice busy={false} onReload={() => {}}/>);
  assert.match(idle, /role="status"/);
  assert.match(idle, /<button type="button">Sonuçları yükle/);
  const busy = renderToStaticMarkup(<LearningExpiryNotice busy onReload={() => {}}/>);
  assert.match(busy, /disabled=""/);
  assert.match(busy, /Sonuçlar yükleniyor/);
});
