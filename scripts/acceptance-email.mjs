import {randomUUID} from 'node:crypto';
import {writeFile,appendFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {EMAIL_TEMPLATE_IDS,missingEmailTemplates,unknownEmailTemplates} from '../shared/email-templates.mjs';

/**
 * Real e-mail acceptance. A provider accepting the message is not proof that
 * a parent received it, so this tool separates the two: SMTP verification and
 * provider acceptance are measured, delivery is only recorded when the
 * operator confirms a real inbox and supplies a ticket reference.
 *
 * The receipt never contains the address, message body, password or messageId.
 */

export const EMAIL_RECEIPT_FORMAT='bilsem-email-acceptance-v1';
export const REQUIRED_TEMPLATES=EMAIL_TEMPLATE_IDS.length;

/** @param {any} value @returns {string|null} */
export function emailDomain(value){
 const match=/^[^@\s]+@([^@\s]+\.[^@\s]+)$/.exec(String(value||'').trim());
 return match?.[1].toLowerCase()||null;
}

/** @param {any} value @returns {boolean} */
export function validReference(value){
 const text=String(value||'').trim();
 return text.length>=12&&!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text)&&!/\b\d{10,}\b/.test(text);
}

/**
 * Pure receipt builder: every claim needs its own evidence flag.
 * @param {any} [options] @returns {any}
 */
export function emailReceiptFrom(options={}){
 const {
 smtpVerified=false,providerAccepted=false,deliveryConfirmed=false,spfDkimDmarc=false,
 templates=[],recipient='',reference='',now=new Date(),
 }=options;
 const delivered=[...new Set((Array.isArray(templates)?templates:[]).map(value=>String(value)))];
 const missingTemplates=missingEmailTemplates(delivered);
 const unrecognisedTemplates=unknownEmailTemplates(delivered);
 const domain=emailDomain(recipient);
 const problems=[];
 if(!smtpVerified)problems.push('SMTP kimlik doğrulaması yapılmadı.');
 if(!providerAccepted)problems.push('Sunucu test iletisini kabul etmedi.');
 if(!deliveryConfirmed)problems.push('Gerçek gelen kutusunda teslim operatör tarafından doğrulanmadı.');
 if(!spfDkimDmarc)problems.push('SPF/DKIM/DMARC doğrulanmadı.');
 if(missingTemplates.length)problems.push(`Şu e-posta şablonlarının teslimi doğrulanmadı: ${missingTemplates.join(', ')}.`);
 if(unrecognisedTemplates.length)problems.push(`Tanınmayan e-posta şablonu verildi: ${unrecognisedTemplates.join(', ')}.`);
 if(!domain)problems.push('Gerçek alıcı adresi yok.');
 else if(/\.(invalid|test|internal|example|local)$/i.test(domain)||domain.endsWith('.local'))problems.push('Alıcı alanı gerçek teslimi kanıtlayamaz.');
 if(!validReference(reference))problems.push('En az 12 karakterlik, kişisel veri içermeyen kanıt referansı gerekli.');
 return {
  receipt:{
   format:EMAIL_RECEIPT_FORMAT,
   checkedAt:now.toISOString(),
   smtpVerified,providerAccepted,deliveryConfirmed,spfDkimDmarc,
   templates:delivered.length,
   deliveredTemplates:delivered,
   recipientDomain:domain,
   reference:String(reference||'').trim(),
   personalDataIncluded:false,
  },
  problems,
 };
}

/** @param {any} [options] @returns {any} */
export function emailTestMessage(options={}){
 const {reference,now=new Date()}=options;
 const id=randomUUID();
 return {
  subject:`Bilsem Junior e-posta kabul testi · ${now.toISOString().slice(0,10)} · ${id.slice(0,8)}`,
  text:[
   'Bu ileti Bilsem Junior e-posta teslim kabul testidir.',
   `Kayıt numarası: ${id}`,
   `Kanıt referansı: ${reference||'(girilmedi)'}`,
   'Bu iletiyi gerçek bir gelen kutusunda gördüyseniz teslim doğrulanabilir.',
   'Bu ileti çocuk veya veli verisi içermez.',
  ].join('\n'),
  html:`<p>Bu ileti Bilsem Junior e-posta teslim kabul testidir.</p><p>Kayıt numarası: <code>${id}</code></p><p>Çocuk veya veli verisi içermez.</p>`,
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
 const recipient=value('--to')||'';
 const reference=value('--reference')||'';
 const output=value('--output')||'ops/evidence/email-acceptance.json';
 if(!recipient){console.error('Gerçek alıcı adresi gerekli: --to <adres>. Hiçbir ileti gönderilmedi.');process.exitCode=1;}
 else{
  const host=process.env.SMTP_HOST||'',port=Number(process.env.SMTP_PORT)||587,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM||user;
  if(!host||!user||!pass){console.error('SMTP_HOST, SMTP_USER ve SMTP_PASS gerekli. Hiçbir ileti gönderilmedi.');process.exitCode=1;}
  else{
   let smtpVerified=false,providerAccepted=false;
   try{
    const {default:nodemailer}=await import('nodemailer');
    const transporter=nodemailer.createTransport({host,port,secure:port===465,auth:{user,pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000});
    await transporter.verify();
    smtpVerified=true;
    const message=emailTestMessage({reference,now:new Date()});
    await transporter.sendMail({from:from||user,to:recipient,...message});
    providerAccepted=true;
    console.log('SMTP doğrulandı ve test iletisi sağlayıcı tarafından kabul edildi. Gerçek gelen kutusunu kontrol edin.');
   }catch(error){
    console.error(`E-posta kabul testi tamamlanmadı (${smtpVerified?'gönderim':'SMTP bağlantısı'}). Parola veya sunucu ayrıntısı yazılmadı.`);
   }
   const templates=args.flatMap((arg,index)=>arg==='--template'&&args[index+1]?[args[index+1]]:[]);
   const {receipt,problems}=emailReceiptFrom({
    smtpVerified,providerAccepted,
    deliveryConfirmed:args.includes('--delivery-confirmed'),
    spfDkimDmarc:args.includes('--spf-dkim-dmarc'),
    templates,
    recipient,reference,now:new Date(),
   });
   await mkdir(path.dirname(output),{recursive:true});
   await writeFile(output,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
   if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### E-posta kabul testi\n\n${problems.length?problems.map(problem=>`- ${problem}`).join('\n'):'Tüm koşullar sağlandı.'}\n\nAlıcı adresi, parola ve ileti içeriği kayda yazılmadı.\n`);
   console.log(`Kayıt yazıldı: ${output}`);
   if(problems.length){for(const problem of problems)console.error(`- ${problem}`);process.exitCode=1;}
  }
 }
}
