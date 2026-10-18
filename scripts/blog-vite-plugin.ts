import type { Plugin } from 'vite';
import { blogConfig, renderBlog } from './blog-engine';

export function blogPlugin(): Plugin {
  return {
    name: 'zekapark-static-editorial-blog',
    transformIndexHtml(_html, context) {
      if (context.filename.replaceAll('\\','/').endsWith('/en/index.html')) {
        const config=blogConfig();
        return [
          ...(config.origin ? [{tag:'link',attrs:{rel:'canonical',href:config.origin+'/en/'},injectTo:'head' as const},{tag:'link',attrs:{rel:'alternate',hreflang:'tr',href:config.origin+'/'},injectTo:'head' as const},{tag:'link',attrs:{rel:'alternate',hreflang:'en',href:config.origin+'/en/'},injectTo:'head' as const}] : []),
          {tag:'meta',attrs:{name:'robots',content:config.indexable?'index,follow':'noindex,follow'},injectTo:'head' as const},
        ];
      }
      const config = blogConfig();
      return [
        ...(config.origin ? [{ tag: 'link', attrs: { rel: 'canonical', href: `${config.origin}/` }, injectTo: 'head' as const }, { tag:'link',attrs:{rel:'alternate',hreflang:'en',href:config.origin+'/en/'},injectTo:'head' as const }, { tag:'link',attrs:{rel:'alternate',hreflang:'tr',href:config.origin+'/'},injectTo:'head' as const }] : []),
        ...(config.origin ? [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Bilsem Junior', url: config.origin + '/', inLanguage: 'tr' }), injectTo: 'head' as const }] : []),
        { tag: 'meta', attrs: { name: 'robots', content: config.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow' }, injectTo: 'head' as const },
      ];
    },
    generateBundle() {
      for (const [fileName, source] of renderBlog().pages) {
        // Vercel's filesystem must not serve a stale policy instead of the database-backed route.
        if (/^bilgi\/(?:gizlilik-ve-veriler|kullanim-kosullari|iletisim-ve-destek)\/index\.html$/.test(fileName)) continue;
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
    configureServer(server) {
      let pages = renderBlog().pages;
      server.watcher.add(['content/blog', 'src/content/platform-info.ts']);
      server.watcher.on('change', file => {
        if (file.includes('/content/blog/') || file.endsWith('/platform-info.ts')) pages = renderBlog().pages;
      });
      server.middlewares.use((req, res, next) => {
        const route = (req.url || '/').split(/[?#]/, 1)[0].replace(/\/$/, '');
        if (!route.startsWith('/bilgi/') && route !== '/bilgi' && !route.startsWith('/blog/') && route !== '/blog' && !['/robots.txt', '/sitemap.xml'].includes(route)) return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        const file = route === '/blog' ? 'blog/index.html' : route.endsWith('.xml') || route.endsWith('.txt') ? route.slice(1) : `${route.slice(1)}/index.html`;
        const page = pages.get(file);
        if (!page) { res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(req.method === 'HEAD' ? undefined : '<!doctype html><html lang="tr"><title>Yazı bulunamadı | Bilsem Junior</title><h1>Yazı bulunamadı</h1><a href="/blog">Bloga dön</a></html>'); return; }
        res.setHeader('Content-Type', file.endsWith('.xml') ? 'application/xml; charset=utf-8' : file.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : page);
      });
    },
  };
}

