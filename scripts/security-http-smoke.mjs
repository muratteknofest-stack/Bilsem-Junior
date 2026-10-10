import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const child = spawn(process.execPath, ['build/server.cjs'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port) }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw Error('Production server exited before readiness');
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) }); await response.arrayBuffer(); ready = true; break; } catch { await pause(100); }
  }
  assert.ok(ready, 'Production server did not start');
  const checks = [['/', 200], ['/blog', 200], ['/bilgi/gizlilik-ve-veriler', 200], ['/bilgi/unknown', 404], ['/blog/unknown', 404], ['/server.cjs', 404], ['/server.cjs.map', 404], ['/build/server.cjs', 404], ['/bilgi/%2e%2e/.env', 404], ['/api/account/export', 401], ['/api/admin/support-requests', 401]];
  for (const [path, expected] of checks) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/, path);
    assert.equal(response.headers.get('x-powered-by'), null, path);
    if (path.startsWith('/api/')) assert.equal(response.headers.get('cache-control'), 'no-store', path);
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
  console.log(`Production HTTP security: ${checks.length + 2} checks passed.`);
} finally {
  if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
}
