import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayIdentityClient, playAuthIssues, playAccessToken } from '../server/google-play-auth';
import { playSetupIssues, playRequest } from '../server/google-play-client';
import { GooglePlayError } from '../server/google-play-model';

const env: NodeJS.ProcessEnv = {
  GOOGLE_PLAY_AUTH_MODE: 'workload_identity', VERCEL_ENV: 'production',
  GOOGLE_PLAY_WIF_PROVIDER: 'projects/367829590893/locations/global/workloadIdentityPools/bilsem-vercel/providers/bilsem-production',
  GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: 'bilsem-play-api@bilsem-junior-512517.iam.gserviceaccount.com',
};

test('keyless readiness requires explicit production config but no private key or cached JWT', () => {
  assert.deepEqual(playAuthIssues(env), []);
  assert.deepEqual(playSetupIssues({ ...env, GOOGLE_PLAY_BINDING_SECRET: 'b'.repeat(32), GOOGLE_PLAY_TOKEN_KEY: 'a'.repeat(64),
    GOOGLE_PLAY_RTDN_AUDIENCE: 'https://bilsemjunior.vercel.app/api/google-play/notifications', GOOGLE_PLAY_RTDN_EMAIL: env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL }), []);
  for (const mode of ['preview', 'development', '', undefined]) assert.deepEqual(playAuthIssues({ ...env, VERCEL_ENV: mode }), ['VERCEL_ENV']);
  assert.deepEqual(playAuthIssues({ ...env, GOOGLE_PLAY_AUTH_MODE: 'invalid-private-value' }), ['GOOGLE_PLAY_AUTH_MODE']);
  assert.deepEqual(playAuthIssues({}), ['GOOGLE_PLAY_SERVICE_ACCOUNT_JSON']);
});

test('malformed federation resource names cannot supply URLs, paths or other credential sources', () => {
  for (const provider of ['https://attacker.example/token', '//iam.googleapis.com/' + env.GOOGLE_PLAY_WIF_PROVIDER, env.GOOGLE_PLAY_WIF_PROVIDER + '?secret=x', env.GOOGLE_PLAY_WIF_PROVIDER?.replace('367829590893','wrong'), '../escape']) {
    assert.deepEqual(playAuthIssues({ ...env, GOOGLE_PLAY_WIF_PROVIDER: provider }), ['GOOGLE_PLAY_WIF_PROVIDER']);
    assert.throws(() => createPlayIdentityClient({ ...env, GOOGLE_PLAY_WIF_PROVIDER: provider }), GooglePlayError);
  }
  assert.deepEqual(playAuthIssues({ ...env, GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: 'private@attacker.example' }), ['GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL']);
  assert.deepEqual(playAuthIssues({ ...env, GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: 'bad/escape@fixture.iam.gserviceaccount.com' }), ['GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL']);
});

test('Google SDK exchanges a fresh Vercel token and impersonates only the configured account with Publisher scope', async () => {
  let supplied = 0;
  const client = createPlayIdentityClient(env, async () => `fixture-oidc-${++supplied}`);
  const calls: Array<{ url: string; data: unknown }> = [];
  client.transporter.defaults.fetchImplementation = async (input, options) => {
    const url = String(input); calls.push({ url, data: options?.body });
    let data: unknown;
    if (url === 'https://sts.googleapis.com/v1/token') {
      const body = new URLSearchParams(String(options?.body));
      assert.equal(body.get('audience'), `//iam.googleapis.com/${env.GOOGLE_PLAY_WIF_PROVIDER}`);
      assert.equal(body.get('subject_token'), `fixture-oidc-${supplied}`);
      assert.equal(body.get('subject_token_type'), 'urn:ietf:params:oauth:token-type:jwt');
      data = { access_token: 'fixture-sts', token_type: 'Bearer', expires_in: 600 };
    } else {
      assert.equal(url, `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`);
      assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer fixture-sts');
      assert.deepEqual(JSON.parse(String(options?.body)), { scope: ['https://www.googleapis.com/auth/androidpublisher'], lifetime: '600s' });
      data = { accessToken: 'fixture-publisher', expireTime: new Date(Date.now() + 600000).toISOString() };
    }
    return Response.json(data);
  };
  assert.equal((await client.getAccessToken()).token, 'fixture-publisher');
  assert.equal((await client.getAccessToken()).token, 'fixture-publisher');
  assert.equal(supplied, 1); assert.equal(calls.length, 2);
  client.setCredentials({ access_token: 'expired', expiry_date: Date.now() - 1000 });
  await client.getAccessToken();
  assert.equal(supplied, 2); assert.equal(calls.length, 4);
});

test('runtime refuses partial federation without silently using a private key and hides credential errors', async () => {
  const original = { ...process.env };
  try {
    Object.assign(process.env, env, { GOOGLE_PLAY_WIF_PROVIDER: 'private-invalid-value', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: 'private-json-value' });
    let called = false;
    await assert.rejects(playRequest('fixture-purchase-token-1234567890', 'get', async () => { called = true; return Response.json({}); }),
      error => error instanceof GooglePlayError && !error.message.includes('private-'));
    assert.equal(called, false);
    await assert.rejects(playAccessToken(), error => error instanceof GooglePlayError && !error.message.includes('private-'));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
