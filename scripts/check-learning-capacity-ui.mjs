import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { createQuestionFixtureServer } from './question-fixture-server.mjs';

const output = 'test-artifacts/question-experience';
await fs.mkdir(output, { recursive: true });
const server = await createQuestionFixtureServer(5185, 'tests/browser/learning-launch.html');
let browser, page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'], ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Fixture browser:', error.message); });
  page.on('response', response => { if(response.status() >= 400) console.error('Fixture HTTP:', response.status(), response.url()); });
  await page.goto('http://127.0.0.1:5185/tests/browser/learning-launch.html?grade=1&category=numerical', { waitUntil: 'commit', timeout: 30000 });
  await page.getByRole('button', { name: 'Konu seç', exact: true }).waitFor({ timeout: 90000 });
  assert.match(await page.locator('.zp-topic-launch strong').innerText(), /Sayısal/);
  await page.getByRole('button', { name: 'Konu seç', exact: true }).click();
  await page.locator('[data-topic=mixed]').click();
  await page.waitForFunction(() => document.querySelector('.zp-topic-launch strong')?.textContent === 'Sürpriz karışım');
  await page.getByRole('button', { name: '20 soru seç', exact: true }).click();
  await page.getByRole('button', { name: 'Yeni testi başlat', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.launchSelection), { topic: 'mixed', category: 'mixed', difficulty: 'mixed', count: 20 });
  assert.equal(await page.getByText(/her soru tarzı bir kez/).count(), 0);
  await page.screenshot({ path: `${output}/learning-setup-mobile.png`, fullPage: true });
  await page.getByRole('spinbutton', { name: 'Soru sayısı', exact: true }).fill('50');
  await page.getByRole('button', { name: 'Yeni testi başlat', exact: true }).click();
  assert.equal(await page.evaluate(() => window.launchSelection?.count), 50);
  assert.equal(await page.evaluate(() => window.launchSelection?.category), 'mixed');
  await page.getByRole('spinbutton', { name: 'Soru sayısı', exact: true }).fill('51');
  assert.equal(await page.getByRole('button', { name: 'Yeni testi başlat', exact: true }).isDisabled(), true);
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/learning-setup-results.json`, JSON.stringify({ passed: true, checks: ['explicit area label', 'mixed choice clears previous area', '20-question target preserved', '50-question target preserved', 'invalid target blocked'], pageErrors: errors }, null, 2));
  console.log('PASS: mixed route resets the area and preserves 20/50-question goals.');
} catch (error) {
  if(page) {
    console.error('Fixture body:', (await page.locator('body').innerText({timeout:3000}).catch(() => '')).slice(0,600));
    await page.screenshot({path:`${output}/learning-setup-failure.png`,timeout:10000}).catch(() => {});
  }
  throw error;
} finally { await browser?.close(); await server.close(); }
