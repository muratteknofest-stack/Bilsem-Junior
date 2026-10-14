import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../server/api-app';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine';
import { prepareQuestionReport, mayReviewRequest } from '../server/support-validation';

test('question report retains reproducible content but drops arbitrary profile data; stable retries deduplicate', () => {
  const question = generateProfessionalQuestion('matrix_2x2', 1234, 2);
  const input = { question: { ...question, email: 'should-not-persist@example.com', userProfile: { name:'hidden' } }, reason: 'answer' };
  const report = prepareQuestionReport(input);
  assert.equal(report.key, prepareQuestionReport(input).key);
  assert.equal('email' in report.payload.question, false);
  assert.equal('userProfile' in report.payload.question, false);
  assert.equal(report.payload.question.seed, question.seed);
  assert.notEqual(report.key, prepareQuestionReport({ ...input, reason:'visual' }).key);
  assert.equal(mayReviewRequest('deletion','resolved'), false);
  assert.equal(mayReviewRequest('deletion','reviewing'), true);
});

test('API rejects standalone child signup, anonymous account access, malformed JSON and oversized bodies', async () => {
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('No address');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const legacy = await fetch(base+'/api/register-student', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(legacy.status,410); assert.equal((await legacy.json()).code,'FAMILY_REGISTRATION_REQUIRED');
    for (const path of ['/api/account/export','/api/account/requests','/api/admin/support-requests','/api/challenges/today','/api/admin/question-review-summary','/api/admin/support-requests/55555555-5555-4555-8555-555555555555/deletion']) {
      const response = await fetch(base+path); assert.equal(response.status,401); assert.match(response.headers.get('content-type') || '', /json/);
    }
    const deletion = await fetch(base+'/api/admin/support-requests/55555555-5555-4555-8555-555555555555/complete-deletion',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(deletion.status,401);
    const malformed = await fetch(base+'/api/questions/report', {method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
    assert.equal(malformed.status,400); assert.ok((await malformed.json()).requestId);
    const oversized = await fetch(base+'/api/questions/report', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ text:'x'.repeat(300000) })});
    assert.equal(oversized.status,413);
    const origin = await fetch(base+'/api/health', { headers: {Origin:'https://untrusted.example'} }); assert.equal(origin.status,403);
  } finally { await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('weekly reports never attribute stale progress to this week and weight recorded exam answers', async()=>{
  const {weeklyReportMetrics,reportDates}=await import('../server/weekly-report');
  const now=new Date('2026-10-11T22:00:00Z'); // Monday in Turkey, Sunday in UTC.
  assert.equal(reportDates(now).weekStart,'2026-10-12');
  const student={lastActiveDate:'2026-10-11T08:00:00Z',todayMinutesSpent:55,streak:2};
  const values={yapyap_weekly_questions_v1:JSON.stringify({weekStart:'2026-10-05',thisWeekDays:[20,10]}),yapyap_exam_results:JSON.stringify([{totalQuestions:10,correctAnswers:10},{totalQuestions:30,correctAnswers:15}])};
  const result=weeklyReportMetrics(student,values,now);
  assert.equal(result.totalQuestions,0);assert.equal(result.totalMinutes,0);assert.equal(result.accuracy,63);
  assert.equal(weeklyReportMetrics(student,{},now).accuracy,null);
});
