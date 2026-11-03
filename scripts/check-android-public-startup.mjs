// Exercise the compiled application's real mount/AuthProvider, rather than an entry component fixture.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';

const assets = resolve(process.env.ANDROID_OPENING_ASSETS || 'dist-android');
const output = resolve('test-artifacts/android-public-startup');
await mkdir(output, { recursive: true });
const app = express();
app.use(express.static(assets));
app.use((_request, response) => response.sendFile(resolve(assets, 'index.html')));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const errors = [], mutations = [], checks = [];
try {
  for (const [width, height] of [[320,480], [360,640], [390,844], [768,1024], [844,390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) return route.continue();
      if (request.method() !== 'GET') {
        mutations.push({ method: request.method(), path: url.pathname });
        return route.abort();
      }
      if (url.pathname === '/api/public/platform') return route.fulfill({ json: { registrationOpen: true, policyVersion: '2026-10-28.1' } });
      return route.abort();
    });
    await page.goto(origin);
    try { await page.locator('.bj-welcome').waitFor({ timeout: 12000 }); }
    catch (error) { await page.screenshot({ path: resolve(output, `wrong-opening-${width}.png`), fullPage: true }); throw error; }
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight }));
    assert.ok(layout.pageWidth <= width + 1 && layout.pageHeight <= height + 2, JSON.stringify(layout));
    assert.equal(await page.locator('.zp-colorful-home').count(), 0, 'An unauthenticated APK must not display the long web marketing page');
    for (const name of ['Öğrenci girişi', 'Veli girişi', 'Yeni aile hesabı oluştur', 'Hesap açmadan bir soru dene']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(box.height >= 44 && box.y >= 0 && box.y + box.height <= height, `${name} must fit the opening screen`);
    }
    await page.screenshot({ path: resolve(output, `opening-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Öğrenci girişi', exact: true }).click();
    await page.getByLabel('Öğrenci kodu veya e-posta', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    await page.getByRole('button', { name: 'Ana sayfa', exact: true }).click();
    await page.getByRole('button', { name: 'Veli girişi', exact: true }).click();
    await page.getByLabel('Veli E-posta Adresi', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('role'), 'parent');
    await page.getByRole('button', { name: 'Ana sayfa', exact: true }).click();
    await page.getByRole('button', { name: 'Yeni aile hesabı oluştur', exact: true }).click();
    await page.getByLabel('Veli e-posta adresi', { exact: false }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/register');
    await page.getByRole('button', { name: 'Ana sayfa', exact: true }).click();
    await page.getByRole('button', { name: 'Hesap açmadan bir soru dene', exact: true }).click();
    await page.locator('.bj-entry-discovery').waitFor();
    assert.equal(await page.locator('.zp-colorful-home').count(), 0);
    await page.locator('.bj-entry-discovery>header button').click();
    await page.locator('.bj-welcome').waitFor();
    checks.push({ ...layout, realMount: true, studentLogin: true, parentLogin: true, registration: true, sampleAndReturn: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, [], 'The opening check must not create accounts or send email');
  console.log(JSON.stringify({ passed: checks.length, checks, liveWrites: 0 }, null, 2));
} finally {
  await writeFile(resolve(output, 'checks.json'), JSON.stringify({ checks, errors, mutations }, null, 2));
  await browser.close(); server.close();
}
