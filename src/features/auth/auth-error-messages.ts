type AuthFailure = { code?: string; message?: string; status?: number } | null | undefined;

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
  return 'Sıfırlama isteği tamamlanamadı. Bir süre sonra tekrar deneyin veya destek ile iletişime geçin.';
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
  if (error?.message && /fetch failed|failed to fetch|network|load failed/i.test(error.message)) {
    return 'Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
  }
  if (error?.status === 429) return 'Çok fazla giriş denemesi yapıldı. Birkaç dakika sonra tekrar deneyin.';
  return null;
}
