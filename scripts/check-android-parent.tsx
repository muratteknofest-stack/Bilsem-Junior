/** Real parent workspace and navigation, with isolated account/data services. No live writes. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';

const output = resolve('test-artifacts/android-parent');
await mkdir(output, { recursive: true });
const cssNames = (await readdir('dist-android/assets')).filter(name => name.endsWith('.css'));
const css = (await Promise.all(cssNames.map(name => readFile('dist-android/assets/' + name, 'utf8')))).join('\n');
const fixture = `
import React from 'react';import{createRoot}from'react-dom/client';
import{ParentPortalView}from'./src/components/ParentPortalView';import{Navbar}from'./src/components/Navbar';import{MobileBottomNav}from'./src/components/MobileBottomNav';
const child=id=>({id,role:'student',linkedParentId:'parent',name:id==='a'?'Deniz':'Ece',grade:2,studentCode:id==='a'?'DENIZ123':'ECE12345',avatar:'🦊',level:2,xp:300,streak:3,lastActiveDate:new Date().toISOString(),dailyGoalMinutes:15,todayMinutesSpent:5,dailyGoalQuestions:10,todayQuestionsSolved:7,soundEnabled:false});
window.__children={a:child('a'),b:child('b')};window.__parent={id:'parent',role:'parent',name:'Test veli',linkedStudentIds:['a','b']};window.__opened=[];window.__billing=[];
function Fixture(){return <div className="bj-native-shell"><Navbar currentUser={window.__parent} currentRoute="parent" onNavigateHome={()=>{}} onNavigate={()=>{}} onOpenReminderSettings={()=>{}} onLogout={()=>window.__logout=true}/><ParentPortalView student={window.__parent} masteries={[]} onOpenStudent={id=>window.__opened.push(id)}/><div id="external-check" hidden><MobileBottomNav currentRoute="admin" userRole="admin" mistakesCount={0} onNavigate={()=>{}}/></div></div>};
createRoot(document.getElementById('root')).render(<Fixture/>);`;
const mocks: Record<string, string> = {
  'contexts/AuthContext': `export const useAuth=()=>({userProfile:window.__parent});`,
  'lib/platform': `export const db={};`,
  'lib/supabase-data': `export const doc=(_db,_collection,id)=>id;export const getDoc=async id=>{if(window.__fail==='profile'&&id==='b')throw Error('isolated profile failure');return {exists:()=>true,data:()=>window.__children[id]}};`,
  'services/data-service': `export const dataService={getCurrentUser:()=>window.__parent,getSkillMasteries:()=>[],loadRemoteProgressForUser:async id=>{if(window.__hold&&id==='b')await new Promise(resolve=>window.__release=resolve);if(window.__fail==='progress'&&id==='b')throw Error('isolated progress failure');return {masteries:[{category:'matrix',categoryName:'Matris',mastery:55,attemptCount:8,accuracy:60,recentTrend:'neutral'}],weeklyQuestions:[]}},getWeeklyQuestionProgressData:child=>({dailyStats:[0,2,4,0,3,6,0].map((thisWeek,dayIndex)=>({dayIndex,shortDay:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][dayIndex],dayName:'Gün',thisWeek:child.id==='a'?thisWeek:thisWeek*2,lastWeek:0,isToday:false})),fourWeeksTrend:[],allTimeTotal:15,summary:{thisWeekTotal:15,lastWeekTotal:0,difference:15,percentChange:0,direction:'up',weeklyTarget:30,targetCompletionRate:50,dailyAverage:2,bestDay:{dayName:'Cumartesi',shortDay:'Cmt',count:6}}})};`,
  'components/AccountCenter': `import React from'react';export const FamilyActivation=()=>null;export const AccountCenter=()=> <section aria-label="Hesap ve veri işlemleri">İzole hesap hizmeti</section>;`,
  'components/NativeAccessStatus': `import React,{useEffect}from'react';export function NativeAccessStatus({studentId,studentName,onBusyChange}){useEffect(()=>{window.__billing.push(studentId);window.__setBillingBusy=onBusyChange},[studentId]);return <section aria-label="Üyelik hizmeti">{studentName} üyeliği</section>}`,
};
await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, format: 'iife', platform: 'browser', outfile: resolve(output, 'fixture.js'), define: { 'import.meta.env': JSON.stringify({ VITE_APP_TARGET: 'android', VITE_PUBLIC_SITE_URL: 'https://bilsemjunior.vercel.app', VITE_SUPABASE_URL: 'https://parent-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-isolated-fixture' }) }, plugins: [{ name: 'isolated-parent-services', setup(builder) {
  builder.onResolve({ filter: /./ }, args => { const key = Object.keys(mocks).find(key => args.path.endsWith(key) || (key.startsWith('components/') && args.path.endsWith('/' + key.split('/').pop()))); return key ? { path: key, namespace: 'isolated' } : undefined; });
  builder.onLoad({ filter: /.*/, namespace: 'isolated' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: process.cwd() }));
} }] });
await writeFile(resolve(output, 'index.html'), `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`);
const app = express(); app.use(express.static(output)); app.use(express.static(resolve('public')));
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BILSEM_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks: Array<Record<string, unknown>> = [], errors: string[] = [];
try {
  for (const [width, height] of [[320,480],[360,640],[390,844],[412,915],[768,1024],[568,320]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    await page.getByRole('heading', { name: 'Bu hafta nasıl geçti?' }).waitFor();
    assert.deepEqual(await page.evaluate(() => (window as any).__billing), []);
    assert.equal(await page.locator('.bj-parent-pocket-metrics article').first().locator('strong').innerText(), '15soru');
    const nav = page.getByRole('navigation', { name: 'Veli alanı bölümleri' });
    assert.equal(await nav.getByRole('button').count(), 4);
    async function fits(name: string) {
      const bounds = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, nav: document.querySelector('.bj-parent-native-tabs')!.getBoundingClientRect().bottom - innerHeight, touches: [...document.querySelectorAll('.bj-parent-native-tabs button')].every(button => button.getBoundingClientRect().height >= 44) }));
      assert.ok(bounds.overflow <= 2 && Math.abs(bounds.nav) <= 2 && bounds.touches, `${width} ${name}: ${JSON.stringify(bounds)}`);
      checks.push({ width, height, name, ...bounds });
    }
    await fits('summary');
    if (width === 390) await page.screenshot({ path: resolve(output, 'parent-summary.png') });
    await page.getByRole('button', { name: 'Öğrenciye geç', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => (window as any).__opened), ['a']);
    await nav.getByRole('button', { name: 'Üyelik', exact: true }).click();
    await page.getByRole('region', { name: 'Üyelik hizmeti' }).waitFor();
    assert.deepEqual(await page.evaluate(() => (window as any).__billing), ['a']);
    await fits('membership');
    await page.evaluate('window.__setBillingBusy(true)');
    await page.waitForFunction(() => [...document.querySelectorAll('.bj-parent-native-tabs button')].every(button => (button as HTMLButtonElement).disabled));
    await page.evaluate(() => window.dispatchEvent(new Event('bilsem:android-back', { cancelable: true })));
    assert.equal(await page.getByRole('region', { name: 'Üyelik hizmeti' }).count(), 1);
    await page.evaluate('window.__setBillingBusy(false)');
    await page.waitForFunction(() => [...document.querySelectorAll('.bj-parent-native-tabs button')].every(button => !(button as HTMLButtonElement).disabled));
    await page.evaluate(() => window.dispatchEvent(new Event('bilsem:android-back', { cancelable: true })));
    await page.getByRole('heading', { name: 'Bu hafta nasıl geçti?' }).waitFor();
    await page.getByRole('button', { name: 'Grafikleri ve raporu incele' }).click();
    await page.getByRole('button', { name: 'Kısa özete dön', exact: false }).waitFor();
    await fits('detailed-report');
    await page.evaluate(() => window.dispatchEvent(new Event('bilsem:android-back', { cancelable: true })));
    await page.getByRole('heading', { name: 'Bu hafta nasıl geçti?' }).waitFor();
    await nav.getByRole('button', { name: 'Beceriler', exact: true }).click();
    await page.getByRole('heading', { name: '10 Bilişsel Boyut Haritası' }).waitFor();
    await fits('skills');
    await nav.getByRole('button', { name: 'Hesap', exact: true }).click();
    await page.getByRole('heading', { name: 'Öğrenci ve destek', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Hesap ve veli rehberi', exact: true }).getAttribute('href'), 'https://bilsemjunior.vercel.app/bilgi/hesap-ve-veli-rehberi');
    await fits('account');
    await page.evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('isolated denied'); } } })");
    await page.getByRole('button', { name: 'Kodu kopyala', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Kod kopyalanamadı' }).waitFor();
    await page.evaluate(() => { (window as any).__hold = true; (window as any).__fail = 'progress'; });
    await page.getByLabel('Öğrenci seçin').selectOption('b');
    await page.locator('.bj-screen-loading').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Öğrenciye geç', exact: true }).count(), 0);
    assert.equal(await page.locator('.bj-parent-pocket').count(), 0);
    await page.waitForFunction(() => typeof (window as any).__release === 'function');
    await page.evaluate(() => (window as any).__release());
    await page.getByRole('alert').filter({ hasText: 'Öğrenci bilgileri yüklenemedi' }).waitFor();
    assert.equal(await page.locator('.bj-parent-pocket').count(), 0);
    await page.evaluate(() => { (window as any).__hold = false; (window as any).__fail = ''; });
    await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
    await page.getByRole('heading', { name: 'Ece', exact: true }).waitFor();
    await nav.getByRole('button', { name: 'Özet', exact: true }).click();
    await page.getByRole('heading', { name: 'Bu hafta nasıl geçti?' }).waitFor();
    assert.equal(await page.locator('.bj-parent-pocket-metrics article').first().locator('strong').innerText(), '30soru');
    await fits('recovered-student');
    await page.getByRole('button', { name: 'Öğrenciye geç', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => (window as any).__opened), ['a','b']);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await fits('dark-summary');
    if (width === 390) await page.screenshot({ path: resolve(output, 'parent-dark.png') });
    await page.evaluate(() => document.documentElement.style.fontSize = '22px');
    await fits('large-text');
    const external = page.locator('#external-check a');
    for (const a of await external.all()) assert.ok((await a.getAttribute('href'))?.startsWith('https://bilsemjunior.vercel.app/'));
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, realAccountsCreated: 0, services: 'isolated', billingAcceptance: 'not tested here' }));
} finally {
  await writeFile(resolve(output, 'checks.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close(); server.close();
}
