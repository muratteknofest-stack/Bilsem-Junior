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

test('connection failures describe the login service instead of asserting the user is offline', () => {
  for (const error of [{ message: 'Failed to fetch' }, { message: 'NetworkError' }, { message: 'Sunucudan yanıt alınamadı.' }, { status: 502 }, { status: 503 }, { status: 504 }]) {
    const message = loginAuthError(error) || '';
    assert.match(message, /Giriş hizmet/);
    assert.doesNotMatch(message, /İnternet bağlantınızı/);
  }
  assert.match(loginAuthError({ status: 429 }) || '', /Çok fazla giriş/);
  assert.match(loginAuthError({ code: 'invalid_credentials', status: 400 }) || '', /Giriş bilgileri hatalı/);
});
