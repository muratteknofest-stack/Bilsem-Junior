import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';

import parentRoutes from './server/routes/parent-routes';
import studentAiRoutes from './server/routes/student-ai-routes';
import adminAiRoutes from './server/routes/admin-ai-routes';
import authRoutes from './server/routes/auth-routes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://zekapark.muratteknofest.chatgpt.site')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
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
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.supabase.co',
        ],
      },
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', parentRoutes);
  app.use('/api', studentAiRoutes);
  app.use('/api', adminAiRoutes);
  app.use('/api', authRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: Date.now(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'API uç noktası bulunamadı.' });
    });
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
