import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { androidBuildSettings } from '../scripts/android-build-settings';
import { requestSecurity } from '../server/request-security';
import { verifyAndroidRelease } from '../scripts/verify-android-release.mjs';

test('compiled release rejects debug, test-only, cleartext, backups and unexpected identity', () => {
  const manifest = ['usesCleartextTraffic','allowBackup','fullBackupContent'].map(name => `A: android:${name}=(type 0x12)0x0`).join('\n');
  const badging = "package: name='com.zekapark.app' versionCode='12' versionName='1.0.11'\napplication-label:'BİLSEM Junior'\nsdkVersion:'24'\ntargetSdkVersion:'36'\n";
  assert.equal(verifyAndroidRelease(manifest, badging).debuggable, false);
  for (const attribute of ['debuggable','testOnly']) for (const value of ['ffffffff','1']) assert.throws(() => verifyAndroidRelease(manifest+`\nA: android:${attribute}=(type 0x12)0x${value}`, badging));
  for (const attribute of ['usesCleartextTraffic','allowBackup','fullBackupContent']) {
    assert.throws(() => verifyAndroidRelease(manifest.replace(`android:${attribute}=(type 0x12)0x0`, `android:${attribute}=(type 0x12)0xffffffff`), badging));
    assert.throws(() => verifyAndroidRelease(manifest.replace(`A: android:${attribute}=(type 0x12)0x0`, ''), badging));
  }
  for (const [before,after] of [["application-label:'BİLSEM Junior'","application-label:'ZekaPark'"],['com.zekapark.app','com.other.app'],["versionCode='12'","versionCode='3'"],["versionName='1.0.11'","versionName='1.0.2'"],["targetSdkVersion:'36'","targetSdkVersion:'33'"]]) assert.throws(() => verifyAndroidRelease(manifest,badging.replace(before,after)));
});

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
