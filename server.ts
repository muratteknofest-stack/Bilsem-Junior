import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';

import parentRoutes from './server/routes/parent-routes';
import studentAiRoutes from './server/routes/student-ai-routes';
import adminAiRoutes from './server/routes/admin-ai-routes';
import authRoutes from './server/routes/auth-routes';
import adminDataRoutes from './server/routes/admin-data-routes';
import examRoutes from './server/routes/exam-routes';
import practiceRoutes from './server/routes/practice-routes';
import privacyRoutes from './server/routes/privacy-routes';
import billingRoutes from './server/routes/billing-routes';
import billingWebhookRoutes from './server/routes/billing-webhook-routes';
import progressRoutes from './server/routes/progress-routes';
import { randomUUID } from 'node:crypto';
import { getAdminDb } from './server/security';
import { loadRuntimeConfig } from './server/runtime-config';

dotenv.config();

async function startServer() {
  const runtime = loadRuntimeConfig();
  const app = express();
  const PORT = runtime.port;

  app.disable('x-powered-by');
  if (runtime.production) app.set('trust proxy', 1);
  const allowedOrigins = runtime.allowedOrigins;
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'İstek kaynağına izin verilmiyor.' });
    }
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: runtime.production ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://firebasevertexai.googleapis.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use((req, res, next) => {
    const requestId = req.header('x-request-id')?.slice(0, 100) || randomUUID();
    const startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      console.log(JSON.stringify({
        severity: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARNING' : 'INFO',
        message: 'http_request',
        requestId,
        method: req.method,
        // Route templates are operationally useful without placing user IDs,
        // attempt IDs or deletion request IDs into long-lived request logs.
        route: req.route?.path || 'unmatched',
        status: res.statusCode,
        latencyMs: Date.now() - startedAt,
      }));
    });
    next();
  });
  // Stripe signature verification requires the exact raw request bytes. The
  // request logger is installed first because it never consumes the body.
  app.use('/api', billingWebhookRoutes);
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', parentRoutes);
  app.use('/api', studentAiRoutes);
  app.use('/api', adminAiRoutes);
  app.use('/api', adminDataRoutes);
  app.use('/api', authRoutes);
  app.use('/api', examRoutes);
  app.use('/api', practiceRoutes);
  app.use('/api', privacyRoutes);
  app.use('/api', billingRoutes);
  app.use('/api', progressRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: Date.now(),
    });
  });

  app.get('/api/ready', async (_req, res) => {
    try {
      await getAdminDb().collection('_health').limit(1).get();
      return res.json({ status: 'ready', timestamp: Date.now() });
    } catch (error) {
      console.error('[Readiness] Firestore unavailable:', error);
      return res.status(503).json({ status: 'not_ready', timestamp: Date.now() });
    }
  });

  if (!runtime.production) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.SERVE_STATIC_CLIENT?.trim().toLowerCase() === 'true') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'API uç noktası bulunamadı.' });
    });
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'API uç noktası bulunamadı.' });
    });
    app.use((_req, res) => {
      res.status(404).json({ error: 'Bu servis yalnızca ZekaPark API isteklerini kabul eder.' });
    });
  }

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'unhandled_request_error',
      route: req.route?.path || 'unmatched',
      error: error instanceof Error ? error.message : 'unknown_error',
    }));
    if (!res.headersSent) res.status(500).json({ error: 'Beklenmeyen bir sunucu hatası oluştu.' });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(JSON.stringify({ severity: 'INFO', message: 'shutdown_started', signal }));
    server.close((error) => {
      if (error) {
        console.error(JSON.stringify({ severity: 'ERROR', message: 'shutdown_failed', error: error.message }));
        process.exitCode = 1;
      }
      process.exit();
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('ZekaPark sunucusu başlatılamadı:', error);
  process.exit(1);
});
