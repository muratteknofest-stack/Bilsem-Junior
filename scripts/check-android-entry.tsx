/** Real entry components with isolated network responses; never creates a real account. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';

const output = resolve('test-artifacts/android-entry');
await mkdir(output, { recursive: true });
const cssNames = (await readdir('dist-android/assets')).filter(name => name.endsWith('.css'));
const css = (await Promise.all(cssNames.map(name => readFile('dist-android/assets/' + name, 'utf8')))).join('\n');
const fixture = `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{AndroidWelcome}from'./src/components/android/AndroidWelcome';import{LoginPage}from'./src/components/LoginPage';
function Fixture(){const[route,setRoute]=useState('home'),[role,setRole]=useState('student');
window.__entryShow=(r,who='student')=>{setRole(who);setRoute(r)};
return route==='home'?<AndroidWelcome onNavigateToLogin={r=>{setRole(r);setRoute('login')}} onNavigate={setRoute}/>:<LoginPage key={route+role} initialMode={route==='register'?'register':'login'} initialRole={role} onNavigateHome={()=>setRoute('home')} onLoginSuccess={()=>{}}/>;}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, format: 'iife', platform: 'browser', outfile: resolve(output, 'fixture.js'), define: { 'import.meta.env': JSON.stringify({ VITE_APP_TARGET: 'android', VITE_SUPABASE_URL: 'https://entry-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-isolated-fixture' }) }, plugins: [{ name: 'isolated-auth-context', setup(builder) { builder.onResolve({ filter: /contexts\/AuthContext$/ }, () => ({ path: 'auth-context', namespace: 'isolated' })); builder.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: 'export const useAuth=()=>({loginLocally(){},sendEmailVerification:async()=>{},sendPasswordResetEmail:async()=>{}});' })); } }] });
await writeFile(resolve(output, 'index.html'), `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><link rel="stylesheet" href="/fixture.css"></head><body><div class="bj-native-shell" id="root"></div><script src="/fixture.js"></script></body></html>`);
const app = express(); app.use(express.static(output)); app.use(express.static(resolve('public')));
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BILSEM_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks: Array<Record<string, unknown>> = [];
const errors: string[] = [];
try {
  for (const [width, height] of [[320,480],[360,640],[390,844],[412,915],[768,1024]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', error => errors.push(error.message));
    const submissions: unknown[] = [];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = { registrationOpen: true, policyVersion: '2026-10-28.1' };
      if (path === '/api/register-family') { submissions.push(route.request().postDataJSON()); body = { success: true, parentProfile: { id: '11111111-1111-4111-8111-111111111111', role: 'parent' }, student: { id: '22222222-2222-4222-8222-222222222222', code: 'DENIZ1234', email: 'deniz1234@zekapark.com' }, verificationSent: true }; }
      await route.fulfill({ json: body });
    });
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    async function fits(name: string) {
      await page.locator('.bj-welcome, .zp-auth').waitFor();
      const box = await page.evaluate(() => {
        const root = document.querySelector('.bj-welcome, .zp-auth') as HTMLElement;
        return { scroll: root.scrollHeight - root.clientHeight, overflowX: document.documentElement.scrollWidth - innerWidth, pageScroll: document.documentElement.scrollHeight - innerHeight };
      });
      checks.push({ width, height, name, ...box });
      if (box.scroll > 2 || box.overflowX > 2 || box.pageScroll > 2) await page.screenshot({ path: resolve(output, `overflow-${width}-${name}.png`) });
      assert.ok(box.scroll <= 2 && box.overflowX <= 2 && box.pageScroll <= 2, `${width}x${height} ${name}: ${JSON.stringify(box)}`);
    }
    await page.getByRole('button', { name: /Öğrenci girişi/ }).waitFor(); await fits('home');
    if (width === 390) await page.screenshot({ path: resolve(output, 'home.png') });
    await page.getByRole('button', { name: /Öğrenci girişi/ }).click();
    await page.getByLabel('Şifre', { exact: true }).waitFor(); await fits('student-login');
    await page.getByRole('button', { name: 'Veli', exact: true }).click(); await fits('parent-login');
    if (width === 390) await page.screenshot({ path: resolve(output, 'login.png') });
    await page.locator('#login-identifier').focus();
    await page.setViewportSize({ width, height: 320 });
    await page.locator('.zp-auth[data-keyboard=true]').waitFor(); await fits('login-keyboard');
    await page.locator('#login-identifier').blur(); await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: 'Yeni Kayıt', exact: true }).click();
    await page.getByLabel('Veli e-posta adresi', { exact: false }).waitFor(); await fits('registration-email');
    await page.getByLabel('Veli e-posta adresi', { exact: false }).fill('veli@example.invalid');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByLabel('Veli şifresi', { exact: true }).waitFor(); await fits('registration-parent-password');
    await page.getByLabel('Veli şifresi', { exact: true }).fill('Veli937546');
    await page.getByLabel('Veli şifresi tekrar', { exact: true }).fill('Veli937546');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByLabel('Öğrencinin takma adı', { exact: false }).waitFor(); await fits('registration-student');
    await page.getByLabel('Öğrencinin takma adı', { exact: false }).fill('Deniz');
    await page.getByLabel('Öğrencinin sınıf düzeyi', { exact: false }).selectOption('2');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByLabel('Öğrenci şifresi', { exact: true }).waitFor(); await fits('registration-student-password');
    await page.getByLabel('Öğrenci şifresi', { exact: true }).fill('Ogrenci937546');
    await page.getByLabel('Öğrenci şifresi tekrar', { exact: true }).fill('Ogrenci937546');
    await page.getByLabel('Öğrenci şifresi tekrar', { exact: true }).focus();
    await page.setViewportSize({ width, height: 320 });
    await page.locator('.zp-auth[data-keyboard=true]').waitFor(); await fits('registration-keyboard');
    await page.getByLabel('Öğrenci şifresi tekrar', { exact: true }).blur(); await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: 'Geri', exact: true }).click();
    assert.equal(await page.getByLabel('Öğrencinin takma adı', { exact: false }).inputValue(), 'Deniz');
    assert.equal(await page.getByLabel('Öğrencinin sınıf düzeyi', { exact: false }).inputValue(), '2');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    assert.equal(await page.getByLabel('Öğrenci şifresi', { exact: true }).inputValue(), 'Ogrenci937546');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByRole('button', { name: 'Aile hesabını oluştur', exact: true }).waitFor(); await fits('registration-consent');
    if (width === 390) await page.screenshot({ path: resolve(output, 'registration.png') });
    assert.equal(submissions.length, 0);
    for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
    await page.getByRole('button', { name: 'Aile hesabını oluştur', exact: true }).click();
    await page.getByRole('heading', { name: 'Aile hesabınız hazır!' }).waitFor(); await fits('registration-success');
    assert.equal(submissions.length, 1);
    assert.deepEqual(submissions[0], { parentEmail: 'veli@example.invalid', parentPassword: 'Veli937546', studentPassword: 'Ogrenci937546', studentName: 'Deniz', grade: 2, examFocus: 'Genel Zihinsel Yetenek', consentAccepted: true, termsAccepted: true, guardianConfirmed: true, policyVersion: '2026-10-28.1' });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, checks, realAccountsCreated: 0 }, null, 2));
} finally {
  await writeFile(resolve(output, 'checks.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close(); server.close();
}
