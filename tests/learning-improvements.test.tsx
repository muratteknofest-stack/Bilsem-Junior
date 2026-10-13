import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateQuestion } from '../src/features/questions/generators';
import { auditQuestion, type QuestionVisualReference } from '../src/features/questions/quality';
import { publicVisualConfig, type DisplayColorfulBoard } from '../src/features/questions/public-visual';
import { ColorfulBoard } from '../src/features/questions/renderers/ColorfulBoard';
import { publicLearningQuestion, learningView, learningUpdateView, answerLearningSession, finishLearningSession, type LearningSession } from '../server/learning-model';
import { publicChallenge } from '../server/challenge-validation';
import { readQuestionPages } from '../server/question-pages';
import { publishedBankVersion } from '../server/learning-bank';
import { LearningSessionCache } from '../src/features/student/learning-session-cache';
import { LearningRefreshQueue } from '../src/features/student/learning-refresh';
import { prepareEditorialQuestion } from '../server/editorial-validation';
import { archiveQuestionRevision, assertQuestionRevision, EditorialConflictError } from '../server/editorial-store';
import { aiQuestionReviewSchema } from '../server/routes/admin-ai-routes';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function session(mode: LearningSession['mode'] = 'practice'): LearningSession {
  return { id: crypto.randomUUID(), student_id: crypto.randomUUID(), mode, title: 'Test',
    questions: [generateQuestion({ targetGrade: 2, type: 'figure_completion', difficulty: 2, seed: 42 })],
    answers: {}, created_at: '2026-10-13T10:00:00Z', expires_at: '2026-10-13T11:00:00Z', finished_at: null,
    revision: 0, rewarded_xp: 0, result: null };
}

test('hidden mosaic cells are absent from both study and daily DTOs without altering server scoring', () => {
  for (const grade of [1, 2, 3, 4] as const) for (let seed = 1; seed <= 8; seed++) {
    const q = generateQuestion({ targetGrade: grade, type: 'figure_completion', difficulty: grade, seed });
    const original = structuredClone(q.visualConfig);
    const study = publicLearningQuestion(q).visualConfig as unknown as DisplayColorfulBoard;
    const daily = publicChallenge({ id: 'daily-id', slot: 1, day: '2026-10-13', question: q }).question.visualConfig;
    assert.deepEqual(daily, study);
    assert.equal(study.source?.art, 'mosaic');
    if (study.source?.art !== 'mosaic') assert.fail('Mosaic required');
    assert.equal(study.source.cells[study.missing!], null);
    assert.equal(study.source.cells.filter(cell => cell === null).length, 1);
    assert.deepEqual(q.visualConfig, original);
    assert.equal(auditQuestion(q).solverVerified, true);
  }
});

test('the missing cell is never drawn underneath an overlay, including full admin previews', () => {
  const q = session().questions[0];
  for (const config of [q.visualConfig, publicVisualConfig(q)]) {
    const board = config as unknown as DisplayColorfulBoard;
    const html = renderToStaticMarkup(<ColorfulBoard board={board}/>);
    const cell = html.split(`data-mosaic-cell="${board.missing}"`)[1].split('data-mosaic-cell=')[0];
    assert.match(cell, /Eksik kare/);
    assert.match(cell, />\?<\/text>/);
    assert.ok(!cell.includes('stroke-opacity="0.3"'), 'Hidden motif must not be in the SVG DOM');
    assert.ok(!html.includes('position:absolute'), 'No covering layer may hide the original answer');
  }
});

test('a compact answer acknowledgement keeps all authoritative fields and exam keys remain concealed', () => {
  for (const mode of ['practice', 'exam'] as const) {
    const initial = session(mode), q = initial.questions[0];
    const saved = answerLearningSession(initial, 0, { mode: 'choice', optionId: q.correctOptionId }, Date.parse(initial.created_at) + 1000);
    const { questions, ...full } = learningView(saved);
    assert.deepEqual(learningUpdateView(saved), full);
    assert.ok(!Object.hasOwn(learningUpdateView(saved), 'questions'));
    if (mode === 'exam') assert.deepEqual(Object.keys(full.answers['0']), ['response']);
    const completed = learningUpdateView(finishLearningSession(saved, Date.parse(initial.created_at) + 2000));
    assert.equal(completed.solutions?.['0'].correctOptionId, q.correctOptionId);
    assert.ok(JSON.stringify(learningUpdateView(saved)).length < JSON.stringify(learningView(saved)).length);
  }
});

test('session updates reuse immutable puzzles but cannot read another account cache or a changed snapshot', () => {
  const cache = new LearningSessionCache(), original = session(), initial = learningView(original);
  cache.save('student-a', initial);
  const update = learningUpdateView(answerLearningSession(original, 0,
    { mode: 'choice', optionId: original.questions[0].correctOptionId }, Date.parse(original.created_at) + 1000));
  const merged = cache.save('student-a', update);
  assert.equal(merged.questions, initial.questions);
  assert.equal(merged.answers['0'].correct, true);
  assert.throws(() => cache.save('student-a', { ...update, expiresAt: 'changed' }), /doğrulanamadı/);
  assert.equal(cache.get('student-b', initial.id), undefined);
  assert.throws(() => cache.save('student-b', update), /doğrulanamadı/);
  assert.equal(cache.get('student-a', initial.id), undefined);
});

test('published bank identity comes from actual content, independent of order, and changes with edits', () => {
  const a = { ...session().questions[0], status: 'published' as const, sourceBatch: 'reasoning-v2', revision: 1 };
  const b = { ...a, id: 'another-question', revision: 2 };
  const version = publishedBankVersion([a, b]);
  assert.equal(version, publishedBankVersion([b, a]));
  assert.ok(!version.includes('colorful-v3'));
  assert.notEqual(version, publishedBankVersion([a, { ...b, revision: 3 }]));
  assert.notEqual(version, publishedBankVersion([a, { ...b, prompt: b.prompt + ' Yeni yönerge.' }]));
  assert.notEqual(version, publishedBankVersion([]));
});

test('pagination finds duplicates beyond row 500 even when the provider silently caps page size', async () => {
  const q = session().questions[0];
  const rows: QuestionVisualReference[] = Array.from({ length: 501 }, (_, i) => ({ id: String(i).padStart(4, '0'),
    type: q.type, visualConfig: { displayMode: 'comparison-fixture', index: i }, options: q.options }));
  rows.push({ id: '0501', type: q.type, visualConfig: q.visualConfig, options: q.options });
  let calls = 0;
  const loaded = await readQuestionPages(async after => {
    calls++;
    return { data: rows.filter(row => !after || row.id > after).slice(0, 100), error: null };
  }, 'read failed');
  assert.equal(loaded.length, 502);
  assert.equal(calls, 7);
  assert.ok(auditQuestion(q, loaded).errors.some(error => error.includes('0501')));
});

test('partial reads, duplicate cursors and safety-limit overflows cannot become a successful comparison', async () => {
  let calls = 0;
  await assert.rejects(readQuestionPages(async () => (++calls === 1 ? { data: [{ id: 'a' }], error: null }
    : { data: null, error: { code: 'unavailable' } }), 'read failed'), /read failed/);
  await assert.rejects(readQuestionPages(async () => ({ data: [{ id: 'a' }], error: null }), 'read failed'), /read failed/);
  await assert.rejects(readQuestionPages(async () => ({ data: [{ id: 'a' }, { id: 'b' }], error: null }), 'read failed', 250, 1), /read failed/);
});

test('background refreshes coalesce rapid answers and never block the acknowledgement caller', async () => {
  let release!: () => void, calls = 0;
  const queue = new LearningRefreshQueue(() => 'student-a', async () => {
    calls++;
    if (calls === 1) await new Promise<void>(resolve => { release = resolve; });
  });
  queue.schedule();
  for (let i = 0; i < 10; i++) queue.schedule();
  assert.equal(calls, 1);
  assert.equal(queue.getStatus(), 'refreshing');
  release(); await tick();
  assert.equal(calls, 2);
  assert.equal(queue.getStatus(), 'idle');
});

test('an old account refresh cannot apply a profile or overwrite the new account refresh status', async () => {
  let current = 'student-a', release!: () => void;
  const applied: string[] = [];
  const queue = new LearningRefreshQueue(() => current, async (id, isCurrent) => {
    if (id === 'student-a') await new Promise<void>(resolve => { release = resolve; });
    if (isCurrent()) applied.push(id);
  });
  queue.schedule(); current = 'student-b'; queue.schedule(); release(); await tick();
  assert.deepEqual(applied, ['student-b']);
  assert.equal(queue.getStatus(), 'idle');
});

test('secondary refresh failure is retryable without resubmitting or reversing a saved answer', async () => {
  let failed = true;
  const queue = new LearningRefreshQueue(() => 'student-a', async () => { if (failed) throw Error('offline'); });
  queue.schedule(); await tick(); assert.equal(queue.getStatus(), 'error');
  failed = false; queue.schedule(); await tick(); assert.equal(queue.getStatus(), 'idle');
});

test('an explicit editor review closes the batch review flag, and a draft edit invalidates prior review', () => {
  const q = { ...session().questions[0], batchValidation: { policy: 'test', automaticChecks: 'passed' as const,
    editorReview: 'pending' as const, visualKeySha256: 'test', stemKeySha256: 'test' },
    releaseAuthorization: { source: 'test-owner', automaticChecks: 'passed' as const, individualHumanReview: false, releasedAt: '2026-10-13' } };
  const published = prepareEditorialQuestion(q, 'published', 1, true, 'admin-test');
  assert.equal(published.batchValidation?.editorReview, 'completed');
  assert.equal(published.releaseAuthorization?.individualHumanReview, true);
  const draft = prepareEditorialQuestion(published, 'draft', 2, false, 'admin-test');
  assert.equal(draft.batchValidation?.editorReview, 'pending');
  assert.equal(draft.reviewedBy, undefined);
  assert.equal(draft.releaseAuthorization?.individualHumanReview, false);
  assert.equal(draft.releaseAuthorization?.humanReviewedAt, undefined);
  const damaged = { ...published, correctOptionId: 'invalid' };
  const archived = archiveQuestionRevision(damaged, 'admin-test');
  assert.equal(archived.status, 'archived');
  assert.equal(archived.revision, published.revision + 1);
  assert.equal(archived.reviewedBy, undefined);
});

test('AI review requires the revision actually inspected by the editor before starting any mutation', () => {
  const q = { ...session().questions[0], revision: 2 };
  assert.equal(aiQuestionReviewSchema.safeParse({ questionId: q.id, action: 'approve' }).success, false);
  assert.equal(aiQuestionReviewSchema.safeParse({ questionId: q.id, action: 'approve', expectedRevision: -1 }).success, false);
  assert.throws(() => assertQuestionRevision(q, 1), EditorialConflictError);
  assert.doesNotThrow(() => assertQuestionRevision(q, 2));
});
