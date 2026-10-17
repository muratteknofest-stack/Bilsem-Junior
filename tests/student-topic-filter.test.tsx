import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import express from 'express';
import { renderToStaticMarkup } from 'react-dom/server';
import learningRoutes from '../server/routes/learning-routes';
import { emailHash } from '../server/shopier-model';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { generateQuestion } from '../src/features/questions/generators';
import { ALL_QUESTION_TYPES } from '../src/features/questions/generators';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { LEARNING_TOPICS, topicCategory, topicQuestionCount } from '../src/features/student/learning-topics';
import { DEFAULT_ADAPTIVE_COUNT, fitsLearningSelection, learningStartSchema, sameLearningSelection, type LearningSelection } from '../src/features/student/learning-selection';
import { selectLearningQuestions } from '../server/learning-question-selection';
import { isQuestionReadyForStudents, questionVisualKey } from '../src/features/questions/quality';
import { StudentTopicPractice } from '../src/components/student/StudentTopicPractice';
import type { BaseQuestion, DifficultyLevel } from '../src/types';

test('all 44 studio topics are visible for every student grade and every allowed level filters precisely', () => {
  assert.deepEqual(LEARNING_TOPICS, ALL_QUESTION_TYPES);
  assert.equal(LEARNING_TOPICS.length, 44);
  let cells = 0;
  for (const grade of [1, 2, 3, 4] as const) {
    const html = renderToStaticMarkup(<StudentTopicPractice grade={grade} onStart={() => {}} />);
    assert.equal((html.match(/<option /g) || []).length, 44);
    for (const topic of LEARNING_TOPICS) {
      assert.ok(html.includes(`value="${topic}"`));
      for (let level = 1; level <= EDUCATION_PROFILES[grade].maxDifficulty; level++) {
        const q = generateQuestion({ profile: 'complete', targetGrade: grade, type: topic, difficulty: level as DifficultyLevel, seed: 31000 + cells++ });
        const selection: LearningSelection = { grade, topic, category: topicCategory(topic, 'mixed'), difficulty: level as DifficultyLevel, exam: '', count: 1, bankVersion: 'fixture' };
        assert.equal(fitsLearningSelection(q, selection), true, `${grade}/${topic}/${level}`);
        assert.equal(fitsLearningSelection({ ...q, type: LEARNING_TOPICS.find(t => t !== topic)! }, selection), false);
        assert.equal(fitsLearningSelection({ ...q, targetGrade: grade === 1 ? 2 : 1 }, selection), false);
        assert.equal(fitsLearningSelection({ ...q, difficulty: (level === 1 ? 2 : 1) as DifficultyLevel }, selection), false);
      }
    }
  }
  assert.equal(cells, 660);
});

test('topic changes never resume another topic and legacy mixed sessions remain compatible', () => {
  const old: LearningSelection = { grade: 1, category: 'spatial', difficulty: 'mixed', exam: '', count: 5, bankVersion: 'fixture' };
  assert.equal(sameLearningSelection(old, { ...old, topic: 'mixed' }), true);
  assert.equal(sameLearningSelection(old, { ...old, topic: 'paper_folding' }), false);
  assert.equal(sameLearningSelection({ ...old, topic: 'paper_folding' }, { ...old, topic: 'punch_folding' }), false);
  assert.equal(learningStartSchema.parse({ mode: 'practice' }).topic, 'mixed');
  assert.equal(learningStartSchema.safeParse({ mode: 'practice', topic: 'invented-topic' }).success, false);
  assert.equal(topicQuestionCount([] , 5, 'paper_folding'), 0);
});

test('topic practice reuses reviewed bank questions without generating another topic', () => {
  const q = generateQuestion({ profile: 'complete', type: 'paper_folding', targetGrade: 1, difficulty: 1, seed: 917 });
  const selected = selectLearningQuestions({ count: 1, category: q.category, candidates: [q],
    exposure: new Map([[questionVisualKey(q), 10]]), canUse: isQuestionReadyForStudents, allowGeneration: false,
    generate: () => { assert.fail('Topic practice must not generate filler'); } });
  assert.equal(selected[0], q);
});

test('adaptive question counts are bounded integers and participate in saved selection matching', () => {
  assert.equal(DEFAULT_ADAPTIVE_COUNT, 10);
  for (const questionCount of [1, 7, 10, 25, 50]) assert.equal(learningStartSchema.parse({ mode: 'adaptive', questionCount }).questionCount, questionCount);
  for (const questionCount of [0, -1, 51, 2.5, '10', null]) assert.equal(learningStartSchema.safeParse({ mode: 'adaptive', questionCount }).success, false);
  const selection: LearningSelection = { grade: 2, category: 'spatial', difficulty: 'mixed', exam: '', count: 7, bankVersion: 'fixture' };
  assert.equal(sameLearningSelection({ ...selection, count: 10 }, selection), false);
});

test('real authenticated learning API isolates published topics in all grades, caps small pools and rejects invalid scopes', async () => {
  const originalFetch = globalThis.fetch;
  const priorUrl = process.env.SUPABASE_URL, priorKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://topic-api-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-fixture-key';
  process.env.SHOPIER_ACCESS_TOKEN = 'isolated-shopier-test';
  const parentId = '88888888-8888-4888-8888-888888888888';
  const activated = new Date().toISOString();
  let grade: 1|2|3|4 = 1, bank: BaseQuestion[] = [], rows: any[] = [], reads = 0;
  const userId = () => `11111111-1111-4111-8111-11111111111${grade}`;
  const token = () => ['fixture', Buffer.from(JSON.stringify({ session_id: '99999999-9999-4999-8999-999999999999', aal: 'aal1' })).toString('base64url'), 'fixture'].join('.');
  globalThis.fetch = (async (input, init) => {
    const request = new Request(input as RequestInfo, init), u = new URL(request.url);
    if (u.hostname === 'api.shopier.com') return Response.json({id:'topic-order',status:'unfulfilled',paymentStatus:'paid',dateCreated:activated,currency:'TRY',shippingInfo:{email:'parent@example.invalid'},totals:{subtotal:'299.00',shipping:'0.00',discount:'0.00',total:'299.00'},lineItems:[{productId:'30',type:'digital',quantity:1,price:'299.00',total:'299.00'}],refunds:[]});
    if (u.hostname !== 'topic-api-fixture.invalid') return originalFetch(input, init);
    let value: unknown;
    if (u.pathname === '/auth/v1/user') value = { id: userId(), email: 'student@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { role: 'student' } };
    else if (u.pathname === '/rest/v1/rpc/is_user_session_active' || u.pathname === '/rest/v1/rpc/consume_api_limit') value = true;
    else if (u.pathname === '/rest/v1/profiles') {
      const profile = u.searchParams.get('id') === 'eq.'+parentId ? {id:parentId,role:'parent',linked_student_ids:[userId()]} : { id: userId(), role: 'student', grade, linked_parent_id:parentId };
      value = request.headers.get('accept')?.includes('vnd.pgrst.object') ? profile : [profile];
    } else if (u.pathname === '/rest/v1/platform_settings') value = { settings: defaultPlatformSettings(), revision: 1, updated_at: new Date().toISOString() };
    else if (u.pathname === '/rest/v1/google_play_subscriptions') value = [];
    else if (u.pathname === '/rest/v1/shopier_access_orders') value = [{order_id:'topic-order',activated_at:activated,duration_days:30,amount_kurus:29900,buyer_email_sha256:emailHash('parent@example.invalid'),product_id:'30',plan_id:'monthly'}];
    else if (u.pathname === '/rest/v1/questions') {
      reads++;
      assert.equal(u.searchParams.get('status'), 'eq.published');
      assert.equal(u.searchParams.get('target_grade'), `eq.${grade}`);
      const type = u.searchParams.get('type')?.slice(3);
      assert.ok(type && LEARNING_TOPICS.includes(type as any));
      value = bank.filter(q => q.status === 'published' && q.targetGrade === grade && q.type === type && q.id > (u.searchParams.get('id')?.slice(3) || '') &&
        (!u.searchParams.has('difficulty') || `eq.${q.difficulty}` === u.searchParams.get('difficulty')) &&
        `eq.${q.category}` === u.searchParams.get('category')).sort((a,b) => a.id.localeCompare(b.id)).map(q => ({ id: q.id, data: q }));
    } else if (u.pathname === '/rest/v1/learning_sessions') {
      if (request.method === 'POST') {
        const row = await request.json(); row.revision = 0; row.rewarded_xp = 0; rows.push(row); value = row;
      } else if (u.searchParams.get('select') === 'questions,created_at') value = rows.filter(r => r.student_id === userId()).map(r => ({ questions: r.questions, created_at: r.created_at }));
      else if (u.searchParams.has('id')) value = rows.find(r => `eq.${r.id}` === u.searchParams.get('id'));
      else value = rows.filter(r => r.student_id === userId() && r.mode === u.searchParams.get('mode')?.slice(3) && !r.finished_at);
    } else if (u.pathname === '/rest/v1/rpc/commit_learning_session') {
      const body = await request.json(), row = rows.find(r => r.id === body.p_session);
      Object.assign(row, { answers: body.p_answers, result: body.p_result, finished_at: body.p_finished ? new Date().toISOString() : null, revision: row.revision + 1 }); value = row;
    } else throw Error(`Unexpected fixture request: ${request.method} ${u.pathname}`);
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const app = express(); app.use(express.json()); app.use('/api', learningRoutes);
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const start = async (body: object, authenticated = true) => {
    const res = await originalFetch(`${origin}/api/learning/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token()}` } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };
  try {
    assert.equal((await start({ mode: 'practice', topic: 'paper_folding' }, false)).status, 401);
    for (const g of [1, 2, 3, 4] as const) {
      grade = g;
      for (const [i, topic] of LEARNING_TOPICS.entries()) {
        rows = [];
        const q = generateQuestion({ profile: 'complete', targetGrade: grade, type: topic, difficulty: 1, seed: 91000 + i * 997 + grade });
        q.status = 'published';
        // Same-category distractor and draft rows must never enter the topic session.
        const other = generateQuestion({ profile: 'complete', targetGrade: grade, type: topic === 'paper_folding' ? 'mirror_reflection' : 'paper_folding', difficulty: 1, seed: 7181 });
        bank = [q, { ...q, id: 'draft-only', status: 'draft' }, { ...other, status: 'published' }];
        const result = await start({ mode: 'practice', topic, category: 'mixed', difficulty: 1, expectedGrade: grade });
        assert.equal(result.status, 201, `${grade}/${topic}: ${JSON.stringify(result.body)}`);
        assert.equal(result.body.questions.length, 1);
        assert.equal(rows[0].selection.topic, topic);
        for (const question of result.body.questions) {
          assert.equal(question.type, topic); assert.equal(question.targetGrade, grade); assert.equal(question.difficulty, 1);
          assert.equal('correctOptionId' in question, false);
        }
      }
    }
    grade = 1; rows = [];
    const first = { ...generateQuestion({ profile: 'complete', targetGrade: 1, type: 'paper_folding', difficulty: 1, seed: 5551 }), status: 'published' as const };
    const second = { ...generateQuestion({ profile: 'complete', targetGrade: 1, type: 'mirror_reflection', difficulty: 1, seed: 5552 }), status: 'published' as const };
    bank = [first, second];
    const a = await start({ mode: 'practice', topic: first.type });
    const b = await start({ mode: 'practice', topic: second.type });
    assert.equal(a.status, 201); assert.equal(b.status, 201); assert.notEqual(a.body.id, b.body.id);
    assert.equal(rows[0].result.totalQuestions, 1); assert.equal(b.body.questions[0].type, second.type);
    const exam = await start({ mode: 'exam', topic: first.type, exam: 'standard' });
    assert.equal(exam.status, 201); assert.equal(exam.body.questions.length, 1); assert.equal(exam.body.questions[0].type, first.type);
    const adaptive = await start({ mode: 'adaptive', topic: first.type });
    assert.equal(adaptive.status, 201); assert.equal(adaptive.body.questions[0].type, first.type);
    assert.equal((await start({ mode: 'practice', topic: first.type, difficulty: 2 })).status, 422);
    assert.equal((await start({ mode: 'practice', topic: first.type, difficulty: 3 })).status, 400);
    assert.equal((await start({ mode: 'practice', topic: 'invented' })).status, 400);
    assert.equal((await start({ mode: 'practice', topic: first.type, expectedGrade: 2 })).status, 409);
    assert.equal((await start({ mode: 'practice', topic: first.type, locale: 'en' })).status, 400);
    // Every normal start is a new shuffled draw, including when an identical test is unfinished.
    for (const g of [1, 2, 3, 4] as const) {
      grade = g;
      bank = Array.from({ length: 80 }, (_, i) => ({ ...generateQuestion({ profile: 'complete', targetGrade: grade, type: 'matrix_3x3', difficulty: 1, seed: 51000 + i * 997 }), status: 'published' as const }));
      for (const mode of ['practice', 'adaptive', 'exam'] as const) {
        rows = [];
        const body = { mode, topic: 'matrix_3x3', difficulty: 1, expectedGrade: grade, questionCount: 7 };
        const a = await start(body), count = mode === 'practice' ? 5 : mode === 'exam' ? 15 : 7;
        assert.equal(a.status, 201, `${grade}/${mode}: ${JSON.stringify(a.body)}`); assert.equal(a.body.questions.length, count);
        const snapshot = structuredClone(a.body.questions);
        const response = { mode: 'choice', optionId: rows[0].questions[0].correctOptionId };
        const answer = await originalFetch(`${origin}/api/learning/${a.body.id}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ index: 0, response }) });
        assert.equal(answer.status, 200);
        const b = await start(body);
        assert.equal(b.status, 201); assert.notEqual(b.body.id, a.body.id); assert.equal(b.body.questions.length, count);
        assert.equal(rows[0].result.correctAnswers, 1); assert.equal(rows[0].result.blankAnswers, count - 1);
        assert.equal(new Set(rows[1].questions.map(questionVisualKey)).size, count);
        const oldKeys = new Set(rows[0].questions.map(questionVisualKey));
        assert.ok(rows[1].questions.every((q: BaseQuestion) => !oldKeys.has(questionVisualKey(q))), `${grade}/${mode} must prefer unseen questions`);
        const resumed = await originalFetch(`${origin}/api/learning/${a.body.id}`, { headers: { Authorization: `Bearer ${token()}` } });
        const saved = await resumed.json() as any;
        assert.deepEqual(saved.questions, snapshot); assert.deepEqual(saved.answers['0'].response, response);
      }
    }
    rows = [];
    const maxCount = await start({ mode: 'adaptive', topic: 'matrix_3x3', questionCount: 50 });
    assert.equal(maxCount.status, 201); assert.equal(maxCount.body.questions.length, 50);
    const defaultCount = await start({ mode: 'adaptive', topic: 'matrix_3x3' });
    assert.equal(defaultCount.status, 201); assert.equal(defaultCount.body.questions.length, 10);
    for (const questionCount of [0, 51, 2.5, '5']) assert.equal((await start({ mode: 'adaptive', questionCount })).status, 400);
    assert.ok(reads >= 176);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    globalThis.fetch = originalFetch;
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = priorKey;
  }
});
