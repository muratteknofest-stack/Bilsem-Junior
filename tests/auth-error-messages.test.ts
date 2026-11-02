import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  loginAuthError, 
  passwordResetRequestError, 
  translateSupabaseError, 
  parseRecoveryUrlNotice, 
  passwordResetUpdateError,
  isEmailNotConfirmed 
} from '../src/features/auth/auth-error-messages';

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

test('translates English error messages from Supabase Auth to Turkish', () => {
  // Raw messages without error code
  assert.match(translateSupabaseError({ message: 'Invalid login credentials' }), /Giriş bilgileri hatalı/);
  assert.match(translateSupabaseError({ message: 'Email not confirmed' }), /doğrulanmamış/);
  assert.match(translateSupabaseError({ message: 'User already registered' }), /zaten var/);
  assert.match(translateSupabaseError({ message: 'User already exists' }), /zaten var/);
  assert.match(translateSupabaseError({ message: 'For security purposes, you can only request this after 53 seconds.' }), /53 saniye bekleyip/);
  assert.match(translateSupabaseError({ message: 'Email rate limit exceeded' }), /çok fazla e-posta/);
  assert.match(translateSupabaseError({ message: 'Token has expired or is invalid' }), /süresi dolmuş/);
  assert.match(translateSupabaseError({ message: 'Email link is invalid or has expired' }), /süresi dolmuş/);
  assert.match(translateSupabaseError({ message: 'User not found' }), /Kayıtlı kullanıcı bulunamadı/);
  assert.match(translateSupabaseError({ message: 'Password should be at least 6 characters.' }), /Şifre güvenlik kriterlerini/);
  assert.match(translateSupabaseError({ message: 'New password should be different from the old password.' }), /eski şifrenizle aynı olamaz/);
  assert.match(translateSupabaseError({ message: 'Failed to fetch' }), /Ağ bağlantısı/);
  assert.match(translateSupabaseError(new Error('NetworkError when attempting to fetch resource.')), /Ağ bağlantısı/);
});

test('isEmailNotConfirmed detects both code and message variants', () => {
  assert.equal(isEmailNotConfirmed({ code: 'email_not_confirmed' }), true);
  assert.equal(isEmailNotConfirmed({ message: 'Email not confirmed' }), true);
  assert.equal(isEmailNotConfirmed({ message: 'EMAIL_NOT_VERIFIED_SENT' }), true);
  assert.equal(isEmailNotConfirmed({ code: 'invalid_credentials' }), false);
});

test('parseRecoveryUrlNotice parses hash and search parameters in Turkish', () => {
  const expiredHash = parseRecoveryUrlNotice({ hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired' });
  assert.equal(expiredHash?.isError, true);
  assert.match(expiredHash?.message ?? '', /süresi dolmuş/);

  const queryExpired = parseRecoveryUrlNotice({ search: '?error_code=otp_expired' });
  assert.equal(queryExpired?.isError, true);
  assert.match(queryExpired?.message ?? '', /süresi dolmuş/);

  assert.equal(parseRecoveryUrlNotice({ hash: '', search: '' }), null);
});

test('passwordResetUpdateError handles password policy and Supabase errors in Turkish', () => {
  assert.match(passwordResetUpdateError(new Error('PASSWORD_COMPROMISED')), /veri sızıntılarında/);
  assert.match(passwordResetUpdateError({ message: 'New password should be different from the old password.' }), /eski şifrenizle aynı olamaz/);
  assert.match(passwordResetUpdateError({ message: 'Auth session missing!' }), /Oturum süreniz doldu/);
});
