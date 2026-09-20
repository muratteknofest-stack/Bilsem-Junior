import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { escapeHtml, normalizeStudentCode, sanitizeHeaderValue } from '../server/security.ts';
import { requireAppCheck, requireFirebaseAuth, requireVerifiedEmail } from '../server/security.ts';
import { accountSecurityLimiter, adminAiLimiter, adminDataLimiter, aiLimiter } from '../server/rate-limiters.ts';
import parentRoutes from '../server/routes/parent-routes.ts';
import studentAiRoutes from '../server/routes/student-ai-routes.ts';
import adminAiRoutes from '../server/routes/admin-ai-routes.ts';
import authRoutes from '../server/routes/auth-routes.ts';
import adminDataRoutes from '../server/routes/admin-data-routes.ts';
import { loadRuntimeConfig } from '../server/runtime-config.ts';
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

test('Firestore authorization protects admin access and validates family links', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /request\.auth\.token\.role/);
  assert.doesNotMatch(rules, /documents\/users\/.*\.data\.role == 'admin'/);
  assert.match(rules, /validInitialParentLink/);
  assert.match(rules, /linkedParentId == userId/);
  assert.match(rules, /validAccountIdentity\(userId, 'parent'\)/);
  assert.match(rules, /request\.resource\.data\.email == request\.auth\.token\.email/);
  assert.match(rules, /validConsent/);
  assert.match(rules, /allow create: if isAdmin\(\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);
  assert.match(rules, /function isAdmin\(\)[\s\S]*return hasRole\('admin'\)/);
  assert.doesNotMatch(rules, /isAdmin\(\)[\s\S]{0,500}request\.auth\.token\.email\s*==/);
  assert.match(rules, /match \/questions\/\{questionId\}[\s\S]*signedIn\(\) && resource\.data\.status == 'published'/);
  assert.match(rules, /match \/questions\/\{questionId\}[\s\S]*allow write: if isAdmin\(\)/);
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
  }

  for (const path of ['/admin/overview', '/admin/students', '/admin/students/:studentId/reward']) {
    const handlers = handlersFor(adminDataRoutes, path);
    assert.equal(handlers[0], requireFirebaseAuth, path);
    assert.equal(handlers[1], requireAppCheck, path);
    assert.equal(handlers[2], adminDataLimiter, path);
    assert.deepEqual(handlers[3].requiredRoles, ['admin'], path);
  }

  const registration = handlersFor(authRoutes, '/register-family');
  assert.equal(registration[0], requireAppCheck);
  assert.equal(registration[1], accountSecurityLimiter);

  const securitySource = await readFile(new URL('../server/security.ts', import.meta.url), 'utf8');
  assert.match(securitySource, /profile\.role === 'admin' && tokenRole !== 'admin'/);
  assert.match(securitySource, /cachedRole === 'admin' && tokenRole !== 'admin'/);
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
  assert.match(login, /credential\.user\.emailVerified/);
  assert.match(login, /token\.claims\.role !== 'admin'/);
  assert.match(authContext, /token\.claims\.role !== 'admin'/);
  assert.doesNotMatch(authContext, /\.email.*role\s*=\s*['"]admin['"]/s);
  assert.match(login, /loggedInProfile\.role !== selectedRole/);
  assert.match(registration, /registerFamilyInFirebase/);
  assert.match(familyRegistration, /appCheckedFetch\('\/api\/register-family'/);
  assert.doesNotMatch(familyRegistration, /createUserWithEmailAndPassword|initializeApp\(/);
  assert.doesNotMatch(login, /errMsg = error\.message/);
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
  };
  assert.deepEqual([...loadRuntimeConfig(base).allowedOrigins], ['https://zekapark.example']);
  assert.throws(() => loadRuntimeConfig({ ...base, ENFORCE_APP_CHECK: 'false' }), /ENFORCE_APP_CHECK=false/);
  assert.throws(() => loadRuntimeConfig({ ...base, CORS_ALLOWED_ORIGINS: 'http://zekapark.example' }), /HTTPS/);
});

test('service worker never caches API or cross-origin responses', async () => {
  const source = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8');
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.doesNotMatch(source, /caches\.put\([^\n]*(?:api|Authorization)/i);
});
