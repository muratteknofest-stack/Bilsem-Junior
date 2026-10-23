import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runQuestionReviewBatch, reviewConfigurationReady, type ReviewBatchProgress } from '../src/lib/question-review-batch';
import { QuestionReviewBatchPanel } from '../src/components/admin/QuestionReviewBatchPanel';
import { generateQuestion } from '../src/features/questions/generators';
import { assessCandidate, recordReview } from '../src/features/questions/multi-stage-quality';
import { reviewDesignedQuestion } from '../server/ai-question-pipeline-v2';
import type { AiCapabilities, AiRoleModels } from '../src/features/questions/ai-contracts';

const selection = { provider: 'openai' as const, model: 'unit-fixture' };
const models: AiRoleModels = { designer: { provider: 'gemini', model: 'unused' }, solver: selection, pedagogue: selection };
// Contract fixtures test receipt handling; these are never written to the question bank.
function receipt(id: string, revision: number, passed: boolean) {
  const question = generateQuestion({ profile: 'professional-v2', type: 'number_pattern', seed: 9271, targetGrade: 4, difficulty: 5 });
  question.id = id; question.status = 'review'; question.revision = revision;
  question.qualityReport = assessCandidate(question, { grade: 4, difficulty: 5 });
  if (passed) { recordReview(question.qualityReport, 'blind', []); recordReview(question.qualityReport, 'editorial', []); }
  return { success: passed, solverVerified: passed, question, qualityScore: question.qualityReport.score };
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const targets = [{ id: 'a', revision: 1 }, { id: 'b', revision: 4 }, { id: 'c', revision: 3 }];

test('sequential review waits for each persisted receipt and distinguishes rejection from storage failure', async () => {
  const saved: string[] = [], states: ReviewBatchProgress[] = []; let active = 0, peak = 0;
  const result = await runQuestionReviewBatch({ targets, models, shouldStop: () => false, saved: q => saved.push(q.id), changed: s => states.push(s),
    request: async target => { active++; peak = Math.max(peak, active); await new Promise(resolve => setImmediate(resolve)); active--; return response(receipt(target.id, target.revision + 1, target.id === 'a')); } });
  assert.equal(peak, 1); assert.deepEqual(saved, ['a', 'b', 'c']);
  assert.deepEqual(result.items.map(i => i.outcome), ['passed', 'needs-changes', 'needs-changes']);
  assert.equal(result.stopped, false); assert.equal(result.currentId, null);
  assert.equal(states[0].items.length, 0); assert.equal(states[1].items.length, 1);
});

test('stop finishes the current save and never starts the next billable request', async () => {
  let stopped = false, calls = 0; const saved: string[] = [];
  const result = await runQuestionReviewBatch({ targets, models, shouldStop: () => stopped, saved: q => saved.push(q.id), changed: () => {},
    request: async target => { calls++; stopped = true; return response(receipt(target.id, target.revision + 1, true)); } });
  assert.equal(calls, 1); assert.deepEqual(saved, ['a']); assert.equal(result.stopped, true); assert.equal(result.items.length, 1);
});

test('outages, conflicts and ambiguous saves halt without automatic retries or invented successes', async () => {
  for (const status of [401, 403, 409, 429, 500, 503, 200]) {
    let calls = 0, saved = 0;
    const result = await runQuestionReviewBatch({ targets, models, shouldStop: () => false, changed: () => {}, saved: () => saved++,
      request: async () => { calls++; if (status === 200) throw Error('network after save'); return response({}, status); } });
    assert.equal(calls, 1, String(status)); assert.equal(saved, 0); assert.equal(result.stopped, true); assert.equal(result.items[0].outcome, 'failed');
  }
});

test('mismatched identity, revision, publication or incomplete approval receipts cannot update the UI', async () => {
  const bad = [
    { ...receipt('other', 2, true) }, { ...receipt('a', 1, true) },
    { ...receipt('a', 2, false), success: true, solverVerified: true },
    { ...receipt('a', 2, true), solverVerified: false },
  ];
  const published = receipt('a', 2, true); published.question.status = 'published'; bad.push(published);
  for (const value of bad) {
    let saved = 0;
    const result = await runQuestionReviewBatch({ targets, models, shouldStop: () => false, changed: () => {}, saved: () => saved++, request: async () => response(value) });
    assert.equal(saved, 0); assert.equal(result.items[0].outcome, 'failed'); assert.equal(result.items.length, 1);
  }
});

test('invalid/oversized batches fail before HTTP; unchanged draft revisions support a deliberate retry', async () => {
  let calls = 0;
  for (const invalid of [[], [targets[0], targets[0]], [{ id: '', revision: 1 }], [{ id: 'a', revision: -1 }], Array.from({ length: 21 }, (_, i) => ({ id: String(i), revision: 1 }))]) {
    await assert.rejects(runQuestionReviewBatch({ targets: invalid, models, shouldStop: () => false, changed: () => {}, saved: () => {}, request: async () => { calls++; return response({}); } }));
  }
  assert.equal(calls, 0);
  const result = await runQuestionReviewBatch({ targets: [targets[0]], models, shouldStop: () => false, changed: () => {}, saved: () => {}, request: async target => response(receipt(target.id, target.revision + 1, true)) });
  assert.equal(result.items[0].outcome, 'passed'); assert.equal(targets[0].revision, 1);
});

test('existing question review requires only actual reviewer provider keys, not a designer key', () => {
  const capabilities: AiCapabilities = { defaults: models, providers: [{ provider: 'openai', configured: true }, { provider: 'gemini', configured: false }], models: [selection], imageGenerationConfigured: false };
  assert.equal(reviewConfigurationReady(capabilities, models), true);
  assert.equal(reviewConfigurationReady({ ...capabilities, providers: [] }, models), false);
  assert.equal(reviewConfigurationReady(capabilities, null), false);
});

test('missing real reviewer configuration records a failed gate and never makes a question publishable', async () => {
  const previous = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  try {
    const q = receipt('a', 1, false).question;
    const report = await reviewDesignedQuestion(q, models);
    assert.equal(report.eligible, false);
    assert.equal(report.stages.find(s => s.id === 'blind')?.status, 'failed');
    assert.match(report.stages.find(s => s.id === 'blind')!.reasons.join(' '), /AI_REVIEW_UNAVAILABLE/);
    assert.equal(report.stages.find(s => s.id === 'editorial')?.status, 'pending');
  } finally { if (previous !== undefined) process.env.OPENAI_API_KEY = previous; }
});

test('progress panel exposes real counts, stop control, and separate editor decision', () => {
  assert.equal(renderToStaticMarkup(<QuestionReviewBatchPanel progress={null} running={false} onStop={() => {}}/>), '');
  const progress: ReviewBatchProgress = { total: 20, currentId: 'a', stopped: false, items: [{ id: 'b', revision: 2, outcome: 'needs-changes', message: 'Düzeltme gerekli.' }] };
  const html = renderToStaticMarkup(<QuestionReviewBatchPanel progress={progress} running onStop={() => {}}/>);
  assert.match(html, /1 \/ 20 sonuç/); assert.match(html, /0 AI denetimini geçti/); assert.match(html, /1 düzeltme gerekli/);
  assert.match(html, /Bu sorudan sonra durdur/); assert.match(html, /Bu işlem soru yayımlamaz/); assert.match(html, /aria-busy="true"/);
});

test('a stalled response aborts and releases the batch; a late receipt cannot create success', async () => {
  let saved = 0, signal: AbortSignal | undefined, finish!: (r: Response) => void;
  const result = await runQuestionReviewBatch({ targets, models, requestTimeoutMs: 15, shouldStop: () => false, changed: () => {}, saved: () => saved++,
    request: async (_target, _models, abort) => { signal = abort; return new Promise(resolve => { finish = resolve; }); } });
  assert.equal(signal?.aborted, true); assert.equal(result.stopped, true); assert.equal(result.items.length, 1); assert.equal(saved, 0);
  finish(response(receipt('a', 2, true))); await new Promise(resolve => setImmediate(resolve)); assert.equal(saved, 0);
});

test('a persisted provider outage keeps the saved revision but stops the remaining billable calls', async () => {
  const value = receipt('a', 2, false);
  recordReview(value.question.qualityReport!, 'blind', ['AI_REVIEW_UNAVAILABLE: Sağlayıcı çağrısı tamamlanmadı.']);
  let calls = 0, revision = 0;
  const result = await runQuestionReviewBatch({ targets, models, shouldStop: () => false, changed: () => {}, saved: q => { revision = q.revision!; }, request: async () => { calls++; return response(value); } });
  assert.equal(calls, 1); assert.equal(revision, 2); assert.equal(result.items[0].outcome, 'failed'); assert.equal(result.stopped, true);
});
