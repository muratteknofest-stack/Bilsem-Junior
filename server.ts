import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createApiApp } from './server/api-app';

dotenv.config();

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.get(/^\/(?:blog|bilgi)(?:\/.*)?$/, (req, res) => {
      const route = req.path.replace(/\/$/, '');
      const section = route.startsWith('/bilgi') ? 'bilgi' : 'blog';
      const slug = route.slice(section.length + 2);
      const file = route === '/blog' ? 'blog/index.html' : section === 'blog' && slug === 'feed.xml' ? 'blog/feed.xml' : /^[a-z0-9-]+$/.test(slug) ? `${section}/${slug}/index.html` : '';
      if (!file) { res.status(404).send('Yazı bulunamadı'); return; }
      res.sendFile(path.join(distPath, file), error => {
        if (error && !res.headersSent) res.status(404).send('Yazı bulunamadı');
      });
    });
    app.use(/^\/(?:server(?:\.cjs)?|build|\.(?:env|git))(?:[/.].*)?$/, (_req, res) => { res.sendStatus(404); });
    app.use(express.static(distPath, { dotfiles: 'deny' }));
    app.use(/^\/(?:robots\.txt|sitemap\.xml|blog-assets\/)/, (_req, res) => { res.sendStatus(404); });
    app.use((_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(port, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${port}`));
}

startServer();

