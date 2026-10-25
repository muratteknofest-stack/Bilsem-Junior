import { isPublicPolicySlug } from './src/content/legal-documents';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createApiApp } from './server/api-app';
import { readPlatformSettings } from './server/platform-settings';
import { publicPolicy, policyHtml } from './server/platform-policy';
import { publicPlayMembership,playMembershipPageHtml } from './server/play-membership-page';
import { defaultPlatformSettings } from './src/lib/platform-settings';

dotenv.config();

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;
  app.use((req, res, next) => {
    if (/^\/(?:admin|reset-password)(?:\/|$)/.test(req.path)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  app.get('/paketler',async(_req,res)=>{res.setHeader('Cache-Control','no-store');res.type('html').send(playMembershipPageHtml(await publicPlayMembership()));});
  app.get('/bilgi/:slug', async (req, res, next) => {
    if (!isPublicPolicySlug(req.params.slug)) return next();
    const { settings } = await readPlatformSettings().catch(() => ({ settings: defaultPlatformSettings() }));
    const info = publicPolicy(req.params.slug, settings)!;
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(policyHtml(info));
  });
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
      res.sendFile(file, { root: distPath }, error => {
        if (error && !res.headersSent) res.status(404).send('Yazı bulunamadı');
      });
    });
    app.use(/^\/(?:server(?:\.cjs)?|build|\.(?:env|git))(?:[/.].*)?$/, (_req, res) => { res.sendStatus(404); });
    app.get(/^\/en\/?$/,(_req,res)=>res.sendFile('en/index.html',{root:distPath}));
    app.use(express.static(distPath, { dotfiles: 'deny' }));
    app.use(/^\/(?:robots\.txt|sitemap\.xml|blog-assets\/)/, (_req, res) => { res.sendStatus(404); });
    app.get(/^\/(?:admin(?:\/giris)?|reset-password|wordwall|dashboard|parent|login|register|practice|exam|adaptive)?\/?$/, (req, res) => res.sendFile('index.html', { root: distPath, cacheControl: !/^\/(?:admin|reset-password)(?:\/|$)/.test(req.path) }));
    app.use((_req, res) => res.status(404).sendFile('404.html', { root: distPath }));
  }
  app.listen(port, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${port}`));
}

startServer();


