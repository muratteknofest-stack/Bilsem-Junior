import assert from 'node:assert/strict';
import test from 'node:test';
import { publishToMeta } from '../server/social-publish.ts';

test('Instagram carousel uses two cards and publishes once', async () => {
  const names = ['PUBLIC_API_BASE_URL', 'META_IG_USER_ID', 'META_IG_ACCESS_TOKEN'] as const;
  const before = names.map(name => process.env[name]);
  const original = globalThis.fetch;
  const calls: string[] = [];
  process.env.PUBLIC_API_BASE_URL = 'https://api.example.test';
  process.env.META_IG_USER_ID = 'ig-account';
  process.env.META_IG_ACCESS_TOKEN = 'test-token';
  try {
    let seq = 0;
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      calls.push(String(url));
      if (init?.method === 'POST') return new Response(JSON.stringify({ id: `media-${++seq}` }), { status: 200 });
      return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
    }) as typeof fetch;
    const id = await publishToMeta('2026-09-24_morning', 'instagram', 'Deneme');
    assert.equal(id, 'media-4');
    assert.equal(calls.filter(url => url.endsWith('/media_publish')).length, 1);
    assert.equal(calls.filter(url => url.endsWith('/media')).length, 3);
  } finally {
    globalThis.fetch = original;
    names.forEach((name, i) => { if (before[i] === undefined) delete process.env[name]; else process.env[name] = before[i]; });
  }
});

test('a missing Meta account prevents outbound requests', async () => {
  const previous = process.env.META_PAGE_ID;
  delete process.env.META_PAGE_ID;
  try { await assert.rejects(publishToMeta('2026-09-24_evening', 'facebook', 'Deneme'), /yapılandırılmamış/); }
  finally { if (previous !== undefined) process.env.META_PAGE_ID = previous; }
});
