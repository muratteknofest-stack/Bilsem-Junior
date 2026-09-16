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
  const source = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(source, /\/api\/parent\/reset-student-password/);
  assert.match(source, /requireVerifiedEmail/);
  assert.match(source, /requireProfileRole\('parent'\)/);
  assert.match(source, /revokeRefreshTokens/);
  assert.match(source, /linkedParentId === req\.authUser\.uid/);
  assert.match(source, /requireAppCheck/);
  assert.match(source, /X-Firebase-AppCheck/);
  assert.match(source, /student\.linkedParentId !== req\.authUser\.uid/);
  assert.doesNotMatch(source, /AI soru üretimi başarısız:.*err\.message/);
});

test('protected AI routes authenticate before applying per-user limits', async () => {
  const source = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(source, /authenticatedRateLimitKey/);
  assert.match(source, /'\/api\/ai-hint', requireFirebaseAuth, requireAppCheck, aiLimiter, requireProfileRole\('student', 'admin'\)/);
  assert.match(source, /'\/api\/admin\/ai-generate-question', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole\('admin'\)/);
});

test('login source contains no local authentication fallback or fixed password', async () => {
  const source = await readFile(new URL('../src/components/LoginPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /SYSTEM_ACCOUNTS/);
  assert.doesNotMatch(source, /resilient local login/i);
  assert.doesNotMatch(source, /Standart şifre|setPassword\('123456'\)/);
  assert.doesNotMatch(source, /\/api\/auth\/register-family/);
  assert.match(source, /registerFamilyInFirebase/);
  assert.match(source, /OWNER_ADMIN_EMAIL = 'iomegagame@gmail\.com'/);
  assert.match(source, /signedInEmail === OWNER_ADMIN_EMAIL &&[\s\S]*credential\.user\.emailVerified/);
  assert.match(source, /credential\.user\.emailVerified/);
  assert.match(source, /createOwnerAdminProfile/);
  assert.match(source, /loggedInProfile\.role !== selectedRole/);
  assert.doesNotMatch(source, /errMsg = error\.message/);
});

test('login validation requires email identifiers for privileged roles', async () => {
  const { loginSchema } = await import('../src/lib/validations.ts');
  assert.equal(loginSchema.safeParse({ identifier: 'VELI123', password: 'secret', role: 'parent' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@example.com', password: 'secret', role: 'admin' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: 'OGRENCI123', password: 'secret', role: 'student' }).success, true);
});
