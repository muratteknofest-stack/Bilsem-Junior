import { useStudentReducedMotion } from '../features/student/experience-preferences';
import { ArrowLeft, ArrowRight, Check, Clock3, Grid2X2, LoaderCircle, Maximize2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/sound';
import type { AnswerFeedback } from '../features/student/answer-feedback';
import { LearningAnswerFeedback } from './student/LearningAnswerFeedback';
import { LearningSessionProgress } from './student/LearningSessionProgress';
import type { LearningMode } from '../features/student/learning-contract';
import type { SessionProgress } from '../features/student/session-progress';
import { feedbackDuration } from '../features/student/answer-feedback';
import React, { useEffect, useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { QUESTION_TYPE_LABELS, type BaseQuestion } from '../types';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { FocusedAnswerChoices } from './FocusedAnswerChoices';
import { LearningExpiryNotice } from './LearningExpiryNotice';
import { MemoryStudy } from '../features/questions/renderers/MemoryStudy';
import './FocusedQuestionScreen.css';

/** Scale only the diagram. Text, choices and touch controls retain their own sizes. */
export const FitQuestionVisual = React.memo(function FitQuestionVisual({question,spatialMethod='svg',onSpatialUnavailable}:{question:BaseQuestion;spatialMethod?:'svg'|'webgl';onSpatialUnavailable?:()=>void}) {
  const frame=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  useLayoutEffect(()=>{
    const measure=()=>{
      if(!frame.current||!content.current)return;
      const width=Math.max(1,frame.current.clientWidth-12),height=Math.max(1,frame.current.clientHeight-12);
      let bestWidth=width,bestScale=0;
      // Try the real phone width first. Dense equations may benefit from a wider
      // logical canvas; choose the layout with the largest readable symbols.
      for(const logicalWidth of [...new Set([width,Math.max(width,440),Math.max(width,560)])]){
        content.current.style.width=`${logicalWidth}px`;
        const next=Math.min(1,width/Math.max(logicalWidth,content.current.scrollWidth),height/Math.max(1,content.current.scrollHeight));
        if(next>bestScale){bestScale=next;bestWidth=logicalWidth;}
      }
      content.current.style.width=`${bestWidth}px`;
      setScale(bestScale);
    };
    const observer=new ResizeObserver(measure);observer.observe(frame.current!);observer.observe(content.current!);measure();return()=>observer.disconnect();
  },[question.id]);
  return <div className="zp-fit-frame" ref={frame}><div ref={content} className="zp-fit-content" style={{transform:`translate(-50%, -50%) scale(${scale})`}}><QuestionRenderer key={spatialMethod} question={question} previewMethod={spatialMethod} spatialControls={false} hideContext onSpatialUnavailable={onSpatialUnavailable}/></div></div>;
});
type Props={mode?:LearningMode;progress?:SessionProgress;onContinueFeedback?:()=>void;adventureEffect?:'burst'|'orbit'|'leaves';feedback?:AnswerFeedback|null;question:BaseQuestion;sessionKey:string;index:number;total:number;remaining:number;busy:boolean;submitted:boolean;expired?:boolean;response:QuestionResponse|null;error:string;onChange:(r:QuestionResponse)=>void;onLeave:()=>void;onPrevious?:()=>void;onNext?:()=>void;onRetry?:()=>void;onRetryLabel?:string;onReloadResults?:()=>void;tools:React.ReactNode};
export function FocusedQuestionScreen(p:Props) {
  const reducedMotion=useStudentReducedMotion();
  const screen=useRef<HTMLElement>(null);
  const soundOn=useSyncExternalStore(sound.subscribe,sound.getSnapshot,sound.getServerSnapshot);
  const lastTransition=useRef('');
  const [fullScreen,setFullScreen]=useState(false);
  const [screenMessage,setScreenMessage]=useState('');
  const [spatialMethod,setSpatialMethod]=useState<'svg'|'webgl'>('svg');
  const [spatialUnavailable,setSpatialUnavailable]=useState(false);
  const onSpatialUnavailable=useCallback(()=>{setSpatialMethod('svg');setSpatialUnavailable(true);},[]);
  const tools=useRef<HTMLDialogElement>(null),zoom=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
  useEffect(()=>{
    const viewport=window.visualViewport;
    const resize=()=>{if(screen.current&&(!viewport||viewport.scale===1))screen.current.style.setProperty('--zp-visible-height',`${viewport?.height||window.innerHeight}px`);};
    const changed=()=>setFullScreen(document.fullscreenElement===screen.current);
    resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',changed);
    return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);document.removeEventListener('fullscreenchange',changed);};
  },[]);
  const toggleFullScreen=async()=>{
    tools.current?.close();
    try{if(document.fullscreenElement)await document.exitFullscreen();else await screen.current?.requestFullscreen();setScreenMessage('');}
    catch{setScreenMessage('Tarayıcı tam ekranı açamadı. Sorular mevcut ekrana sığacak şekilde gösteriliyor.');}
  };
  useEffect(()=>{
    screen.current?.scrollTo({top:0,behavior:'instant'});
    heading.current?.focus({preventScroll:true});tools.current?.close();zoom.current?.close();
    if(lastTransition.current!==p.sessionKey){lastTransition.current=p.sessionKey;sound.playTransition();}
  },[p.sessionKey]);
  const status=p.feedback?'Sıradaki keşfe…':p.busy?'Cevabın kaydediliyor…':p.expired?'Süre tamamlandı':p.submitted?'Cevabın kaydedildi':'Cevabını seç, keşfe devam et';
  const content=<main ref={screen} className="zp-focus" data-mode={p.mode || 'practice'} data-reduced-motion={reducedMotion} data-answer-feedback={p.feedback?.kind} aria-label="Soru çözme ekranı">
    <header className="zp-focus-header">
      <button type="button" onClick={p.onLeave} disabled={p.busy} aria-label="Çalışmadan çık"><ArrowLeft size={20} aria-hidden="true" /></button>
      <div className="zp-focus-brand"><span className="zp-focus-brand-icon" aria-hidden="true"><Sparkles size={21}/></span><span><b>Bilsem Junior</b><small>{p.question.targetGrade || ''}. sınıf · {p.mode==='exam'?'Deneme':p.mode==='adaptive'?'Sana özel keşif':'Zihin atölyesi'}</small></span></div>
      <span className="zp-focus-clock" data-low={p.remaining>0&&p.remaining<=60} role="timer" aria-label={`Kalan süre: ${Math.floor(p.remaining/60)} dakika ${p.remaining%60} saniye`}><Clock3 size={16} aria-hidden="true"/>{Math.floor(p.remaining/60)}:{String(p.remaining%60).padStart(2,'0')}</span>
      <button type="button" onClick={()=>tools.current?.showModal()} aria-label="Sorular ve çalışma araçları"><Grid2X2 size={19} aria-hidden="true" /></button>
    </header>
    <LearningSessionProgress progress={p.progress || {answered:0,streak:0,xp:0}} total={p.total} exam={p.mode==='exam'} />
    {p.error&&<div role="alert" className="zp-focus-error">{p.error}{p.onRetry&&!p.expired&&<button onClick={p.onRetry} disabled={p.busy}>{p.onRetryLabel||'Yeniden gönder'}</button>}</div>}
    {p.expired&&<LearningExpiryNotice busy={p.busy} onReload={p.onReloadResults}/>}
    <h2 key={`prompt-${p.sessionKey}`} className="zp-focus-prompt" tabIndex={-1} ref={heading}><span className="zp-focus-question-label">SORU {String(p.index+1).padStart(2,'0')}<span> · {QUESTION_TYPE_LABELS[p.question.type].replace(/^\d+\.\s*/, '')}</span></span>{p.question.prompt}{p.question.context&&<small>{p.question.context.title} · {p.question.context.story}</small>}{p.question.secondaryPrompt&&<small>{p.question.secondaryPrompt}</small>}</h2>
    <MemoryStudy key={p.sessionKey} question={p.question} review={p.submitted}>
      <div className="zp-focus-visual"><FitQuestionVisual question={p.question} spatialMethod={spatialMethod} onSpatialUnavailable={onSpatialUnavailable}/>{['cube_counting','top_view','multiview_perspective'].includes(p.question.type)&&<button type="button" className="zp-spatial-mode" aria-pressed={spatialMethod==='webgl'} onClick={()=>{setSpatialUnavailable(false);setSpatialMethod(value=>value==='svg'?'webgl':'svg');}}>{spatialMethod==='svg'?'3B görünüm':'Net çizim'}</button>}{spatialUnavailable&&<span role="status" className="zp-spatial-notice">Bu cihazda net çizim kullanılıyor.</span>}{(p.question.type!=='visual_memory'||p.submitted)&&<button type="button" className="zp-zoom-button" onClick={()=>zoom.current?.showModal()} aria-label="Soru görselini büyüt"><Maximize2 size={19} aria-hidden="true" /></button>}</div>
      <FocusedAnswerChoices question={p.question} response={p.response} onChange={p.onChange} busy={p.busy} expired={p.expired} submitted={p.submitted}/>
    </MemoryStudy>
    {p.feedback && <LearningAnswerFeedback feedback={p.feedback} adventureEffect={p.adventureEffect} onContinue={p.onContinueFeedback} durationMs={feedbackDuration(reducedMotion,p.feedback.kind)}/>}
    <footer className="zp-focus-footer"><button type="button" disabled={p.busy||!p.onPrevious} onClick={p.onPrevious}><ArrowLeft size={16} aria-hidden="true"/><span>Önceki</span></button><span className="zp-focus-status" role="status" aria-live="polite">{p.busy&&!p.feedback?<LoaderCircle className="zp-saving-spinner" size={15} aria-hidden="true"/>:p.submitted?<Check size={15} aria-hidden="true"/>:<Sparkles size={15} aria-hidden="true"/>}<span><b>{p.index+1} / {p.total}</b><small>{status}</small></span></span><button type="button" disabled={p.busy||!p.onNext} onClick={p.onNext}><span>Sonraki</span><ArrowRight size={16} aria-hidden="true"/></button></footer>
    <dialog ref={tools} className="zp-focus-dialog" aria-label="Sorular ve çalışma araçları"><div className="zp-dialog-top"><h2>Sorular ve araçlar</h2><button onClick={()=>tools.current?.close()}>Kapat ✕</button></div><button type="button" className="zp-sound-toggle" aria-pressed={soundOn} aria-label={soundOn?'Sesi kapat':'Sesi aç'} onClick={()=>{sound.enabled=!sound.enabled;if(sound.enabled){sound.unlock();sound.playClick();}}}>{soundOn?<Volume2 size={18} aria-hidden="true"/>:<VolumeX size={18} aria-hidden="true"/>} Ses: {soundOn?'Açık':'Kapalı'}</button><label className="zp-focus-volume">Ses düzeyi<input aria-label="Test sesi düzeyi" type="range" min="0" max="100" step="5" defaultValue={Math.round(sound.volume*100)} onChange={event=>{sound.volume=Number(event.target.value)/100;}} /></label>{document.fullscreenEnabled&&<button onClick={()=>void toggleFullScreen()}>{fullScreen?'Tam ekrandan çık':'Tam ekranı aç'}</button>}{screenMessage&&<p role="status">{screenMessage}</p>}{p.tools}</dialog>
    {(p.question.type!=='visual_memory'||p.submitted)&&<dialog ref={zoom} className="zp-focus-dialog zp-zoom-dialog" aria-label="Büyük soru görseli"><div className="zp-dialog-top"><h2>Soru görseli</h2><button onClick={()=>zoom.current?.close()}>Kapat ✕</button></div><p>{p.question.prompt}</p><QuestionRenderer question={p.question}/></dialog>}
  </main>;
  return createPortal(content,document.body);
}
