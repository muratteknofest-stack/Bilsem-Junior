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

test('Supabase authorization uses protected app claims and immutable family identity', async () => {
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const adminPolicy = await readFile(new URL('../supabase/migrations/20261005180525_admin_claim_only.sql', import.meta.url), 'utf8');
  assert.match(schema, /create trigger protect_profile_identity before update/);
  assert.match(schema, /new\.linked_parent_id/);
  assert.match(schema, /new\.consent/);
  assert.match(schema, /using \(\(select auth\.uid\(\)\) = id or linked_parent_id/);
  assert.match(adminPolicy, /email_confirmed_at is not null/);
  assert.match(adminPolicy, /raw_app_meta_data->>'role' = 'admin'/);
  assert.doesNotMatch(adminPolicy, /raw_user_meta_data/);
});

test('linked student password reset requires verified parent authorization', async () => {
  const source = await readFile(new URL('../server/routes/parent-routes.ts', import.meta.url), 'utf8');
  const passwordHandler = await readFile(new URL('../server/student-password.ts', import.meta.url), 'utf8');
  assert.match(source, /\/parent\/reset-student-password/);
  assert.match(source, /requireVerifiedEmail/);
  assert.match(source, /requireProfileRole\('parent'\)/);
  assert.match(source, /revokeRefreshTokens/);
  assert.match(passwordHandler, /parent\.linkedStudentIds\?\.includes\(parsed\.data\.studentId\)/);
  assert.match(passwordHandler, /student\.linkedParentId !== parent\.id/);
  assert.match(source, /sharedRateLimit/);
  assert.match(source, /student\.linkedParentId !== req\.authUser\.uid/);
  assert.doesNotMatch(source, /AI soru üretimi başarısız:.*err\.message/);
});

test('protected AI routes authenticate before applying per-user limits and recheck publication', async () => {
  const student = await readFile(new URL('../server/routes/student-ai-routes.ts', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../server/routes/admin-ai-routes.ts', import.meta.url), 'utf8');
  const limits = await readFile(new URL('../server/rate-limiters.ts', import.meta.url), 'utf8');
  assert.match(limits, /keyGenerator: authenticatedRateLimitKey/);
  assert.match(student, /'\/ai-hint', requireSupabaseAuth, aiLimiter, requireProfileRole\('student', 'admin'\)/);
  assert.match(admin, /'\/admin\/ai-generate-question', requireSupabaseAuth, adminAiLimiter, requireProfileRole\('admin'\)/);
  assert.match(admin, /if \(!isQuestionReadyForStudents\(currentData\) \|\| report\.errors\.length\)/);
});

test('login source contains no local authentication fallback or fixed password', async () => {
  const source = await readFile(new URL('../src/features/auth/components/LoginForm.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /SYSTEM_ACCOUNTS/);
  assert.doesNotMatch(source, /resilient local login/i);
  assert.doesNotMatch(source, /Standart şifre|setPassword\('123456'\)/);
  assert.doesNotMatch(source, /\/api\/auth\/register-family/);
  const registration = await readFile(new URL('../src/features/auth/components/RegistrationForm.tsx', import.meta.url), 'utf8');
  assert.match(registration, /registerFamilyInSupabase/);
  assert.match(source, /credential\.user\.emailVerified/);
  assert.match(source, /token\.claims\.role !== 'admin'/);
  assert.doesNotMatch(source, /OWNER_ADMIN_EMAIL|createOwnerAdminProfile/);
  assert.match(source, /loggedInProfile\.role !== selectedRole/);
  assert.doesNotMatch(source, /errMsg = error\.message/);
});

test('login validation requires email identifiers for privileged roles', async () => {
  const { loginSchema } = await import('../src/lib/validations.ts');
  assert.equal(loginSchema.safeParse({ identifier: 'VELI123', password: 'secret', role: 'parent' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@example.com', password: 'secret', role: 'admin' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: 'OGRENCI123', password: 'secret', role: 'student' }).success, true);
});


