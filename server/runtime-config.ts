type RuntimeEnvironment = Record<string, string | undefined>;

export interface RuntimeConfig {
  port: number;
  production: boolean;
  allowedOrigins: ReadonlySet<string>;
}

function requireEmail(env: RuntimeEnvironment, key: string): void {
  const value = env[key]?.trim();
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${key} geçerli bir e-posta adresi olmalıdır.`);
  }
}

function parseOrigins(raw: string, production: boolean): Set<string> {
  const origins = new Set<string>();
  for (const value of raw.split(',').map((item) => item.trim()).filter(Boolean)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`CORS_ALLOWED_ORIGINS geçersiz bir adres içeriyor: ${value}`);
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
      throw new Error(`CORS_ALLOWED_ORIGINS yalnızca origin içermelidir: ${value}`);
    }
    if (production && url.protocol !== 'https:') {
      throw new Error(`Üretim CORS origin'i HTTPS olmalıdır: ${value}`);
    }
    origins.add(url.origin);
  }
  return origins;
}

export function loadRuntimeConfig(env: RuntimeEnvironment = process.env): RuntimeConfig {
  const production = env.NODE_ENV === 'production';
  const missing: string[] = [];

  if (production) {
    for (const key of [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_DATABASE_ID',
      'APP_BASE_URL',
      'CORS_ALLOWED_ORIGINS',
      'LEGAL_ENTITY_NAME',
      'LEGAL_ENTITY_ADDRESS',
      'PRIVACY_CONTACT_EMAIL',
      'SUPPORT_EMAIL',
    ]) {
      if (!env[key]?.trim()) missing.push(key);
    }
    if (missing.length) throw new Error(`Üretim yapılandırması eksik: ${missing.join(', ')}`);
    if (env.ENFORCE_APP_CHECK?.trim().toLowerCase() === 'false') {
      throw new Error('Üretimde ENFORCE_APP_CHECK=false kullanılamaz.');
    }
    let appBaseUrl: URL;
    try {
      appBaseUrl = new URL(env.APP_BASE_URL!);
    } catch {
      throw new Error('APP_BASE_URL geçerli bir adres olmalıdır.');
    }
    if (appBaseUrl.protocol !== 'https:' || appBaseUrl.origin !== env.APP_BASE_URL!.replace(/\/$/, '')) {
      throw new Error('Üretimde APP_BASE_URL yalnızca kesin bir HTTPS origin içermelidir.');
    }
    requireEmail(env, 'PRIVACY_CONTACT_EMAIL');
    requireEmail(env, 'SUPPORT_EMAIL');
    if (env.PAYMENTS_ENABLED?.trim().toLowerCase() === 'true') {
      for (const key of ['LEGAL_REGISTRATION_ID', 'PREMIUM_PRICE_DISPLAY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID']) {
        if (!env[key]?.trim()) missing.push(key);
      }
      if (missing.length) throw new Error(`Ödeme yapılandırması eksik: ${missing.join(', ')}`);
      if (env.STRIPE_LIVE_MODE_REQUIRED?.trim().toLowerCase() !== 'true') {
        throw new Error('Ticari üretimde STRIPE_LIVE_MODE_REQUIRED=true olmalıdır.');
      }
      if (!env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_')) {
        throw new Error('Ticari üretimde canlı Stripe gizli anahtarı kullanılmalıdır.');
      }
    }
  }

  const originSource = env.CORS_ALLOWED_ORIGINS?.trim()
    || 'http://localhost:3000,http://localhost:5173';
  const allowedOrigins = parseOrigins(originSource, production);
  if (allowedOrigins.size === 0) throw new Error('En az bir CORS origin yapılandırılmalıdır.');

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT 1–65535 arasında bir tam sayı olmalıdır.');
  }

  return { port, production, allowedOrigins };
}
