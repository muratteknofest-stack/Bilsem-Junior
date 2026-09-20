import { rateLimit } from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import type { AuthenticatedRequest } from './security';

export const authenticatedRateLimitKey = (req: AuthenticatedRequest) => (
  req.authUser?.uid ? `uid:${req.authUser.uid}` : `ip:${ipKeyGenerator(req.ip || '0.0.0.0')}`
);

export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authenticatedRateLimitKey,
  message: { error: 'Yapay zekâ istek sınırına ulaşıldı. Lütfen kısa süre sonra tekrar deneyin.' },
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authenticatedRateLimitKey,
  message: { error: 'Saatlik rapor gönderim sınırına ulaşıldı.' },
});

export const accountSecurityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authenticatedRateLimitKey,
  message: { error: 'Saatlik hesap güvenliği işlem sınırına ulaşıldı.' },
});

export const adminAiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authenticatedRateLimitKey,
  message: { error: 'AI soru motoru istek sınırına ulaşıldı.' },
});

export const adminDataLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authenticatedRateLimitKey,
  message: { error: 'Yönetim paneli istek sınırına ulaşıldı.' },
});
