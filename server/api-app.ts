import { logServerFailure } from './safe-log';
import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import challengeRoutes from './routes/challenge-routes';
import learningRoutes from './routes/learning-routes';
import supportRoutes from './routes/support-routes';
import helmet from 'helmet';
import parentRoutes from './routes/parent-routes';
import studentAiRoutes from './routes/student-ai-routes';
import adminAiRoutes from './routes/admin-ai-routes';
import authRoutes from './routes/auth-routes';
import profileRoutes from './routes/profile-routes';
import editorialRoutes from './routes/editorial-routes';
import { browserDirectives, resolveConnectSrcOrigins, securityHeaders } from './browser-security';
import { checkedSupabaseOrigin } from '../shared/supabase-environment.mjs';
import { requestSecurity } from './request-security';
import createPlatformRoutes from './routes/platform-routes';
import { createCachedRead } from './cached-read';
import { readPlatformSettings } from './platform-settings';
import { createRequestLimits, type RequestLimitPolicy } from './request-limits';
import { createHealthHandler } from './health';
import googlePlayRoutes from './routes/google-play-routes';
import { publicPlayMembership, playMembershipPageHtml } from './play-membership-page';

export function createApiApp(options: { limits?: Partial<RequestLimitPolicy> } = {}) {
  const app = express();
  const limits = createRequestLimits(options.limits);
  const publicSettings = createCachedRead(readPlatformSettings, 5000);
  let connectSrc = browserDirectives.connectSrc;
  try {
    if (process.env.SUPABASE_URL) connectSrc = resolveConnectSrcOrigins(checkedSupabaseOrigin(process.env.SUPABASE_URL, process.env));
  } catch { connectSrc = ["'self'"]; }
  app.disable('x-powered-by');
  // Vercel owns and overwrites the final forwarding hop. A directly exposed
  // Node/VPS server must not accept an attacker's X-Forwarded-For as its IP.
  app.set('trust proxy', process.env.VERCEL === '1' ? 1 : false);
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: { ...browserDirectives, connectSrc },
    } : false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
  }));
  app.use((_req, res, next) => { for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value); next(); });
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://localhost:5173');
  app.use('/api', requestSecurity(corsOrigins));
  app.use(['/api', '/bilgi', '/paketler'], (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); }, limits.api);
  app.use(['/api/public', '/api/health', '/bilgi', '/paketler'], limits.public);
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', createPlatformRoutes(publicSettings));
  app.get('/api/public/membership', async (_req,res) => { const view=await publicPlayMembership(publicSettings.get);res.json({...view,enforced: process.env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS === 'true',plans: [{id:'monthly'},{id:'quarterly'},{id:'annual'}]}); });
  app.get('/api/public/membership/page', async (_req,res) => res.type('html').send(playMembershipPageHtml(await publicPlayMembership(publicSettings.get))));
  app.use('/api', googlePlayRoutes);
  app.use('/api', parentRoutes);
  app.use('/api', studentAiRoutes);
  app.use('/api', adminAiRoutes);
  app.use('/api', editorialRoutes);
  app.use('/api', authRoutes);
  app.use('/api', profileRoutes);
  app.use('/api', supportRoutes);
  app.use('/api', challengeRoutes);
  app.use('/api', learningRoutes);
  app.get('/api/health', createHealthHandler());
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API uç noktası bulunamadı.' }));
  const apiErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const requestId = randomUUID();
    logServerFailure('API request failed', error, requestId);
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 503;
    res.status(status).json({ error: status === 413 ? 'İstek boyutu sınırı aşıldı.' : status === 400 ? 'Geçersiz istek.' : 'İşlem şu anda tamamlanamıyor. Tekrar deneyin.', requestId });
  };
  app.use('/api', apiErrorHandler);
  return app;
}



