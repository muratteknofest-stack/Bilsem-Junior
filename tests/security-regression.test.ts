import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { escapeHtml, normalizeStudentCode, sanitizeHeaderValue } from '../server/security.ts';
import { requireAdminMfa, requireAppCheck, requireFirebaseAuth, requireVerifiedEmail } from '../server/security.ts';
import { accountSecurityLimiter, adminAiLimiter, adminDataLimiter, aiLimiter, billingLimiter, privacyLimiter, progressLimiter } from '../server/rate-limiters.ts';
import parentRoutes from '../server/routes/parent-routes.ts';
import studentAiRoutes from '../server/routes/student-ai-routes.ts';
import adminAiRoutes from '../server/routes/admin-ai-routes.ts';
import authRoutes from '../server/routes/auth-routes.ts';
import adminDataRoutes from '../server/routes/admin-data-routes.ts';
import examRoutes from '../server/routes/exam-routes.ts';
import practiceRoutes from '../server/routes/practice-routes.ts';
import progressRoutes from '../server/routes/progress-routes.ts';
import privacyRoutes from '../server/routes/privacy-routes.ts';
import billingRoutes from '../server/routes/billing-routes.ts';
import { loadRuntimeConfig } from '../server/runtime-config.ts';
import { toPublicQuestion } from '../server/public-question.ts';
import { verifyStripeWebhook } from '../server/billing/stripe-client.ts';
import { generateQuestion } from '../src/features/questions/generators/index.ts';
import { normalizeStudentCodeBase, studentCodeToEmail } from '../src/lib/account-identifiers.ts';

type RouteHandler = ((...args: any[]) => unknown) & { requiredRoles?: readonly string[] };

function handlersFor(router: any, path: string): RouteHandler[] {
  const layer = router.stack.find((candidate: any) => candidate.route?.path === path);
  assert.ok(layer, `route not found: ${path}`);
  return layer.route.stack.map((item: any) => item.handle as RouteHandler);
}

test('HTML inserted into report emails is escaped', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')">`),
    '&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;',
  );
});

test('mail header values cannot inject additional headers', () => {
  assert.equal(sanitizeHeaderValue('Öğrenci\r\nBcc: attacker@example.com'), 'Öğrenci Bcc: attacker@example.com');
});

test('student codes contain only normalized ASCII letters and digits', () => {
  assert.equal(normalizeStudentCode('Çağrı Öztürk<script>'), 'CAGRIOZTURKS');
  assert.equal(normalizeStudentCodeBase('Işık Çağrı'), 'ISIKCAGRI');
  assert.equal(studentCodeToEmail(' IŞIK 123 '), 'isik123@zekapark.com');
});

test('Firestore authorization protects admin access and server-owned learning data', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /request\.auth\.token\.role/);
  assert.doesNotMatch(rules, /documents\/users\/.*\.data\.role == 'admin'/);
  assert.match(rules, /linkedParentId == request\.auth\.uid/);
  assert.match(rules, /sign_in_second_factor is string/);
  assert.doesNotMatch(rules, /allow (?:create|write): if isAdmin\(\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);
  assert.match(rules, /function isAdmin\(\)[\s\S]*return hasRole\('admin'\)[\s\S]*sign_in_second_factor/);
  assert.doesNotMatch(rules, /isAdmin\(\)[\s\S]{0,500}request\.auth\.token\.email\s*==/);
  assert.match(rules, /match \/questions\/\{questionId\}[\s\S]*allow read: if isAdmin\(\)/);
  assert.match(rules, /match \/questions\/\{questionId\}[\s\S]*allow write: if false/);
  assert.match(rules, /match \/mistakeQuestionVault\/[\s\S]*allow read, write: if false/);
  assert.match(rules, /match \/progressEvents\/[\s\S]*allow read, write: if false/);
  assert.match(rules, /match \/billingEvents\/[\s\S]*allow read, write: if false/);
  assert.doesNotMatch(rules, /allow delete: if (?:isAdmin|isOwner)\(/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});

test('linked student password reset requires verified parent authorization', async () => {
  const handlers = handlersFor(parentRoutes, '/parent/reset-student-password');
  assert.equal(handlers[0], requireFirebaseAuth);
  assert.equal(handlers[1], requireAppCheck);
  assert.equal(handlers[2], accountSecurityLimiter);
  assert.equal(handlers[3], requireVerifiedEmail);
  assert.deepEqual(handlers[4].requiredRoles, ['parent']);

  const source = await readFile(new URL('../server/routes/parent-routes.ts', import.meta.url), 'utf8');
  assert.match(source, /revokeRefreshTokens/);
  assert.match(source, /student\?\.linkedParentId === req\.authUser\.uid/);
});

test('protected AI routes authenticate before applying per-user limits', async () => {
  for (const path of ['/ai-hint', '/ai-explain-mistake', '/ai-step-explanation', '/ai-daily-plan']) {
    const handlers = handlersFor(studentAiRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], aiLimiter, path);
    assert.deepEqual(handlers[3].requiredRoles, ['student', 'admin'], path);
  }

  for (const path of ['/admin/ai-generate-question', '/admin/ai-bulk-generate', '/admin/ai-generation-job/:jobId', '/admin/ai-question-review']) {
    const handlers = handlersFor(adminAiRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], adminAiLimiter, path);
    assert.deepEqual(handlers[3].requiredRoles, ['admin'], path);
    assert.equal(handlers[4], requireAdminMfa, path);
  }

  for (const path of [
    '/admin/questions',
    '/admin/questions/:questionId',
    '/admin/overview',
    '/admin/students',
    '/admin/students/:studentId/reward',
  ]) {
    const handlers = handlersFor(adminDataRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], adminDataLimiter, path);
    assert.deepEqual(handlers[3].requiredRoles, ['admin'], path);
    assert.equal(handlers[4], requireAdminMfa, path);
  }

  const registration = handlersFor(authRoutes, '/register-family');
  assert.equal(registration[0], requireAppCheck);
  assert.equal(registration[1], accountSecurityLimiter);

  const securitySource = await readFile(new URL('../server/security.ts', import.meta.url), 'utf8');
  assert.match(securitySource, /profile\.role === 'admin' && tokenRole !== 'admin'/);
  assert.match(securitySource, /cachedRole === 'admin' && tokenRole !== 'admin'/);
});

test('admin middleware requires a token that actually completed MFA', () => {
  let status = 0;
  let payload: unknown;
  let nextCalled = false;
  const res = {
    status(value: number) { status = value; return this; },
    json(value: unknown) { payload = value; return this; },
  } as any;
  requireAdminMfa({ authUser: { uid: 'admin', firebase: {} } } as any, res, () => { nextCalled = true; });
  assert.equal(status, 403);
  assert.deepEqual(payload, {
    error: 'Yönetici işlemleri için çok faktörlü doğrulama zorunludur.',
    code: 'ADMIN_MFA_REQUIRED',
  });
  requireAdminMfa({ authUser: { uid: 'admin', firebase: { sign_in_second_factor: 'totp' } } } as any, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('scoring, rewards, privacy and billing endpoints use trusted guards', () => {
  for (const [router, path, roles] of [
    [examRoutes, '/exams/start', ['student']],
    [examRoutes, '/exams/:attemptId/submit', ['student']],
    [practiceRoutes, '/practice/start', ['student']],
    [practiceRoutes, '/practice/:sessionId/answer', ['student']],
    [progressRoutes, '/progress/rewards/claim', ['student']],
  ] as const) {
    const handlers = handlersFor(router, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], progressLimiter, path);
    assert.deepEqual(handlers[3].requiredRoles, roles, path);
  }

  for (const path of ['/privacy/export', '/privacy/deletion-requests']) {
    const handlers = handlersFor(privacyRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], privacyLimiter, path);
  }

  for (const path of ['/billing/status', '/billing/checkout', '/billing/portal']) {
    const handlers = handlersFor(billingRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], billingLimiter, path);
    assert.equal(handlers[3], requireVerifiedEmail, path);
    assert.deepEqual(handlers[4].requiredRoles, ['parent'], path);
  }
});

test('public question payload strips answers, seeds and nested solver metadata', () => {
  const question = generateQuestion({ category: 'pattern', difficulty: 3, seed: 424242 });
  (question.visualConfig as any).answerOverlay = 'secret';
  (question.visualConfig as any).authoring = { solution: 'secret' };
  (question.options[0].visualData as any).correctMarker = true;
  (question.options[0].visualData as any).aiMeta = { solverAnswer: 'A' };
  const publicQuestion = toPublicQuestion(question, 'opaque-challenge-id');
  const serialized = JSON.stringify(publicQuestion);
  assert.equal(publicQuestion.id, 'opaque-challenge-id');
  assert.equal('seed' in publicQuestion, false);
  assert.equal('correctOptionId' in publicQuestion, false);
  assert.equal('explanation' in publicQuestion, false);
  assert.doesNotMatch(serialized, /answerOverlay|correctMarker|solverAnswer|authoring|aiMeta|424242/);
});

test('login source contains no local authentication fallback or fixed password', async () => {
  const [login, authContext, registration, familyRegistration, publishing, profileService] = await Promise.all([
    readFile(new URL('../src/features/auth/components/LoginForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/auth/components/RegistrationForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/family-registration-service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/question-publishing-service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/modules/profile-service.ts', import.meta.url), 'utf8'),
  ]);
  const privilegedClientSources = `${login}\n${authContext}\n${familyRegistration}\n${publishing}\n${profileService}`;

  assert.doesNotMatch(privilegedClientSources, /OWNER_ADMIN_EMAIL|createOwnerAdminProfile|signInAnonymously|isOwnerAdmin/);
  assert.doesNotMatch(privilegedClientSources, /password\s*===\s*['"`]/);
  assert.doesNotMatch(publishing, /signInWithEmailAndPassword|signInAnonymously/);
  assert.doesNotMatch(publishing, /firebase\/firestore|clearAllFirestoreQuestions|loadPublishedQuestions/);
  assert.match(publishing, /authenticatedFetch\(`\/api\/admin\/questions/);
  const questionBank = await readFile(new URL('../src/services/question-bank-service.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(questionBank, /firebase\/firestore|setDoc\(|deleteDoc\(|writeBatch\(/);
  assert.match(login, /credential\.user\.emailVerified/);
  assert.match(login, /token\.claims\.role !== 'admin'/);
  assert.match(authContext, /token\.claims\.role !== 'admin'/);
  assert.doesNotMatch(authContext, /\.email.*role\s*=\s*['"]admin['"]/s);
  assert.match(login, /loggedInProfile\.role !== selectedRole/);
  assert.match(registration, /registerFamilyInFirebase/);
  assert.match(registration, /guardianConsent/);
  assert.match(familyRegistration, /appCheckedFetch\('\/api\/register-family'/);
  assert.doesNotMatch(familyRegistration, /createUserWithEmailAndPassword|initializeApp\(/);
  assert.doesNotMatch(login, /errMsg = error\.message/);
});

test('family registration, answer migration and completed sessions are retry and retention safe', async () => {
  const [registrationRoute, registrationClient, migration, examRoute, practiceRoute] = await Promise.all([
    readFile(new URL('../server/routes/auth-routes.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/family-registration-service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/migrate-answer-secrets.ts', import.meta.url), 'utf8'),
    readFile(new URL('../server/routes/exam-routes.ts', import.meta.url), 'utf8'),
    readFile(new URL('../server/routes/practice-routes.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(registrationRoute, /requestId: z\.string\(\)\.uuid\(\)/);
  assert.match(registrationRoute, /registrationOperations\/family_/);
  assert.match(registrationRoute, /requestFingerprint/);
  assert.match(registrationClient, /pendingRegistrationRequestIds/);
  assert.match(registrationClient, /response\.status < 500/);
  assert.match(migration, /ANSWER_SECRET_MIGRATION_MODE/);
  assert.match(migration, /mode === 'execute'/);
  assert.match(examRoute, /expiresAt: Timestamp\.fromMillis\(activityRetentionExpiresAt\(completedAt\)\)/);
  assert.match(practiceRoute, /completed \? \{ expiresAt: activityRetentionExpiresAt\(now\) \} : \{\}/);
});

test('login validation requires email identifiers for privileged roles', async () => {
  const { loginSchema } = await import('../src/lib/validations.ts');
  assert.equal(loginSchema.safeParse({ identifier: 'VELI123', password: 'secret', role: 'parent' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@example.com', password: 'secret', role: 'admin' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: 'OGRENCI123', password: 'secret', role: 'student' }).success, true);
});

test('production startup fails closed when security configuration is missing or unsafe', () => {
  assert.throws(
    () => loadRuntimeConfig({ NODE_ENV: 'production' }),
    /Üretim yapılandırması eksik/,
  );
  const base = {
    NODE_ENV: 'production',
    FIREBASE_PROJECT_ID: 'project',
    FIREBASE_DATABASE_ID: 'database',
    APP_BASE_URL: 'https://zekapark.example',
    CORS_ALLOWED_ORIGINS: 'https://zekapark.example',
    ENFORCE_APP_CHECK: 'true',
    LEGAL_ENTITY_NAME: 'ZekaPark Eğitim A.Ş.',
    LEGAL_ENTITY_ADDRESS: 'İstanbul, Türkiye',
    PRIVACY_CONTACT_EMAIL: 'privacy@example.com',
    SUPPORT_EMAIL: 'support@example.com',
  };
  assert.deepEqual([...loadRuntimeConfig(base).allowedOrigins], ['https://zekapark.example']);
  assert.throws(() => loadRuntimeConfig({ ...base, ENFORCE_APP_CHECK: 'false' }), /ENFORCE_APP_CHECK=false/);
  assert.throws(() => loadRuntimeConfig({ ...base, CORS_ALLOWED_ORIGINS: 'http://zekapark.example' }), /HTTPS/);
  assert.throws(() => loadRuntimeConfig({ ...base, SUPPORT_EMAIL: 'not-an-email' }), /geçerli bir e-posta/);
  assert.throws(
    () => loadRuntimeConfig({ ...base, PAYMENTS_ENABLED: 'true' }),
    /Ödeme yapılandırması eksik/,
  );
});

test('Stripe webhook verification is timestamp-bound and constant-time checked', { concurrency: false }, () => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_regression_secret';
  try {
    const body = Buffer.from('{"id":"evt_test"}');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${timestamp}.${body.toString('utf8')}`).digest('hex');
    assert.doesNotThrow(() => verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`));
    assert.throws(() => verifyStripeWebhook(body, `t=${timestamp},v1=${'0'.repeat(64)}`), /WEBHOOK_SIGNATURE_INVALID/);
    assert.throws(() => verifyStripeWebhook(body, `t=${timestamp - 600},v1=${signature}`), /WEBHOOK_SIGNATURE_EXPIRED/);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previous;
  }
});

test('privacy deletion requires explicit approval and audited admin identity', async () => {
  const [processor, approver, privacyRoutesSource, persistence, mistakeService] = await Promise.all([
    readFile(new URL('../scripts/process-privacy-deletion.ts', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/approve-privacy-deletion.ts', import.meta.url), 'utf8'),
    readFile(new URL('../server/routes/privacy-routes.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/modules/persistence-service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/modules/mistake-service.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(processor, /\['approved', 'processing'\]\.includes/);
  assert.doesNotMatch(processor, /\['approved', 'pending'\]/);
  assert.match(processor, /request\.legalHold === true/);
  assert.match(processor, /PRIVACY_AUDIT_HMAC_KEY/);
  assert.match(processor, /processedSubjectIds: FieldValue\.arrayUnion/);
  assert.match(processor, /requesterHash: pseudonymise/);
  assert.doesNotMatch(processor, /finalBatch\.set\(proofRef, \{[^}]*requesterId/s);
  assert.match(approver, /customClaims\?\.role !== 'admin'/);
  assert.match(approver, /approverProfile\.data\(\)\?\.role !== 'admin'/);
  assert.match(approver, /CONFIRM_PRIVACY_APPROVAL/);
  assert.match(privacyRoutesSource, /redactAnswerSecrets/);
  assert.match(privacyRoutesSource, /cachedQuestion\|questionSeed\|seed/);
  assert.match(persistence, /questionSeed: _seed, cachedQuestion: _question/);
  assert.doesNotMatch(mistakeService, /cachedQuestion:\s*question|questionSeed:\s*question\.seed/);
});

test('service worker never caches API or cross-origin responses', async () => {
  const source = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.doesNotMatch(source, /caches\.put\([^\n]*(?:api|Authorization)/i);
});
