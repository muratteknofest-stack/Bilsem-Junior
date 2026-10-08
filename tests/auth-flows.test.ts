import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFamilySchema, registerStudentSchema } from '../server/routes/auth-routes';
import { passwordResetSchema } from '../src/lib/validations';

const family = {
  parentEmail: '  VELI@example.com  ',
  parentPassword: 'Güvenli123',
  parentPhone: '0555 123 45 67',
  studentName: '  Deniz  ',
  studentPassword: 'Öğrenci456',
  grade: 2,
  examFocus: 'Genel Yetenek',
  consentAccepted: true, termsAccepted: true, guardianConfirmed: true,
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

