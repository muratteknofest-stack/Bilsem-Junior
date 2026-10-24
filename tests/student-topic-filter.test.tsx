import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import express from 'express';
import { renderToStaticMarkup } from 'react-dom/server';
import learningRoutes from '../server/routes/learning-routes';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { generateQuestion } from '../src/features/questions/generators';
import { ALL_QUESTION_TYPES } from '../src/features/questions/generators';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import { LEARNING_TOPICS, topicCategory } from '../src/features/student/learning-topics';
import { DEFAULT_ADAPTIVE_COUNT, fitsLearningSelection, learningStartSchema, sameLearningSelection, type LearningSelection } from '../src/features/student/learning-selection';
import { selectLearningQuestions } from '../server/learning-question-selection';
import { isQuestionReadyForStudents, questionVisualKey, questionStimulusKey } from '../src/features/questions/quality';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { StudentTopicPractice } from '../src/components/student/StudentTopicPractice';
import type { BaseQuestion, DifficultyLevel } from '../src/types';
import { needsReasoningFormat, LEARNING_QUESTION_FORMAT, PREVIOUS_PROFESSIONAL_QUESTION_FORMAT, LEGACY_REASONING_QUESTION_FORMAT } from '../src/features/student/learning-question-format';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { generateProfessionalQuestion as generateV7 } from '../src/features/questions/professional-engine-v7';

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
});

test('topic practice reuses reviewed bank questions without generating another topic', () => {
  const q = generateQuestion({ profile: 'complete', type: 'paper_folding', targetGrade: 1, difficulty: 1, seed: 917 });
  const selected = selectLearningQuestions({ count: 1, category: q.category, candidates: [q],
    repeatPolicy: 'oldest-first',
    exposure: new Map([[questionVisualKey(q), 10]]), canUse: isQuestionReadyForStudents, allowGeneration: false,
    generate: () => { assert.fail('Topic practice must not generate filler'); } });
  assert.equal(selected[0], q);
});

test('adaptive question counts are bounded integers and participate in saved selection matching', () => {
  assert.equal(DEFAULT_ADAPTIVE_COUNT, 10);
  for(const questionCount of [1,2,3,4,5])assert.equal(learningStartSchema.parse({mode:'practice',questionCount}).questionCount,questionCount);
  assert.equal(learningStartSchema.safeParse({mode:'practice',questionCount:6}).success,false);
  for (const questionCount of [1, 7, 10, 25, 50]) assert.equal(learningStartSchema.parse({ mode: 'adaptive', questionCount }).questionCount, questionCount);
  for (const questionCount of [0, -1, 51, 2.5, '10', null]) assert.equal(learningStartSchema.safeParse({ mode: 'adaptive', questionCount }).success, false);
  const selection: LearningSelection = { grade: 2, category: 'spatial', difficulty: 'mixed', exam: '', count: 7, bankVersion: 'fixture' };
  assert.equal(sameLearningSelection({ ...selection, count: 10 }, selection), false);
});

test('real authenticated learning API preserves mixed choices, permits practice variants, and rejects duplicate puzzles without changing active sessions', async () => {
  const originalFetch = globalThis.fetch;
  const priorUrl = process.env.SUPABASE_URL, priorKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://topic-api-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-fixture-key';
  let grade: 1|2|3|4 = 1, bank: BaseQuestion[] = [], rows: any[] = [], reads = 0;
  const userId = () => `11111111-1111-4111-8111-11111111111${grade}`;
  const token = () => ['fixture', Buffer.from(JSON.stringify({ session_id: '99999999-9999-4999-8999-999999999999', aal: 'aal1' })).toString('base64url'), 'fixture'].join('.');
  globalThis.fetch = (async (input, init) => {
    const request = new Request(input as RequestInfo, init), u = new URL(request.url);
    if (u.hostname !== 'topic-api-fixture.invalid') return originalFetch(input, init);
    let value: unknown;
    const headers=new Headers({'Content-Type':'application/json'});
    if (u.pathname === '/auth/v1/user') value = { id: userId(), email: 'student@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { role: 'student' } };
    else if (u.pathname === '/rest/v1/rpc/is_user_session_active' || u.pathname === '/rest/v1/rpc/consume_api_limit') value = true;
    else if (u.pathname === '/rest/v1/profiles') {
      const profile = { id: userId(), role: 'student', grade };
      value = request.headers.get('accept')?.includes('vnd.pgrst.object') ? profile : [profile];
    } else if (u.pathname === '/rest/v1/platform_settings') value = { settings: defaultPlatformSettings(), revision: 1, updated_at: new Date().toISOString() };
    else if (u.pathname === '/rest/v1/questions') {
      reads++;
      assert.equal(u.searchParams.get('status'), 'eq.published');
      assert.equal(u.searchParams.get('target_grade'), `eq.${grade}`);
      // Emulate the real PostgREST filters, including the pushed-down start optimization.
      const typeFilter = u.searchParams.get('type');
      const types = typeFilter?.startsWith('in.(') ? typeFilter.slice(4,-1).split(',') : typeFilter ? [typeFilter.slice(3)] : [];
      if(typeFilter)assert.ok(typeFilter.startsWith('eq.') || typeFilter.startsWith('in.('));
      for(const type of types)assert.ok(LEARNING_TOPICS.includes(type as any));
      const engineFilter = u.searchParams.get('data->authoring->>engine');
      if(engineFilter)assert.ok(engineFilter.startsWith('in.('));
      const engines = engineFilter?.slice(4,-1).split(',');
      const level = u.searchParams.get('difficulty');
      if(level)assert.ok(level.startsWith('eq.') || level.startsWith('gte.'));
      const offset = Number(u.searchParams.get('offset') || 0), limit = Number(u.searchParams.get('limit') || 1000);
      const matching = bank.filter(q => q.status === 'published' && q.targetGrade === grade && (!types.length || types.includes(q.type)) && q.id > (u.searchParams.get('id')?.slice(3) || '') &&
        (!engines || engines.includes(q.authoring?.engine || '')) &&
        (!level || (level.startsWith('gte.') ? q.difficulty >= Number(level.slice(4)) : q.difficulty === Number(level.slice(3)))) &&
        (!u.searchParams.has('category') || `eq.${q.category}` === u.searchParams.get('category'))).sort((a,b) => a.id.localeCompare(b.id));
      const page=matching.slice(offset,offset+limit);
      value=page.map(q=>({id:q.id,data:q}));
      assert.ok(request.headers.get('prefer')?.includes('count=exact'));
      headers.set('content-range',`${page.length?`${offset}-${offset+page.length-1}`:'*'}/${matching.length}`);
    } else if(u.pathname==='/rest/v1/user_private_state')value={values:{}};
    else if (u.pathname === '/rest/v1/learning_sessions') {
      if (request.method === 'POST') {
        const row = await request.json(); row.revision = 0; row.rewarded_xp = 0; rows.push(row); value = row;
      } else if (u.searchParams.get('select') === 'questions,answers,created_at') value = rows.filter(r => r.student_id === userId()).map(r => ({ questions: r.questions, answers:r.answers, created_at: r.created_at }));
      else if (u.searchParams.has('id')) value = rows.find(r => `eq.${r.id}` === u.searchParams.get('id'));
      else value = rows.filter(r => r.student_id === userId() && r.mode === u.searchParams.get('mode')?.slice(3) && !r.finished_at);
    } else if (u.pathname === '/rest/v1/rpc/commit_learning_session') {
      const body = await request.json(), row = rows.find(r => r.id === body.p_session);
      Object.assign(row, { answers: body.p_answers, result: body.p_result, finished_at: body.p_finished ? new Date().toISOString() : null, revision: row.revision + 1 }); value = row;
    } else throw Error(`Unexpected fixture request: ${request.method} ${u.pathname}`);
    return new Response(JSON.stringify(value), { status: 200, headers });
  }) as typeof fetch;
  const app = express(); app.use(express.json()); app.use('/api', learningRoutes);
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const start = async (body: object, authenticated = true, modern: boolean | string = false) => {
    const res = await originalFetch(`${origin}/api/learning/start${modern?'?questionFormat='+(typeof modern==='string'?modern:LEARNING_QUESTION_FORMAT):''}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token()}` } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, timing:res.headers.get('server-timing'), body: await res.json() as any };
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
        const beforeReads=reads;
        const result = await start({ mode: 'practice', questionCount: 1, topic, category: 'mixed', difficulty: 1, expectedGrade: grade });
        assert.equal(result.status, 201, `${grade}/${topic}: ${JSON.stringify(result.body)}`);
        assert.equal(reads,beforeReads+1,'Exact count must avoid the empty end-of-bank round trip');
        for(const stage of ['auth','access','context','bank','assembly','save','total'])assert.ok(result.timing?.includes(`${stage};dur=`));
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
    const a = await start({ mode: 'adaptive', questionCount: 1, topic: first.type });
    const b = await start({ mode: 'adaptive', questionCount: 1, topic: second.type });
    assert.equal(a.status, 201); assert.equal(b.status, 201); assert.notEqual(a.body.id, b.body.id);
    assert.equal(rows[0].result.totalQuestions, 1); assert.equal(b.body.questions[0].type, second.type);
    const exam = await start({ mode: 'exam', topic: first.type, exam: 'standard' });
    assert.equal(exam.status, 422); assert.equal(exam.body.code, 'INSUFFICIENT_DISTINCT_QUESTIONS'); assert.equal(exam.body.requestedCount, 30); assert.equal(exam.body.preparedCount, 1);
    const adaptive = await start({ mode: 'adaptive', topic: first.type });
    assert.equal(adaptive.status, 422); assert.equal(adaptive.body.requestedCount, 10); assert.equal(rows.length, 2);
    assert.equal((await start({ mode: 'practice', topic: first.type, difficulty: 2 })).status, 422);
    assert.equal((await start({ mode: 'practice', topic: first.type, difficulty: 3 })).status, 400);
    assert.equal((await start({ mode: 'practice', topic: 'invented' })).status, 400);
    assert.equal((await start({ mode: 'practice', topic: first.type, expectedGrade: 2 })).status, 409);
    assert.equal((await start({ mode: 'practice', topic: first.type, locale: 'en' })).status, 400);
    // Repeating IDs or options cannot turn two displayed puzzles into a full test.
    // Failures preserve active answers; a successful restart still prefers a fresh puzzle.
    for (const g of [1, 2, 3, 4] as const) {
      grade = g;
      const originals = [51000, 51997].map(seed => generateQuestion({ profile: 'complete', targetGrade: grade, type: 'matrix_3x3', difficulty: 1, seed }));
      assert.equal(new Set(originals.map(questionStimulusKey)).size, 2);
      bank = Array.from({ length: 80 }, (_, i) => ({ ...originals[i % 2], id: `duplicate-${i}`, status: 'published' as const }));
      for (const mode of ['practice', 'adaptive', 'exam'] as const) {
        rows = [];
        const body = { mode, topic: 'matrix_3x3', difficulty: 1, expectedGrade: grade, questionCount: mode==='practice'?5:7 };
        const rejected = await start(body);
        assert.equal(rejected.status, 422);
        assert.equal(rejected.body.code, 'INSUFFICIENT_DISTINCT_QUESTIONS');
        assert.equal(rejected.body.preparedCount, 2);
        assert.equal(rejected.body.requestedCount, mode === 'practice' ? 5 : mode === 'exam' ? 15 : 7);
        assert.deepEqual(Object.keys(rejected.body).sort(), ['code','error','preparedCount','requestedCount']);
        assert.equal(rows.length, 0, 'A failed preparation cannot insert a partial test');
        const single = {...body, mode: 'adaptive', questionCount: 1};
        const a = await start(single), count = 1;
        assert.equal(a.status, 201, JSON.stringify(a.body));
        const snapshot = structuredClone(a.body.questions);
        const response = { mode: 'choice', optionId: rows[0].questions[0].correctOptionId };
        const answer = await originalFetch(`${origin}/api/learning/${a.body.id}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ index: 0, response }) });
        assert.equal(answer.status, 200);
        const activeBefore = JSON.stringify(rows);
        assert.equal((await start(body)).status, 422);
        assert.equal(JSON.stringify(rows), activeBefore, 'Rejection must preserve active answers and rewards');
        const b = await start(single);
        assert.equal(b.status, 201); assert.notEqual(b.body.id, a.body.id); assert.equal(b.body.questions.length, count);
        assert.equal(rows[0].result.correctAnswers, 1); assert.equal(rows[0].result.blankAnswers, 0);
        const oldKeys = new Set(rows[0].questions.map(questionVisualKey));
        assert.ok(rows[1].questions.every((q: BaseQuestion) => !oldKeys.has(questionVisualKey(q))));
        const resumed = await originalFetch(`${origin}/api/learning/${a.body.id}`, { headers: { Authorization: `Bearer ${token()}` } });
        const saved = await resumed.json() as any;
        assert.deepEqual(saved.questions, snapshot); assert.deepEqual(saved.answers['0'].response, response);
      }
    }
    rows = [];
    const maxCount = await start({ mode: 'adaptive', topic: 'matrix_3x3', questionCount: 50 });
    assert.equal(maxCount.status, 422); assert.equal(maxCount.body.requestedCount, 50); assert.equal(rows.length, 0);
    const defaultCount = await start({ mode: 'adaptive', topic: 'matrix_3x3' });
    assert.equal(defaultCount.status, 422); assert.equal(defaultCount.body.requestedCount, 10); assert.equal(rows.length, 0);
    assert.equal((await start({ mode: 'adaptive', requireDistinctStyles: false })).status, 400, 'Clients cannot turn off the server diversity policy');
    for (const questionCount of [0, 51, 2.5, '5']) assert.equal((await start({ mode: 'adaptive', questionCount })).status, 400);
    assert.ok(reads >= 176);
    // Reproduce the first-grade UI: a mixed adaptive request without the story-only flag.
    // An empty published bank must still produce the full requested verified session.
    grade=1;bank=[];
    for(const difficulty of [1,2,'mixed'] as const)for(const questionCount of [20,50]) {
      rows=[];
      const result=await start({mode:'adaptive',category:'mixed',difficulty,questionCount,expectedGrade:1},true,true);
      assert.equal(result.status,201,JSON.stringify(result.body));
      assert.equal(result.body.questions.length,questionCount);
      assert.equal(rows[0].selection.category,'mixed');
      assert.equal(new Set(rows[0].questions.map((q:BaseQuestion)=>q.category)).size,AVAILABLE_CATEGORIES.length);
      assert.equal(new Set(rows[0].questions.map(questionStimulusKey)).size,questionCount);
      assert.ok(rows[0].questions.every((q:BaseQuestion)=>q.targetGrade===1&&isQuestionReadyForStudents(q)));
    }
    // One topic may use different verified examples of the same skill.
    rows=[];bank=Array.from({length:80},(_,i)=>({...generateQuestion({profile:'complete',targetGrade:1,type:'number_pattern',difficulty:1,seed:61001+i*997}),status:'published' as const}));
    const focused=await start({mode:'adaptive',topic:'number_pattern',difficulty:1,questionCount:20,expectedGrade:1},true,true);
    assert.equal(focused.status,201,JSON.stringify(focused.body));
    assert.equal(focused.body.questions.length,20);
    assert.ok(focused.body.questions.every((q:BaseQuestion)=>q.type==='number_pattern'&&q.difficulty===1));
    // Exercise the production route, authentication, bank policy and DTO together.
    // An old published bank must not starve the new reasoning variants.
    for(const g of [1,2,3,4] as const){
      grade=g;rows=[];
      const old=generateV7('number_pattern',7919,1);
      bank=[{...old,targetGrade:grade,targetGrades:[grade],ageGroup:grade<=2?'1-2':'3-4',status:'published'}];
      const result=await start({mode:'adaptive',category:'mixed',mixCategories:true,questionCount:20,difficulty:'mixed',expectedGrade:grade},true,true);
      assert.equal(result.status,201,JSON.stringify(result.body));
      assert.equal(result.body.questions.length,20);
      assert.deepEqual(result.body.questions.map((q:BaseQuestion)=>q.difficulty).sort(),reasoningDifficultyPlan(grade,20,()=>0).sort());
      assert.equal(rows[0].selection.questionFormat,LEARNING_QUESTION_FORMAT);
      assert.ok(rows[0].questions.every((q:BaseQuestion)=>q.authoring?.engine!=='verified-7'));
    }
    const modern=rows[0];assert.ok(modern.questions.some(needsReasoningFormat));
    const before=JSON.stringify(modern),headers={'Content-Type':'application/json',Authorization:`Bearer ${token()}`};
    for(const [suffix,method,body] of [['','GET',undefined],['/answer','POST',{index:0,response:{mode:'choice',optionId:modern.questions[0].correctOptionId}}],['/finish','POST',{}]] as const){
      const rejected=await originalFetch(`${origin}/api/learning/${modern.id}${suffix}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
      assert.equal(rejected.status,426);assert.match((await rejected.json() as any).error,/güncelle/);
      assert.equal(JSON.stringify(modern),before,'An incompatible request must not commit answers or rewards');
    }
    const saved=await originalFetch(`${origin}/api/learning/${modern.id}/answer?view=update&questionFormat=${LEARNING_QUESTION_FORMAT}`,{method:'POST',headers,body:JSON.stringify({index:0,response:{mode:'choice',optionId:modern.questions[0].correctOptionId}})});
    assert.equal(saved.status,200);const update=await saved.json() as any;assert.equal(update.questions,undefined);assert.equal(update.answers['0'].correct,true);
    const resumed=await originalFetch(`${origin}/api/learning/${modern.id}?questionFormat=${LEARNING_QUESTION_FORMAT}`,{headers});
    assert.equal(resumed.status,200);assert.equal((await resumed.json() as any).questions.length,20);
    for(const oldFormat of [PREVIOUS_PROFESSIONAL_QUESTION_FORMAT,LEGACY_REASONING_QUESTION_FORMAT]){
      rows=[];
      const oldClient=await start({mode:'adaptive',category:'mixed',mixCategories:true,questionCount:20,difficulty:'mixed',expectedGrade:grade},true,oldFormat);
      assert.equal(oldClient.status,201,JSON.stringify(oldClient.body));
      assert.equal(rows[0].selection.questionFormat,oldFormat);
      assert.ok(rows[0].questions.every((q:BaseQuestion)=>q.authoring?.engine!=='reasoning-lab-1'),'Installed older clients cannot receive new drawing modes');
    }
    rows=[];
    const legacy=await start({mode:'adaptive',category:'mixed',mixCategories:true,questionCount:20,difficulty:'mixed',expectedGrade:grade});
    assert.equal(legacy.status,201,JSON.stringify(legacy.body));assert.ok(rows[0].questions.every((q:BaseQuestion)=>!needsReasoningFormat(q)));
    const easy=await start({mode:'practice',difficulty:1,expectedGrade:grade},true,true);
    assert.equal(easy.status,201);assert.ok(easy.body.questions.every((q:BaseQuestion)=>q.difficulty===1));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    globalThis.fetch = originalFetch;
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = priorKey;
  }
});

