import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {EMAIL_TEMPLATE_IDS,missingEmailTemplates} from '../shared/email-templates.mjs';

/**
 * Release closure gate. It answers a narrow question: does every remaining
 * commercial-release obligation have evidence that a second person could
 * inspect? Declarations are accepted for legal/organisational work. Where a
 * machine receipt exists, the declaration alone is not enough: a claimed
 * "tested" item without a valid receipt blocks the release.
 *
 * Nothing in the register or the receipts may contain personal data,
 * credentials or purchase tokens.
 */

export const REGISTER_FORMAT='bilsem-release-closure-v1';
export const REPORT_FORMAT='bilsem-release-closure-report-v1';
export const RECEIPTS={
 'backup-receipt':['bilsem-backup-verification-v1','legacy-backup-verification'],
 'storage-receipt':['bilsem-storage-verification-v1'],
 'email-receipt':['bilsem-email-acceptance-v1'],
 'play-receipt':['bilsem-play-acceptance-v1'],
 'voice-kit':['bilsem-voice-recording-kit-v1'],
 'voice-coverage':['bilsem-voice-coverage-v1'],
 'educator-review':['bilsem-educator-review-v1'],
 'android-signing':['bilsem-android-signing-v1'],
};
export const AUTO_CHECK_ITEMS={
 'backup-receipt':['backup.daily-run','backup.isolated-restore'],
 'storage-receipt':['backup.storage-objects'],
 'email-receipt':['accept.email-delivery'],
 'play-receipt':['accept.play-purchase','accept.play-restore','accept.play-renewal','accept.play-cancellation'],
 'voice-kit':['content.voice-scripts'],
 'voice-coverage':['content.voice-recordings'],
 'educator-review':['content.educator-review'],
 'android-signing':['android.signed-release'],
};
const AREA_IDS=['backup','operations','acceptance','content','android'];
const AREA_PREFIX={backup:'backup',operations:'ops',acceptance:'accept',content:'content',android:'android'};
const STATUSES=['pending','verified','blocked','not_applicable'];
const DAY=86_400_000;
const PLACEHOLDER=/todo|tbd|placeholder|örnek|example|kanıt yok|belirsiz|\bxxx\b/i;
const PERSONAL=/[\w.+-]+@[\w-]+\.[a-z]{2,}|\b\d{10,}\b|sbp_[a-f0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}/i;

const fail=(itemId,code,message)=>({itemId,code,message});

export function registerItems(register){
 return AREA_IDS.flatMap(area=>(register?.areas?.[area]?.items||[]).map(item=>({...item,area})));
}

/** Structural and evidentiary rules for the operator register itself. */
export function validateRegister(register,{now=Date.now()}={}){
 const issues=[];
 if(register?.format!==REGISTER_FORMAT)issues.push(fail(null,'REGISTER_FORMAT','Kayıt dosyası biçimi tanınmadı.'));
 if(!Number.isFinite(Date.parse(`${register?.updatedAt}T00:00:00Z`)))issues.push(fail(null,'REGISTER_DATE','Kayıt güncelleme tarihi geçersiz.'));
 const ids=new Set();
 for(const area of AREA_IDS){
  if(!register?.areas?.[area]?.items?.length)issues.push(fail(null,'AREA_MISSING',`${area} alanında kayıt yok.`));
 }
 for(const item of registerItems(register)){
  if(!item.id||typeof item.id!=='string')issues.push(fail(null,'ITEM_ID','Kaydın kimliği yok.'));
  else if(ids.has(item.id))issues.push(fail(item.id,'ITEM_DUPLICATE','Kayıt kimliği tekrar ediyor.'));
  else ids.add(item.id);
  if(!item.id?.startsWith(`${AREA_PREFIX[item.area]}.`))issues.push(fail(item.id,'ITEM_AREA','Kayıt kimliği alanıyla eşleşmiyor.'));
  if(!STATUSES.includes(item.status))issues.push(fail(item.id,'ITEM_STATUS','Kayıt durumu geçersiz.'));
  if(typeof item.label!=='string'||item.label.trim().length<8)issues.push(fail(item.id,'ITEM_LABEL','Kabul ölçütü adı eksik.'));
  if(typeof item.owner!=='string'||item.owner.trim().length<3)issues.push(fail(item.id,'ITEM_OWNER','Sorumlu kişi/rol eksik.'));
  if(typeof item.acceptance!=='string'||item.acceptance.trim().length<20)issues.push(fail(item.id,'ITEM_ACCEPTANCE','Kabul ölçütü açıklaması eksik.'));
  const evidence=typeof item.evidence==='string'?item.evidence.trim():'';
  if(item.status==='verified'||item.status==='not_applicable'){
   if(evidence.length<12)issues.push(fail(item.id,'EVIDENCE_REQUIRED',item.status==='not_applicable'
    ?'Uygulanamaz kayıt en az 12 karakterlik gerekçe referansı ister.'
    :'Doğrulanmış kayıt en az 12 karakterlik kanıt referansı ister.'));
   if(PLACEHOLDER.test(evidence))issues.push(fail(item.id,'EVIDENCE_PLACEHOLDER','Kanıt referansı yer tutucu metin içeriyor.'));
   if(evidence&&PERSONAL.test(evidence))issues.push(fail(item.id,'EVIDENCE_PERSONAL','Kanıt referansı kişisel veri veya sır içerebilir; maskeli kayıt numarası kullanın.'));
   if(!Number.isFinite(Date.parse(item.verifiedAt||'')))issues.push(fail(item.id,'EVIDENCE_DATE','Kaydın doğrulama veya karar tarihi geçersiz.'));
   else if(Date.parse(item.verifiedAt)>now+5*60_000)issues.push(fail(item.id,'EVIDENCE_FUTURE','Doğrulama veya karar tarihi gelecekte olamaz.'));
  }else if(item.status==='pending'&&evidence)issues.push(fail(item.id,'EVIDENCE_PREMATURE','Bekleyen kayıtta kanıt referansı bulunmamalı.'));
  if(item.status==='blocked'&&evidence)issues.push(fail(item.id,'EVIDENCE_BLOCKED','Engelli kayıtta tamamlanmış kanıt bulunmamalı.'));
 }
 return {issues,items:registerItems(register)};
}

function fresh(iso,{now,maxDays}){
 const time=Date.parse(iso||'');
 return Number.isFinite(time)&&time<=now+15*60_000&&now-time<=maxDays*DAY;
}

/** Each receipt returns {ok, detail, items}. A false `ok` never becomes a pass. */
export function checkBackupReceipt(receipt,{now=Date.now()}={}){
 const ok=receipt?.verified===true&&receipt?.isolated===true&&fresh(receipt?.checkedAt,{now,maxDays:30});
 return {ok,items:AUTO_CHECK_ITEMS['backup-receipt'],detail:ok
  ?'İzole geri yükleme doğrulaması geçerli ve 30 günden yeni.'
  :'İzole geri yükleme doğrulaması yok, geçersiz veya 30 günden eski.'};
}

export function checkStorageReceipt(receipt,{now=Date.now()}={}){
 const ok=receipt?.format==='bilsem-storage-verification-v1'&&receipt?.projectRef==='vtcsoqohkiagbwatlabk'
  &&receipt?.verified===true&&receipt?.isolated===true&&receipt?.productionSource===true
  &&['filesVerified','bucketConfigVerified','ownershipVerified','clientAccessVerified'].every(k=>receipt?.[k]===true)
  &&['buckets','objects','bytes','privateBuckets'].every(k=>Number.isSafeInteger(receipt?.[k])&&receipt[k]>=0)
  &&receipt.privateBuckets<=receipt.buckets&&/^[a-f0-9]{64}$/.test(receipt?.archiveSha256||'')
  &&/^[a-f0-9]{64}$/.test(receipt?.sourceCatalogSha256||'')&&fresh(receipt?.checkedAt,{now,maxDays:30});
 return {ok,items:AUTO_CHECK_ITEMS['storage-receipt'],detail:ok
  ?`${receipt.objects} Storage dosyası ve ${receipt.buckets} alan izole API ile geri yüklendi; hash, sahiplik ve erişim ayarları doğrulandı.`
  :'Storage kurtarma kanıtı eksik veya geçersiz; çalışma ortamı provası gerçek dosya geri yüklemesinin yerine geçmez.'};
}

export function checkEmailReceipt(receipt,{now=Date.now()}={}){
 const delivered=Array.isArray(receipt?.deliveredTemplates)?receipt.deliveredTemplates:[];
 const ok=receipt?.smtpVerified===true&&receipt?.deliveryConfirmed===true&&receipt?.spfDkimDmarc===true
  &&missingEmailTemplates(delivered).length===0&&Number(receipt?.templates)>=EMAIL_TEMPLATE_IDS.length
  &&fresh(receipt?.checkedAt,{now,maxDays:90})
  &&typeof receipt?.recipientDomain==='string'&&!/\.(invalid|test|internal|example)$/i.test(receipt.recipientDomain);
 return {ok,items:AUTO_CHECK_ITEMS['email-receipt'],detail:ok
  ?'SMTP, teslim, SPF/DKIM/DMARC ve altı şablon kaydı geçerli.'
  :'E-posta teslim kabulü eksik: SMTP, gerçek teslim, SPF/DKIM/DMARC ve altı şablonun adıyla teslimi birlikte gerekli.'};
}

export function checkPlayReceipt(receipt,{now=Date.now()}={}){
 const part=key=>receipt?.[key]?.verified===true;
 const ok=['purchase','restore','renewal','cancellation'].every(part)
  &&['license-test','production'].includes(receipt?.environment)
  &&typeof receipt?.appVersion==='string'&&receipt.appVersion.trim().length>=3
  &&fresh(receipt?.checkedAt,{now,maxDays:90});
 return {ok,items:AUTO_CHECK_ITEMS['play-receipt'],detail:ok
  ?'Satın alma, geri yükleme, yenileme ve iptal kabul kayıtları geçerli.'
  :'Google Play kabulü eksik: dört akış, ortam, uygulama sürümü ve tarih birlikte gerekli.'};
}

export function checkVoiceKit(kit,{now=Date.now()}={}){
 const lessons=Array.isArray(kit?.lessons)?kit.lessons:[];
 const ok=kit?.format==='bilsem-voice-recording-kit-v1'&&lessons.length>=18
  &&lessons.every(lesson=>Array.isArray(lesson.steps)&&lesson.steps.length===4
   &&lesson.steps.every(step=>typeof step.text==='string'&&step.text.trim().length>=20&&typeof step.file==='string'))
  &&fresh(kit?.generatedAt,{now,maxDays:730});
 return {ok,items:AUTO_CHECK_ITEMS['voice-kit'],detail:ok
  ?`${lessons.length} dersin dört adımı için kayıt metni hazır.`
  :'Kayıt metni kiti eksik veya ders içeriğiyle eşleşmiyor.'};
}

export function checkVoiceCoverage(report,{now=Date.now()}={}){
 const total=Number(report?.expectedSteps),human=Number(report?.humanRecordedSteps);
 const ok=Number.isInteger(total)&&Number.isInteger(human)&&total>=72&&human===total&&fresh(report?.checkedAt,{now,maxDays:90});
 return {ok,items:AUTO_CHECK_ITEMS['voice-coverage'],detail:ok
  ?`${human}/${total} adımda gerçek insan kaydı var.`
  :'İnsan sesi kayıtları tamamlanmadı veya kayıt kanıtı 90 günden eski.'};
}

export function checkEducatorReview(report,{now=Date.now()}={}){
 const total=Number(report?.published?.total),reviewed=Number(report?.published?.individuallyReviewed);
 const ok=Number.isInteger(total)&&total>0&&Number.isInteger(reviewed)&&reviewed===total&&fresh(report?.checkedAt,{now,maxDays:90});
 return {ok,items:AUTO_CHECK_ITEMS['educator-review'],detail:ok
  ?`${reviewed}/${total} yayımlanmış soru bireysel eğitmen incelemesinden geçti.`
  :'Yayımlanmış soruların tamamında bireysel eğitmen kaydı yok veya kanıt 90 günden eski.'};
}

export function checkAndroidSigning(receipt,{now=Date.now()}={}){
 const files=receipt?.files&&typeof receipt.files==='object'?receipt.files:{};
 const signed=Object.entries(files).filter(([name,value])=>{
  const row=value||{};
  return /\.(?:aab|apk)$/i.test(name)&&/^[a-f0-9]{64}$/.test(String(row.sha256||''))&&Number(row.bytes)>0;
 });
 const ok=receipt?.format==='bilsem-android-signing-v1'
  &&receipt?.packageName==='com.quantumtech.bilsemjunior'
  &&Number.isInteger(receipt?.versionCode)&&receipt.versionCode>0
  &&typeof receipt?.versionName==='string'&&receipt.versionName.trim().length>=3
  &&receipt?.debuggable===false&&receipt?.testOnly===false&&receipt?.cleartext===false&&receipt?.backup===false
  &&/^[a-f0-9]{64}$/.test(String(receipt?.uploadCertificateSha256||''))
  &&receipt?.aabSignatureVerified===true&&receipt?.apkSignatureVerified===true
  &&Number.isInteger(receipt?.nativeDependencyPairs)&&receipt.nativeDependencyPairs>=1
  &&signed.some(([name])=>/\.aab$/i.test(name))&&signed.some(([name])=>/\.apk$/i.test(name))
  &&fresh(receipt?.signedAt,{now,maxDays:90});
 return {ok,items:AUTO_CHECK_ITEMS['android-signing'],detail:ok
  ?'Üretim imzası, sabitlenmiş sertifika ve derleme bayrakları doğrulandı.'
  :'Android üretim imzası kanıtı yok, geçersiz veya 90 günden eski.'};
}

export const RECEIPT_CHECKS={
 'backup-receipt':checkBackupReceipt,'email-receipt':checkEmailReceipt,'play-receipt':checkPlayReceipt,
 'storage-receipt':checkStorageReceipt,
 'voice-kit':checkVoiceKit,'voice-coverage':checkVoiceCoverage,'educator-review':checkEducatorReview,
 'android-signing':checkAndroidSigning,
};

/**
 * Combines the register with the receipts. Machine evidence may verify a
 * pending item; it may never be contradicted by a verified declaration.
 */
export function evaluateClosure(register,receipts={},{now=Date.now()}={}){
 const {issues,items}=validateRegister(register,{now});
 const machine=new Map(),receiptDetails=[];
 for(const [kind,receipt] of Object.entries(receipts)){
  if(!receipt)continue;
  const check=RECEIPT_CHECKS[kind];
  if(!check)continue;
  const result=check(receipt,{now});
  receiptDetails.push({kind,ok:result.ok,detail:result.detail});
  for(const id of result.items)machine.set(id,result);
 }
 const rows=items.map(item=>{
  const notApplicable=item.status==='not_applicable';
  const auto=item.autoCheck?machine.get(item.id):undefined;
  const verifiedBy=item.autoCheck?(notApplicable?null:(auto?.ok?'machine':null))
   :(item.status==='verified'||notApplicable?'declaration':null);
  const inconsistent=Boolean(item.autoCheck&&item.status==='verified'&&!auto?.ok);
  if(item.autoCheck&&notApplicable)issues.push(fail(item.id,'AUTO_NOT_APPLICABLE',
   'Makine denetimli kayıt uygulanamaz olarak işaretlenemez; makbuz veya kaldırılmış kayıt gerekir.'));
  if(inconsistent)issues.push(fail(item.id,'INCONSISTENT',auto
   ?'Kayıt doğrulanmış görünüyor ancak makine kanıtı geçersiz.': 'Kayıt doğrulanmış görünüyor ancak makine kanıtı hiç sağlanmadı.'));
  return {
   id:item.id,area:item.area,label:item.label,owner:item.owner,status:item.status,
   verifiedBy,autoCheck:item.autoCheck||null,notApplicable,evidence:item.evidence||'',verifiedAt:item.verifiedAt||null,
   machineReady:auto?.ok===true,machineDetail:auto?.detail||null,inconsistent,
  };
 });
 const verified=rows.filter(row=>row.verifiedBy).length;
 const blocking=rows.filter(row=>!row.verifiedBy);
 return {
  format:REPORT_FORMAT,generatedAt:new Date(now).toISOString(),projectRef:register?.projectRef||null,
  totals:{items:rows.length,verified,pending:rows.length-verified,blocked:items.filter(item=>item.status==='blocked').length},
  readyForCommercialRelease:blocking.length===0&&issues.length===0,
  areas:AREA_IDS.map(area=>({area,label:register?.areas?.[area]?.label||area,
   items:rows.filter(row=>row.area===area)})),
  receipts:receiptDetails,
  issues,
  blocking:blocking.map(row=>({id:row.id,label:row.label,status:row.status,autoCheck:row.autoCheck})),
 };
}

export function closureSummary(report){
 const mark=row=>row.verifiedBy==='machine'?'MAKİNE'
  :row.verifiedBy==='declaration'?(row.notApplicable?'BEYAN (N/A)':'BEYAN'):'EKSİK';
 return `### Bilsem Junior yayın kapanışı\n\n`+
  `Sonuç: **${report.readyForCommercialRelease?'HAZIR':'HAZIR DEĞİL'}** · ${report.totals.verified}/${report.totals.items} kayıt kanıtlı · ${report.generatedAt}\n\n`+
  report.areas.map(area=>`**${area.label}**\n| Kayıt | Durum |\n|---|---|\n${area.items.map(row=>`| ${row.label} | ${mark(row)} |`).join('\n')}`).join('\n\n')+
  (report.issues.length?`\n\n**Sorunlar**\n${report.issues.map(issue=>`- ${issue.itemId||'kayıt'}: ${issue.message}`).join('\n')}`:'')+
  `\n\nKişisel veri, parola veya satın alma tokenı bu raporda bulunmaz.\n`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
 const read=async path=>{if(!path)return null;try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}};
 const register=await read(value('--register')||'ops/release-closure.json');
 if(!register){
  console.error('Yayın kapanış kaydı okunamadı.');
  process.exitCode=1;
 }else{
  const receipts={
   'backup-receipt':await read(value('--backup-receipt')),
   'storage-receipt':await read(value('--storage-receipt')),
   'email-receipt':await read(value('--email-receipt')),
   'play-receipt':await read(value('--play-receipt')),
   'voice-kit':await read(value('--voice-kit')||'content/voice/recording-kit.json'),
   'voice-coverage':await read(value('--voice-coverage')),
   'educator-review':await read(value('--educator-review')),
   'android-signing':await read(value('--android-receipt')),
  };
  const report=evaluateClosure(register,receipts);
  const output=value('--output')||'release-closure-report.json';
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,closureSummary(report));
  console.log(closureSummary(report));
  if(!report.readyForCommercialRelease){
   console.error(`Ticari yayın kapanışı tamamlanmadı: ${report.blocking.length} eksik kayıt, ${report.issues.length} sorun.`);
   process.exitCode=1;
  }
 }
}
