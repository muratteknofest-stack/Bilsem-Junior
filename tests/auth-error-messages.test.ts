import test from 'node:test';
import assert from 'node:assert/strict';
import { loginAuthError, passwordResetRequestError } from '../src/features/auth/auth-error-messages';

test('reset request distinguishes email quota, request quota and SMTP failure from accepted requests', () => {
  assert.match(passwordResetRequestError({ code: 'over_email_send_rate_limit' }), /çok fazla e-posta/);
  assert.match(passwordResetRequestError({ code: 'over_request_rate_limit' }), /Çok fazla istek/);
  assert.match(passwordResetRequestError({ code: 'email_provider_disabled' }), /kullanılamıyor/);
  assert.match(passwordResetRequestError({ status: 500 }), /tamamlanamadı/);
});

test('login explains Supabase error codes seen in Auth logs', () => {
  assert.match(loginAuthError({ code: 'invalid_credentials' }) ?? '', /Giriş bilgileri hatalı/);
  assert.match(loginAuthError({ code: 'email_not_confirmed' }) ?? '', /doğrulanmamış/);
  assert.match(loginAuthError({ code: 'over_request_rate_limit' }) ?? '', /Çok fazla giriş/);
});
