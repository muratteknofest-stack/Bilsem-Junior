/** Public legal documents and real web/Android UI. Isolated accounts, no messages or live writes. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import { LEGAL_DOCUMENTS } from '../src/content/legal-documents';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { publicPolicy, policyHtml } from '../server/platform-policy';

const output = resolve('test-artifacts/legal-links');
await mkdir(output, { recursive: true });
const cssNames = (await readdir('dist-android/assets')).filter(name => name.endsWith('.css'));
const css = (await Promise.all(cssNames.map(name => readFile('dist-android/assets/' + name, 'utf8')))).join('\n');
const settings = defaultPlatformSettings(); settings.business.brandName = 'Bilsem Junior'; settings.business.contactEmail = 'requests@example.invalid';
const app = express(); app.use(express.static(output)); app.use(express.static(resolve('public')));
app.get('/api/public/platform', (_req, res) => res.json({ registrationOpen: true, policyVersion: 'isolated-policy' }));
app.get('/api/public/policy/:slug', (req, res) => { const info = publicPolicy(req.params.slug, settings); res.setHeader('Cache-Control','no-store'); if (!info) return res.sendStatus(404); res.json(info); });
app.get('/bilgi/:slug', (req, res) => { const info = publicPolicy(req.params.slug, settings); res.setHeader('Cache-Control','no-store'); if (!info) return res.sendStatus(404); res.type('html').send(policyHtml(info)); });
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const fixture = `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LegalLinks}from'./src/components/LegalLinks';import{AndroidWelcome}from'./src/components/android/AndroidWelcome';import{LoginPage}from'./src/components/LoginPage';
function Fixture(){const[mode,setMode]=useState('panel');window.__legalShow=setMode;return mode==='welcome'?<AndroidWelcome onNavigate={()=>{}} onNavigateToLogin={()=>setMode('login')}/>:mode==='login'?<LoginPage initialRole="parent" onNavigateHome={()=>setMode('welcome')} onLoginSuccess={()=>{}}/>:<main style={{padding:16}}><LegalLinks mode={mode}/></main>};createRoot(document.getElementById('root')).render(<Fixture/>);`;
for (const target of ['web','android']) {
  await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, format: 'iife', platform: 'browser', outfile: resolve(output, target + '.js'), define: { 'import.meta.env': JSON.stringify({ VITE_APP_TARGET: target, VITE_API_BASE_URL: origin, VITE_PUBLIC_SITE_URL: 'https://bilsemjunior.vercel.app', VITE_SUPABASE_URL: 'https://legal-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-isolated-fixture' }) }, plugins: [{ name: 'isolated-auth-context', setup(builder) { builder.onResolve({ filter: /contexts\/AuthContext$/ }, () => ({ path: 'auth-context', namespace: 'isolated' })); builder.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: 'export const useAuth=()=>({loginLocally(){},sendEmailVerification:async()=>{},sendPasswordResetEmail:async()=>{}});' })); } }] });
  await writeFile(resolve(output, target + '.html'), `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><link rel="stylesheet" href="/${target}.css"></head><body><div id="root" class="${target === 'android' ? 'bj-native-shell' : ''}"></div><script src="/${target}.js"></script></body></html>`);
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.BILSEM_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const checks: Array<Record<string, unknown>> = [], errors: string[] = [];
try {
  for (const target of ['web','android']) for (const [width,height] of [[320,480],[390,844],[768,1024]]) {
    const page = await browser.newPage({ viewport: { width,height }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message)); await page.route('https://**/*', route => route.abort());
    await page.goto(origin + '/' + target + '.html');
    const nav = page.getByRole('navigation', { name: 'Yasal bilgiler', exact: true });
    for (const doc of LEGAL_DOCUMENTS) {
      const anchor = nav.getByRole('link', { name: doc.label, exact: true });
      assert.equal(await anchor.getAttribute('href'), (target === 'android' ? 'https://bilsemjunior.vercel.app' : '') + '/bilgi/' + doc.slug);
      await anchor.click();
      const modal = page.getByRole('dialog');
      await modal.getByRole('heading', { name: publicPolicy(doc.slug, settings)!.title, exact: true }).waitFor();
      await modal.locator('.platform-info-dialog-sections').waitFor();
      const separate = modal.getByRole('link', { name: 'Bu açıklamayı ayrı sayfada aç', exact: true });
      assert.equal(await separate.getAttribute('href'), (target === 'android' ? 'https://bilsemjunior.vercel.app' : '') + '/bilgi/' + doc.slug);
      if (doc.id === 'deletion') assert.match((await modal.getByRole('link', { name: 'Silme talebini e-posta ile başlat' }).getAttribute('href'))!, /^mailto:requests@example.invalid\?subject=/);
      const bounds = await modal.boundingBox(); assert.ok(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, JSON.stringify({target,width,doc:doc.id,bounds}));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.equal(page.url(), origin + '/' + target + '.html');
      checks.push({ target,width,height,document:doc.slug });
      if (width === 390 && doc.id === 'deletion') await page.screenshot({ path: resolve(output,target + '-deletion.png') });
      if (target === 'android') await page.evaluate(() => window.dispatchEvent(new Event('bilsem:android-back',{cancelable:true}))); else await page.keyboard.press('Escape');
      await modal.waitFor({ state:'detached' });
    }
    await page.route('**/api/public/policy/cerez-ve-yerel-depolama', route => route.fulfill({status:503,json:{error:'isolated'}}));
    await nav.getByRole('link',{name:'Çerez ve yerel depolama',exact:true}).click();
    await page.getByText('Güncel açıklama yüklenemedi.',{exact:false}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Ayrı sayfada aç',exact:true}).getAttribute('href'), (target === 'android' ? 'https://bilsemjunior.vercel.app' : '') + '/bilgi/cerez-ve-yerel-depolama');
    await page.unroute('**/api/public/policy/cerez-ve-yerel-depolama');
    await page.getByRole('button',{name:'Yeniden dene',exact:true}).click();
    await page.locator('.platform-info-dialog-sections').waitFor();
    await page.getByRole('button',{name:'Bilgi ekranını kapat',exact:true}).click();
    await page.evaluate('window.__legalShow("login")');
    await page.locator('#login-identifier').fill('draft@example.invalid');
    await page.getByRole('button',{name:'Yasal bilgiler',exact:true}).click();
    await page.getByRole('dialog').locator('.platform-info-dialog-sections').waitFor();
    await page.getByRole('button',{name:'Bilgi ekranını kapat',exact:true}).click();
    assert.equal(await page.locator('#login-identifier').inputValue(),'draft@example.invalid');
    if (target === 'android') {
      await page.evaluate('window.__legalShow("welcome")');
      await page.getByRole('link',{name:'Gizlilik / KVKK',exact:true}).waitFor();
      assert.ok(await page.evaluate(() => { const el=document.querySelector('.bj-welcome')!;return el.scrollHeight-el.clientHeight<=2; }));
    }
    checks.push({target,width,height,errorRetry:true,loginDraftPreserved:true});
    await page.close();
  }
  for (const doc of LEGAL_DOCUMENTS) { const response = await fetch(origin + '/bilgi/' + doc.slug); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store'); const html=await response.text(); assert.ok(html.includes('href="/bilgi/hesap-ve-veri-silme"')); }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:checks.length,publicDocuments:LEGAL_DOCUMENTS.length,errors,liveWrites:false}));
} finally { await writeFile(resolve(output,'checks.json'),JSON.stringify({checks,errors},null,2));await browser.close();server.close(); }
