import type { RequestHandler } from 'express';
import { createCachedRead } from './cached-read';
import { getServiceClient } from './supabase-admin';
import { logServerFailure } from './safe-log';

export function createHealthHandler(): RequestHandler {
  const readiness = createCachedRead(async () => {
    try {
      const client = getServiceClient(), signal = AbortSignal.timeout(3000);
      // HEAD checks table access without returning customer rows. Concurrent
      // probes share this entire bounded check, not three queries per caller.
      const checks = await Promise.all(['profiles', 'learning_sessions', 'platform_settings'].map(table =>
        client.from(table).select('id', { head: true }).limit(1).abortSignal(signal).retry(false)));
      for (const check of checks) if (check.error) throw check.error;
      return { status: 'ok', database: 'ready', version: '1.0.0',
        projectRef: new URL(process.env.SUPABASE_URL || '').hostname.split('.')[0],
        commit: process.env.VERCEL_GIT_COMMIT_SHA || null, timestamp: Date.now() };
    } catch (error) {
      logServerFailure('API readiness check failed', error);
      throw new Error('Readiness unavailable');
    }
  }, 10_000);
  return async (_req, res) => {
    try { return res.json(await readiness.get()); }
    catch { return res.status(503).json({ status: 'unavailable', database: 'unavailable' }); }
  };
}
