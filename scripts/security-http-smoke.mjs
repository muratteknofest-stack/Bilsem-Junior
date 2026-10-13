import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const child = spawn(process.execPath, ['build/server.cjs'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port) }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const configuredHeaders = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers[0].headers.filter(header => header.key !== 'Content-Security-Policy');
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw Error('Production server exited before readiness');
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) }); await response.arrayBuffer(); ready = true; break; } catch { await pause(100); }
  }
  assert.ok(ready, 'Production server did not start');
  const checks = [['/', 200], ['/en', 200], ['/en/', 200], ['/en/unknown', 404], ['/unknown-release-page', 404], ['/reset-password', 200], ['/admin', 200], ['/admin/giris', 200], ['/admin/giris/', 200], ['/blog', 200], ['/bilgi/gizlilik-ve-veriler', 200], ['/bilgi/unknown', 404], ['/blog/unknown', 404], ['/server.cjs', 404], ['/server.cjs.map', 404], ['/build/server.cjs', 404], ['/bilgi/%2e%2e/.env', 404], ['/api/account/export', 401], ['/api/admin/support-requests', 401], ['/api/parent/shopier/access?studentId=22222222-2222-4222-8222-222222222222', 401]];
  for (const [path, expected] of checks) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/, path);
    assert.equal(response.headers.get('x-powered-by'), null, path);
    for (const header of configuredHeaders) assert.equal(response.headers.get(header.key), header.value, `${path}: ${header.key}`);
    const csp = response.headers.get('content-security-policy') || '';
    assert.match(csp, /script-src-attr 'none'/);
    assert.match(csp, /style-src-elem 'self' https:\/\/fonts.googleapis.com/);
    assert.ok(!csp.includes('*.') && !csp.includes('unsafe-eval'), path);
    if (path.startsWith('/api/') || path === '/bilgi/gizlilik-ve-veriler') assert.equal(response.headers.get('cache-control'), 'no-store', path);
    if (path.startsWith('/admin') || path === '/reset-password') {
      assert.equal(response.headers.get('cache-control'), 'no-store', path);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive', path);
    }
    await response.arrayBuffer();
  }
  const reset = await fetch(base + '/api/auth/change-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'DisposableTest123' }), signal: AbortSignal.timeout(3000),
  });
  assert.equal(reset.status, 401, 'Unauthenticated password change');
  assert.equal(reset.headers.get('cache-control'), 'no-store');
  await reset.arrayBuffer();
  const studentSwitch = await fetch(base + '/api/parent/student-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: '22222222-2222-4222-8222-222222222222' }), signal: AbortSignal.timeout(3000),
  });
  assert.equal(studentSwitch.status, 401, 'Unauthenticated student-session switch');
  assert.equal(studentSwitch.headers.get('cache-control'), 'no-store');
  await studentSwitch.arrayBuffer();
  for (const path of ['/api/parent/return-session', '/api/parent/reset-student-password', '/api/parent/shopier/claim']) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, 401, `Unauthenticated ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
    const payload = await response.json();
    assert.equal(typeof payload.error, 'string', path);
    assert.equal(payload.access_token, undefined, path);
    assert.equal(payload.refresh_token, undefined, path);
  }
  for (const [headers, expected] of [
    [{ Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, 403],
    [{ 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' }, 403],
    [{ 'Content-Type': 'text/plain' }, 415],
  ]) {
    const response = await fetch(base + '/api/parent/return-session', { method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    await response.arrayBuffer();
  }
  console.log(`Production HTTP security: ${checks.length + 8} checks passed.`);
} finally {
  if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
}

