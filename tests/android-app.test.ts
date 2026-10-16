import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { androidBuildSettings } from '../scripts/android-build-settings';
import { requestSecurity } from '../server/request-security';

const publicEnv = {
  VITE_API_BASE_URL: 'https://api.example.test',
  VITE_PUBLIC_SITE_URL: 'https://example.test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};

test('native build requires explicit HTTPS endpoints and never exports accidental secrets', () => {
  for (const key of Object.keys(publicEnv)) assert.throws(() => androidBuildSettings({ ...publicEnv, [key]: '' }));
  for (const url of ['http://api.example.test', 'https://localhost', 'https://api.example.test/path', 'https://user:password@api.example.test', 'https://api.example.test/?token=private']) {
    assert.throws(() => androidBuildSettings({ ...publicEnv, VITE_API_BASE_URL: url }));
  }
  const output = androidBuildSettings({ ...publicEnv, SHOPIER_ACCESS_TOKEN: 'private', VITE_SUPABASE_SERVICE_ROLE_KEY: 'private', VITE_API_BASE_URL_SECRET: 'private' });
  assert.deepEqual(output, publicEnv);
  const serviceRole = ['eyJ0eXAiOiJKV1QifQ', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'signature'].join('.');
  assert.throws(() => androidBuildSettings({ ...publicEnv, VITE_SUPABASE_PUBLISHABLE_KEY: serviceRole }));
});

test('Android CORS requires explicit origin and never replaces bearer authentication', async () => {
  const app = express();
  app.use('/api', requestSecurity('https://localhost'));
  app.get('/api/private', (_req, res) => res.status(401).json({ error: 'authentication required' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/private`;
  try {
    const preflight = await fetch(base, { method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://localhost');
    assert.match(preflight.headers.get('access-control-allow-headers') || '', /Authorization/);
    const anonymous = await fetch(base, { headers: { Origin: 'https://localhost' } });
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get('access-control-allow-credentials'), null);
    for (const origin of ['https://evil.example', 'http://localhost', 'null']) {
      assert.equal((await fetch(base, { headers: { Origin: origin } })).status, 403);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
