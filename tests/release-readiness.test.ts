import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { defaultPlatformSettings, registrationOpen, releaseBlockers, platformSettingsSchema, configuredExams } from '../src/lib/platform-settings';
import { exportSafePreferences } from '../src/lib/safe-preferences';
import { publicPolicy, policyHtml } from '../server/platform-policy';
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
    assert.match(String(subject), /ZekaPark/);
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
import {verifyPublicRelease} from '../scripts/check-live-release.mjs';

test('commercial readiness uses the real operator settings and verified Shopier products',()=>{
 const settings=defaultPlatformSettings();settings.business={legalName:'Test Operator',address:'Test postal address',contactEmail:'test@example.invalid',legalBases:'Test purposes',retention:'Test retention',transfers:'Test providers'};
 settings.release={registrationEnabled:true,emailTested:true,restoreTested:true,familyPilotTested:true,monitoringTested:true};
 settings.shopier={enabled:false,enforcePaidAccess:false,monthlyProductId:'monthly-real',quarterlyProductId:'quarterly-real',monthlyUrl:'https://www.shopier.com/monthly-real',quarterlyUrl:'https://www.shopier.com/quarterly-real'};
 const checks={databaseReady:true,originReady:true,shopierTokenReady:true,productsVerified:true};
 assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,true);assert.equal(commercialReadiness(settings,checks).paidSalesEnabled,false);
 assert.equal(commercialReadiness(settings,{...checks,productsVerified:false}).readyForPaidLaunch,false);
 assert.equal(commercialReadiness(settings,{...checks,shopierTokenReady:false}).readyForPaidLaunch,false);
 settings.release.emailTested=false;assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,false);
 settings.release.emailTested=true;settings.business.legalName='';assert.equal(commercialReadiness(settings,checks).readyForPaidLaunch,false);
});

test('free registration does not imply completed commercial launch checks',()=>{
 const settings=defaultPlatformSettings();settings.release.registrationEnabled=true;
 const report=commercialReadiness(settings,{databaseReady:true,originReady:true,shopierTokenReady:false,productsVerified:false});
 assert.equal(report.registrationOpen,true);assert.equal(report.readyForPaidLaunch,false);assert.ok(report.blockers.some(b=>b.includes('Shopier')));assert.ok(report.blockers.some(b=>b.includes('geri yükleme')));
});

function releaseFetch(overrides:Record<string,{status?:number;body?:string;headers?:Record<string,string>}>={}){
 return async (input:Parameters<typeof fetch>[0],init?:RequestInit)=>{const url=input instanceof URL?input:new URL(typeof input==='string'?input:input.url);const path=url.pathname;const status=init?.method==='POST'?(new Headers(init.headers).has('Origin')?403:401):path==='/api/release-unknown'?404:path.startsWith('/api/')&&!path.startsWith('/api/public/')?401:200;
 const body=path==='/'?'<html lang="tr"><title>ZekaPark</title></html>':path==='/robots.txt'?'User-agent: *\nDisallow: /admin':path==='/sitemap.xml'?'https://zekapark.vercel.app/':path==='/api/public/platform'?JSON.stringify({registrationOpen:true,policyVersion:'fixture-1'}):path==='/api/public/shopier'?JSON.stringify({ready:false,enforced:false,plans:[{},{}]}):'fixture';
 const override=overrides[path]||{};return new Response(override.body??body,{status:override.status??status,headers:{'x-content-type-options':'nosniff','x-frame-options':'DENY','cache-control':'no-store',...override.headers}});
 };
}
test('live release checks distinguish free registration and disabled paid sales',async()=>{
 const report=await verifyPublicRelease(new URL('https://zekapark.vercel.app'),releaseFetch());assert.deepEqual(report,{checks:17,registrationOpen:true,paidSalesReady:false});
});
test('live release refuses sign-in walls, private exports, missing protection and indexing blocks',async()=>{
 const origin=new URL('https://zekapark.vercel.app');
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/api/account/export':{status:200}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/':{status:302}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/':{headers:{'x-frame-options':'SAMEORIGIN'}}})));
 await assert.rejects(()=>verifyPublicRelease(origin,releaseFetch({'/robots.txt':{body:'User-agent: *\nDisallow: /'}})));
});
