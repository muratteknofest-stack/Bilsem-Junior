import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'test-artifacts/review-batch';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5194, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const failures = [], errors = []; let checks = 0;
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:5194/tests/browser/review-batch.html');
    await page.getByRole('status').waitFor();
    if (!(await page.getByRole('status').innerText()).includes('3 / 20 sonuç')) failures.push({ width, issue: 'counts' });
    const button = page.getByRole('button', { name: 'Bu sorudan sonra durdur' });
    const box = await button.boundingBox();
    if (!box || box.height < 44) failures.push({ width, issue: 'touch-target' });
    await page.getByText('Soru bazında sonuçlar', { exact: true }).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) failures.push({ width, issue: 'horizontal-overflow' });
    await page.screenshot({ path: `${output}/${width}-running.png`, fullPage: true });
    await button.click();
    await page.getByText(/İşlem durdu\. Kaydedilen raporlar korundu/).waitFor();
    if (await button.isVisible()) failures.push({ width, issue: 'stop-not-applied' });
    if (await page.getByRole('region', { name: 'Toplu AI inceleme ilerlemesi' }).getAttribute('aria-busy') !== 'false') failures.push({ width, issue: 'busy-not-released' });
    checks += 5;
  }
} catch (error) { failures.push({ issue: error.message }); }
finally { await browser.close(); await server.close(); }
const result = { checks, viewports: 3, scope: 'Real review progress component; layout fixture only, no AI or database writes', errors, failures };
await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
await writeFile('docs/question-engine-v2/review-batch-mobile-report.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (errors.length || failures.length) process.exitCode = 1;
