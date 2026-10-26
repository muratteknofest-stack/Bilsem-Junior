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
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let checks = 0;
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1024 });
    await page.goto(origin + '/tests/browser/bilsem-branding.html');
    await page.getByRole('heading', { level: 1, name: /BİLSEM’e hazırlık/ }).waitFor();
    await page.locator('.zp-public-brand .bj-wordmark').waitFor();
    assert.match(await page.locator('.zp-public-brand .bj-wordmark').innerText(), /Bilsem Junior/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Homepage overflow at ' + width);
    for (const button of await page.locator('.zp-public-nav button:visible').all()) {
      const rect = await button.boundingBox();
      assert.ok(rect && rect.x >= -1 && rect.x + rect.width <= width + 1, 'Header action must stay on screen at ' + width);
    }
    assert.equal(await page.locator('.bj-guide-card').count(), 4);
    assert.equal(await page.locator('.bj-logo-symbol').first().evaluate(img => img.complete && img.naturalWidth > 0), true);
    await page.screenshot({ path: output + '/home-' + width + '.png', animations: 'disabled' });
    await page.locator('.bj-guide').screenshot({ path: output + '/guide-' + width + '.png', animations: 'disabled' });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width <= 1200) {
      await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
      await page.getByRole('dialog').getByRole('link', { name: /BİLSEM hazırlık rehberi/ }).waitFor();
      await page.getByRole('button', { name: 'Menüyü kapat', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Kayıt ol', exact: true }).click();
    await page.getByRole('heading', { name: 'Bilsem Junior yolculuğun başlasın.', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Register overflow at ' + width);
    await page.screenshot({ path: output + '/register-' + width + '.png', animations: 'disabled' });
    await page.goto(origin + '/tests/browser/bilsem-branding.html?view=login');
    await page.getByRole('heading', { name: 'Hazırlığına kaldığın yerden devam et.', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Login overflow at ' + width);
    await page.screenshot({ path: output + '/login-' + width + '.png', animations: 'disabled' });
    checks += 3;
  }
  assert.deepEqual(errors, []);
  console.log('Bilsem Junior: ' + checks + ' homepage/register/login viewport checks; logo, preparation guide and mobile navigation passed.');
} catch (error) {
  if (page) {
    await page.screenshot({ path: output + '/failure.png', fullPage: true, animations: 'disabled' }).catch(() => {});
    console.error(JSON.stringify({ pageErrors: errors, url: page.url(), text: (await page.locator('body').innerText().catch(() => '')).slice(0, 2000) }));
  }
  throw error;
} finally { await browser?.close(); await server.close(); }
