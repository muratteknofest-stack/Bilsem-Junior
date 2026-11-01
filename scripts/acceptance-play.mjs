import {createHash} from 'node:crypto';
import {writeFile,appendFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validReference} from './acceptance-email.mjs';

/**
 * Google Play acceptance receipt. Device flows cannot be automated: the
 * licence tester must see the test payment sheet, the entitlement and the
 * restore. This tool verifies the server side (catalog, optional purchase
 * token) and records the device confirmations with separate references.
 *
 * The purchase token is never written anywhere; only a short hash prefix is
 * kept so two receipts can be compared without exposing the token.
 */

export const PLAY_RECEIPT_FORMAT='bilsem-play-acceptance-v1';

/** @param {any} token @returns {string|null} */
export function tokenFingerprint(token){
 const text=String(token||'');
 return text.length>=20?createHash('sha256').update(text).digest('hex').slice(0,16):null;
}

/** @param {any} [options] @returns {any} */
export function playReceiptFrom(options={}){
 const {
 environment='',appVersion='',catalogVerified=false,serverTokenValidated=false,token='',
 devicePurchase=false,restore=false,renewal=false,cancellation=false,
 purchaseRef='',restoreRef='',renewalRef='',cancellationRef='',now=new Date(),
 }=options;
 const problems=[];
 if(!['license-test','production'].includes(environment))problems.push('Ortam license-test veya production olmalı.');
 if(String(appVersion).trim().length<3)problems.push('Uygulama sürümü gerekli.');
 if(!catalogVerified)problems.push('Google Play ürün kataloğu doğrulanmadı.');
 if(!devicePurchase)problems.push('Gerçek cihazda satın alma operatör tarafından doğrulanmadı.');
 if(!validReference(purchaseRef))problems.push('Satın alma için en az 12 karakterlik kanıt referansı gerekli.');
 if(!restore)problems.push('Geri yükleme gerçek cihazda doğrulanmadı.');
 if(!validReference(restoreRef))problems.push('Geri yükleme için en az 12 karakterlik kanıt referansı gerekli.');
 if(!renewal)problems.push('Yenileme akışı doğrulanmadı.');
 if(!validReference(renewalRef))problems.push('Yenileme için en az 12 karakterlik kanıt referansı gerekli.');
 if(!cancellation)problems.push('İptal/iade akışı doğrulanmadı.');
 if(!validReference(cancellationRef))problems.push('İptal/iade için en az 12 karakterlik kanıt referansı gerekli.');
 return {
  receipt:{
   format:PLAY_RECEIPT_FORMAT,
   checkedAt:now.toISOString(),
   environment,appVersion:String(appVersion).trim(),
   catalogVerified,serverTokenValidated,tokenFingerprint:tokenFingerprint(token),
   purchase:{verified:Boolean(catalogVerified&&devicePurchase&&validReference(purchaseRef)),reference:String(purchaseRef||'').trim()},
   restore:{verified:Boolean(restore&&validReference(restoreRef)),reference:String(restoreRef||'').trim()},
   renewal:{verified:Boolean(renewal&&validReference(renewalRef)),reference:String(renewalRef||'').trim()},
   cancellation:{verified:Boolean(cancellation&&validReference(cancellationRef)),reference:String(cancellationRef||'').trim()},
   personalDataIncluded:false,
  },
  problems,
 };
}

/** Subscription v2 response -> the few non-sensitive fields a receipt needs. */
/** @param {any} raw @returns {any} */
export function summarizeSubscription(raw){
 const state=typeof raw?.subscriptionState==='string'?raw.subscriptionState:'';
 const line=Array.isArray(raw?.lineItems)?raw.lineItems[0]:null;
 return {
  active:state==='SUBSCRIPTION_STATE_ACTIVE'||state==='SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  state:state||null,
  productId:typeof line?.productId==='string'?line.productId:null,
  expiryTime:typeof line?.expiryTime==='string'?line.expiryTime:null,
  acknowledged:raw?.acknowledgementState==='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
 const output=value('--output')||'ops/evidence/play-acceptance.json';
 try{
  const client=await import('../server/google-play-client.ts');
  const issues=client.playSetupIssues();
  if(issues.length){
   console.error(`Google Play sunucu ayarları eksik veya geçersiz: ${issues.join(', ')}. Değerler gösterilmedi ve kayıt yazılmadı.`);
   process.exitCode=1;
  }else{
   let catalogVerified=false;
   try{await client.verifyPlayCatalog();catalogVerified=true;}
   catch{console.error('Google Play ürün kataloğu (üç dönem) doğrulanamadı. Cihaz kabulü kaydı yazılmadı.');process.exitCode=1;}
   if(catalogVerified){
    let serverTokenValidated=false;
    const token=process.env.PLAY_TEST_PURCHASE_TOKEN||'';
    if(token){
     try{
      const summary=summarizeSubscription(await client.playRequest(token,'get'));
      serverTokenValidated=summary.active;
      console.log(`Sunucu satın alma doğrulaması: ${summary.active?'geçerli':'etkin değil'}${summary.state?` (${summary.state})`:''}.`);
     }catch{console.error('Satın alma tokenı sunucuda doğrulanamadı; token günlüğe yazılmadı.');}
    }else console.log('PLAY_TEST_PURCHASE_TOKEN verilmedi; yalnız cihaz beyanı kaydedilecek.');
    const {receipt,problems}=playReceiptFrom({
     environment:value('--environment')||'',appVersion:value('--app-version')||'',
     catalogVerified,serverTokenValidated,token,
     devicePurchase:args.includes('--device-purchase'),restore:args.includes('--restore'),
     renewal:args.includes('--renewal'),cancellation:args.includes('--cancellation'),
     purchaseRef:value('--purchase-ref')||'',restoreRef:value('--restore-ref')||'',
     renewalRef:value('--renewal-ref')||'',cancellationRef:value('--cancellation-ref')||'',
    });
    await mkdir(path.dirname(path.resolve(output)),{recursive:true});
    await writeFile(path.resolve(output),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Google Play kabul testi\n\n${problems.length?problems.map(problem=>`- ${problem}`).join('\n'):'Dört akış için kanıt kaydedildi.'}\n\nSatın alma tokenı ve müşteri verisi kayda yazılmadı.\n`);
    console.log(`Kayıt yazıldı: ${output}`);
    if(problems.length){for(const problem of problems)console.error(`- ${problem}`);process.exitCode=1;}
   }
  }
 }catch{
  console.error('Google Play kabul aracı çalıştırılamadı; hiçbir kayıt yazılmadı.');
  process.exitCode=1;
 }
}
