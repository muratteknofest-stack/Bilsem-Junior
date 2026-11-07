import { randomBytes } from 'node:crypto';

export interface AppHandoffSessionPayload {
  accessToken?: string;
  refreshToken?: string;
  studentCode?: string;
  studentName?: string;
  role: 'student' | 'parent' | 'admin';
  email?: string;
  uid: string;
}

export interface AppHandoffRecord {
  token: string;
  code: string;
  userId: string;
  email: string;
  role: 'student' | 'parent' | 'admin';
  sessionPayload: AppHandoffSessionPayload;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory store for active handoff records (TTL: 10 minutes)
const handoffStore = new Map<string, AppHandoffRecord>();
const codeIndex = new Map<string, string>(); // code -> token
const failedAttemptCounts = new Map<string, { count: number; lockedUntil: number }>();

const HANDOFF_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function pruneExpired(): void {
  const now = Date.now();
  for (const [token, record] of handoffStore.entries()) {
    if (record.expiresAt <= now || record.used) {
      handoffStore.delete(token);
      codeIndex.delete(record.code);
    }
  }
  for (const [key, attempt] of failedAttemptCounts.entries()) {
    if (attempt.lockedUntil > 0 && attempt.lockedUntil <= now) {
      failedAttemptCounts.delete(key);
    }
  }
}

function generateHandoffCode(): string {
  // Generates BJ-XXXXXX where XXXXXX is 6 unambiguous uppercase characters/digits (729M+ entropy)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = randomBytes(6);
    let code = 'BJ-';
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    if (!codeIndex.has(code)) return code;
  }
  return `BJ-${randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;
}

export function createAppHandoff(params: {
  userId: string;
  email: string;
  role: 'student' | 'parent' | 'admin';
  sessionPayload: AppHandoffSessionPayload;
  siteUrl?: string;
}): {
  token: string;
  code: string;
  expiresAt: number;
  deepLinkUrl: string;
  appLinkUrl: string;
  playStoreReferrerUrl: string;
} {
  if (params.role === 'admin') {
    throw new Error('Yönetici oturumları güvenlik nedeniyle aktarılamaz.');
  }

  pruneExpired();

  const token = `handoff_${randomBytes(24).toString('base64url')}`;
  const code = generateHandoffCode();
  const now = Date.now();
  const expiresAt = now + HANDOFF_TTL_MS;

  const record: AppHandoffRecord = {
    token,
    code,
    userId: params.userId,
    email: params.email,
    role: params.role,
    sessionPayload: params.sessionPayload,
    createdAt: now,
    expiresAt,
    used: false,
  };

  handoffStore.set(token, record);
  codeIndex.set(code, token);

  const baseSite = (params.siteUrl || process.env.VITE_PUBLIC_SITE_URL || 'https://www.bilsemjunior.com').replace(/\/+$/, '');
  const deepLinkUrl = `bilsemjunior://auth?handoff=${encodeURIComponent(token)}`;
  const appLinkUrl = `${baseSite}/app-auth?handoff=${encodeURIComponent(token)}`;
  const playStoreReferrerUrl = `https://play.google.com/store/apps/details?id=com.quantumtech.bilsemjunior&referrer=handoff_token%3D${encodeURIComponent(token)}`;

  return {
    token,
    code,
    expiresAt,
    deepLinkUrl,
    appLinkUrl,
    playStoreReferrerUrl,
  };
}

export function exchangeAppHandoff(identifier: { token?: string; code?: string; clientIp?: string }): {
  success: boolean;
  error?: string;
  code?: string;
  sessionPayload?: AppHandoffSessionPayload;
} {
  pruneExpired();

  const ipKey = identifier.clientIp || 'default_client';
  const now = Date.now();
  const attemptInfo = failedAttemptCounts.get(ipKey);
  if (attemptInfo && attemptInfo.lockedUntil > now) {
    const remainingSec = Math.ceil((attemptInfo.lockedUntil - now) / 1000);
    return {
      success: false,
      error: `Çok fazla başarısız deneme yapıldı. Lütfen ${remainingSec} saniye sonra tekrar deneyin.`,
      code: 'RATE_LIMIT_EXCEEDED',
    };
  }

  let token = identifier.token?.trim();
  if (!token && identifier.code) {
    const normalizedCode = identifier.code.trim().toUpperCase();
    const withPrefix = normalizedCode.startsWith('BJ-') ? normalizedCode : `BJ-${normalizedCode}`;
    token = codeIndex.get(withPrefix) || codeIndex.get(normalizedCode);
  }

  const recordFailure = () => {
    const current = failedAttemptCounts.get(ipKey) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    failedAttemptCounts.set(ipKey, current);
  };

  if (!token) {
    recordFailure();
    return { success: false, error: 'Aktarım kodu veya bağlantısı bulunamadı.', code: 'HANDOFF_NOT_FOUND' };
  }

  const record = handoffStore.get(token);
  if (!record) {
    recordFailure();
    return { success: false, error: 'Aktarım bağlantısı geçersiz veya süresi dolmuş.', code: 'HANDOFF_NOT_FOUND' };
  }

  if (record.used) {
    return { success: false, error: 'Bu aktarım bağlantısı daha önce kullanılmış. Lütfen web uygulamasından yeni bir bağlantı oluşturun.', code: 'HANDOFF_ALREADY_USED' };
  }

  if (record.expiresAt <= Date.now()) {
    handoffStore.delete(token);
    codeIndex.delete(record.code);
    return { success: false, error: 'Aktarım bağlantısının 10 dakikalık süresi dolmuş. Lütfen web uygulamasından tekrar aktarın.', code: 'HANDOFF_EXPIRED' };
  }

  // Mark as used immediately to prevent replay
  record.used = true;
  handoffStore.delete(token);
  codeIndex.delete(record.code);
  failedAttemptCounts.delete(ipKey);

  return {
    success: true,
    sessionPayload: record.sessionPayload,
  };
}

// Clean up helper for testing
export function _resetHandoffStoreForTest(): void {
  handoffStore.clear();
  codeIndex.clear();
  failedAttemptCounts.clear();
}
