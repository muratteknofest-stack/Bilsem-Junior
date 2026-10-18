import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

process.env.VITE_SUPABASE_URL = 'https://audit-fixture.supabase.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_audit_test_fixture';
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: true } });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Isolated UI checks must never contact production Auth, customer data or games.
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let pathChecks = 0;
  for (const [width, height] of [[360, 640], [390, 844], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    for (const path of ['/wordwall', '/wordwall/']) {
      await page.goto(base + path);
      await page.getByRole('heading', { level: 1, name: 'Zeka Testleri', exact: true }).waitFor();
      assert.equal(await page.locator('.ww-card').count(), 12);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path} at ${width}`);
      pathChecks++;
    }
    for (const path of ['/reset-password', '/reset-password/']) {
      await page.goto(base + path);
      await page.getByRole('heading', { level: 1, name: 'Bilsem Junior şifre yenileme', exact: true }).waitFor();
      pathChecks++;
    }
  }
  await page.goto(base + '/tests/browser/audit-regressions.html');
  const marked = page.locator('.ww-card[data-node-status="completed"]');
  const completeFirst = () => page.locator('.ww-node-complete-toggle').first().click();
  await page.locator('.ww-card').first().waitFor();
  assert.equal(await marked.count(), 0);
  await completeFirst();
  assert.equal(await marked.count(), 1);
  await page.getByRole('button', { name: 'Öğrenci B', exact: true }).click();
  assert.equal(await marked.count(), 0);
  await page.getByRole('button', { name: 'Misafir', exact: true }).click();
  assert.equal(await marked.count(), 0);
  await page.getByRole('button', { name: 'Öğrenci A', exact: true }).click();
  assert.equal(await marked.count(), 1);
  await page.reload();
  await page.locator('.ww-card').first().waitFor();
  assert.equal(await marked.count(), 1);

  const timingCount = () => page.evaluate(async () => (await import('/src/features/student/wordwall-telemetry.ts')).getWordwallTelemetryHistory().length);
  const openFirst = () => page.locator('.ww-card .ww-play-3d-btn').first().click();
  // Selecting a filter, replacing the owner or unmounting all close the old timer.
  const before = await timingCount();
  await openFirst();
  await page.locator('iframe').waitFor();
  await page.getByRole('searchbox', { name: 'Zeka testlerinde ara' }).fill('şekil');
  await page.locator('iframe').waitFor({ state: 'detached' });
  assert.equal(await timingCount(), before + 1);
  await page.getByRole('searchbox', { name: 'Zeka testlerinde ara' }).fill('');
  await openFirst();
  await page.locator('iframe').waitFor();
  await page.getByRole('button', { name: 'Öğrenci B', exact: true }).click();
  await page.locator('iframe').waitFor({ state: 'detached' });
  assert.equal(await timingCount(), before + 2);
  await openFirst();
  await page.locator('iframe').waitFor();
  await page.getByRole('button', { name: 'Test alanını aç/kapat', exact: true }).click();
  await page.locator('.ww-library').waitFor({ state: 'detached' });
  assert.equal(await timingCount(), before + 3);
  assert.deepEqual(errors, []);
  console.log(`Audit browser regressions: ${pathChecks} route/viewport checks, per-student progress isolation/reload and 3 timer cleanup paths passed.`);
} finally {
  await browser?.close();
  await server.close();
}
