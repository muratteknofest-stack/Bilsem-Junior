import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer as createHttpServer} from 'node:http';
import { randomBytes } from 'node:crypto';
import { defaultPlatformSettings, registrationOpen, releaseBlockers, platformSettingsSchema, configuredExams } from '../src/lib/platform-settings';
import { exportSafePreferences } from '../src/lib/safe-preferences';
import { publicPolicy, policyHtml } from '../server/platform-policy';
import { readPlatformSettings } from '../server/platform-settings';
// @ts-ignore JavaScript operation helper is also used by the backup workflow.
import { backupKey, encryptBackup, decryptBackup } from '../scripts/backup-crypto.mjs';

test('export can never enumerate storage or request an authentication key', () => {
  const requested: string[] = [];
  const data = exportSafePreferences({ getItem(key) { requested.push(key); return key === 'zekapark_theme' ? 'dark' : null; } });
  assert.deepEqual(requested, ['zekapark_theme', 'zekapark_sound_enabled']);
  assert.deepEqual(data.preferences, { zekapark_theme: 'dark' });
  assert.ok(!JSON.stringify(data).includes('sb-'));
});
test('registration uses explicit operator enablement while readiness records remain independent', () => {
  const complete = defaultPlatformSettings();
  assert.equal(registrationOpen(complete), false); assert.equal(releaseBlockers(complete).length, 10);
  complete.release.registrationEnabled = true;
  assert.equal(registrationOpen(complete), true);
  assert.equal(releaseBlockers(complete).length, 10);
  assert.equal(complete.release.emailTested, false);
  complete.business = { legalName: 'Test İşletmesi', address: 'Yalnızca test adresi', contactEmail: 'test@example.com', legalBases: 'Test amaç ve dayanak', retention: 'Test saklama süresi', transfers: 'Test aktarım açıklaması' };
  complete.release = { registrationEnabled: true, emailTested: true, restoreTested: true, familyPilotTested: true, monitoringTested: true };
  assert.equal(registrationOpen(complete), true);
  for (const key of Object.keys(complete.business) as Array<keyof typeof complete.business>) assert.equal(registrationOpen({ ...complete, business: { ...complete.business, [key]: '' } }), true, key);
  for (const key of Object.keys(complete.release) as Array<keyof typeof complete.release>) assert.equal(registrationOpen({ ...complete, release: { ...complete.release, [key]: false } }), key !== 'registrationEnabled', key);
  assert.equal(platformSettingsSchema.safeParse({ ...complete, serviceRoleKey: 'forged' }).success, false);
  assert.equal(platformSettingsSchema.safeParse({ ...complete, exams: { ...complete.exams, mini: { count: 100, seconds: 900 } } }).success, false);
  complete.exams.mini = { count: 7, seconds: 420 }; assert.equal(configuredExams(complete)[0].count, 7); assert.equal(configuredExams(complete)[0].seconds, 420);
});
test('loading enabled registration preserves recorded checks and never invents acceptance evidence', async () => {
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL', 'VERCEL_ENV'] as const;
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const origin = 'https://abcdefghijklmnopqrst.supabase.co';
  process.env.SUPABASE_URL = origin;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_fixture';
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  try {
    for (const recorded of [
      { registrationEnabled: true },
      { registrationEnabled: true, emailTested: true, restoreTested: false, familyPilotTested: false, monitoringTested: true },
    ]) {
      globalThis.fetch = async input => {
        const url = new URL(String(input));
        assert.equal(url.origin, origin);
        assert.equal(url.pathname, '/rest/v1/platform_settings');
        return Response.json({ settings: { release: recorded }, revision: 2, updated_at: null });
      };
      const result = await readPlatformSettings();
      assert.equal(registrationOpen(result.settings), true);
      assert.deepEqual(result.settings.release, platformSettingsSchema.parse({ release: recorded }).release);
      assert.equal(result.settings.release.restoreTested, false);
      assert.equal(result.settings.release.familyPilotTested, false);
      assert.ok(releaseBlockers(result.settings).includes('Şifreli yedekten geri yükleme kabul testi'));
      assert.ok(releaseBlockers(result.settings).includes('Veli / öğrenci ve aileler arası yetki kabul testi'));
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test('policy keeps missing information visible and escapes operator-supplied HTML', () => {
  const settings = defaultPlatformSettings();
  assert.match(policyHtml(publicPolicy('gizlilik-ve-veriler', settings)!), /henüz belirtilmemiştir/);
  settings.business = { legalName: '<script>alert(1)</script>', address: 'Test adresi', contactEmail: 'test@example.com', legalBases: 'Test', retention: 'Test', transfers: 'Test' };
  const html = policyHtml(publicPolicy('gizlilik-ve-veriler', settings)!);
  assert.ok(!html.includes('<script>alert(1)</script>')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('henüz belirtilmemiştir'));
  assert.match(html, /Wordwall/); assert.match(html, /KVKK/); assert.equal(publicPolicy('does-not-exist', settings), undefined);
});
test('encrypted backups reject wrong keys, corruption and unencrypted files', () => {
  const key = backupKey(randomBytes(32).toString('base64')), plain = Buffer.from('Private database fixture');
  const encrypted = encryptBackup(plain, key);
  assert.ok(!encrypted.includes(plain)); assert.deepEqual(decryptBackup(encrypted, key), plain);
  assert.throws(() => decryptBackup(encrypted, randomBytes(32)));
  const corrupt = Buffer.from(encrypted); corrupt[corrupt.length - 1] ^= 1; assert.throws(() => decryptBackup(corrupt, key));
  assert.throws(() => decryptBackup(plain, key)); assert.throws(() => backupKey('weak-key'));
});

test('all authentication email templates are Turkish and retain the provider tokens', () => {
  const subjects = JSON.parse(fs.readFileSync('supabase/templates/subjects.json', 'utf8'));
  assert.equal(Object.keys(subjects).length, 6);
  for (const [slug, subject] of Object.entries(subjects)) {
    assert.match(String(subject), /Bilsem Junior/);
    const html = fs.readFileSync(`supabase/templates/${slug}.html`, 'utf8');
    assert.match(html, /lang="tr"/); assert.ok(!html.includes('Reset your password'));
    assert.ok(html.includes(slug === 'reauthentication' ? '{{ .Token }}' : '{{ .ConfirmationURL }}'));
  }
});


test('operator identity and contact links remain visible while legal details are incomplete', () => {
  const settings = defaultPlatformSettings();
  settings.business.legalName = 'Quantum tech';
  settings.business.address = 'Quantum tech lab';
  settings.business.contactEmail = 'contact@example.com';
  for (const slug of ['gizlilik-ve-veriler', 'kullanim-kosullari', 'iletisim-ve-destek']) {
    const html = policyHtml(publicPolicy(slug, settings)!);
    assert.match(html, /Quantum tech lab/);
    assert.match(html, /href="mailto:contact@example.com"/);
    assert.ok(!html.includes('Doğrulanmış Kurumsal Bilgi'));
    assert.ok(!html.includes('kimlik ve adres bilgileri henüz'));
  }
  const privacy = policyHtml(publicPolicy('gizlilik-ve-veriler', settings)!);
  assert.match(privacy, /hukuki dayanak/);
  assert.match(privacy, /henüz tamamlanmamıştır/);
  assert.equal(releaseBlockers(settings).length, 7);
});

test('an invalid contact in direct HTML input cannot inject a mail link', () => {
  const info = publicPolicy('iletisim-ve-destek', defaultPlatformSettings())!;
  const html = policyHtml({ ...info, contactEmail: 'bad@example.com" onclick="alert(1)' });
  assert.ok(!html.includes('onclick="alert(1)'));
  assert.match(html, /mailto:zeka.kupu.test@gmail.com/);
});

import {commercialReadiness} from '../server/commercial-readiness';
// @ts-ignore Read-only production verifier is also used by CI.
import {verifyPublicRelease,fetchReleaseResource} from '../scripts/check-live-release.mjs';

test('commercial readiness uses the real operator settings and verified Google Play products',()=>{
 const settings=defaultPlatformSettings();settings.business={legalName:'Test Operator',address:'Test postal address',contactEmail:'test@example.invalid',legalBases:'Test purposes',retention:'Test retention',transfers:'Test providers'};
 settings.release={registrationEnabled:true,emailTested:true,restoreTested:true,familyPilotTested:true,monitoringTested:true};
 const checks={databaseReady:true,originReady:true,playSetupReady:true,productsVerified:true};
 assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,true);assert.equal(commercialReadiness(settings,checks).paidSalesEnabled,false);
 assert.equal(commercialReadiness(settings,{...checks,productsVerified:false}).readyForPaidLaunch,false);
 assert.equal(commercialReadiness(settings,{...checks,playSetupReady:false}).readyForPaidLaunch,false);
 settings.release.emailTested=false;assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,false);
 settings.release.emailTested=true;settings.business.legalName='';assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,false);
});

test('free registration does not imply completed commercial launch checks',()=>{
 const settings=defaultPlatformSettings();settings.release.registrationEnabled=true;
 const report=commercialReadiness(settings,{databaseReady:true,originReady:true,playSetupReady:false,productsVerified:false});
 assert.equal(report.registrationOpen,true);assert.equal(report.readyForPaidLaunch,false);assert.ok(report.blockers.some(b=>b.includes('Google Play')));assert.ok(report.blockers.some(b=>b.includes('geri yükleme')));
});

function releaseFetch(overrides:Record<string,{status?:number;body?:string;headers?:Record<string,string>}>={}){
 return async (input:Parameters<typeof fetch>[0],init?:RequestInit)=>{const url=input instanceof URL?input:new URL(typeof input==='string'?input:input.url);const path=url.pathname;const crossSite=new Headers(init?.headers).get('Sec-Fetch-Site')==='cross-site';const status=crossSite&&path.startsWith('/api/')?403:init?.method==='POST'?(new Headers(init.headers).has('Origin')?403:401):path==='/api/release-unknown'?404:path.startsWith('/api/')&&!path.startsWith('/api/public/')?401:200;
 const body=path==='/'?'<html lang="tr"><title>Bilsem Junior</title></html>':path==='/robots.txt'?'User-agent: *\nDisallow: /admin':path==='/sitemap.xml'?'https://bilsemjunior.vercel.app/':path==='/api/public/platform'?JSON.stringify({registrationOpen:true,policyVersion:'fixture-1'}):path==='/api/public/membership'?JSON.stringify({ready:false,enforced:false,plans:[{},{},{}]}):path==='/paketler'||path==='/paketler/'?'<html><link href="/sales/sales.css"><h1 id="sales-heading">Keşif</h1><section class="zp-plan-card"></section></html>':path==='/sales/sales.css'?'.zp-plan-mint{color:green}':path.startsWith('/bilgi/')?'<html><h1>Policy</h1></html>':'fixture';
 const override=overrides[path]||{};return new Response(override.body??body,{status:override.status??status,headers:{'x-content-type-options':'nosniff','x-frame-options':'DENY','cache-control':'no-store','content-type':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8',...override.headers}});
 };
}
test('live release checks distinguish free registration and disabled paid sales',async()=>{
 const report=await verifyPublicRelease(new URL('https://bilsemjunior.vercel.app'),releaseFetch());assert.deepEqual(report,{checks:27,registrationOpen:true,paidSalesReady:false});
});
test('live release refuses sign-in walls, private exports, missing protection and indexing blocks',async()=>{
 const origin=new URL('https://bilsemjunior.vercel.app');
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/api/account/export':{status:200}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/':{status:302}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/':{headers:{'x-frame-options':'SAMEORIGIN'}}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/robots.txt':{body:'User-agent: *\nDisallow: /'}})));
});


test('package addresses with and without a trailing slash use the same public server page',()=>{
 const config=JSON.parse(fs.readFileSync('config/vercel-base.json','utf8'));
 for(const path of ['/paketler','/paketler/']){
  assert.equal(config.rewrites.find((route:{source:string})=>route.source===path)?.destination,'/api/index?__path=public/membership/page');
 }
});
test('live release refuses a broken package address or a missing sales stylesheet',async()=>{
 const origin=new URL('https://bilsemjunior.vercel.app');
 for(const path of ['/paketler','/paketler/']){
  await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({[path]:{status:404}})));
  await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({[path]:{body:'<h1>Sayfa bulunamadı</h1>'}})));
 }
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/sales/sales.css':{headers:{'content-type':'text/html'}}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/sales/sales.css':{body:'<html>Missing</html>'}})));
});


test('live release requires external document links to work and cross-site API reads to stay blocked',async()=>{
 const origin=new URL('https://bilsemjunior.vercel.app'),fixture=releaseFetch();
 const brokenNavigation:typeof fetch=async(input,init)=>new Headers(init?.headers).get('Sec-Fetch-Site')==='cross-site'&&new URL(String(input)).pathname==='/paketler'?Response.json({error:'Origin blocked'},{status:403}):fixture(input,init);
 await assert.rejects(()=>verifyPublicRelease(origin,brokenNavigation));
 const openApi:typeof fetch=async(input,init)=>new Headers(init?.headers).get('Sec-Fetch-Site')==='cross-site'&&new URL(String(input)).pathname==='/api/account/export'?Response.json({data:'private'}):fixture(input,init);
 await assert.rejects(()=>verifyPublicRelease(origin,openApi));
});


test('release navigation transport preserves the browser fetch metadata instead of rewriting it to cors',async()=>{
 let received:import('node:http').IncomingHttpHeaders={};
 const server=createHttpServer((req,res)=>{received=req.headers;res.setHeader('Content-Type','text/html');res.end('<html>Public</html>');});
 server.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 try{
  const response=await fetchReleaseResource(new URL(`http://127.0.0.1:${address.port}/paketler`),{headers:{'Sec-Fetch-Mode':'navigate','Sec-Fetch-Site':'cross-site','Sec-Fetch-Dest':'document'},signal:AbortSignal.timeout(3000)});
  assert.equal(response.status,200);assert.equal(await response.text(),'<html>Public</html>');
  assert.equal(received['sec-fetch-mode'],'navigate');assert.equal(received['sec-fetch-site'],'cross-site');assert.equal(received['sec-fetch-dest'],'document');assert.equal(received.origin,undefined);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
