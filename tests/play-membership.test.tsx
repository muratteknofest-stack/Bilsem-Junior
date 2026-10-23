import { isGooglePlayBillingPlatform } from '../src/lib/play-billing';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayMembershipPage } from '../src/components/PlayMembershipPage';
import { WebPlayMembershipPanel } from '../src/components/WebPlayMembershipPanel';
import { PlayBillingFlow, initialPlayBillingState, playConfigSchema, canBuyPlay } from '../src/lib/google-play-flow';
import { safePlayStoreUrl } from '../src/lib/play-listing';
import { playStoreListing } from '../server/play-listing';

const storeUrl = 'https://play.google.com/store/apps/details?id=com.zekapark.app';
const config = { ready: true, enforced: true, productId: 'zekapark_uyelik', storeUrl,
  binding: { accountId: 'a'.repeat(64), profileId: 'b'.repeat(64) }, access: { active: false, expiresAt: null } };

test('unpublished membership page has three periods and no dead store link or guessed price', () => {
  const html = renderToStaticMarkup(<PlayMembershipPage brand="Bilsem Junior" storeUrl={null} ready={false}/>);
  for (const text of ['Aylık', '3 aylık', 'Yıllık', 'henüz satışa açılmadı', 'otomatik yenilenir', 'aynı öğrenci']) assert.ok(html.includes(text));
  assert.equal((html.match(/class="zp-plan-card /g) || []).length, 3);
  assert.ok(!/shopier.com|₺|\d+ TL|href="https:\/\/play.google.com/.test(html));
});
test('publication flag alone controls store listing, never grants an entitlement', () => {
  const old = process.env.GOOGLE_PLAY_STORE_PUBLISHED;
  try {
    delete process.env.GOOGLE_PLAY_STORE_PUBLISHED; assert.equal(playStoreListing(), null);
    process.env.GOOGLE_PLAY_STORE_PUBLISHED = 'false'; assert.equal(playStoreListing(), null);
    process.env.GOOGLE_PLAY_STORE_PUBLISHED = 'true'; assert.equal(playStoreListing(), storeUrl);
  } finally { if (old === undefined) delete process.env.GOOGLE_PLAY_STORE_PUBLISHED; else process.env.GOOGLE_PLAY_STORE_PUBLISHED = old; }
});
test('billing listing only permits a direct Google Play app URL', () => {
  assert.ok(safePlayStoreUrl(storeUrl));
  for (const url of ['javascript:alert(1)', 'https://evil.test/?id=com.zekapark.app', storeUrl + '&redirect=evil', storeUrl + '&id=com.evil.app', storeUrl + '#token', storeUrl.replace('play.google.com','play.google.com.evil.test'), 'https://user:password@play.google.com/store/apps/details?id=com.zekapark.app']) {
    assert.equal(safePlayStoreUrl(url), false); assert.equal(playConfigSchema.safeParse({ ...config, storeUrl: url }).success, false);
  }
});
test('web access reads server membership without invoking native catalog, restore, prepare or purchase', async () => {
  const requests: string[] = [];
  const unexpected = async () => { assert.fail('Web must not invoke the native billing plugin'); };
  const flow = new PlayBillingFlow({ studentId: 'student-fixture', native: false, isCurrent: () => true, changed() {},
    store: { catalog: unexpected, restore: unexpected, purchase: unexpected },
    async request(path) { requests.push(path); return { ...config, access: { active: true, expiresAt: '2027-01-16T12:00:00Z' } }; },
  });
  await flow.refresh();
  const state = flow.snapshot();
  const html = renderToStaticMarkup(<WebPlayMembershipPanel studentName="Deniz" state={state} onRefresh={() => {}}/>);
  assert.deepEqual(requests, ['access?studentId=student-fixture']); assert.equal(state.notice.kind, 'success');
  assert.match(html, /Aboneliğiniz aktif/); assert.match(html, /webden de çalışabilirsiniz/);
  assert.ok(!html.includes('Google Play ile devam et')); flow.dispose();
});
test('stale access is not displayed as an active web membership; purchase stays in the Android parent panel', () => {
  const state = { ...initialPlayBillingState(), phase: 'idle' as const, config: { ...config, access: { active: true, expiresAt: '2027-01-16T12:00:00Z' } }, fresh: false };
  const html = renderToStaticMarkup(<WebPlayMembershipPanel state={state} onRefresh={() => {}}/>);
  assert.ok(!html.includes('Aboneliğiniz aktif')); assert.match(html, /aynı öğrenciyi seçin/); assert.match(html, /Android uygulamasını Google Play’de aç/);
});


test('only a real Android platform may initialize purchasing; browser and other native shells remain read-only', async () => {
  for (const [native, platform] of [[false, 'web'], [false, 'android'], [true, 'ios'], [true, 'android']] as const) {
    const allowed = isGooglePlayBillingPlatform({ isNativePlatform: () => native, getPlatform: () => platform });
    assert.equal(allowed, native && platform === 'android');
    if (allowed) continue;
    const requests: string[] = [];
    const unexpected = async () => { assert.fail('A non-Android client invoked the billing bridge'); };
    const flow = new PlayBillingFlow({ studentId: 'student-fixture', native: allowed, isCurrent: () => true, changed() {},
      store: { catalog: unexpected, purchase: unexpected, restore: unexpected },
      async request(path) { requests.push(path); return config; },
    });
    try {
      await flow.refresh(); await flow.purchase('monthly'); await flow.restore();
      assert.deepEqual(requests, ['access?studentId=student-fixture']);
      assert.equal(canBuyPlay(flow.snapshot(), 'monthly'), false);
    } finally { flow.dispose(); }
  }
});
