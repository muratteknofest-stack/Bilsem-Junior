// Real shared home component, Android build settings, touch menus and React routes.
// No sign-ins, account creation, messages or purchases.
import assert from 'node:assert/strict';
import express from 'express';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';

const server = express().use(express.static(resolve('dist-android'))).use((_req, res) => res.sendFile(resolve('dist-android/index.html'))).listen(5198, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox','--disable-dev-shm-usage'] } : {}) });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR:', e.message); });
  page.on('console', message => { if (message.type() === 'error') console.error('BROWSER:', message.text()); });
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('http://127.0.0.1:5198/');
    await page.locator('#hero-title').waitFor().catch(async error => { console.error('BODY:', (await page.locator('body').innerText()).slice(0,1200)); throw error; });
    assert.equal(await page.locator('html').getAttribute('data-native-app'), 'android');
    assert.match(await page.locator('#hero-title').innerText(), /büyük keşiflere/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Home overflow at ' + width);
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
    await page.locator('dialog[open]').waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('zekapark:native-back', { cancelable: true })));
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
    await page.locator('dialog[open]').getByRole('link', { name: /Google Play üyeliği/ }).click();
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: /Üyelik için veli girişi/ }).click();
    await page.locator('#zp-auth-heading').waitFor();
    assert.ok(new URL(page.url()).searchParams.get('role') === 'parent');
    await page.getByRole('button', { name: 'Ana Sayfaya Dön', exact: true }).click();
    await page.locator('#hero-title').waitFor();
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Öğrenci girişi', exact: true }).click();
    await page.locator('#zp-auth-heading').waitFor();
    await page.getByRole('button', { name: 'Yeni Kayıt', exact: true }).click();
    await page.locator('#parent-email').waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('zekapark:native-back', { cancelable: true })));
    await page.waitForFunction(() => document.querySelector('button.zp-auth-mode-button[aria-pressed="true"]')?.textContent.trim() === 'Giriş Yap');
    assert.equal(await page.locator('#hero-title').count(), 0, 'Registration Back must stop at login');
    await page.evaluate(() => window.dispatchEvent(new Event('zekapark:native-back', { cancelable: true })));
    await page.locator('#hero-title').waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    console.log('Native home / menu Back / parent membership / login home: ' + width + 'px passed');
  }
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('http://127.0.0.1:5198/'); await page.locator('#hero-title').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Desktop home overflow at ' + width);
  }
  assert.deepEqual(errors, []);
} finally { await browser?.close(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
