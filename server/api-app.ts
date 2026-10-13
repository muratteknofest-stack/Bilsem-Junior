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
import editorialRoutes from './routes/editorial-routes';
import { getServiceClient } from './supabase-admin';
import { browserDirectives, securityHeaders } from './browser-security';
import { requestSecurity } from './request-security';
import platformRoutes from './routes/platform-routes';
import shopierRoutes from './routes/shopier-routes';

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: browserDirectives,
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
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', platformRoutes);
  app.use('/api', shopierRoutes);
  app.use('/api', parentRoutes);
  app.use('/api', studentAiRoutes);
  app.use('/api', adminAiRoutes);
  app.use('/api', editorialRoutes);
  app.use('/api', authRoutes);
  app.use('/api', supportRoutes);
  app.use('/api', challengeRoutes);
  app.use('/api', learningRoutes);
  app.get('/api/health', async (_req, res) => {
    try {
      const { error } = await getServiceClient().from('profiles').select('id').limit(1);
      if (error) throw error;
      const learning = await getServiceClient().from('learning_sessions').select('id').limit(1);
      if (learning.error) throw learning.error;
      const platform = await getServiceClient().from('platform_settings').select('id').limit(1);
      if (platform.error) throw platform.error;
      const configuredUrl = new URL(process.env.SUPABASE_URL || '');
      return res.json({ status: 'ok', database: 'ready', version: '1.0.0',
        projectRef: configuredUrl.hostname.split('.')[0],
        commit: process.env.VERCEL_GIT_COMMIT_SHA || null, timestamp: Date.now() });
    } catch (error) {
      logServerFailure('API readiness check failed', error);
      return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });
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



