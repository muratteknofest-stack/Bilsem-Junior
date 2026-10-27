import test from 'node:test';
import assert from 'node:assert/strict';
import type { HttpOptions, HttpResponse } from '@capacitor/core';
import { apiRequestUrl, createApiTransport } from '../src/lib/api-transport';

const baseUrl = 'https://api.example.test';
const pageOrigin = 'https://localhost';
const response = (status = 200, data: unknown = { ok: true }): HttpResponse => ({ status, data, headers: { 'content-type': 'application/json' }, url: baseUrl + '/api/test' });
const neverBrowser: typeof fetch = async () => { throw Error('native request used the browser'); };
const native = (request: (options: HttpOptions) => Promise<HttpResponse>, timeoutMs?: number) => createApiTransport({ baseUrl, pageOrigin, nativeRequest: request, browserFetch: neverBrowser, timeoutMs });

test('Android narration preserves binary bytes and does not decode JSON errors as audio', async () => {
  const bytes=Buffer.from([0x49,0x44,0x33,0x00,0xff,0x80,0x0a]);
  const transport=native(async options=>{assert.equal(options.responseType,'arraybuffer');return{...response(200,bytes.toString('base64')+'\n'),headers:{'content-type':'audio/mpeg'}};});
  assert.deepEqual(Buffer.from(await(await transport('/api/student/lessons/visual_sequence/audio/0')).arrayBuffer()),bytes);
  const denied=await native(async()=>response(403,{error:'Üyelik gerekli'}))('/api/student/lessons/dice_unfold/audio/0');
  assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{error:'Üyelik gerekli'});
  await assert.rejects(native(async()=>({...response(200,'%%%'),headers:{'content-type':'audio/mpeg'}}))('/api/student/lessons/visual_sequence/audio/0'));
});

test('API transport never forwards credentials to another host or a non-API URL', () => {
  for (const input of ['https://evil.example/api/test', '//evil.example/api/test', '/assets/test', 'https://user:pass@api.example.test/api/test', '/api/test#secret', '/api/../admin']) {
    assert.throws(() => apiRequestUrl(input, baseUrl, pageOrigin), /doğrulanamadı/);
  }
  assert.equal(apiRequestUrl('/api/test?a=1', baseUrl, pageOrigin), baseUrl + '/api/test?a=1');
  assert.equal(apiRequestUrl(new URL(baseUrl + '/api/test'), baseUrl, pageOrigin), baseUrl + '/api/test');
});

test('browser uses its existing same-origin fetch and cancellation semantics', async () => {
  const controller = new AbortController();
  const transport = createApiTransport({ baseUrl: '', pageOrigin: 'https://web.example', browserFetch: async (url, init) => {
    assert.equal(url, '/api/test'); assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.signal, controller.signal);
    return Response.json({ web: true });
  } });
  assert.deepEqual(await (await transport('/api/test', { signal: controller.signal })).json(), { web: true });
});

test('Android sends JSON and bearer token through the native bridge without forged origin or redirects', async () => {
  let calls = 0;
  const transport = native(async options => {
    calls++;
    assert.equal(options.url, baseUrl + '/api/test'); assert.equal(options.method, 'POST');
    assert.deepEqual(options.data, { answer: 'B' }); assert.equal(options.headers?.authorization, 'Bearer fixture');
    for (const name of ['origin', 'referer', 'cookie', 'host', 'sec-fetch-site']) assert.equal(options.headers?.[name], undefined);
    assert.equal(options.disableRedirects, true); assert.equal(options.connectTimeout, 10000);
    return response();
  });
  const result = await transport('/api/test', { method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json', Origin: 'https://web.example', Cookie: 'no', 'Sec-Fetch-Site': 'cross-site' }, body: '{"answer":"B"}' });
  assert.deepEqual(await result.json(), { ok: true }); assert.equal(calls, 1);
});

test('native server errors preserve status and JSON; they never become successful access', async () => {
  for (const status of [401, 403, 409, 415, 429, 503]) {
    const r = await native(async () => response(status, { error: 'Reddedildi' }))('/api/test');
    assert.equal(r.status, status); assert.equal(r.ok, false); assert.deepEqual(await r.json(), { error: 'Reddedildi' });
  }
});

test('native empty responses, HEAD and policy text retain fetch-compatible bodies', async () => {
  assert.equal(await (await native(async () => response(204, ''))('/api/test')).text(), '');
  assert.equal(await (await native(async () => response())('/api/test', { method: 'HEAD' })).text(), '');
  const r = await native(async () => ({ ...response(200, 'Yasal metin'), headers: { 'content-type': 'text/plain', 'content-length': '99', 'content-encoding': 'gzip' } }))('/api/test');
  assert.equal(await r.text(), 'Yasal metin'); assert.equal(r.headers.get('content-encoding'), null);
});

test('aborted native request never launches and late native results never update an aborted view', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(native(async () => { calls++; return response(); })('/api/test', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
  const late = new AbortController(); let done!: (value: HttpResponse) => void;
  const pending = native(() => new Promise(resolve => { done = resolve; }))('/api/test', { signal: late.signal });
  await new Promise(resolve => setImmediate(resolve)); late.abort();
  await assert.rejects(pending, { name: 'AbortError' }); done(response());
});

test('native timeout does not retry a mutation with an uncertain saved result', async () => {
  let calls = 0;
  const transport = native(() => { calls++; return new Promise(() => {}); }, 15);
  await assert.rejects(transport('/api/test', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }), { name: 'TimeoutError' });
  assert.equal(calls, 1);
});

test('native transport rejects insecure configuration, invalid bodies and unexpected redirect destinations', async () => {
  const insecure = createApiTransport({ baseUrl: 'http://api.example.test', pageOrigin, nativeRequest: async () => response(), browserFetch: neverBrowser });
  await assert.rejects(insecure('/api/test'), /Güvenli/);
  await assert.rejects(native(async () => response())('/api/test', { method: 'POST', body: 'raw' }), /JSON/);
  await assert.rejects(native(async () => ({ ...response(), url: 'https://evil.example/api/test' }))('/api/test'), /yönlendirmesi/);
  await assert.rejects(native(async () => { throw Error('private-internal-detail'); })('/api/test'), /Sunucuya bağlanılamadı/);
});

test('Request inputs retain their method, body and authentication headers', async () => {
  const request = new Request(baseUrl + '/api/test', { method: 'PUT', headers: { Authorization: 'Bearer request', 'Content-Type': 'application/json' }, body: '{"grade":3}' });
  await native(async options => {
    assert.equal(options.method, 'PUT'); assert.equal(options.headers?.authorization, 'Bearer request'); assert.deepEqual(options.data, { grade: 3 });
    return response();
  })(request);
});
