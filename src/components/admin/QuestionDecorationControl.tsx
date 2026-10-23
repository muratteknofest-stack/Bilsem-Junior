import React,{useEffect,useState} from 'react';import {z} from 'zod';import type {BaseQuestion} from '../../types';import {authenticatedFetch} from '../../lib/api-client';
const schema=z.object({id:z.uuid(),status:z.literal('draft'),previewPath:z.string().regex(/^\/api\/admin\/question-visual-assets\/[0-9a-f-]+\/content$/),sha256:z.string().length(64)});
export function QuestionDecorationControl({question,configured}:{question:BaseQuestion;configured:boolean}){
 const [image,setImage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>()=>{if(image)URL.revokeObjectURL(image);},[image]);
 const generate=async()=>{setBusy(true);setError('');try{
  const response=await authenticatedFetch('/api/admin/question-decoration',{method:'POST',body:JSON.stringify({questionId:question.id,expectedRevision:question.revision||0})});if(!response.ok)throw Error('Görsel üretilemedi veya kaydı doğrulanamadı.');const asset=schema.parse(await response.json());
  const preview=await authenticatedFetch(asset.previewPath);if(!preview.ok)throw Error('Özel görsel önizlemesi yüklenemedi.');const blob=await preview.blob();setImage(URL.createObjectURL(blob));
 }catch(e){setError(e instanceof Error?e.message:'Görsel üretilemedi.');}finally{setBusy(false);}};
 return <section className="space-y-2 rounded-xl border border-slate-700 p-3"><h4>AI süsleme görseli · özel taslak</h4><p>Matematiksel sahne ve cevap seçeneklerinden ayrıdır. Üretim API ücreti doğurabilir. Otomatik yayımlanmaz.</p><button disabled={!configured||busy} onClick={generate} className="rounded-lg bg-indigo-800 px-3 py-2 disabled:opacity-50">{busy?'Üretiliyor ve kaydediliyor…':image?'Yeni süsleme taslağı üret':'Süsleme taslağı üret'}</button>{!configured&&<p>Sunucuda OPENAI_API_KEY ve AI_IMAGE_MODEL tanımlanmalı.</p>}{error&&<p role="alert">{error}</p>}{image&&<img src={image} alt="Onay bekleyen dekoratif hikâye görseli" className="w-full max-w-sm rounded-xl"/>}</section>;
}
