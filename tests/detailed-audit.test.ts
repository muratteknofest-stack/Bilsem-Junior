import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppPathname } from '../src/lib/route-sync';
import { isPasswordRecoveryLocation } from '../src/lib/password-recovery';
import { loadCompletedWordwallIds, saveCompletedWordwallIds } from '../src/features/student/wordwall-map-model';
import { recordWordwallActivityStart, recordWordwallActivityClose, getWordwallTelemetryHistory } from '../src/features/student/wordwall-telemetry';
import { persistGeneratedQuestionResult, assertQuestionRevision } from '../server/editorial-store';
import { prepareGeneratedQuestionDraft } from '../server/editorial-validation';
import { generateProfessionalQuestion } from '../src/features/questions/professional-engine';
import { osvQueries, auditLockfile } from '../scripts/osv-audit.mjs';

test('dedicated entry paths and recovery links tolerate trailing slashes without widening routes', () => {
  for (const path of ['/wordwall', '/reset-password', '/admin/giris']) {
    assert.equal(normalizeAppPathname(path + '/'), path);
    assert.equal(normalizeAppPathname(path + '//'), path);
  }
  assert.equal(normalizeAppPathname(''), '/');
  assert.equal(normalizeAppPathname('/wordwall/other/'), '/wordwall/other');
  assert.equal(isPasswordRecoveryLocation({ pathname: '/reset-password/', search: '', hash: '' }), true);
  assert.equal(isPasswordRecoveryLocation({ pathname: '/reset-password/other', search: '', hash: '' }), false);
});

test('Wordwall progress belongs to one student; guests and unowned legacy records cannot leak into it', () => {
  const values = new Map<string, string>([['zekapark-wordwall-completed-v1', '["legacy-shared"]']]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } } });
  try {
    assert.deepEqual(loadCompletedWordwallIds('student-a'), []);
    saveCompletedWordwallIds(['1', '1', '2'], 'student-a');
    saveCompletedWordwallIds(['3'], 'student-b');
    saveCompletedWordwallIds(['4']);
    saveCompletedWordwallIds(['5'], 'guest');
    assert.deepEqual(loadCompletedWordwallIds('student-a'), ['1', '2']);
    assert.deepEqual(loadCompletedWordwallIds('student-b'), ['3']);
    assert.deepEqual(loadCompletedWordwallIds(), ['4']);
    assert.deepEqual(loadCompletedWordwallIds('guest'), ['5']);
    assert.deepEqual(loadCompletedWordwallIds('student-c'), []);
    assert.equal(values.get('zekapark-wordwall-completed-v1'), '["legacy-shared"]');
    for (const [key] of values) if (key.includes('student-a')) values.set(key, 'broken JSON');
    assert.deepEqual(loadCompletedWordwallIds('student-a'), []);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('Wordwall timing history is bounded and cannot be mutated by its callers', () => {
  for (let i = 0; i < 105; i++) {
    const id = `audit-${i}`;
    recordWordwallActivityStart({ id, title: 'Test', grade: 1, category: 'Mantık' }, 1000);
    assert.equal(recordWordwallActivityClose(id, 11000)?.durationSeconds, 10);
    assert.equal(recordWordwallActivityClose(id, 21000), null);
  }
  const history = getWordwallTelemetryHistory();
  assert.equal(history.length, 100);
  assert.equal(history[0].activityId, 'audit-5');
  history[0].title = 'changed by caller';
  assert.equal(getWordwallTelemetryHistory()[0].title, 'Test');
});

test('generation returns the stored revision so immediate educator review does not conflict', async () => {
  const question = generateProfessionalQuestion('visual_sequence', 84712, 2);
  const original = { success: true, question, qualityScore: 95 };
  const saved = await persistGeneratedQuestionResult(original, 'admin-1', async (candidate, status, adminId) => {
    assert.equal(status, 'draft');
    return prepareGeneratedQuestionDraft(candidate, status, adminId, '2026-10-17T21:00:00.000Z');
  });
  assert.equal(saved.qualityScore, 95);
  assert.equal(saved.question.revision, 1);
  assert.equal(saved.question.updatedBy, 'admin-1');
  assertQuestionRevision(saved.question, saved.question.revision!);
  assert.notEqual(original.question.revision, saved.question.revision);
  assert.throws(() => assertQuestionRevision(saved.question, original.question.revision ?? 0));
});

test('generation preserves review status and never returns success when draft persistence fails', async () => {
  const question = generateProfessionalQuestion('visual_sequence', 84712, 2);
  const saved = await persistGeneratedQuestionResult({ success: false, question }, 'admin-1', async (candidate, status, adminId) => {
    assert.equal(status, 'review');
    return prepareGeneratedQuestionDraft(candidate, status, adminId);
  });
  assert.equal(saved.question.status, 'review');
  await assert.rejects(persistGeneratedQuestionResult({ success: true, question }, 'admin-1', async () => { throw Error('fixture storage outage'); }), /fixture storage outage/);
  const empty = { success: false };
  assert.equal(await persistGeneratedQuestionResult(empty, 'admin-1', async () => { throw Error('must not save an absent question'); }), empty);
});

const lock = { packages: {
  '': { name: 'app', version: '1.0.0' },
  'node_modules/tool': { version: '1.0.0' },
  'node_modules/tool/node_modules/@scope/nested': { version: '2.0.0' },
  'node_modules/@scope/nested': { version: '2.0.0' },
  'node_modules/alias': { name: 'real-package', version: '3.0.0' },
  'node_modules/workspace': { link: true, version: '1.0.0' },
} };

test('OSV checks canonical nested and aliased packages once for each name/version pair', async () => {
  const queries = osvQueries(lock);
  assert.deepEqual(queries.map(q => [q.package.name, q.version]), [
    ['tool', '1.0.0'], ['@scope/nested', '2.0.0'], ['real-package', '3.0.0'],
  ]);
  const result = await auditLockfile(lock, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { queries });
    return Response.json({ results: [{}, { vulns: [{ id: 'TEST-NESTED-ADVISORY' }] }, {}] });
  });
  assert.deepEqual(result, { count: 3, findings: [{ package: '@scope/nested', version: '2.0.0', advisories: ['TEST-NESTED-ADVISORY'] }] });
});

test('incomplete OSV scans cannot be reported as clean scans', async () => {
  assert.throws(() => osvQueries({ packages: {} }), /incomplete/);
  for (const payload of [{}, { results: [] }, { results: [{}, {}, null] }, { results: [{}, [], {}] }, { results: [{}, { next_page_token: 'more' }, {}] }, { results: [{}, { vulns: 'invalid' }, {}] }, { results: [{}, { vulns: [{ id: ' ' }] }, {}] }]) {
    await assert.rejects(auditLockfile(lock, async () => Response.json(payload)), /incomplete/);
  }
  await assert.rejects(auditLockfile(lock, async () => new Response('', { status: 503 })), /503/);
});
