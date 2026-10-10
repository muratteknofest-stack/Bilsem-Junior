type RecoveryLocation = Pick<Location, 'pathname' | 'search' | 'hash'>;

export function isPasswordRecoveryLocation(location: RecoveryLocation): boolean {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  return location.pathname === '/reset-password' ||
    hash.get('type') === 'recovery' || query.get('type') === 'recovery' ||
    hash.get('error_code') === 'otp_expired' || query.get('error_code') === 'otp_expired';
}

export function hasRecoveryClaims(claims: Record<string, unknown> | undefined): boolean {
  // Call only with Supabase getClaims() output, which verifies the JWT signature.
  return Boolean(claims?.sub && Array.isArray(claims.amr) &&
    claims.amr.some(method => method && typeof method === 'object' && method.method === 'recovery'));
}

export function passwordRecoveryRedirect(browserOrigin: string, publicOrigin: string = ''): string {
  const url = new URL(publicOrigin || browserOrigin);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Şifre yenileme dönüş adresi yapılandırılamadı. Destek ile iletişime geçin.');
  }
  return new URL('/reset-password', url).href;
}
