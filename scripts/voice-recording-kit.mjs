import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {LESSON_CATALOG} from '../src/features/lessons/catalog.ts';
import {lessonDocument} from '../server/lesson-content.ts';

/**
 * Batch recording kit for the lesson narrations. The admin panel uploads one
 * step at a time; a narrator needs the full script, the exact file names and
 * the rights metadata in one place. Every lesson has four teaching steps and
 * each step is one recording.
 */

export const VOICE_KIT_FORMAT='bilsem-voice-recording-kit-v1';
export const STEPS_PER_LESSON=4;
export const EXPECTED_LESSONS=LESSON_CATALOG.length;

/** @param {any} kit @returns {string} */
export function voiceKitHash(kit){
 const canonical={
  format:kit.format,
  lessons:kit.lessons.map(lesson=>({id:lesson.id,title:lesson.title,version:lesson.version,
   steps:lesson.steps.map(step=>({step:step.step,file:step.file,text:step.text}))})),
 };
 return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Turkish reading pace: roughly 13 characters per second, rounded up. */
/** @param {any} text @returns {number} */
export function estimatedSeconds(text){return Math.max(2,Math.ceil(text.trim().length/13));}

/** @param {any} [options] @returns {any} */
export function buildVoiceKit(options={}){
 const {now=new Date()}=options;
 const lessons=LESSON_CATALOG.map(card=>{
  const document=lessonDocument(card.id);
  if(!document)throw Error(`Ders içeriği bulunamadı: ${card.id}`);
  if(document.steps.length!==STEPS_PER_LESSON)throw Error(`Ders adım sayısı beklenenden farklı: ${card.id}`);
  return {
   id:card.id,
   title:card.title,
   group:card.group,
   version:document.version,
   steps:document.steps.map((step,index)=>({
    step:index,
    title:step.title,
    file:`${card.id}-v${document.version}-${index}.wav`,
    text:step.narration,
    characters:step.narration.length,
    estimatedSeconds:estimatedSeconds(step.narration),
   })),
  };
 });
 const steps=lessons.flatMap(lesson=>lesson.steps);
 const kit={
  format:VOICE_KIT_FORMAT,
  generatedAt:now.toISOString(),
  language:'tr-TR',
  direction:'Yetişkin, sıcak ve sakin bir öğretmen tonu. Acele etmeden, cümle sonlarında kısa duraklama. Abartılı çocuk sesi kullanılmaz.',
  technical:{
   format:'WAV (44.1 kHz, 16-bit, mono) veya MP3 (128 kbps ve üzeri)',
   maxBytes:3*1024*1024,
   naming:'<ders-kimliği>-v<dersSürümü>-<adım>.wav',
   upload:'/admin → Ses kayıtları → ders ve adım seç → dosya + anlatıcı + haklar referansı',
  },
  lessons,
  totals:{lessons:lessons.length,steps:steps.length,characters:steps.reduce((sum,step)=>sum+step.characters,0),
   estimatedMinutes:Math.ceil(steps.reduce((sum,step)=>sum+step.estimatedSeconds,0)/60)},
 };
 return {...kit,contentHash:voiceKitHash(kit)};
}

/** @param {any} kit @returns {string} */
export function kitMarkdown(kit){
 const lines=[
  '# İnsan sesi kayıt metinleri','',
  `Üretim: ${kit.generatedAt} · ${kit.totals.lessons} ders · ${kit.totals.steps} adım · yaklaşık ${kit.totals.estimatedMinutes} dakika`,'',
  '> Bu dosya ders içeriğinden üretilir; elle düzenlenmez. Metin değişirse yeniden üretin ve kayıtları güncelleyin.','',
  '## Kayıt kuralları','',
  `- ${kit.direction}`,
  `- Biçim: ${kit.technical.format}; dosya en fazla ${Math.round(kit.technical.maxBytes/1024/1024)} MB.`,
  `- Dosya adı: \`${kit.technical.naming}\` (örnek: \`visual_sequence-v1-0.wav\`)`,
  `- Yükleme: ${kit.technical.upload}`,
  '- Her yüklemede anlatıcı adı ve en az 12 karakterlik haklar/sözleşme referansı zorunludur. Gerçek insan kaydı onayı olmadan dosya kabul edilmez.','',
 ];
 for(const lesson of kit.lessons){
  lines.push(`## ${lesson.title}`, '', `Ders kimliği: \`${lesson.id}\` · sürüm ${lesson.version}`,'');
  for(const step of lesson.steps){
   lines.push(`### ${step.step+1}. adım — ${step.title}`,`Dosya: \`${step.file}\` · ${step.characters} karakter · ~${step.estimatedSeconds} sn`,'',`> ${step.text}`,'');
  }
 }
 return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const check=process.argv.includes('--check');
 const jsonPath=path.resolve('content/voice/recording-kit.json'),mdPath=path.resolve('docs/voice-recording-kit.md');
 const kit=buildVoiceKit();
 if(check){
  let existing=null;
  try{existing=JSON.parse(await readFile(jsonPath,'utf8'));}catch{}
  const fresh=existing&&existing.format===kit.format&&existing.contentHash===kit.contentHash;
  if(!fresh){
   console.error('Ses kayıt kiti ders içeriğiyle eşleşmiyor. `npm run voice:kit` ile yeniden üretin.');
   process.exitCode=1;
  }else console.log(`Ses kayıt kiti güncel: ${kit.totals.lessons} ders, ${kit.totals.steps} adım.`);
 }else{
  await mkdir(path.dirname(jsonPath),{recursive:true});
  await writeFile(jsonPath,JSON.stringify(kit,null,2)+'\n');
  await writeFile(mdPath,kitMarkdown(kit)+'\n');
  console.log(`Ses kayıt kiti yazıldı: ${kit.totals.steps} adım, yaklaşık ${kit.totals.estimatedMinutes} dakika.`);
 }
}
