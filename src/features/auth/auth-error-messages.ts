export type AuthFailure = { code?: string; message?: string; status?: number; error_description?: string } | null | undefined;

/**
 * Supabase Auth (GoTrue) tarafından döndürülen tüm İngilizce hata mesajlarını
 * ve hata kodlarını kullanıcı dostu Türkçe açıklamalara çevirir.
 */
export function translateSupabaseError(error: unknown, fallbackMessage?: string): string {
  if (!error) return fallbackMessage || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';

  const candidate = (typeof error === 'object' ? error : { message: String(error) }) as AuthFailure & { name?: string };
  const code = (candidate?.code || '').toLowerCase();
  const rawMsg = String(candidate?.message || candidate?.error_description || '');
  const status = candidate?.status;

  // 1. Ağ ve Bağlantı Hataları
  if (/fetch failed|failed to fetch|network|load failed|err_internet_disconnected|network-request-failed|authretryablefetcherror/i.test(rawMsg) ||
      code === 'auth/network-request-failed') {
    return 'Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  // 2. Çok Fazla İstek / Hız Sınırı (Rate Limits & 429)
  const secondsMatch = rawMsg.match(/after\s+(\d+)\s+seconds/i);
  if (secondsMatch) {
    return `Güvenlik nedeniyle lütfen ${secondsMatch[1]} saniye bekleyip tekrar deneyin.`;
  }
  if (code === 'over_email_send_rate_limit' || /email rate limit exceeded|over email send rate limit/i.test(rawMsg)) {
    return 'Bu adrese kısa sürede çok fazla e-posta istendi. Lütfen bir süre bekleyip tekrar deneyin.';
  }
  if (code === 'over_request_rate_limit' || status === 429 || /too many requests/i.test(rawMsg)) {
    return 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
  }

  // 3. Giriş ve Kimlik Doğrulama Hataları
  if (code === 'invalid_credentials' || /invalid login credentials|invalid email or password/i.test(rawMsg)) {
    return 'Giriş bilgileri hatalı. E-posta/öğrenci kodu ve şifrenizi kontrol edin.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed|email_not_confirmed/i.test(rawMsg)) {
    return 'E-posta adresiniz doğrulanmamış. Öğrenci kodu kullanıyorsanız veliniz e-postasını doğrulayıp veli paneline giriş yapmalıdır. Veli hesabında gelen kutusu ve spam klasörünü kontrol edin.';
  }
  if (code === 'user_not_found' || /user not found/i.test(rawMsg)) {
    return 'Kayıtlı kullanıcı bulunamadı. Lütfen bilgilerinizi kontrol edin.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered|already exists|user already exists/i.test(rawMsg)) {
    return 'Bu e-posta adresiyle kayıtlı bir hesap zaten var. Lütfen giriş yapın veya şifrenizi sıfırlayın.';
  }

  // 4. Token, OTP ve Şifre Sıfırlama Bağlantısı Hataları
  if (code === 'otp_expired' || code === 'token_expired' || /token.*expired|link.*expired|invalid or has expired|otp_expired/i.test(rawMsg)) {
    return 'Bağlantının veya doğrulama kodunun süresi dolmuş ya da daha önce kullanılmış. Lütfen yeni bir bağlantı isteyin.';
  }
  if (/token is invalid|invalid token/i.test(rawMsg)) {
    return 'Doğrulama bağlantısı geçersiz. Lütfen e-postanızdaki en güncel bağlantıyı kullanın.';
  }

  // 5. Şifre Güvenlik Kriterleri ve Değiştirme Hataları
  if (/password should be at least|password is too weak|weak_password/i.test(rawMsg) || code === 'weak_password') {
    return 'Şifre güvenlik kriterlerini karşılamıyor. En az 8 karakter, bir harf ve bir rakam içermelidir.';
  }
  if (/same_password|new password should be different/i.test(rawMsg) || code === 'same_password') {
    return 'Yeni şifreniz eski şifrenizle aynı olamaz. Lütfen farklı bir şifre belirleyin.';
  }

  // 6. E-posta Geçerliliği ve Servis Sağlayıcı Hataları
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid email/i.test(rawMsg)) {
    return 'Geçerli bir e-posta adresi girin.';
  }
  if (code === 'email_address_not_authorized' || code === 'email_provider_disabled' || /provider disabled/i.test(rawMsg)) {
    return 'E-posta gönderimi şu anda kullanılamıyor. Destek ile iletişime geçin.';
  }
  if (code === 'signup_disabled' || /signup.*disabled|signups not allowed/i.test(rawMsg)) {
    return 'Yeni üye kaydı şu anda kapalıdır.';
  }
  if (code === 'bad_jwt' || /jwt expired|session expired|auth session missing/i.test(rawMsg)) {
    return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  }

  return fallbackMessage || 'İşlem tamamlanamadı. Bir süre sonra tekrar deneyin veya destek ile iletişime geçin.';
}

export function isEmailNotConfirmed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const failure = error as { code?: string; message?: string };
  return failure.code === 'email_not_confirmed' ||
    /email.*not.*confirmed/i.test(failure.message || '') ||
    /^EMAIL_NOT_VERIFIED/i.test(failure.message || '');
}

export function passwordResetRequestError(error: AuthFailure): string {
  switch (error?.code) {
    case 'over_email_send_rate_limit':
      return 'Bu adrese kısa sürede çok fazla e-posta istendi. Bir süre bekleyip tekrar deneyin.';
    case 'over_request_rate_limit':
      return 'Çok fazla istek gönderildi. Birkaç dakika sonra tekrar deneyin.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Geçerli bir e-posta adresi girin.';
    case 'email_address_not_authorized':
    case 'email_provider_disabled':
      return 'E-posta gönderimi şu anda kullanılamıyor. Destek ile iletişime geçin.';
  }
  if (error?.message && /fetch failed|failed to fetch|network|load failed/i.test(error.message)) {
    return 'Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (error?.status === 429) return 'Çok fazla istek gönderildi. Bir süre bekleyip tekrar deneyin.';

  return translateSupabaseError(error, 'Sıfırlama isteği tamamlanamadı. Bir süre sonra tekrar deneyin veya destek ile iletişime geçin.');
}

export function loginAuthError(error: AuthFailure): string | null {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'Giriş bilgileri hatalı. E-posta/öğrenci kodu ve şifrenizi kontrol edin.';
    case 'email_not_confirmed':
      return 'E-posta adresiniz doğrulanmamış. Öğrenci kodu kullanıyorsanız veliniz e-postasını doğrulayıp veli paneline giriş yapmalıdır. Veli hesabında gelen kutusu ve spam klasörünü kontrol edin.';
    case 'over_request_rate_limit':
      return 'Çok fazla giriş denemesi yapıldı. Birkaç dakika sonra tekrar deneyin.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Geçerli bir e-posta adresi girin.';
  }
  if (error?.status && [502, 503, 504].includes(error.status)) {
    return 'Giriş hizmeti şu anda yanıt vermiyor. Biraz sonra tekrar deneyin.';
  }
  if (error?.message && /fetch failed|failed to fetch|network|load failed|yanıt alınamadı/i.test(error.message)) {
    return 'Giriş hizmetine bağlanılamadı. Biraz sonra tekrar deneyin.';
  }
  if (error?.status === 429) return 'Çok fazla giriş denemesi yapıldı. Birkaç dakika sonra tekrar deneyin.';

  // If error has an English message from Supabase, translate it
  if (error?.message && /invalid login credentials|invalid credentials/i.test(error.message)) {
    return 'Giriş bilgileri hatalı. E-posta/öğrenci kodu ve şifrenizi kontrol edin.';
  }
  if (error?.message && /email not confirmed/i.test(error.message)) {
    return 'E-posta adresiniz doğrulanmamış. Öğrenci kodu kullanıyorsanız veliniz e-postasını doğrulayıp veli paneline giriş yapmalıdır. Veli hesabında gelen kutusu ve spam klasörünü kontrol edin.';
  }
  if (error?.message && /email rate limit exceeded|over email send rate limit/i.test(error.message)) {
    return 'Bu adrese kısa sürede çok fazla e-posta istendi. Bir süre bekleyip tekrar deneyin.';
  }
  if (error?.message && /user not found/i.test(error.message)) {
    return 'Kayıtlı kullanıcı bulunamadı. Lütfen e-posta adresinizi veya öğrenci kodunuzu kontrol edin.';
  }

  return null;
}

export function passwordResetUpdateError(error: unknown): string {
  if (error instanceof Error && error.message) {
    // If it's already a clear Turkish message from our validation or policy
    if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(error.message) &&
        !/invalid|failed|unauthorized|rejected|compromised|token|session|error/i.test(error.message)) {
      return error.message;
    }
    if (error.message === 'PASSWORD_COMPROMISED' || /veri sızıntılarında/i.test(error.message)) {
      return 'Bu parola bilinen veri sızıntılarında yer alıyor. Başka hizmetlerde kullanmadığınız farklı bir parola seçin.';
    }
  }
  return translateSupabaseError(error, 'Şifre değiştirilemedi. Lütfen yeni bir bağlantı isteyin veya biraz sonra tekrar deneyin.');
}

/**
 * E-posta bağlantısıyla yönlendirilen sayfadaki URL parametrelerini (hata veya zaman aşımı) çözümler.
 */
export function parseRecoveryUrlNotice(locationLike?: { hash?: string; search?: string }): { isError: boolean; message: string } | null {
  if (typeof window === 'undefined' && !locationLike) return null;
  const loc = locationLike || window.location;
  const hash = new URLSearchParams((loc.hash || '').replace(/^#/, ''));
  const query = new URLSearchParams(loc.search || '');

  const errorCode = hash.get('error_code') || query.get('error_code');
  const errorDesc = hash.get('error_description') || query.get('error_description');
  const error = hash.get('error') || query.get('error');

  if (errorCode === 'otp_expired' || /expired/i.test(errorDesc || '')) {
    return {
      isError: true,
      message: 'Şifre sıfırlama bağlantısının kullanım süresi dolmuş veya bağlantı daha önce kullanılmış. Aşağıdan yeni bir bağlantı isteyebilirsiniz.',
    };
  }
  if (error || errorDesc || errorCode) {
    return {
      isError: true,
      message: translateSupabaseError({ code: errorCode || error || undefined, message: errorDesc || undefined }, 'Bu bağlantı geçersiz veya süresi dolmuş olabilir. Aşağıdan yeni bir sıfırlama bağlantısı isteyebilirsiniz.'),
    };
  }

  return null;
}
