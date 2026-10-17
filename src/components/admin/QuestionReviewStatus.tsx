import React,{useEffect,useState} from 'react';
import {authenticatedFetch} from '../../lib/api-client';
import {questionReviewSchema,type GradeReview} from '../../lib/admin-response-schemas';
export function QuestionReviewStatus(){
 const [rows,setRows]=useState<GradeReview[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;const controller=new AbortController();setLoading(true);setError(false);setRows([]);
 authenticatedFetch('/api/admin/question-review-summary',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const data=questionReviewSchema.parse(await response.json());if(active)setRows([...data.grades].sort((a,b)=>a.grade-b.grade));}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();};
 },[refresh]);
 return <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4"><h3 className="font-bold">Sınıf bazında eğitmen incelemesi</h3><p className="text-sm text-slate-300">Otomatik denetim kaydı ve bireysel eğitmen incelemesi ayrı takip edilir. Soru Atölyesi’nde yönerge, görsel, çözüm ve yaşa uygunluğu inceleyin; gerçekten tamamlanan incelemeyi kaydedin.</p>
 <a href="/admin?section=review" className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Eğitmen onayını aç</a>
 <button type="button" disabled={loading} className="min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40" onClick={()=>setRefresh(v=>v+1)}>{error?'İnceleme durumunu yeniden yükle':'İnceleme sayılarını yenile'}</button>
 {loading?<p role="status">İnceleme durumu yükleniyor…</p>:error?<p role="alert">İnceleme sayıları yüklenemedi veya doğrulanamadı. Yeniden deneyin.</p>:!rows.length?<p role="status">Yayımlanmış sınıf sorusu bulunamadı.</p>:<div className="grid gap-3 sm:grid-cols-2">{rows.map(row=><article key={row.grade} className="min-w-0 rounded-xl border border-slate-700 p-3"><h4 className="font-semibold">{row.grade}. sınıf</h4><p className="text-sm">{row.published} yayımlanan · {row.reviewed} incelenen · <strong>{row.pending} bekleyen</strong></p><p className="mt-2 break-all text-xs text-slate-400">İlk inceleme adayları: {row.samples?.join(', ')||(row.pending?'Örnek soru kodu bulunamadı.':'Bekleyen soru yok.')}</p></article>)}</div>}
 </section>;
}
