import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  REPORT_FORMAT,checkAndroidSigning,checkBackupReceipt,checkEducatorReview,checkEmailReceipt,checkPlayReceipt,checkVoiceCoverage,checkVoiceKit,
  closureSummary,evaluateClosure,registerItems,validateRegister,
} from '../scripts/release-closure.mjs';

const registerPath=resolve('ops/release-closure.json');
const rawRegister=()=>JSON.parse(readFileSync(registerPath,'utf8'));
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const iso=(offsetMs:number)=>new Date(Date.now()+offsetMs).toISOString();

function liveItems(register:any){return Object.values(register.areas).flatMap((area:any)=>area.items) as any[];}
function verifiedRegister(){
  const register=rawRegister();
  for(const item of liveItems(register)){
    item.status='verified';
    item.evidence='Kabul kaydı BJ-2026-0001, güvenli işletim kaydı';
    item.verifiedAt=iso(-86_400_000);
  }
  return register;
}

function receipts(){
  const kit=JSON.parse(readFileSync(resolve('content/voice/recording-kit.json'),'utf8'));
  const checkedAt=iso(-3_600_000);
  return {
    'backup-receipt':{verified:true,isolated:true,checkedAt},
    'storage-receipt':{format:'bilsem-storage-verification-v1',projectRef:'vtcsoqohkiagbwatlabk',verified:true,isolated:true,productionSource:true,checkedAt,buckets:3,objects:933,bytes:43562401,privateBuckets:3,filesVerified:true,bucketConfigVerified:true,ownershipVerified:true,clientAccessVerified:true,archiveSha256:'a'.repeat(64),sourceCatalogSha256:'b'.repeat(64)},
    'email-receipt':{smtpVerified:true,deliveryConfirmed:true,spfDkimDmarc:true,templates:6,deliveredTemplates:['confirm-sign-up','invite-user','magic-link-or-otp','change-email-address','reset-password','reauthentication'],checkedAt,recipientDomain:'gmail.com'},
    'play-receipt':{purchase:{verified:true},restore:{verified:true},renewal:{verified:true},cancellation:{verified:true},
      environment:'license-test',appVersion:'1.6.0',checkedAt},
    'voice-kit':kit,
    'voice-coverage':{expectedSteps:72,humanRecordedSteps:72,checkedAt},
    'educator-review':{published:{total:8000,individuallyReviewed:8000},checkedAt},
    'android-signing':{format:'bilsem-android-signing-v1',signedAt:checkedAt,packageName:'com.quantumtech.bilsemjunior',
      versionCode:35,versionName:'1.0.34',debuggable:false,testOnly:false,cleartext:false,backup:false,
      uploadCertificateSha256:'a'.repeat(64),aabSignatureVerified:true,apkSignatureVerified:true,
      nativeDependencyPairs:12,files:{'Bilsem-Junior-1.0.34.aab':{bytes:100,sha256:'b'.repeat(64)},
      'Bilsem-Junior-1.0.34.apk':{bytes:100,sha256:'c'.repeat(64)}}},
  };
}

test('the committed register is structurally valid and starts with no fabricated evidence',()=>{
  const register=rawRegister();
  const {issues,items}=validateRegister(register);
  assert.deepEqual(issues,[]);
  assert.equal(items.length,29);
  assert.deepEqual([...new Set(items.map(item=>item.area))].sort(),['acceptance','android','backup','content','operations']);
  assert.ok(items.every(item=>item.status==='pending'&&item.evidence===''&&item.verifiedAt===null));
  assert.ok(items.every(item=>item.owner&&item.acceptance&&item.acceptance.length>=20));
});

test('a declaration without a receipt cannot pass an auto-checked item',()=>{
  const register=verifiedRegister();
  const report=evaluateClosure(register,{'backup-receipt':receipts()['backup-receipt'],'voice-kit':receipts()['voice-kit']});
  assert.equal(report.readyForCommercialRelease,false);
  assert.ok(report.issues.some(issue=>issue.code==='INCONSISTENT'&&issue.itemId==='accept.email-delivery'),
    'An e-mail claim without a receipt must be inconsistent');
  assert.ok(report.blocking.some((row:any)=>row.id==='accept.play-purchase'));
  const backup=report.areas.find(area=>area.area==='backup')!.items;
  assert.ok(backup.filter((row:any)=>row.autoCheck==='backup-receipt').every((row:any)=>row.verifiedBy==='machine'));
  assert.equal(backup.find((row:any)=>row.id==='backup.storage-objects')?.verifiedBy,null,'A database receipt cannot verify Storage recovery');
  assert.equal(backup.find((row:any)=>row.id==='backup.project-config')?.verifiedBy,'declaration','Provider configuration retains its separate real-world evidence obligation');
  assert.ok(backup.filter((row:any)=>!row.autoCheck).every((row:any)=>row.verifiedBy==='declaration'));
});

test('a complete register with valid receipts is the only way through the gate',()=>{
  const report=evaluateClosure(verifiedRegister(),receipts());
  assert.equal(report.format,REPORT_FORMAT);
  assert.deepEqual(report.issues,[]);
  assert.equal(report.readyForCommercialRelease,true);
  assert.equal(report.totals.verified,report.totals.items);
  assert.deepEqual(report.blocking,[]);
  assert.match(closureSummary(report),/HAZIR/);
});

test('short, placeholder, personal or future-dated evidence is rejected',()=>{
  const cases:[string,string][] = [
    ['kisa', 'EVIDENCE_REQUIRED'],
    ['TODO: sonra doldurulacak', 'EVIDENCE_PLACEHOLDER'],
    ['Örnek kayıt numarası', 'EVIDENCE_PLACEHOLDER'],
    ['Veli onayı veli@example.com ile alındı', 'EVIDENCE_PERSONAL'],
    ['Kayıt numarası 5551234567', 'EVIDENCE_PERSONAL'],
  ];
  for(const [evidence,code] of cases){
    const register=rawRegister();
    const item=liveItems(register)[0];
    item.status='verified';item.evidence=evidence;item.verifiedAt=iso(-1000);
    const {issues}=validateRegister(register);
    assert.ok(issues.some(issue=>issue.code===code),`${code} for ${evidence}`);
  }
  const future=rawRegister();
  const futureItem=liveItems(future)[0];
  futureItem.status='verified';futureItem.evidence='Kabul kaydı BJ-2026-0001';futureItem.verifiedAt=iso(86_400_000);
  assert.ok(validateRegister(future).issues.some(issue=>issue.code==='EVIDENCE_FUTURE'));

  const premature=rawRegister();
  liveItems(premature)[0].evidence='Kabul kaydı BJ-2026-0001';
  assert.ok(validateRegister(premature).issues.some(issue=>issue.code==='EVIDENCE_PREMATURE'));
});

test('stale or failed receipts never count as acceptance',()=>{
  const now=Date.now();
  assert.equal(checkBackupReceipt({verified:true,isolated:true,checkedAt:iso(-31*86_400_000)},{now}).ok,false);
  assert.equal(checkBackupReceipt({verified:true,isolated:false,checkedAt:iso(-1000)},{now}).ok,false);
  assert.equal(checkBackupReceipt({verified:false,isolated:true,checkedAt:iso(-1000)},{now}).ok,false);

  const delivered=['confirm-sign-up','invite-user','magic-link-or-otp','change-email-address','reset-password','reauthentication'];
  assert.equal(checkEmailReceipt({smtpVerified:true,deliveryConfirmed:false,spfDkimDmarc:true,templates:6,deliveredTemplates:delivered,checkedAt:iso(-1000),recipientDomain:'gmail.com'},{now}).ok,false);
  assert.equal(checkEmailReceipt({smtpVerified:true,deliveryConfirmed:true,spfDkimDmarc:true,templates:5,deliveredTemplates:delivered.slice(1),checkedAt:iso(-1000),recipientDomain:'gmail.com'},{now}).ok,false);
  assert.equal(checkEmailReceipt({smtpVerified:true,deliveryConfirmed:true,spfDkimDmarc:true,templates:6,deliveredTemplates:['confirm-sign-up','invite-user','magic-link-or-otp','change-email-address','reset-password','made-up'],checkedAt:iso(-1000),recipientDomain:'gmail.com'},{now}).ok,false);
  assert.equal(checkEmailReceipt({smtpVerified:true,deliveryConfirmed:true,spfDkimDmarc:true,templates:6,deliveredTemplates:delivered,checkedAt:iso(-1000),recipientDomain:'example.invalid'},{now}).ok,false);

  const play={purchase:{verified:true},restore:{verified:true},renewal:{verified:true},cancellation:{verified:true},environment:'license-test',appVersion:'1.6.0',checkedAt:iso(-1000)};
  assert.equal(checkPlayReceipt(play,{now}).ok,true);
  assert.equal(checkPlayReceipt({...play,cancellation:{verified:false}},{now}).ok,false);
  assert.equal(checkPlayReceipt({...play,environment:'preview'},{now}).ok,false);

  assert.equal(checkVoiceCoverage({expectedSteps:72,humanRecordedSteps:71,checkedAt:iso(-1000)},{now}).ok,false);
  assert.equal(checkVoiceCoverage({expectedSteps:72,humanRecordedSteps:72,checkedAt:iso(-91*86_400_000)},{now}).ok,false);
  assert.equal(checkEducatorReview({published:{total:8000,individuallyReviewed:7999},checkedAt:iso(-1000)},{now}).ok,false);
  assert.equal(checkEducatorReview({published:{total:0,individuallyReviewed:0},checkedAt:iso(-1000)},{now}).ok,false);
});

test('Android signing evidence must match the release identity, flags and pinned certificate',()=>{
  const now=Date.now();
  const valid={format:'bilsem-android-signing-v1',signedAt:iso(-86_400_000),packageName:'com.quantumtech.bilsemjunior',
    versionCode:35,versionName:'1.0.34',debuggable:false,testOnly:false,cleartext:false,backup:false,
    uploadCertificateSha256:'a'.repeat(64),aabSignatureVerified:true,apkSignatureVerified:true,nativeDependencyPairs:12,
    files:{'Bilsem-Junior-1.0.34.aab':{bytes:100,sha256:'b'.repeat(64)},'Bilsem-Junior-1.0.34.apk':{bytes:100,sha256:'c'.repeat(64)}}};
  assert.equal(checkAndroidSigning(valid,{now}).ok,true);
  for(const mutation of [
    {packageName:'com.example.other'},{debuggable:true},{testOnly:true},{cleartext:true},{backup:true},
    {uploadCertificateSha256:'not-a-digest'},{aabSignatureVerified:false},{apkSignatureVerified:false},
    {nativeDependencyPairs:0},{versionCode:0},{versionName:'1'},
    {files:{'Bilsem-Junior-1.0.34.aab':{bytes:100,sha256:'b'.repeat(64)}}},
    {files:{'Bilsem-Junior-1.0.34.aab':{bytes:0,sha256:'b'.repeat(64)}}},
    {signedAt:iso(-91*86_400_000)},{signedAt:undefined},
  ])assert.equal(checkAndroidSigning({...valid,...mutation},{now}).ok,false,JSON.stringify(mutation));
  assert.equal(checkAndroidSigning(valid,{now}).items.includes('android.signed-release'),true);
});

test('the voice kit receipt is tied to the current lesson content',()=>{
  const kit=JSON.parse(readFileSync(resolve('content/voice/recording-kit.json'),'utf8'));
  assert.equal(checkVoiceKit(kit).ok,true);
  const broken=clone(kit);broken.lessons[0].steps.pop();
  assert.equal(checkVoiceKit(broken).ok,false);
  const stale=clone(kit);stale.generatedAt='2015-01-01T00:00:00.000Z';
  assert.equal(checkVoiceKit(stale).ok,false);
});

test('register shape errors are reported instead of being silently accepted',()=>{
  const broken=rawRegister();
  broken.format='other';
  broken.areas.backup.items[0].id='wrong.id';
  broken.areas.operations.items[0].status='done';
  broken.areas.content.items[0].owner='';
  const codes=validateRegister(broken).issues.map(issue=>issue.code);
  for(const code of ['REGISTER_FORMAT','ITEM_AREA','ITEM_STATUS','ITEM_OWNER'])assert.ok(codes.includes(code),code);
  const duplicated=rawRegister();
  duplicated.areas.content.items.push({...duplicated.areas.content.items[0]});
  assert.ok(validateRegister(duplicated).issues.some(issue=>issue.code==='ITEM_DUPLICATE'));
});

test('a justified not-applicable item closes without pretending it was performed',()=>{
  const register=verifiedRegister();
  register.areas.operations.items.push({id:'ops.optional-sms',label:'Opsiyonel SMS sağlayıcısının inceleme kaydı',owner:'Teknik sorumlu',acceptance:'Yalnız SMS sağlayıcısı kullanılan projelerde sözleşme ve teslim kabulü gereklidir.',status:'not_applicable',evidence:'SMS sağlayıcısı kullanılmıyor, kapsam kararı BJ-2026-0042',verifiedAt:iso(-1000)});
  const report=evaluateClosure(register,receipts());
  assert.deepEqual(report.issues,[]);
  assert.equal(report.readyForCommercialRelease,true);
  const row=report.areas.find((area:any)=>area.area==='operations')!.items.find((item:any)=>item.id==='ops.optional-sms')!;
  assert.equal(row.verifiedBy,'declaration');
  assert.equal(row.notApplicable,true);
  assert.match(closureSummary(report),/BEYAN \(N\/A\)/);
});

test('not-applicable needs a justification and may never replace a machine check',()=>{
  const register=verifiedRegister();
  const storage=register.areas.backup.items.find((item:any)=>item.id==='backup.storage-objects');
  storage.status='not_applicable';
  storage.evidence='';
  assert.ok(validateRegister(register).issues.some(issue=>issue.code==='EVIDENCE_REQUIRED'&&issue.itemId==='backup.storage-objects'));
  storage.evidence='veli@example.com adresine soruldu';
  storage.verifiedAt=iso(-86_400_000);
  assert.ok(validateRegister(register).issues.some(issue=>issue.code==='EVIDENCE_PERSONAL'&&issue.itemId==='backup.storage-objects'));
  storage.evidence='Kapsam dışı bırakıldı, karar BJ-2026-0042';
  const signed=register.areas.android.items.find((item:any)=>item.id==='android.signed-release')!;
  signed.status='not_applicable';
  signed.evidence='İmza gerekmeyecek, karar BJ-2026-0043';
  const report=evaluateClosure(register,receipts());
  assert.equal(report.readyForCommercialRelease,false);
  assert.ok(report.issues.some(issue=>issue.code==='AUTO_NOT_APPLICABLE'&&issue.itemId==='android.signed-release'));
  const row=report.areas.find((area:any)=>area.area==='android')!.items.find((item:any)=>item.id==='android.signed-release')!;
  assert.equal(row.verifiedBy,null);
});
