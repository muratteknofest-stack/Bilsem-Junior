import { rateLimit } from 'express-rate-limit';

export interface RequestLimitPolicy { apiPerMinute: number; publicPerMinute: number }
export const DEFAULT_REQUEST_LIMITS: Readonly<RequestLimitPolicy> = Object.freeze({ apiPerMinute: 600, publicPerMinute: 120 });

/** Runs before JSON parsing, Auth, database rate-limit RPCs and provider calls.
 * These counters are local to one process; distributed edge/WAF controls remain required.
 */
export function createRequestLimits(policy: Partial<RequestLimitPolicy> = {}) {
  const settings = { ...DEFAULT_REQUEST_LIMITS, ...policy };
  for (const limit of Object.values(settings))
    if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) throw new Error('Geçersiz API istek sınırı.');
  const create = (limit: number) => rateLimit({
    windowMs: 60_000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    // Outside Vercel forwarding headers are intentionally not trusted. They
    // must not cause warning floods or substitute for the socket address.
    validate: { xForwardedForHeader: false, forwardedHeader: false },
    message: { error: 'İstek sınırına ulaşıldı. Biraz sonra yeniden deneyin.', code: 'RATE_LIMITED' },
  });
  return { api: create(settings.apiPerMinute), public: create(settings.publicPerMinute) };
}
