// Local component verification; this fixture performs no authenticated API/database writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createQuestionFixtureServer } from './question-fixture-server.mjs';
import { chromium } from 'playwright';

const output = 'test-artifacts/question-experience';
await fs.mkdir(output, { recursive: true });
const server = await createQuestionFixtureServer(5183);
let browser;
try {
  await server.listen();
  const response = await fetch('http://127.0.0.1:5183/tests/browser/question-screen.html', { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  console.log('Fixture HTTP: 200');
  browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'], ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser:', error.message); });
  await page.goto('http://127.0.0.1:5183/tests/browser/question-screen.html?type=number_pattern', { waitUntil: 'commit', timeout: 30000 });
  await page.locator('.zp-answer-option').first().waitFor({ timeout: 90000 });
  const preview = async value => { await page.evaluate(value => window.__preview(value), value); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
  const capture = async name => {
    await page.waitForFunction(() => [...document.querySelectorAll('.zp-answer-option, .zp-feedback-card')].every(element => Number(getComputedStyle(element).opacity) > .99));
    await page.screenshot({ path: `${output}/${name}.png` });
  };

  await preview({ index: 6, total: 10, progress: { answered: 3, streak: 3, xp: 45 } });
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '3', 'visiting question 7 must not count seven answers');
  await page.locator('.zp-answer-option').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__answer.optionId), 'A', 'keyboard answers propagate');
  await preview({ busy: true });
  assert.equal(await page.locator('.zp-answer-option').first().isDisabled(), true, 'pending save disables choices');
  await preview({ busy: false });
  await capture('desktop');

  await page.setViewportSize({ width: 390, height: 844 });
  await capture('mobile');
  await preview({ busy: true, feedback: { id: 'wrong', kind: 'incorrect', streak: 0, xp: 0, correctOptionId: 'C' } });
  assert.ok(await page.getByText('Doğru seçenek:').isVisible());
  await capture('incorrect');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  assert.equal(await page.locator('.zp-feedback').count(), 0);
  assert.equal(await page.evaluate(() => window.__continued), 1);

  await preview({ busy: true, feedback: { id: 'correct', kind: 'correct', streak: 3, xp: 15 } });
  await capture('correct');
  await preview({ feedback: null, busy: false, mode: 'exam' });
  assert.equal(await page.locator('.zp-journey-xp, .zp-journey-streak').count(), 0, 'exam chrome hides all rewards');
  await preview({ feedback: { id: 'saved', kind: 'saved', streak: 0, xp: 0 } });
  assert.ok(await page.getByText('Cevabın kaydedildi!', { exact: true }).isVisible());
  assert.equal(await page.getByText('Doğru cevap!', { exact: true }).count(), 0);
  await preview({ feedback: null, expired: true, remaining: 0 });
  for (const option of await page.locator('.zp-answer-option').all()) assert.equal(await option.isDisabled(), true);

  await preview({ expired: false, remaining: 45, mode: 'practice' });
  assert.equal(await page.locator('.zp-focus-clock').getAttribute('data-low'), 'true');
  await page.getByRole('button', { name: 'Sorular ve çalışma araçları', exact: true }).click();
  assert.ok(await page.locator('dialog[open]').isVisible());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.evaluate(() => window.__show('visual_memory', 2));
  await page.locator('.zp-memory-study[data-locked=true]').waitFor();
  assert.equal(await page.locator('.zp-answer-option').count(), 0, 'memory choices stay hidden during study');
  await page.getByRole('button', { name: 'Deseni gizle ve cevapla', exact: true }).click();
  await page.locator('.zp-answer-option').first().waitFor();
  assert.equal(await page.locator('.zp-answer-option').count(), 4);
  assert.equal(await page.getByRole('button', { name: 'Soru görselini büyüt', exact: true }).count(), 0, 'zoom cannot reveal a hidden memory pattern');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await preview({ feedback: { id: 'motion', kind: 'correct', streak: 2, xp: 15 } });
  assert.equal(await page.locator('.zp-focus').getAttribute('data-reduced-motion'), 'true');
  assert.equal(await page.locator('.zp-feedback-particles').isVisible(), false);
  assert.equal(await page.locator('.zp-feedback-card').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.locator('.zp-journey-fill').evaluate(element => getComputedStyle(element).transitionDuration), '0s');
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/interaction-results.json`, JSON.stringify({ passed: true, checks: ['acknowledged progress', 'keyboard selection', 'pending-save lock', 'feedback continuation', 'exam privacy', 'expiry lock', 'timer', 'tools dialog', 'memory study', 'reduced motion'], pageErrors: errors }, null, 2));
  console.log('PASS: test experience interactions, privacy, accessibility and reduced motion.');
} finally {
  await browser?.close();
  await server.close();
}
