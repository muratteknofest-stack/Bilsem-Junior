import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function verifyHealthResponse(response, { commit, projectRef }) {
  assert.equal(response.status, 200, `Expected /api/health 200, got ${response.status}`);
  assert.equal(response.redirected, false, 'Health endpoint redirected');
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i, 'Health response was not JSON');
  const body = await response.json();
  assert.equal(body.status, 'ok', 'Health status is not ok');
  assert.equal(body.database, 'ready', 'Database is not ready');
  assert.equal(body.commit, commit, `Deployed commit ${body.commit} does not match ${commit}`);
  assert.equal(body.projectRef, projectRef, `Database project ${body.projectRef} does not match ${projectRef}`);
  return body;
}

async function fetchLocalNavigation(url, headers = {}, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, {
      method,
      agent: false,
      headers: { ...headers, ...(body ? { 'Content-Length': String(Buffer.byteLength(body)) } : {}) },
    }, async incoming => {
      try {
        const chunks = [];
        for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
        const resHeaders = new Headers();
        for (const [k, v] of Object.entries(incoming.headers)) {
          if (v !== undefined) resHeaders.set(k, Array.isArray(v) ? v.join(', ') : v);
        }
        resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers: resHeaders }));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
    req.end(body);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [originText, commit, projectRef] = process.argv.slice(2);
  if (originText && commit && projectRef) {
    const url = new URL('/api/health', originText);
    for (let attempt = 1; attempt <= 24; attempt++) {
      try {
        const response = await fetch(url, { redirect: 'manual', headers: { Accept: 'application/json' } });
        const body = await verifyHealthResponse(response, { commit, projectRef });
        console.log(`Live release verified at ${url.origin}: commit=${body.commit} projectRef=${body.projectRef} database=${body.database}`);
        process.exit(0);
      } catch (error) {
        if (attempt === 24) throw error;
        await pause(5000);
      }
    }
  } else if (originText || commit || projectRef) {
    throw new Error('Usage: npm run verify:live -- https://site.example COMMIT_SHA SUPABASE_PROJECT_REF');
  } else {
    const expected = { commit: 'a'.repeat(40), projectRef: 'vtcsoqohkiagbwatlabk' };
    await verifyHealthResponse(Response.json({ status: 'ok', database: 'ready', ...expected }), expected);
    await assert.rejects(verifyHealthResponse(new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } }), expected));
    await assert.rejects(verifyHealthResponse(new Response(null, { status: 307, headers: { location: 'https://vercel.com/login' } }), expected));
    await assert.rejects(verifyHealthResponse(Response.json({ status: 'ok', database: 'ready', commit: 'b'.repeat(40), projectRef: expected.projectRef }), expected));
    await assert.rejects(verifyHealthResponse(Response.json({ status: 'ok', database: 'ready', commit: expected.commit, projectRef: 'other' }), expected));
    await assert.rejects(verifyHealthResponse(Response.json({ status: 'ok', database: 'unavailable', ...expected }), expected));

    const reservation = net.createServer();
    await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));

    const child = spawn(process.execPath, ['build/server.cjs'], {
      env: { ...process.env, NODE_ENV: 'production', PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Production server start timed out')), 15000);
      child.once('exit', code => {
        clearTimeout(timer);
        reject(new Error(`Production server exited early with code ${code}`));
      });
      child.stdout.on('data', chunk => {
        if (String(chunk).includes('Server running on')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const base = new URL(`http://127.0.0.1:${port}`);
    try {
      const checks = [
        ['/', 200],
        ['/blog', 200],
        ['/reset-password', 200],
        ['/bilgi/gizlilik-ve-veriler', 200],
        ['/sales/sales.css', 200],
        ['/robots.txt', 200],
        ['/sitemap.xml', 200],
        ['/api/account/export', 401],
        ['/api/learning/history', 401],
        ['/api/admin/platform-settings', 401],
        ['/api/admin/question-review-summary', 401],
        ['/api/admin/support-requests/55555555-5555-4555-8555-555555555555/deletion', 401],
        ['/api/release-unknown', 404],
      ];
      for (const [path, status] of checks) {
        const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
        assert.equal(response.status, status, path);
        assert.equal(response.redirected, false, path);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
        assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
        const body = await response.text();
        if (path === '/') assert.match(body, /<html[^>]*lang="tr"/i);
        if (path === '/sales/sales.css') assert.ok(body.includes('.zp-plan-mint'));
        if (path === '/robots.txt') assert.match(body, /^User-agent:\s*\*/m);
      }
      const navigation = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-User': '?1', Accept: 'text/html' };
      for (const path of ['/bilgi/gizlilik-ve-veriler', '/bilgi/kullanim-kosullari', '/bilgi/iletisim-ve-destek']) {
        const response = await fetchLocalNavigation(new URL(path, base), navigation);
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get('content-type') || '', /^text\/html/);
      }
      for (const [path, method, headers, body] of [
        ['/api/public/membership', 'GET', { ...navigation, 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' }, undefined],
        ['/api/account/export', 'GET', navigation, undefined],
        ['/api/parent/google-play/verify', 'POST', { ...navigation, 'Content-Type': 'application/json' }, '{}'],
      ]) {
        const response = await fetchLocalNavigation(new URL(path, base), headers, method, body);
        assert.equal(response.status, 403, path);
      }
      console.log(`Live release verification passed: health contract + ${checks.length + 6} public/cross-site release checks verified.`);
    } finally {
      try { child.kill(); } catch {}
    }
    process.exit(0);
  }
}
