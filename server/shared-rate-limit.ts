import { createHmac } from 'node:crypto';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './security';
import { getServiceClient } from './supabase-admin';
/** Durable across Vercel workers. The database receives no raw IP addresses. */
export function sharedRateLimit(scope: string, limit: number, seconds: number) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const salt = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!salt) return res.status(503).json({ error: 'İstek sınırı doğrulanamadı. Yeniden deneyin.' });
    const key = createHmac('sha256', salt).update(`${scope}:${req.authUser?.uid || req.ip || 'unknown'}`).digest('hex');
    const { data, error } = await getServiceClient().rpc('consume_api_limit', { p_key: key, p_scope: scope, p_limit: limit, p_seconds: seconds });
    if (error) return res.status(503).json({ error: 'İstek sınırı doğrulanamadı. Yeniden deneyin.' });
    if (!data) { res.setHeader('Retry-After', String(seconds)); return res.status(429).json({ error: 'İstek sınırına ulaşıldı. Biraz sonra yeniden deneyin.' }); }
    return next();
  };
}
