import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileBottomNav } from '../src/components/MobileBottomNav';
import { FOOTER_GROUPS, PLATFORM_INFO } from '../src/content/platform-info';
import { blogPlugin } from '../scripts/blog-vite-plugin';
import { renderBlog } from '../scripts/blog-engine';
import { safeErrorMetadata } from '../server/safe-log';
import { createApiApp } from '../server/api-app';

test('every informational footer link has a crawlable page and shared privacy text', () => {
  const { pages } = renderBlog(process.cwd(), { PUBLIC_SITE_URL: 'https://example.org', VERCEL_ENV: 'production' });
  for (const group of FOOTER_GROUPS) for (const link of group.links) {
    const pathname = new URL(link.href, 'https://example.org').pathname;
    assert.ok(pages.has(`${pathname.slice(1)}/index.html`), link.href);
  }
  for (const info of PLATFORM_INFO) {
    const page = pages.get(`bilgi/${info.slug}/index.html`)!;
    assert.match(page, /<main id="icerik"/);
    assert.equal((page.match(/<h1>/g) || []).length, 1);
    assert.ok(page.includes(info.sections[0].paragraphs[0]));
    assert.match(page, /application\/ld\+json/);
    assert.match(page, new RegExp(`rel="canonical" href="https://example.org/bilgi/${info.slug}"`));
    assert.ok(!page.includes('<form'));
  }
  assert.match(pages.get('bilgi/gizlilik-ve-veriler/index.html')!, /henüz belirtilmemiştir/);
});

test('information routes reject nonexistent and traversal paths instead of falling back to login', () => {
  let middleware: any;
  (blogPlugin().configureServer as Function)({ watcher: { add() {}, on() {} }, middlewares: { use(fn: any) { middleware = fn; } } });
  for (const [url, method, expected] of [['/bilgi/gizlilik-ve-veriler', 'GET', 200], ['/bilgi/gizlilik-ve-veriler?test=1', 'HEAD', 200], ['/bilgi/unknown', 'GET', 404], ['/bilgi/../server', 'GET', 404], ['/bilgi/gizlilik-ve-veriler', 'POST', 405]] as const) {
    const response: any = { statusCode: 200, setHeader() {}, end(value: unknown) { this.body = value; } };
    middleware({ url, method }, response, () => { throw Error('Unexpected SPA fallback'); });
    assert.equal(response.statusCode, expected, url);
    if (method === 'HEAD') assert.equal(response.body, undefined);
  }
});

test('mobile navigation exposes active route and mistake count, without unsupported parent role switching', () => {
  const props = { currentRoute: 'mistakes', onNavigate() {}, mistakesCount: 14 };
  const student = renderToStaticMarkup(<MobileBottomNav {...props} userRole="student" />);
  assert.match(student, /<nav aria-label="Öğrenci alt menüsü"/);
  assert.match(student, /role="tablist"/);
  assert.match(student, /role="tab"/);
  assert.match(student, /aria-current="page"/);
  assert.match(student, /Tekrar: 14 yanlış soru/);
  const parent = renderToStaticMarkup(<MobileBottomNav {...props} currentRoute="parent" userRole="parent" />);
  assert.ok(!parent.includes('Öğrenci Paneli'));
  assert.match(parent, /href="\/bilgi\/hesap-ve-veli-rehberi"/);
});

test('provider errors cannot leak secrets or personal input through safe log metadata', () => {
  const secret = 'test-only-secret-do-not-log';
  const error = { code: secret, name: secret, message: secret, body: { password: secret }, status: 503, headers: { authorization: secret } };
  assert.deepEqual(safeErrorMetadata(error), { code: 'INTERNAL', status: 503 });
  assert.deepEqual(safeErrorMetadata({ code: 'PGRST202', status: 404 }), { code: 'PGRST202', status: 404 });
  assert.deepEqual(safeErrorMetadata(secret), { code: 'INTERNAL' });
  assert.ok(!JSON.stringify(safeErrorMetadata(error)).includes(secret));
});

test('static deployment denies framing and script injection and does not publish the server bundle', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map((h: any) => [h.key, h.value]));
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Content-Security-Policy'], /script-src 'self';/);
  assert.ok(!headers['Content-Security-Policy'].includes('unsafe-eval'));
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(!pkg.scripts.build.includes('outfile=dist/'));
  assert.equal(pkg.scripts.start, 'node build/server.cjs');
});

test('HTTP API fails closed for unauthenticated protected routes, hostile origins and injected JSON', async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const server = createApiApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const [path, method] of [['/api/account/export', 'GET'], ['/api/account/deletion-request', 'POST'], ['/api/learning/sessions', 'POST'], ['/api/parent/activate-students', 'POST'], ['/api/admin/support-requests', 'GET']] as const) {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) });
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    }
    const rejected = await fetch(base + '/api/account/export', { headers: { Origin: 'https://attacker.example' } });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
    const malformed = await fetch(base + '/api/account/deletion-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"secret":"test-marker"' });
    assert.equal(malformed.status, 400);
    assert.ok(!(await malformed.text()).includes('test-marker'));
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv; }
});
