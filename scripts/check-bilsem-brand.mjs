import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
// Isolated display fixture; never connects to a real account.
process.env.VITE_SUPABASE_URL = 'https://branding-fixture.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_isolated_branding_fixture';
const output = 'test-artifacts/bilsem-junior';
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: true } });
await server.listen();
const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
await Promise.all([fetch(origin + '/src/index.css'), fetch(origin + '/tests/browser/bilsem-branding.tsx')]).catch(() => {});
let browser, page;
const errors = [];
try {
  const browserExecutable = process.env.BILSEM_CHROMIUM_EXECUTABLE || process.env.BROWSER_EXECUTABLE || (!existsSync(chromium.executablePath()) ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync) : undefined);
  browser = await chromium.launch({ headless: true, ...(browserExecutable ? { executablePath: browserExecutable, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  let registrationStatus = false;
  await context.route('**/api/public/platform',route=>route.fulfill({json:{registrationOpen:registrationStatus,policyVersion:'2026-10-28.1'}}));
  await context.route('**/api/public/membership', route => route.fulfill({json:{storeUrl:'https://play.google.com/store/apps/details?id=com.quantumtech.bilsemjunior',appStoreUrl:null,ready:false}}));
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let checks = 0;
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1024 });
    await page.goto(origin + '/tests/browser/bilsem-branding.html');
    await page.getByRole('heading', { level: 1, name: /BİLSEM’e hazırlık/ }).waitFor();
    await page.evaluate(async () => {
      const sample = 'ÇĞİÖŞÜ çğıöşü 0123456789';
      await Promise.all([document.fonts.load('700 24px Comfortaa', sample), document.fonts.load('600 16px Nunito', sample)]);
      await document.fonts.ready;
    });
    const typography = await page.evaluate(() => ({
      title: getComputedStyle(document.querySelector('.zp-landing h1')).fontFamily,
      reading: getComputedStyle(document.querySelector('.zp-landing')).fontFamily,
      fonts: [...document.fonts].filter(face => ['Comfortaa', 'Nunito'].includes(face.family.replaceAll('"', ''))).map(face => ({ family: face.family, status: face.status })),
    }));
    assert.match(typography.title, /^Comfortaa/);
    assert.match(typography.reading, /^Nunito/);
    assert.equal(typography.fonts.length, 2);
    assert.ok(typography.fonts.every(face => face.status === 'loaded'), JSON.stringify(typography));
    await page.locator('.zp-public-brand .bj-wordmark').waitFor();
    assert.match(await page.locator('.zp-public-brand .bj-wordmark').innerText(), /Bilsem Junior/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Homepage overflow at ' + width);
    for (const button of await page.locator('.zp-public-nav button:visible').all()) {
      const rect = await button.boundingBox();
      assert.ok(rect && rect.x >= -1 && rect.x + rect.width <= width + 1, 'Header action must stay on screen at ' + width);
    }
    const downloads = page.locator('#uygulamayi-indir');
    await downloads.getByRole('link', { name: /Google Play üzerinden indir/ }).waitFor();
    assert.equal(await downloads.getByRole('link').count(), 1);
    assert.match(await downloads.innerText(), /App Store/);
    assert.match(await downloads.innerText(), /İndirme bağlantısı yakında/);
    assert.equal(await page.locator('.bj-hero-downloads .bj-app-link').count(), 2);
    assert.equal(await page.locator('.bj-footer-downloads .bj-app-link').count(), 2);
    assert.equal(await downloads.locator('.bj-download-orbit').evaluate(el => getComputedStyle(el).animationName), 'none');
    for (const card of await downloads.locator('.bj-app-link').all()) {
      const box = await card.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 44, 'Download card fits at ' + width);
    }
    await downloads.screenshot({path: output + '/downloads-' + width + '.png', animations:'disabled'});
    assert.equal(await page.locator('.bj-guide-card').count(), 4);
    await page.waitForFunction(() => { const img=document.querySelector('.bj-logo-symbol'); return img instanceof HTMLImageElement && img.complete && img.naturalWidth>0; }, undefined, {timeout:10000});
    assert.equal(await page.locator('.bj-logo-symbol').first().evaluate(img => img.complete && img.naturalWidth > 0), true);
    await page.screenshot({ path: output + '/home-' + width + '.png', animations: 'disabled' });
    await page.locator('.bj-guide').screenshot({ path: output + '/guide-' + width + '.png', animations: 'disabled' });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width <= 1200) {
      await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
      await page.getByRole('dialog').getByRole('link', { name: /BİLSEM hazırlık rehberi/ }).waitFor();
      await page.getByRole('dialog').getByRole('link', {name:'Uygulamayı indir'}).click();
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.locator('#download-title').evaluate(el => el === document.activeElement), true);
    }
    await page.getByRole('button', { name: 'Kayıt bilgisi', exact: true }).click();
    await page.getByRole('heading', { name: 'Birlikte başlayalım', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Register overflow at ' + width);
    await page.screenshot({ path: output + '/register-' + width + '.png', animations: 'disabled' });
    await page.goto(origin + '/tests/browser/bilsem-branding.html?view=login');
    await page.getByRole('heading', { name: 'Tekrar hoş geldin!', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Login overflow at ' + width);
    await page.screenshot({ path: output + '/login-' + width + '.png', animations: 'disabled' });
    checks += 3;
  }
  registrationStatus = true;
  await page.goto(origin + '/tests/browser/bilsem-branding.html');
  await page.getByRole('button',{name:'Kayıt ol',exact:true}).waitFor();
  assert.match(await page.locator('.bj-registration-notice').first().innerText(),/Kaydı veli tamamlar/);
  await context.unroute('**/api/public/platform');
  await context.route('**/api/public/platform',route=>route.fulfill({status:503,json:{error:'Fixture unavailable'}}));
  await page.reload();
  await page.getByRole('button',{name:'Kayıt durumu',exact:true}).waitFor();
  await page.getByText('Kayıt durumu şu anda doğrulanamadı.',{exact:false}).first().waitFor();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.reload();
  await page.locator('#uygulamayi-indir .bj-app-link[href]').waitFor();
  assert.equal(await page.locator('.bj-download-orbit').evaluate(el => getComputedStyle(el).animationName), 'bj-download-float');
  await page.getByRole('button',{name:'Görünüm ve ses ayarları'}).click();
  await page.getByRole('button',{name:'Animasyonları durdur',exact:true}).click();
  assert.equal(await page.locator('.bj-download-orbit').evaluate(el => getComputedStyle(el).animationName), 'none');
  await context.unroute('**/api/public/membership');
  await context.route('**/api/public/membership',route=>route.fulfill({status:503,json:{error:'Fixture unavailable'}}));
  await page.reload();
  await page.locator('#uygulamayi-indir').getByText('Bağlantı şu anda alınamadı').first().waitFor();
  assert.equal(await page.locator('#uygulamayi-indir a').count(),0);
  await context.unroute('**/api/public/membership');
  await context.route('**/api/public/membership',route=>route.fulfill({json:{storeUrl:'https://play.google.com/store/apps/details?id=com.quantumtech.bilsemjunior',appStoreUrl:'https://apps.apple.com/tr/app/bilsem-junior/id1234567890',ready:false}}));
  await page.reload();
  await page.locator('#uygulamayi-indir').getByRole('link',{name:/App Store üzerinden indir/}).waitFor();
  assert.equal(await page.locator('#uygulamayi-indir a').count(),2);
  assert.deepEqual(errors, []);
  console.log('Bilsem Junior: ' + checks + ' homepage/register/login viewport checks; logo, preparation guide and mobile navigation passed.');
} catch (error) {
  if (page) {
    await page.screenshot({ path: output + '/failure.png', fullPage: true, animations: 'disabled' }).catch(() => {});
    console.error(JSON.stringify({ pageErrors: errors, url: page.url(), text: (await page.locator('body').innerText().catch(() => '')).slice(0, 2000) }));
  }
  throw error;
} finally { await browser?.close(); await server.close(); }
