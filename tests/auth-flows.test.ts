import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFamilySchema, registerStudentSchema } from '../server/routes/auth-routes';
import { passwordResetSchema } from '../src/lib/validations';
import { hasRecoveryClaims, isPasswordRecoveryLocation, passwordRecoveryRedirect } from '../src/lib/password-recovery';

const family = {
  parentEmail: '  VELI@example.com  ',
  parentPassword: 'Güvenli123',
  parentPhone: '0555 123 45 67',
  studentName: '  Deniz  ',
  studentPassword: 'Öğrenci456',
  grade: 2,
  examFocus: 'Genel Yetenek',
  consentAccepted: true, termsAccepted: true, guardianConfirmed: true, policyVersion: '2026-10-28.1',
};

test('family registration normalizes identity and requires distinct passwords and explicit consent', () => {
  const parsed = registerFamilySchema.parse(family);
  assert.equal(parsed.parentEmail, 'veli@example.com');
  assert.equal(parsed.studentName, 'Deniz');
  assert.equal(parsed.parentPhone, family.parentPhone);
  assert.equal(registerFamilySchema.safeParse({ ...family, consentAccepted: false }).success, false);
  assert.equal(registerFamilySchema.safeParse({ ...family, guardianConfirmed: undefined }).success, false);
  assert.equal(registerFamilySchema.safeParse({ ...family, termsAccepted: false }).success, false);
  assert.equal(registerFamilySchema.safeParse({ ...family, studentPassword: family.parentPassword }).success, false);
  assert.equal(registerFamilySchema.safeParse({ ...family, studentName: '  ' }).success, false);
  assert.equal(registerFamilySchema.safeParse({ ...family, parentPhone: 'not-a-phone' }).success, false);
});

test('student registration rejects absent consent and accepts Turkish letters in passwords', () => {
  const student = {
    email: ' Ogrenci@example.com ', password: 'Şifre1234', studentName: 'Ayşe',
    grade: 3, examFocus: 'Sözel', consentAccepted: true,
  };
  assert.equal(registerStudentSchema.parse(student).email, 'ogrenci@example.com');
  assert.equal(registerStudentSchema.safeParse({ ...student, consentAccepted: undefined }).success, false);
  assert.equal(registerStudentSchema.safeParse({ ...student, password: '12345678' }).success, false);
});

test('password reset needs a strong password and matching confirmation', () => {
  assert.equal(passwordResetSchema.safeParse({ password: 'YeniŞifre123', confirmPassword: 'YeniŞifre123' }).success, true);
  assert.equal(passwordResetSchema.safeParse({ password: 'YeniŞifre123', confirmPassword: 'wrong123' }).success, false);
  assert.equal(passwordResetSchema.safeParse({ password: '12345678', confirmPassword: '12345678' }).success, false);
});

test('recovery errors returning to the home page still open the recovery screen', () => {
  for (const url of [
    'https://bilsemjunior.vercel.app/#error=access_denied&error_code=otp_expired',
    'https://bilsemjunior.vercel.app/?error_code=otp_expired',
    'https://bilsemjunior.vercel.app/#type=recovery&access_token=test-only',
    'https://bilsemjunior.vercel.app/reset-password',
  ]) assert.equal(isPasswordRecoveryLocation(new URL(url)), true);
  assert.equal(isPasswordRecoveryLocation(new URL('https://bilsemjunior.vercel.app/')), false);
  assert.equal(isPasswordRecoveryLocation(new URL('https://bilsemjunior.vercel.app/#type=signup')), false);
});

test('a verified recovery session remains eligible after reload; other sessions do not', () => {
  assert.equal(hasRecoveryClaims({ sub: 'owner', amr: [{ method: 'recovery' }, { method: 'token_refresh' }] }), true);
  for (const claims of [undefined, {}, { amr: [{ method: 'recovery' }] },
    { sub: 'owner', amr: [{ method: 'password' }], user_metadata: { amr: [{ method: 'recovery' }] } },
    { sub: 'owner', amr: [{ method: 'email/signup' }] }, { sub: 'owner', amr: 'recovery' },
  ]) assert.equal(hasRecoveryClaims(claims), false);
});

test('reset requests from previews use the configured production recovery page', () => {
  assert.equal(passwordRecoveryRedirect('https://old-preview.vercel.app', 'https://bilsemjunior.vercel.app'), 'https://bilsemjunior.vercel.app/reset-password');
  assert.equal(passwordRecoveryRedirect('http://localhost:3000'), 'http://localhost:3000/reset-password');
  for (const origin of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com/?next=evil']) {
    assert.throws(() => passwordRecoveryRedirect('https://bilsemjunior.vercel.app', origin));
  }
});


