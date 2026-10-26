import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { verifyHealthResponse } from './verify-live-release.mjs';

const expectedHeaders = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
};

async function startLocalProductionServer() {
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
  return {
    base: new URL(`http://127.0.0.1:${port}`),
    stop() {
      try { child.kill(); } catch {}
    },
  };
}

async function runSecurityChecks(base, verifyHealth) {
  if (verifyHealth) {
    await verifyHealth();
  }
  for (const path of ['/', '/admin', '/reset-password', '/blog', '/bilgi/gizlilik-ve-veriler']) {
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, path);
    for (const [name, value] of Object.entries(expectedHeaders)) {
      assert.equal(response.headers.get(name), value, `${path} ${name}`);
    }
    const csp = response.headers.get('content-security-policy') || '';
    assert.match(csp, /frame-ancestors 'none'/, path);
    assert.match(csp, /script-src-attr 'none'/, path);
    assert.match(csp, /style-src-elem 'self' https:\/\/fonts\.googleapis\.com/, path);
    assert.ok(!csp.includes('*.') && !csp.includes('unsafe-eval'), path);
    if (path === '/admin' || path === '/reset-password') {
      assert.equal(response.headers.get('cache-control'), 'no-store', path);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive', path);
    }
    await response.arrayBuffer();
  }

  for (const [method, path, headers, expected] of [
    ['PATCH', '/api/account/profile', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/account/profile/activity', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/auth/change-password', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/parent/student-session', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/parent/return-session', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/parent/reset-student-password', { 'Content-Type': 'application/json' }, 401],
    ['POST', '/api/parent/return-session', { Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, 403],
    ['POST', '/api/parent/return-session', { 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' }, 403],
    ['POST', '/api/parent/return-session', { 'Content-Type': 'text/plain' }, 415],
  ]) {
    const response = await fetch(new URL(path, base), {
      method,
      headers,
      body: '{}',
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, expected, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store', `${method} ${path}`);
    for (const [name, value] of Object.entries(expectedHeaders)) {
      assert.equal(response.headers.get(name), value, `${path} ${name}`);
    }
    const payload = await response.json();
    assert.equal(typeof payload.error, 'string', path);
    assert.equal(payload.access_token, undefined, path);
    assert.equal(payload.refresh_token, undefined, path);
  }
}

const [site, commit, projectRef] = process.argv.slice(2);
if (site) {
  const base = new URL(site);
  await runSecurityChecks(base, async () => {
    await verifyHealthResponse(
      await fetch(new URL('/api/health', base), { redirect: 'manual', signal: AbortSignal.timeout(10000) }),
      { commit, projectRef },
    );
  });
  console.log('Live security release verification passed.');
} else {
  const server = await startLocalProductionServer();
  try {
    await runSecurityChecks(server.base);
    console.log('Security release verification passed (14 route & API security checks verified).');
  } finally {
    server.stop();
  }
  process.exit(0);
}
