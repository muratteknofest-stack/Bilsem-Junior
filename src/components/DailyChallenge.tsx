import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isAndroidApp } from '../lib/native-app';
import { sound } from '../lib/sound';
import { FreeTestScreen } from './FreeTestScreen';
import { authenticatedFetch } from '../lib/api-client';
import type { BaseQuestion, VisualExplanation } from '../types';
import type { Board } from '../features/questions/professional-engine';
import { ProfessionalBoard } from '../features/questions/renderers/ProfessionalBoard';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';

type Task = {id:string;slot:number;day:string;question:Pick<BaseQuestion,'prompt'|'type'|'difficulty'|'visualConfig'> & {options:Pick<BaseQuestion['options'][number],'id'|'label'|'visualData'>[]}};
type Result = {selectedOptionId:string;correct:boolean;points:number;correctOptionId:string;explanation:VisualExplanation};
async function request(path:string, body?:object) {
  const response=await authenticatedFetch('/api/challenges/'+path,body ? {method:'POST',body:JSON.stringify(body)} : undefined);
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || 'Görev yüklenemedi.');
  return result;
}
export function DailyChallenge() {
  const [summary,setSummary]=useState<{points:number;completed:number;limit:number;day:string}|null>(null);
  const [task,setTask]=useState<Task|null>(null);
  const [selected,setSelected]=useState('');
  const [result,setResult]=useState<Result|null>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const actionLock=useRef(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [reported,setReported]=useState(false);
  const [reason,setReason]=useState('answer');
  const refresh=useCallback(async () => {setSummary(await request('today'));},[]);
  useEffect(()=>{let active=true;request('today').then(value=>{if(active)setSummary(value);}).catch(()=>{if(active)setNotice('Günün özeti yüklenemedi. Yeniden deneyebilirsiniz.');});return()=>{active=false;};},[]);
  async function start(){
    if(actionLock.current)return;actionLock.current=true;sound.unlock();setBusy(true);setNotice('');
    try{const next=await request('start',{});setTask(next);setSelected('');setResult(null);setReported(false);setFullscreen(isAndroidApp);await refresh();}
    catch(e){setNotice(e instanceof Error?e.message:'Görev yüklenemedi.');}
    finally{actionLock.current=false;setBusy(false);}
  }
  async function answer(optionId=selected){
    if(!task || !task.question.options.some(option=>option.id===optionId) || actionLock.current || result)return;actionLock.current=true;sound.unlock();setSelected(optionId);setBusy(true);setNotice('');
    try{const value=await request(task.id+'/answer',{optionId});setResult(value);setSelected(value.selectedOptionId);await refresh();}
    catch(e){setNotice(e instanceof Error?e.message:'Yanıt kaydedilemedi. Aynı yanıtla yeniden deneyebilirsiniz.');}
    finally{actionLock.current=false;setBusy(false);}
  }
  async function report(){
    if(!task || actionLock.current || reported)return;actionLock.current=true;setBusy(true);setNotice('');
    try{await request(task.id+'/report',{reason});setReported(true);setNotice('Soru inceleme kuyruğuna kaydedildi.');}
    catch(e){setNotice(e instanceof Error?e.message:'Bildirim gönderilemedi.');}finally{actionLock.current=false;setBusy(false);}
  }
  const reportControls = <details className="text-sm text-slate-600"><summary className="cursor-pointer py-3">Soruda bir sorun mu var?</summary><div className="flex flex-wrap gap-3"><select aria-label="Soru bildirim nedeni" value={reason} onChange={e=>setReason(e.target.value)} disabled={busy||reported} className="min-h-11 rounded-lg border p-2"><option value="answer">Cevap veya çözüm</option><option value="unclear">Anlaşılmayan yönerge</option><option value="visual">Görsel</option><option value="level">Sınıf düzeyi</option></select><button type="button" disabled={busy||reported} onClick={()=>void report()} className="min-h-11 rounded-lg border px-3">{reported?'Bildirim kaydedildi':'İnceleme iste'}</button></div></details>;
  return <section className="space-y-5 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="daily-task-title" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Günlük keşif</p><h2 id="daily-task-title" className="mt-2 text-2xl font-bold text-slate-950">Üç soru, yeni bir adım.</h2></div><span className="rounded-2xl bg-amber-50 px-4 py-3 text-xl font-bold text-amber-900">{summary ? `${summary.points} / 30 puan` : '…'}</span></div>
    <p className="text-sm leading-6 text-slate-600">Her doğru yanıt 10 görev puanı kazandırır. İlk yanıtın kaydedilir; hız yerine dikkatli düşünmeye odaklan. Görevler Türkiye saatiyle her gün yenilenir.</p>
    {summary && <p className="text-sm font-semibold text-indigo-800">Bugün {summary.completed} / {summary.limit} görev tamamladın.</p>}
    {task && !isAndroidApp && <div key={task.id} className="space-y-5 border-t border-slate-100 pt-5"><p className="text-sm text-slate-500">Görev {task.slot} / 3 · Seviye {task.question.difficulty}</p><h3 className="text-xl font-semibold leading-8 text-slate-900">{task.question.prompt}</h3><div className="overflow-hidden rounded-2xl bg-slate-50 p-3"><ProfessionalBoard board={task.question.visualConfig as Board}/></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" role="group" aria-label="Cevap seçenekleri">{task.question.options.map(option=><OptionRenderer key={option.id} option={option} questionType={task.question.type} isSelected={selected===option.id} onSelect={()=>setSelected(option.id)} disabled={busy || !!result} showCorrect={!!result} isCorrectOption={result?.correctOptionId===option.id}/>)}</div>
      {!result && <button type="button" disabled={!selected || busy} onClick={()=>void answer()} className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?'Yanıt kaydediliyor…':'Yanıtımı gönder'}</button>}
      {result && <div role="status" className={'rounded-2xl p-5 '+(result.correct?'bg-emerald-50 text-emerald-950':'bg-amber-50 text-amber-950')}><h4 className="font-bold">{result.correct?'Doğru yanıt! +10 puan':'Birlikte öğrenelim.'}</h4><p className="mt-2 leading-7">{result.explanation.summary}</p><ol className="mt-3 list-decimal space-y-2 pl-5">{result.explanation.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></div>}
      {reportControls}
    </div>}
    {isAndroidApp && task && <button type="button" disabled={busy} onClick={()=>setFullscreen(true)} className="min-h-12 rounded-xl border border-indigo-200 px-5 py-3 font-semibold text-indigo-800">{result?'Son soruyu incele':'Soruyu yeniden aç'}</button>}
    {isAndroidApp && task && fullscreen && <FreeTestScreen key={task.id} questionKey={task.id} title="Günlük keşif" index={task.slot} total={summary?.limit ?? 3} prompt={task.question.prompt} type={task.question.type} options={task.question.options} visual={<ProfessionalBoard board={task.question.visualConfig as Board}/>} selectedId={selected} busy={busy} error={notice} feedback={result ? {correct:result.correct,correctOptionId:result.correctOptionId,summary:result.explanation.summary,steps:result.explanation.steps,points:result.points} : null} onSelect={id=>void answer(id)} onLeave={()=>setFullscreen(false)} onContinue={()=>{if(task.slot >= (summary?.limit ?? 3))setFullscreen(false);else void start();}} continueLabel={task.slot >= (summary?.limit ?? 3)?'Tamamla':'Sonraki soru'} onRetry={!result && selected ? ()=>void answer(selected):undefined} tools={reportControls}/>}
    {(!task || result) && <button type="button" disabled={busy || !!summary && summary.completed>=summary.limit} onClick={()=>void start()} className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-600">{summary && summary.completed>=summary.limit?'Bugünün görevleri tamamlandı':busy?'Görev hazırlanıyor…':task?'Sonraki görev':'Günün görevini aç'}</button>}
    {notice && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{notice}</p>}
    <p className="text-xs leading-5 text-slate-500">Görev puanları sunucuda doğrulanır ve kişisel çalışma XP'sinden ayrı tutulur. Bu bölümde diğer öğrencilerin bilgileri paylaşılmaz.</p>
  </section>;
}
