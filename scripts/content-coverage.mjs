import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {LESSON_CATALOG} from '../src/features/lessons/catalog.ts';
import {lessonDocument} from '../server/lesson-content.ts';
import {STEPS_PER_LESSON} from './voice-recording-kit.mjs';

/**
 * Read-only coverage of the two content obligations that cannot be inferred
 * from automated checks: real human narration and individual educator review.
 * Only counts and lesson identifiers leave this module, never question bodies,
 * answer keys, narrator identities or child data.
 */

export const VOICE_COVERAGE_FORMAT='bilsem-voice-coverage-v1';
export const REVIEW_COVERAGE_FORMAT='bilsem-educator-review-v1';

/** @returns {Record<string,number|null>} */
export function currentLessonVersions(){
 return Object.fromEntries(LESSON_CATALOG.map(card=>[card.id,lessonDocument(card.id)?.version??null]));
}

/** @param {any} rows @param {any} [options] @returns {any} */
export function summarizeVoice(rows,{now=new Date(),versions=currentLessonVersions()}={}){
 const expected=Object.keys(versions).filter(id=>versions[id]!==null);
 const covered=new Map();
 for(const row of rows||[]){
  const lessonId=String(row?.lesson_id||''),step=Number(row?.step);
  if(!/^[a-z0-9_]{1,60}$/.test(lessonId)||!Number.isInteger(step)||step<0||step>=STEPS_PER_LESSON)continue;
  if(versions[lessonId]===undefined||versions[lessonId]===null)continue;
  if(Number(row?.lesson_version)!==versions[lessonId])continue;
  if(row?.human_recording!==true||typeof row?.object_path!=='string'||!row.object_path)continue;
  covered.set(`${lessonId}:${step}`,true);
 }
 const missing=expected.flatMap(lessonId=>Array.from({length:STEPS_PER_LESSON},(_,step)=>`${lessonId}:${step}`))
  .filter(key=>!covered.has(key));
 return {
  format:VOICE_COVERAGE_FORMAT,
  checkedAt:now.toISOString(),
  expectedSteps:expected.length*STEPS_PER_LESSON,
  humanRecordedSteps:covered.size,
  missingSteps:missing,
  lessonsWithoutAnyRecording:expected.filter(lessonId=>Array.from({length:STEPS_PER_LESSON},(_,step)=>`${lessonId}:${step}`).every(key=>!covered.has(key))),
  nextAction:missing.length?'Eksik adımları /admin → Ses kayıtları bölümünden gerçek insan kaydıyla yükleyin.':'Tüm ders adımlarında gerçek insan kaydı var.',
  personalDataIncluded:false,
 };
}

/** @param {any} rows @param {any} [options] @returns {any} */
export function summarizeReview(rows,{now=new Date()}={}){
 const published=(rows||[]).filter(row=>row?.status===undefined||row.status==='published');
 const individuallyReviewed=published.filter(row=>{
  const reviewedBy=typeof row?.reviewedBy==='string'?row.reviewedBy.trim():String(row?.reviewed_by||'').trim();
  const humanReview=row?.humanReview??row?.releaseAuthorization?.individualHumanReview;
  return reviewedBy.length>0&&String(humanReview).toLowerCase()!=='false';
 });
 return {
  format:REVIEW_COVERAGE_FORMAT,
  checkedAt:now.toISOString(),
  published:{total:published.length,individuallyReviewed:individuallyReviewed.length,missing:published.length-individuallyReviewed.length},
  nextAction:published.length&&individuallyReviewed.length===published.length
   ?'Yayımlanmış her soruda bireysel eğitmen kaydı var.'
   :'Yayımlanmış soruları Eğitmen Onayı kuyruğundan tek tek inceleyip kaydedin; otomatik denetim bu kaydın yerine geçmez.',
  personalDataIncluded:false,
 };
}

/** Paginated read-only fetch. The service role key never leaves the process. */
async function readAll(client,table,select,{order='id',build}={}){
 const rows=[];const pageSize=1000;
 for(let page=0;page<50;page++){
  let query=client.from(table).select(select).order(order).range(page*pageSize,page*pageSize+pageSize-1);
  if(build)query=build(query);
  const {data,error}=await query;
  if(error)throw Error(`${table} kapsamı okunamadı.`);
  rows.push(...(data||[]));
  if((data||[]).length<pageSize)break;
 }
 return rows;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const value=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null;};
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){
  console.error('İçerik kapsamı için sunucuya özel SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli. Hiçbir kayıt okunmadı ve başarı kaydı yazılmadı.');
  process.exitCode=1;
 }else{
  try{
   const {getServiceClient}=await import('../server/supabase-admin.ts');
   const client=getServiceClient();
   const audio=await readAll(client,'lesson_audio','lesson_id,lesson_version,step,human_recording,object_path',{order:'lesson_id'});
   // Archive history must not stand in for the current bank.
   const questions=await readAll(client,'questions','id,status,reviewedBy:data->>reviewedBy,humanReview:data->releaseAuthorization->>individualHumanReview',{order:'id',build:query=>query.eq('status','published')});
   const voice=summarizeVoice(audio);
   const review=summarizeReview(questions);
   const dir=value('--dir')||'ops/evidence';
   await mkdir(path.resolve(dir),{recursive:true});
   await writeFile(path.resolve(dir,'voice-coverage.json'),JSON.stringify(voice,null,2)+'\n',{mode:0o600});
   await writeFile(path.resolve(dir,'educator-review.json'),JSON.stringify(review,null,2)+'\n',{mode:0o600});
   console.log(`İnsan sesi: ${voice.humanRecordedSteps}/${voice.expectedSteps} adım.`);
   console.log(`Eğitmen incelemesi: ${review.published.individuallyReviewed}/${review.published.total} yayımlanmış soru.`);
   console.log(`Kayıtlar ${dir} altına yazıldı; soru gövdesi, cevap anahtarı veya kişisel veri içermez.`);
  }catch(error){
   console.error(error instanceof Error?error.message:'İçerik kapsamı okunamadı.');
   process.exitCode=1;
  }
 }
}
