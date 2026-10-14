import React,{useEffect,useState} from 'react';
import {authenticatedFetch} from '../../lib/api-client';
interface GradeReview {grade:number;published:number;reviewed:number;pending:number;samples:string[]|null;}
export function QuestionReviewStatus(){
 const [rows,setRows]=useState<GradeReview[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;const controller=new AbortController();setLoading(true);setError(false);
 authenticatedFetch('/api/admin/question-review-summary',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.grades))throw Error();if(active)setRows(data.grades);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();};
 },[refresh]);
 return <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4"><h3 className="font-bold">Sınıf bazında eğitmen incelemesi</h3><p className="text-sm text-slate-300">Otomatik denetim kaydı ve bireysel eğitmen incelemesi ayrı takip edilir. Soru Atölyesi’nde yönerge, görsel, çözüm ve yaşa uygunluğu inceleyin; gerçekten tamamlanan incelemeyi kaydedin.</p>
 {loading?<p role="status">İnceleme durumu yükleniyor…</p>:error?<div role="alert"><p>İnceleme sayıları yüklenemedi.</p><button className="min-h-11 underline" onClick={()=>setRefresh(v=>v+1)}>İnceleme durumunu yeniden yükle</button></div>:<div className="grid gap-3 sm:grid-cols-2">{rows.map(row=><article key={row.grade} className="min-w-0 rounded-xl border border-slate-700 p-3"><h4 className="font-semibold">{row.grade}. sınıf</h4><p className="text-sm">{row.published} yayımlanan · {row.reviewed} incelenen · <strong>{row.pending} bekleyen</strong></p><p className="mt-2 break-all text-xs text-slate-400">İlk inceleme adayları: {row.samples?.join(', ')||'Bekleyen soru yok.'}</p></article>)}</div>}
 </section>;
}
