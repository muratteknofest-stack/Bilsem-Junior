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

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://zekapark.muratteknofest.chatgpt.site')
      .split(',').map(origin => origin.trim()).filter(Boolean),
  );
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    const sameOrigin = Boolean(origin && (() => {
      try { return new URL(origin).host === req.headers.host; } catch { return false; }
    })());
    const accepted = !origin || sameOrigin || allowedOrigins.has(origin);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!accepted) return res.status(403).json({ error: 'İstek kaynağına izin verilmiyor.' });
    if (origin && accepted) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.supabase.co', 'wss://*.supabase.co'],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '256kb' }));
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
      return res.json({ status: 'ok', database: 'ready', version: '1.0.0', timestamp: Date.now() });
    } catch (error) {
      console.error('API readiness check failed:', error);
      return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API uç noktası bulunamadı.' }));
  const apiErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const requestId = randomUUID();
    console.error('API request failed', { requestId, code: error?.code || 'INTERNAL', name: error?.name });
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 503;
    res.status(status).json({ error: status === 413 ? 'İstek boyutu sınırı aşıldı.' : status === 400 ? 'Geçersiz istek.' : 'İşlem şu anda tamamlanamıyor. Tekrar deneyin.', requestId });
  };
  app.use('/api', apiErrorHandler);
  return app;
}


