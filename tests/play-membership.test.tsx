import { isGooglePlayBillingPlatform } from '../src/lib/play-billing';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayMembershipPage } from '../src/components/PlayMembershipPage';
import { WebPlayMembershipPanel } from '../src/components/WebPlayMembershipPanel';
import { PlayBillingPanel } from '../src/components/PlayBillingPanel';
import { PlayBillingFlow, initialPlayBillingState, playConfigSchema, canBuyPlay } from '../src/lib/google-play-flow';
import { safeAppStoreUrl, safePlayStoreUrl } from '../src/lib/play-listing';
import { appStoreListing, playStoreListing } from '../server/play-listing';

const storeUrl = 'https://play.google.com/store/apps/details?id=com.quantumtech.bilsemjunior';
const config = { ready: true, enforced: true, productId: 'zekapark_uyelik', storeUrl,
  binding: { accountId: 'a'.repeat(64), profileId: 'b'.repeat(64) }, access: { active: false, expiresAt: null } };

test('a license session is explicitly labelled and tells the parent to stop if Google does not show a test card', () => {
  const state = {...initialPlayBillingState(), phase:'idle' as const, fresh:true, storeChecked:true,
    config:{...config,licenseTest:true}, offers:[{basePlanId:'monthly' as const,price:'₺99',period:'P1M'}]};
  const html=renderToStaticMarkup(<PlayBillingPanel state={state} onPurchase={()=>{}} onRestore={()=>{}} onRefresh={()=>{}}/>);
  assert.match(html,/Lisans testi oturumu/);assert.match(html,/Test kartı/);assert.match(html,/işlemi tamamlamayın/);
  assert.match(html,/Google Play testini aç/);
  const regular=renderToStaticMarkup(<PlayBillingPanel state={{...state,config:{...config,licenseTest:false}}} onPurchase={()=>{}} onRestore={()=>{}} onRefresh={()=>{}}/>);
  assert.doesNotMatch(regular,/Lisans testi oturumu/);assert.match(regular,/Google Play ile devam et/);
});

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
  for (const url of ['javascript:alert(1)', 'https://evil.test/?id=com.quantumtech.bilsemjunior', storeUrl + '&redirect=evil', storeUrl + '&id=com.evil.app', storeUrl + '#token', storeUrl.replace('play.google.com','play.google.com.evil.test'), 'https://user:password@play.google.com/store/apps/details?id=com.quantumtech.bilsemjunior']) {
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


test('download cards expose only validated published store links, separate from sales readiness', async () => {
  const { AppDownloadLinks } = await import('../src/components/AppDownloadLinks');
  const apple = 'https://apps.apple.com/tr/app/bilsem-junior/id1234567890';
  const html = renderToStaticMarkup(<AppDownloadLinks downloads={{ storeUrl, appStoreUrl: apple, status: 'ready' }}/>);
  assert.match(html, /href="https:\/\/play.google.com/);
  assert.ok(html.includes(`href="${apple}"`));
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
  const waiting = renderToStaticMarkup(<AppDownloadLinks downloads={{ storeUrl: null, appStoreUrl: 'javascript:alert(1)', status: 'ready' }}/>);
  assert.ok(!waiting.includes('href='));
  assert.match(waiting, /İndirme bağlantısı yakında/);
  const unavailable = renderToStaticMarkup(<AppDownloadLinks downloads={{ storeUrl: null, status: 'unavailable' }}/>);
  assert.match(unavailable, /Bağlantı şu anda alınamadı/);
  assert.ok(!unavailable.includes('yakında'));
  const page = renderToStaticMarkup(<PlayMembershipPage brand="Bilsem Junior" storeUrl={storeUrl} appStoreUrl={apple} ready={false}/>);
  assert.ok(page.includes(apple)); assert.match(page, /henüz satışa açılmadı/);
});

test('Apple publication requires an explicit flag and a direct App Store listing', () => {
  const keys = ['APP_STORE_PUBLISHED', 'APP_STORE_URL'] as const;
  const old = keys.map(key => process.env[key]);
  const apple = 'https://apps.apple.com/tr/app/bilsem-junior/id1234567890';
  try {
    process.env.APP_STORE_URL = apple;
    delete process.env.APP_STORE_PUBLISHED; assert.equal(appStoreListing(), null);
    process.env.APP_STORE_PUBLISHED = 'true'; assert.equal(appStoreListing(), apple);
    for (const invalid of ['https://apps.apple.com.evil.test/tr/app/id1234567890', 'https://user:secret@apps.apple.com/tr/app/id1234567890', 'https://apps.apple.com/tr/search', apple + '?redirect=evil', apple + '#token', 'http://apps.apple.com/tr/app/id1234567890']) {
      assert.equal(safeAppStoreUrl(invalid), false);
      process.env.APP_STORE_URL = invalid; assert.equal(appStoreListing(), null);
    }
  } finally { keys.forEach((key, i) => { if (old[i] === undefined) delete process.env[key]; else process.env[key] = old[i]; }); }
});
