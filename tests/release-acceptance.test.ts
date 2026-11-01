import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {emailDomain,emailReceiptFrom,emailTestMessage,validReference} from '../scripts/acceptance-email.mjs';
import {playReceiptFrom,summarizeSubscription,tokenFingerprint} from '../scripts/acceptance-play.mjs';
import {checkEmailReceipt,checkPlayReceipt} from '../scripts/release-closure.mjs';
import {EMAIL_TEMPLATE_IDS,missingEmailTemplates,unknownEmailTemplates} from '../shared/email-templates.mjs';

const now=new Date('2026-11-01T12:00:00Z');
const reference='BJ-KABUL-2026-0001';
const templates=[...EMAIL_TEMPLATE_IDS];

test('an e-mail receipt cannot be produced without SMTP, delivery, DNS evidence and six templates',()=>{
  const empty=emailReceiptFrom({now});
  assert.equal(empty.problems.length,7);
  assert.equal(checkEmailReceipt(empty.receipt,{now:now.getTime()}).ok,false);

  const partial=emailReceiptFrom({smtpVerified:true,providerAccepted:true,recipient:'veli@example.com',templates,now});
  assert.ok(partial.problems.some((problem:any)=>/teslim/i.test(problem)));
  assert.ok(partial.problems.some((problem:any)=>/SPF/i.test(problem)));
  assert.equal(checkEmailReceipt(partial.receipt,{now:now.getTime()}).ok,false);

  const complete:any=emailReceiptFrom({smtpVerified:true,providerAccepted:true,deliveryConfirmed:true,
    spfDkimDmarc:true,templates,recipient:'veli@example.com',reference,now});
  assert.deepEqual(complete.problems,[]);
  assert.equal(complete.receipt.recipientDomain,'example.com');
  assert.equal(complete.receipt.reference,reference);
  assert.equal(complete.receipt.personalDataIncluded,false);
  assert.ok(!JSON.stringify(complete.receipt).includes('veli@example.com'));
  assert.equal(checkEmailReceipt(complete.receipt,{now:now.getTime()}).ok,true);
});

test('recipient and reference rules reject test domains and personal data',()=>{
  assert.equal(emailDomain('a@b.co'),'b.co');
  assert.equal(emailDomain('not-an-address'),null);
  assert.equal(emailDomain('a@example.invalid'),'example.invalid');
  assert.equal(validReference('kisa'),false);
  assert.equal(validReference(reference),true);
  assert.equal(validReference('Veli veli@example.com onayladı'),false);
  assert.equal(validReference('Kayıt numarası 5551234567'),false);

  for(const recipient of ['veli@example.invalid','veli@test.internal','veli@localhost']){
    const {problems}=emailReceiptFrom({smtpVerified:true,providerAccepted:true,deliveryConfirmed:true,
      spfDkimDmarc:true,templates,recipient,reference,now});
    assert.ok(problems.length>0,recipient);
  }
});

test('the six template names cannot drift from the versioned e-mail subjects',()=>{
  const subjects=JSON.parse(readFileSync('supabase/templates/subjects.json','utf8'));
  assert.deepEqual(Object.keys(subjects).sort(),[...EMAIL_TEMPLATE_IDS].sort());
  assert.deepEqual(missingEmailTemplates(templates),[]);
  assert.deepEqual(missingEmailTemplates(templates.slice(1)),['confirm-sign-up']);
  assert.deepEqual(unknownEmailTemplates([...templates,'made-up']),['made-up']);
  const partial=emailReceiptFrom({smtpVerified:true,providerAccepted:true,deliveryConfirmed:true,
    spfDkimDmarc:true,templates:templates.slice(0,5),recipient:'veli@example.com',reference,now});
  assert.ok(partial.problems.some((problem:any)=>/confirm-sign-up|reauthentication|reset-password/.test(problem)));
  assert.equal(checkEmailReceipt(partial.receipt,{now:now.getTime()}).ok,false);
});

test('the test message carries no child, parent or credential data',()=>{
  const message=emailTestMessage({reference,now});
  assert.match(message.subject,/Bilsem Junior e-posta kabul testi/);
  assert.match(message.text,new RegExp(reference));
  assert.match(message.text,/çocuk veya veli verisi içermez/i);
  assert.ok(!JSON.stringify(message).includes('parent'));
  assert.ok(!JSON.stringify(message).includes('token'));
});

test('a Play receipt needs all four device flows, their own references, environment and version',()=>{
  const base={environment:'license-test',appVersion:'1.6.0',catalogVerified:true,
    devicePurchase:true,restore:true,renewal:true,cancellation:true,
    purchaseRef:reference,restoreRef:`${reference}-R`,renewalRef:`${reference}-Y`,cancellationRef:`${reference}-I`,now};
  const complete=playReceiptFrom(base);
  assert.deepEqual(complete.problems,[]);
  assert.equal(complete.receipt.purchase.verified,true);
  assert.equal(complete.receipt.cancellation.verified,true);
  assert.equal(checkPlayReceipt(complete.receipt,{now:now.getTime()}).ok,true);

  for(const key of ['devicePurchase','restore','renewal','cancellation'] as const){
    const partial=playReceiptFrom({...base,[key]:false});
    assert.ok(partial.problems.length>0,key);
    assert.equal(checkPlayReceipt(partial.receipt,{now:now.getTime()}).ok,false,key);
  }
  for(const key of ['purchaseRef','restoreRef','renewalRef','cancellationRef'] as const){
    const partial=playReceiptFrom({...base,[key]:'kisa'});
    assert.ok(partial.problems.some((problem:any)=>/kanıt referansı/.test(problem)),key);
    assert.equal(checkPlayReceipt(partial.receipt,{now:now.getTime()}).ok,false,key);
  }
  assert.ok(playReceiptFrom({...base,environment:'preview'}).problems.some((problem:any)=>/Ortam/.test(problem)));
  assert.ok(playReceiptFrom({...base,appVersion:'1'}).problems.some((problem:any)=>/sürüm/.test(problem)));
  assert.ok(playReceiptFrom({...base,catalogVerified:false}).problems.some((problem:any)=>/katalo/.test(problem)));
});

test('the purchase token is reduced to a comparable fingerprint and never stored',()=>{
  const token='abc1234567890123456789xyz';
  const fingerprint=tokenFingerprint(token);
  assert.equal(fingerprint?.length,16);
  assert.equal(fingerprint,tokenFingerprint(token));
  assert.notEqual(fingerprint,tokenFingerprint(`${token}0`));
  assert.equal(tokenFingerprint('short'),null);
  const {receipt}=playReceiptFrom({environment:'license-test',appVersion:'1.6.0',catalogVerified:true,
    devicePurchase:true,restore:true,renewal:true,cancellation:true,token,
    purchaseRef:reference,restoreRef:`${reference}-R`,renewalRef:`${reference}-Y`,cancellationRef:`${reference}-I`,now});
  assert.equal(receipt.tokenFingerprint,fingerprint);
  assert.ok(!JSON.stringify(receipt).includes(token));
});

test('subscription summaries expose only state, product and expiry',()=>{
  const summary=summarizeSubscription({subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    lineItems:[{productId:'zekapark_uyelik',expiryTime:'2026-12-01T00:00:00Z',autoRenewingPlan:{}}],latestOrderId:'GPA.1234-private'});
  assert.deepEqual(summary,{active:true,state:'SUBSCRIPTION_STATE_ACTIVE',productId:'zekapark_uyelik',expiryTime:'2026-12-01T00:00:00Z',acknowledged:true});
  assert.ok(!JSON.stringify(summary).includes('GPA.1234'));
  assert.equal(summarizeSubscription({subscriptionState:'SUBSCRIPTION_STATE_CANCELED'}).active,false);
  assert.equal(summarizeSubscription({subscriptionState:'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'}).active,true);
  assert.equal(summarizeSubscription(null).active,false);
});
