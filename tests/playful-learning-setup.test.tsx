import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LearningSetupPanel } from '../src/components/student/LearningSetupPanel';
import { difficultyChoices } from '../src/features/student/learning-selection';
import { selectShopierPackageCandidates, shopierConnectionMessage, type ShopierPackageCandidate } from '../src/lib/shopier-connection';

const noop = () => {};
function setup(grade: 1|2|3|4, validCount = true, busy = false) {
  return renderToStaticMarkup(<LearningSetupPanel mode="adaptive" grade={grade} review={false} busy={busy} topic="mixed" onTopic={noop} category="mixed" onCategory={noop} difficulty="mixed" onDifficulty={noop} questionCount="10" onCount={noop} validCount={validCount} exam="mini" onExam={noop} exams={[]} onStart={noop} />);
}
test('the playful setup keeps every curriculum topic and only grade-appropriate challenge levels', () => {
  for (const grade of [1,2,3,4] as const) {
    const html = setup(grade);
    assert.equal((html.match(/data-topic=/g) || []).length, 45);
    for (const choice of difficultyChoices(grade)) assert.ok(html.includes(`aria-label="${choice.label}"`));
    for (let level = difficultyChoices(grade).length + 1; level <= 6; level++) assert.ok(!html.includes(`aria-label="${level}. seviye`));
    assert.ok(html.includes('aria-label="Soru sayısı"'));
    assert.ok(html.includes('aria-label="Yeni testi başlat"'));
    assert.ok(html.includes('aria-label="Deneyim tercihi"'));
    assert.ok(html.includes('Tercihleri kapat'));
  }
});
test('invalid custom counts and busy requests cannot launch another session', () => {
  for (const html of [setup(2, false), setup(2, true, true)]) {
    assert.match(html, /<button[^>]+aria-label="Yeni testi başlat"[^>]+disabled=""/);
  }
});
const candidate = (overrides: Partial<ShopierPackageCandidate> = {}): ShopierPackageCandidate => ({ plan:'monthly',productId:'123',url:'https://www.shopier.com/test/123',titleMatchesPlan:true,digital:true,inStock:true,noDiscount:true,freeShipping:true,noVariants:true,noOptions:true,...overrides });
test('Shopier auto-fill requires one fully compatible product per plan and never guesses from duplicates', () => {
  const good = candidate();
  assert.deepEqual(selectShopierPackageCandidates([good,good]).selected, [good]);
  for (const key of ['titleMatchesPlan','digital','inStock','noDiscount','freeShipping','noVariants','noOptions'] as const) assert.deepEqual(selectShopierPackageCandidates([candidate({[key]:false})]).selected, []);
  const ambiguous = selectShopierPackageCandidates([good,candidate({productId:'456',url:'https://www.shopier.com/test/456'})]);
  assert.deepEqual(ambiguous.selected, []);
  assert.ok(ambiguous.unresolved.includes('monthly'));
  assert.equal(selectShopierPackageCandidates([good,candidate({plan:'quarterly',productId:'234'}),candidate({plan:'annual',productId:'345'})]).unresolved.length, 0);
});
test('Shopier diagnostics distinguish unavailable credentials, rejection and challenge without falsely asserting revocation', () => {
  assert.match(shopierConnectionMessage({configured:false}), /tanımlı değil/);
  const denied = shopierConnectionMessage({configured:true,httpStatus:401});
  assert.match(denied, /doğrulamadı/);
  assert.ok(!denied.includes('iptal edilmiş'));
  assert.match(shopierConnectionMessage({configured:true,httpStatus:403,challenge:true}), /erişim doğrulaması/);
  assert.match(shopierConnectionMessage({configured:true,httpStatus:403}), /okuma izinlerini/);
  assert.match(shopierConnectionMessage({configured:true,readable:false}), /yeniden deneyin/);
});
