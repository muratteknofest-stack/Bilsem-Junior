import assert from 'node:assert/strict';

// Standalone semantic rules check: never included in normal tests or deployments.
// Both services must already run locally with this disposable demo project.
const project = 'demo-bilsem-security';
function emulatorOrigin(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must point to a local emulator.`);
  const url = new URL(value.includes('://') ? value : `http://${value}`);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Only a loopback emulator is permitted.');
  return url.origin;
}
if (process.env.GCLOUD_PROJECT !== project) throw new Error('Only the disposable demo project is permitted.');
const firestore = emulatorOrigin('FIRESTORE_EMULATOR_HOST');
const storage = emulatorOrigin('FIREBASE_STORAGE_EMULATOR_HOST');
const documents = `${firestore}/v1/projects/${project}/databases/(default)/documents`;
const bucket = `${storage}/v0/b/${project}.appspot.com/o`;
async function call(url, method, authorization, body, contentType = 'application/json') {
  return fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(10_000), headers: {
    ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    ...(body !== undefined ? { 'Content-Type': contentType } : {}),
  }, body });
}
const fields = JSON.stringify({ fields: { name: { stringValue: 'Disposable fixture' } } });
// The emulator-only owner token seeds fixtures; it is never used in client assertions.
for (const path of ['users/fixture', 'questions/fixture', 'users/fixture/private/state']) {
  const response = await call(`${documents}/${path}`, 'PATCH', 'owner', fields);
  assert.equal(response.status, 200, 'Local Firestore fixture setup failed'); await response.body?.cancel();
}
const seeded = await call(`${bucket}?name=legacy%2Ffixture.txt`, 'POST', 'owner', 'fixture', 'text/plain');
assert.equal(seeded.status, 200, 'Local Storage fixture setup failed'); await seeded.body?.cancel();

const now = Math.floor(Date.now() / 1000);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = claims => `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
  aud: project, iss: `https://securetoken.google.com/${project}`, sub: 'fixture', user_id: 'fixture',
  iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'custom', identities: {} }, ...claims,
})}.`;
const contexts = [null, token({ role: 'student', email: 'student@example.invalid', email_verified: true }),
  token({ role: 'parent', email: 'parent@example.invalid', email_verified: true }),
  token({ role: 'admin', email: 'admin@example.invalid', email_verified: true })];
let checked = 0;
for (const authorization of contexts) {
  const requests = [
    [`${documents}/users/fixture`, 'GET'], [`${documents}/users`, 'GET'],
    [`${documents}/users?documentId=new`, 'POST', fields], [`${documents}/users/fixture`, 'PATCH', fields],
    [`${documents}/users/fixture`, 'DELETE'], [`${documents}/questions/fixture`, 'GET'],
    [`${documents}/users/fixture/private/state`, 'GET'],
    [`${bucket}/legacy%2Ffixture.txt`, 'GET'], [`${bucket}/legacy%2Ffixture.txt?alt=media`, 'GET'],
    [bucket, 'GET'], [`${bucket}?name=new.txt`, 'POST', 'fixture', 'text/plain'],
    [`${bucket}/legacy%2Ffixture.txt`, 'PATCH', JSON.stringify({ cacheControl: 'private' })],
    [`${bucket}/legacy%2Ffixture.txt`, 'DELETE'],
  ];
  for (const [url, method, body, contentType] of requests) {
    const response = await call(url, method, authorization, body, contentType);
    assert.equal(response.status, 403, `Retired client access unexpectedly allowed: ${method} ${new URL(url).pathname}`);
    await response.body?.cancel(); checked++;
  }
}
console.log(`Retired Firebase emulator rules: ${checked} client operations denied across anonymous, student, parent and admin claims.`);
