import React,{useEffect,useState} from 'react';
import {Headphones,Upload} from 'lucide-react';
import {authenticatedFetch} from '../../lib/api-client';
import {LESSON_CATALOG,type LessonDocument} from '../../features/lessons/catalog';
interface Recording {lesson_id:string;lesson_version:number;step:number;narrator:string;rights_reference:string;bytes:number;updated_at:string;}
export function AdminLessonAudio(){
 const [id,setId]=useState<string>(LESSON_CATALOG[0].id),[step,setStep]=useState(0),[script,setScript]=useState<LessonDocument|null>(null),[records,setRecords]=useState<Recording[]>([]),[narrator,setNarrator]=useState(''),[rights,setRights]=useState(''),[confirmed,setConfirmed]=useState(false),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function list(){const r=await authenticatedFetch('/api/admin/lesson-audio');if(!r.ok)throw Error('Ses kayıtları yüklenemedi.');const v=await r.json();setRecords(v.recordings);}
 useEffect(()=>{void list().catch(e=>setError(e.message));},[]);
 useEffect(()=>{const controller=new AbortController();setScript(null);authenticatedFetch(`/api/admin/lesson-audio/${id}/script`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const v=await r.json();if(!controller.signal.aborted)setScript(v);}).catch(()=>{if(!controller.signal.aborted)setError('Anlatım metni yüklenemedi.');});return()=>controller.abort();},[id]);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function upload(e:React.FormEvent){e.preventDefault();if(!file||busy)return;setBusy(true);setError('');setNotice('');
  try {if(file.size>3*1024*1024)throw Error('Dosya en fazla 3 MB olmalı.');
   const r=await authenticatedFetch(`/api/admin/lesson-audio/${id}/${step}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream','X-Lesson-Metadata':encodeURIComponent(JSON.stringify({narrator,rightsReference:rights,humanRecording:confirmed}))},body:file});
   if(!r.ok){const v=await r.json();throw Error(v.error||'Ses kaydı kaydedilemedi.');}
   await list();setNotice('İnsan seslendirme kaydı bu anlatım adımına bağlandı. Öğrenci anlatımı yeniden açtığında yeni kaydı dinleyebilir.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Ses kaydı kaydedilemedi.');}finally{setBusy(false);}
 }
 const current=records.find(r=>r.lesson_id===id&&r.step===step&&r.lesson_version===script?.version);
 return <section className="space-y-4 rounded-2xl border bg-white p-5" aria-label="Konu anlatımı ses stüdyosu"><h3 className="flex items-center gap-2 text-lg font-bold"><Headphones size={21}/>Konu anlatımı ses stüdyosu</h3><p className="text-sm leading-6">{records.length} insan seslendirme kaydı yüklü. Metinleri gerçek bir anlatıcıya okutun; her adımı ayrı MP3/WAV dosyası olarak yükleyin. Lisans belgesini özel kayıtlarınızda saklayın. Buraya yalnız belge referansı yazın.</p>
  {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
  <form onSubmit={upload}><fieldset disabled={busy} className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">Anlatım konusu<select className="min-h-11 rounded-lg border p-3" value={id} onChange={e=>{setId(e.target.value);setNotice('');setFile(null);setConfirmed(false);}}>{LESSON_CATALOG.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
   <label className="grid gap-2 text-sm font-semibold">Anlatım adımı<select value={step} onChange={e=>{setStep(Number(e.target.value));setFile(null);setConfirmed(false);setNotice('');}} className="min-h-11 rounded-lg border p-3">{[0,1,2,3].map(n=><option value={n} key={n}>{n+1}. adım{script?` · ${script.steps[n].title}`:''}</option>)}</select></label>
   {script&&<label className="grid gap-2 text-sm font-semibold">Okunacak metin<textarea readOnly className="w-full rounded-xl border bg-slate-50 p-4 leading-7" rows={5} value={script.steps[step].narration}/></label>}
   <p className="text-sm">{current?`Mevcut kayıt: ${current.narrator} · ${Math.round(current.bytes/1024)} KB`:'Bu adım için insan seslendirmesi henüz eklenmedi.'}</p>
   <label className="grid gap-2 text-sm font-semibold">Anlatıcının görünen adı<input required minLength={2} maxLength={120} value={narrator} onChange={e=>setNarrator(e.target.value)} className="min-h-11 rounded-lg border p-3"/></label>
   <label className="grid gap-2 text-sm font-semibold">Kullanım hakkı belgesinin kayıt referansı<input required minLength={12} maxLength={500} value={rights} onChange={e=>setRights(e.target.value)} className="min-h-11 rounded-lg border p-3"/><small className="font-normal">Sözleşme tarihi ve özel kayıt numarası yeterli; kimlik belgesi veya imza görseli eklemeyin.</small></label>
   <label className="grid gap-2 text-sm font-semibold">Ses dosyası (MP3/WAV, en fazla 3 MB)<input key={`${id}-${step}`} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{preview&&<audio controls src={preview} preload="metadata" aria-label="Yüklenecek ses kaydını önizle"/>}
   <label className="flex items-start gap-3 text-sm leading-6"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0"/><span>Bu kayıt gerçek bir insan anlatıcıya aittir. Web ve mobil uygulamada kullanmak için gerekli iznimiz vardır; anlatım metniyle ve seçili adımla eşleştiğini dinleyerek kontrol ettim.</span></label>
   <button type="submit" disabled={busy||!file||!script||!confirmed} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:opacity-50"><Upload size={17}/>{busy?'Ses kaydı yükleniyor…':'İnsan seslendirmesini kaydet'}</button>
  </fieldset></form>
 </section>;
}
