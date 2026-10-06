import express from 'express';
import helmet from 'helmet';
import parentRoutes from './routes/parent-routes';
import studentAiRoutes from './routes/student-ai-routes';
import adminAiRoutes from './routes/admin-ai-routes';
import authRoutes from './routes/auth-routes';

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
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.supabase.co'],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', parentRoutes);
  app.use('/api', studentAiRoutes);
  app.use('/api', adminAiRoutes);
  app.use('/api', authRoutes);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: Date.now() }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API uç noktası bulunamadı.' }));
  return app;
}
