import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEGAL_DOCUMENTS, policyActionLinks } from '../src/content/legal-documents';
import { FOOTER_GROUPS, PLATFORM_INFO } from '../src/content/platform-info';
import { LegalLinks } from '../src/components/LegalLinks';
import { defaultPlatformSettings } from '../src/lib/platform-settings';
import { publicPolicy, policyHtml } from '../server/platform-policy';
import { blogPlugin } from '../scripts/blog-vite-plugin';
import { requestSecurity } from '../server/request-security';

test('every legal link resolves to a public document and deployed policies cannot become stale static files', () => {
  const config = JSON.parse(fs.readFileSync('config/vercel-base.json', 'utf8'));
  const rewrite = config.rewrites.find((row: { destination: string }) => row.destination.includes('public/policy'));
  const headers = config.headers.find((row: { source: string }) => row.source.startsWith('/bilgi/:slug('));
  const emitted: string[] = [];
  (blogPlugin().generateBundle as Function).call({ emitFile(file: { fileName: string }) { emitted.push(file.fileName); } });
  for (const doc of LEGAL_DOCUMENTS) {
    const path = '/bilgi/' + doc.slug;
    assert.ok(PLATFORM_INFO.find(info => info.slug === doc.slug));
    assert.ok(FOOTER_GROUPS.some(group => group.links.some(link => link.href === path)));
    assert.ok(rewrite.source.includes(doc.slug)); assert.ok(headers.source.includes(doc.slug));
    assert.ok(headers.headers.some((row: { key: string; value: string }) => row.key === 'Cache-Control' && row.value === 'no-store'));
    assert.ok(!emitted.includes(`bilgi/${doc.slug}/index.html`));
  }
});

test('deletion instructions work without reinstalling and use the configured operator contact', () => {
  const settings = defaultPlatformSettings();
  settings.business.brandName = 'Bilsem Junior'; settings.business.contactEmail = 'requests@example.invalid';
  const info = publicPolicy('hesap-ve-veri-silme', settings)!;
  const html = policyHtml(info);
  assert.match(html, /mailto:requests@example.invalid\?subject=/);
  assert.match(html, /uygulamayı yeniden yüklemeyi gerektirmez/);
  assert.match(html, /Talebin kaydedilmesi silmenin tamamlandığı anlamına gelmez/);
  assert.match(html, /Google Play aboneliğinizi kendiliğinden iptal etmez/);
  assert.ok(!html.includes('mailto:zeka.kupu.test@gmail.com'));
  assert.match(html, /25 Ekim 2026/);
  assert.ok(!html.includes('<form'));
});

test('legal disclosures retain missing identity and do not create a refund guarantee or inferred tracking consent', () => {
  const settings = defaultPlatformSettings();
  assert.match(policyHtml(publicPolicy('gizlilik-ve-veriler', settings)!), /henüz belirtilmemiştir/);
  const subscription = policyHtml(publicPolicy('abonelik-iptal-ve-iade', settings)!);
  assert.match(subscription, /tek başına tamamlanmış mesafeli satış sözleşmesi değildir/);
  assert.match(subscription, /koşulsuz iade garantisi/);
  const cookies = policyHtml(publicPolicy('cerez-ve-yerel-depolama', settings)!);
  assert.match(cookies, /rıza verildiği anlamına gelmez/);
  const unsafe = policyActionLinks('hesap-ve-veri-silme', 'bad@example.invalid" onclick="alert(1)');
  assert.ok(unsafe.every(action => !action.href.includes('onclick')));
});

test('HTML legal navigation is public but the same cross-site JSON and mutations remain blocked', () => {
  for (const doc of LEGAL_DOCUMENTS) for (const [method, format, mode, dest, accepted] of [
    ['GET','html','navigate','document',true], ['HEAD','html','navigate','document',true],
    ['GET','html','navigate','iframe',false], ['GET','','cors','empty',false], ['POST','html','navigate','document',false],
  ] as const) {
    let passed = false, status = 200;
    const input = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': mode, 'Sec-Fetch-Dest': dest };
    const req = { method, path: '/public/policy/' + doc.slug, query: { format }, get: (name: string) => input[name as keyof typeof input], is: () => true };
    const res = { setHeader() {}, status(n: number) { status = n; return this; }, json() {}, sendStatus(n: number) { status = n; } };
    requestSecurity('https://allowed.example')(req as never, res as never, () => { passed = true; });
    assert.equal(passed, accepted, `${doc.slug} ${method} ${mode} ${dest}`);
    assert.equal(status, accepted ? 200 : 403);
  }
});

test('legal UI provides real copyable links and keeps the compact entry and purchase disclosure scoped', () => {
  const panel = renderToStaticMarkup(<LegalLinks/>);
  for (const doc of LEGAL_DOCUMENTS) assert.ok(panel.includes('href="/bilgi/' + doc.slug + '"'));
  const entry = renderToStaticMarkup(<LegalLinks mode="entry"/>);
  assert.match(entry, /Yasal bilgiler/); assert.equal((entry.match(/<a /g) || []).length, 2);
  const purchase = renderToStaticMarkup(<LegalLinks mode="purchase"/>);
  assert.match(purchase, /abonelik-iptal-ve-iade/); assert.equal((purchase.match(/<a /g) || []).length, 3);
});
