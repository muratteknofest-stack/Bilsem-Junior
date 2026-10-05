import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { escapeHtml, normalizeStudentCode, sanitizeHeaderValue } from '../server/security.ts';
import { normalizeStudentCodeBase, studentCodeToEmail } from '../src/lib/account-identifiers.ts';

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
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});

test('linked student password reset requires verified parent authorization', async () => {
  const source = await readFile(new URL('../server/routes/parent-routes.ts', import.meta.url), 'utf8');
  assert.match(source, /\/parent\/reset-student-password/);
  assert.match(source, /requireVerifiedEmail/);
  assert.match(source, /requireProfileRole\('parent'\)/);
  assert.match(source, /revokeRefreshTokens/);
  assert.match(source, /student\?\.linkedParentId === req\.authUser\.uid/);
  assert.match(source, /requireAppCheck/);
  assert.match(source, /parent\.linkedStudentIds\.includes\(parsed\.data\.studentId\)/);
});

test('protected AI routes authenticate before applying per-user limits', async () => {
  const student = await readFile(new URL('../server/routes/student-ai-routes.ts', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../server/routes/admin-ai-routes.ts', import.meta.url), 'utf8');
  const limiters = await readFile(new URL('../server/rate-limiters.ts', import.meta.url), 'utf8');
  assert.match(limiters, /authenticatedRateLimitKey/);
  assert.match(student, /'\/ai-hint', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole\('student', 'admin'\)/);
  assert.match(admin, /'\/admin\/ai-generate-question', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole\('admin'\)/);
});

test('login source contains no local authentication fallback or fixed password', async () => {
  const source = await readFile(new URL('../src/features/auth/components/LoginForm.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /SYSTEM_ACCOUNTS/);
  assert.doesNotMatch(source, /resilient local login/i);
  assert.doesNotMatch(source, /signInAnonymously|createUserWithEmailAndPassword/);
  assert.doesNotMatch(source, /OWNER_ADMIN_EMAIL|createOwnerAdminProfile/);
  assert.match(source, /token\.claims\.role !== 'admin'/);
  assert.match(source, /credential\.user\.emailVerified/);
  assert.match(source, /loggedInProfile\.role !== 'admin'/);
  assert.doesNotMatch(source, /errMsg = error\.message/);
});

test('login validation requires email identifiers for privileged roles', async () => {
  const { loginSchema } = await import('../src/lib/validations.ts');
  assert.equal(loginSchema.safeParse({ identifier: 'VELI123', password: 'secret', role: 'parent' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@example.com', password: 'secret', role: 'admin' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: 'OGRENCI123', password: 'secret', role: 'student' }).success, true);
});
