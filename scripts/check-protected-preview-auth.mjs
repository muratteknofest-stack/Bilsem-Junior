import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Local HTTP cookie probes only: no account, JWT, Supabase response, or Vercel
// authentication success is fabricated by this browser regression check.
const current = (await build({
  entryPoints: ['src/lib/supabase-transport.ts'],
  bundle: true, format: 'esm', platform: 'browser', write: false,
})).outputFiles[0].text;
const servers = [];
let browser;
try {
  let pageOrigin;
  async function listen() {
    const server = createServer((request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      if (pageOrigin) {
        response.setHeader('Access-Control-Allow-Origin', pageOrigin);
        response.setHeader('Access-Control-Allow-Headers', 'Authorization');
      }
      if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
      if (request.url === '/transport.js') {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(current);
      } else if (request.url === '/api/supabase/auth/v1/settings') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          protectionCookiePresent: request.headers.cookie?.includes('__preview_probe=local-test-only') ?? false,
          bearerPreserved: request.headers.authorization === 'Bearer local-test-only',
        }));
      } else {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><title>Preview cookie transport regression</title>');
      }
    });
    servers.push(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  pageOrigin = await listen();
  const crossOrigin = await listen();
  browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext();
  await context.addCookies([{ name: '__preview_probe', value: 'local-test-only', url: pageOrigin, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  await page.goto(pageOrigin);
  const result = await page.evaluate(async ({ pageOrigin, crossOrigin }) => {
    const { createSupabaseTransport } = await import('/transport.js');
    const options = apiBaseUrl => ({
      supabaseUrl: 'https://vtcsoqohkiagbwatlabk.supabase.co', pageOrigin, apiBaseUrl,
      relayFetch: (...args) => fetch(...args),
    });
    const probe = async transport => (await transport('https://vtcsoqohkiagbwatlabk.supabase.co/auth/v1/settings', {
      headers: { Authorization: 'Bearer local-test-only' },
    })).json();
    return {
      omittedCookieControl: await probe(createSupabaseTransport({ ...options(''),
        relayFetch: request => fetch(new Request(request, { credentials: 'omit' })),
      })),
      sameOrigin: await probe(createSupabaseTransport(options(''))),
      explicitSameOrigin: await probe(createSupabaseTransport(options(pageOrigin))),
      crossOrigin: await probe(createSupabaseTransport(options(crossOrigin))),
    };
  }, { pageOrigin, crossOrigin });
  assert.equal(result.omittedCookieControl.protectionCookiePresent, false);
  assert.equal(result.sameOrigin.protectionCookiePresent, true);
  assert.equal(result.explicitSameOrigin.protectionCookiePresent, true);
  assert.equal(result.crossOrigin.protectionCookiePresent, false);
  assert.ok(Object.values(result).every(probe => probe.bearerPreserved));
  const report = { scope: 'Real Chromium HTTP cookie forwarding; not deployed Vercel or account login acceptance', ...result };
  await mkdir('test-artifacts/protected-preview-auth', { recursive: true });
  await writeFile('test-artifacts/protected-preview-auth/results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
