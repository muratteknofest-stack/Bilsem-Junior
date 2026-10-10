import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { blogConfig, BLOG_CATEGORIES, readArticles, renderBlog } from '../scripts/blog-engine';
import { blogPlugin } from '../scripts/blog-vite-plugin';
import { PLATFORM_INFO } from '../src/content/platform-info';

const origin = 'https://example.org';
const production = { PUBLIC_SITE_URL: origin, VERCEL_ENV: 'production' };

test('30 complete original guides cover all six categories with unique relevant photo sources', () => {
  const articles = readArticles();
  const photos = JSON.parse(fs.readFileSync('content/blog/photos.json', 'utf8'));
  assert.equal(articles.length, 30);
  assert.equal(new Set(articles.map(a => a.slug)).size, 30);
  assert.equal(new Set(articles.map(a => a.photo)).size, 30);
  assert.deepEqual(new Set(articles.map(a => a.category)), new Set(BLOG_CATEGORIES));
  for (const a of articles) {
    assert.ok(a.words >= 350, `${a.slug}: substantive article`);
    assert.ok(a.sections.length >= 5);
    assert.equal(a.faqs.length, 3);
    assert.ok(a.sections.every(s => s.paragraphs.length >= 2));
    assert.match(photos[a.photo].source, new RegExp(`^https://www\\.pexels\\.com/photo/.+-${a.photo}/$`));
    assert.match(a.alt, /\S/);
  }
});

test('production pages contain complete text, honest author data, unique metadata and crawlable related links', () => {
  const { pages, articles } = renderBlog(process.cwd(), production);
  const descriptions = new Set<string>();
  for (const a of articles) {
    const html = pages.get(`blog/${a.slug}/index.html`)!;
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes(a.sections[0].paragraphs[0]));
    assert.ok(html.includes(`rel="canonical" href="${origin}/blog/${a.slug}"`));
    assert.match(html, /index,follow,max-image-preview:large/);
    assert.match(html, /srcset=/);
    assert.match(html, /Pexels fotoğraf kaynağı/);
    descriptions.add(a.excerpt);
    const structured = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    const post = structured['@graph'][0];
    assert.equal(post['@type'], 'BlogPosting');
    assert.equal(post.headline, a.title);
    assert.equal(post.author['@type'], 'Organization');
    assert.equal(post.wordCount, a.words);
    for (const m of html.matchAll(/href="(\/blog\/[a-z0-9-]+)"/g)) assert.ok(pages.has(`${m[1].slice(1)}/index.html`), m[1]);
  }
  assert.equal(descriptions.size, 30);
  assert.equal((pages.get('sitemap.xml')!.match(/<loc>/g) || []).length, 33 + PLATFORM_INFO.length);
  assert.equal((pages.get('blog/feed.xml')!.match(/<item>/g) || []).length, 30);
  assert.match(pages.get('robots.txt')!, /Allow: \/\nDisallow: \/api\//);
  assert.equal((pages.get('blog/index.html')!.match(/ data-article /g) || []).length, 30);
});

test('preview pages cannot be indexed and never use the preview hostname as the production canonical', () => {
  const { pages } = renderBlog(process.cwd(), { ...production, VERCEL_ENV: 'preview', VERCEL_URL: 'branch.vercel.app' });
  assert.match(pages.get('blog/index.html')!, /noindex,follow/);
  assert.ok(!pages.get('blog/index.html')!.includes('branch.vercel.app'));
  assert.equal(pages.get('robots.txt'), 'User-agent: *\nDisallow: /\n');
  assert.throws(() => blogConfig({ VERCEL_ENV: 'production' }), /Production blog needs/);
  for (const raw of ['http://example.org', 'https://example.org/path', 'https://a:b@example.org', 'https://example.org/?q=1']) assert.throws(() => blogConfig({ PUBLIC_SITE_URL: raw }));
  assert.equal(blogConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'example.org', VERCEL_ENV: 'production' }).origin, origin);
});

test('Vercel keeps blog assets and unknown blog paths outside the SPA fallback', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const fallback = new RegExp(`^${config.rewrites.at(-1).source}$`);
  for (const route of ['/bilgi', '/bilgi/gizlilik-ve-veriler', '/bilgi/unknown', '/blog', '/blog/bilsem-nedir', '/blog/does-not-exist', '/blog-assets/blog.css', '/robots.txt', '/sitemap.xml', '/api/health']) assert.equal(fallback.test(route), false, route);
  assert.equal(fallback.test('/dashboard'), true);
});

test('development blog middleware serves HTML without React and returns real 404s', async () => {
  let middleware: any;
  const plugin = blogPlugin();
  const setup = plugin.configureServer as Function;
  setup({ watcher: { add() {}, on() {} }, middlewares: { use(fn: any) { middleware = fn; } } });
  const request = (url: string, method = 'GET') => {
    const result: any = { statusCode: 200, headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; }, end(body: string) { this.body = body; } };
    middleware({ url, method }, result, () => { result.next = true; });
    return result;
  };
  assert.match(request('/blog/bilsem-nedir?q=anything').body, /<h1>BİLSEM nedir/);
  assert.equal(request('/blog/unknown').statusCode, 404);
  assert.equal(request('/blog/%2e%2e').statusCode, 404);
  assert.equal(request('/blog/bilsem-nedir', 'HEAD').body, undefined);
  assert.equal(request('/blog', 'POST').statusCode, 405);
  assert.equal(request('/api/health').next, true);
});

test('search handles Turkish spelling, category links, empty results, clear and sharing', async () => {
  const handlers: Record<string, Function> = {};
  const makeNode = (extra = {}): any => ({ dataset: {}, hidden: false, textContent: '', classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, addEventListener(name: string, fn: Function) { (this as any)[name] = fn; }, ...extra });
  const form = makeNode();
  const input: any = makeNode({ value: '', closest: () => form, focus: () => { handlers.focused = () => true; } });
  const cards = [makeNode({ dataset: { category: 'BİLSEM rehberi', search: 'BİLSEM nedir' } }), makeNode({ dataset: { category: 'Dikkat ve öğrenme', search: 'Çocuklarda dikkat oyunları' } })];
  const filters = ['', 'BİLSEM rehberi', 'Dikkat ve öğrenme'].map(category => makeNode({ dataset: { filter: category } }));
  const nodes: Record<string, any> = { '#blog-search': input, '#result-count': makeNode(), '#result-context': makeNode(), '#empty-state': makeNode(), '#clear-search': makeNode(), '[data-share]': makeNode(), '#share-status': makeNode() };
  const location = { href: 'https://example.org/blog?q=bilsem', search: '?q=bilsem', pathname: '/blog', origin };
  const context = { URL, URLSearchParams, location, navigator: { clipboard: { async writeText(value: string) { assert.equal(value, `${origin}/blog`); } } }, history: { replaceState(_: any, __: any, value: URL) { location.href = String(value); } }, window: { addEventListener(event: string, fn: Function) { handlers[event] = fn; } }, document: { documentElement: makeNode(), querySelector: (s: string) => nodes[s], querySelectorAll: (s: string) => s === '[data-article]' ? cards : filters } };
  vm.runInNewContext(fs.readFileSync('public/blog-assets/blog.js', 'utf8'), context);
  assert.equal(nodes['#result-count'].textContent, '1');
  assert.equal(cards[0].hidden, false);
  input.value = 'cocuklarda dikkat'; input.input();
  assert.equal(cards[1].hidden, false);
  filters[1].click(); assert.equal(nodes['#empty-state'].hidden, false);
  nodes['#clear-search'].click(); assert.equal(nodes['#result-count'].textContent, '2');
  assert.ok(handlers.focused);
  await nodes['[data-share]'].click();
  assert.match(nodes['#share-status'].textContent, /kopyalandı/);
});
