import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/sound';
import type { AnswerFeedback } from '../features/student/answer-feedback';
import { LearningAnswerFeedback } from './student/LearningAnswerFeedback';
import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { BaseQuestion } from '../types';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { FocusedAnswerChoices } from './FocusedAnswerChoices';
import { LearningExpiryNotice } from './LearningExpiryNotice';
import { MemoryStudy } from '../features/questions/renderers/MemoryStudy';
import './FocusedQuestionScreen.css';

/** Scale only the diagram. Text, choices and touch controls retain their own sizes. */
export function FitQuestionVisual({question}:{question:BaseQuestion}) {
  const frame=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(1);
  useLayoutEffect(()=>{
    const measure=()=>{if(frame.current&&content.current)setScale(Math.min(1,frame.current.clientWidth/560,frame.current.clientHeight/Math.max(1,content.current.scrollHeight)));};
    const observer=new ResizeObserver(measure);observer.observe(frame.current!);observer.observe(content.current!);measure();return()=>observer.disconnect();
  },[question.id]);
  return <div className="zp-fit-frame" ref={frame}><div ref={content} className="zp-fit-content" style={{transform:`translate(-50%, -50%) scale(${scale})`}}><QuestionRenderer question={question}/></div></div>;
}
type Props={feedback?:AnswerFeedback|null;question:BaseQuestion;sessionKey:string;index:number;total:number;remaining:number;busy:boolean;submitted:boolean;expired?:boolean;response:QuestionResponse|null;error:string;onChange:(r:QuestionResponse)=>void;onLeave:()=>void;onPrevious?:()=>void;onNext?:()=>void;onRetry?:()=>void;onRetryLabel?:string;onReloadResults?:()=>void;tools:React.ReactNode};
export function FocusedQuestionScreen(p:Props) {
  const screen=useRef<HTMLElement>(null);
  const soundOn=useSyncExternalStore(sound.subscribe,sound.getSnapshot,sound.getServerSnapshot);
  const lastTransition=useRef('');
  const [fullScreen,setFullScreen]=useState(false);
  const [screenMessage,setScreenMessage]=useState('');
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
    heading.current?.focus({preventScroll:true});tools.current?.close();zoom.current?.close();
    if(lastTransition.current!==p.sessionKey){lastTransition.current=p.sessionKey;sound.playTransition();}
  },[p.sessionKey]);
  const content=<main ref={screen} className="zp-focus" data-answer-feedback={p.feedback?.kind} aria-label="Soru çözme ekranı">
    <header className="zp-focus-header"><button onClick={p.onLeave} disabled={p.busy} aria-label="Çalışmadan çık">‹ Çık</button><span><b>ZekaPark</b><small>{p.question.targetGrade || ''}. sınıf · Zorluk {p.question.difficulty}</small></span><span role="timer" aria-label="Kalan süre">{Math.floor(p.remaining/60)}:{String(p.remaining%60).padStart(2,'0')}</span><button onClick={()=>tools.current?.showModal()} aria-label="Sorular ve çalışma araçları">☰</button></header>
    {p.error&&<div role="alert" className="zp-focus-error">{p.error}{p.onRetry&&!p.expired&&<button onClick={p.onRetry} disabled={p.busy}>{p.onRetryLabel||'Yeniden gönder'}</button>}</div>}
    {p.expired&&<LearningExpiryNotice busy={p.busy} onReload={p.onReloadResults}/>}
    <h2 key={`prompt-${p.sessionKey}`} className="zp-focus-prompt" tabIndex={-1} ref={heading}>{p.question.prompt}{p.question.secondaryPrompt&&<small>{p.question.secondaryPrompt}</small>}</h2>
    <MemoryStudy key={p.sessionKey} question={p.question} review={p.submitted}>
      <div className="zp-focus-visual"><FitQuestionVisual question={p.question}/>{(p.question.type!=='visual_memory'||p.submitted)&&<button className="zp-zoom-button" onClick={()=>zoom.current?.showModal()} aria-label="Soru görselini büyüt">⤢</button>}</div>
      <FocusedAnswerChoices question={p.question} response={p.response} onChange={p.onChange} busy={p.busy} expired={p.expired} submitted={p.submitted}/>
    </MemoryStudy>
    {p.feedback && <LearningAnswerFeedback feedback={p.feedback} />}
    <footer className="zp-focus-footer"><button disabled={p.busy||!p.onPrevious} onClick={p.onPrevious}>‹ Önceki</button><span aria-live="polite"><b>{p.index+1} / {p.total}</b><small>{p.feedback?'İlerliyoruz…':p.busy?'Kaydediliyor…':p.expired?'Süre doldu':p.submitted?'Cevabı incele':'Seçince ilerler'}</small><progress aria-label="Soru ilerlemesi" value={p.index+1} max={p.total}/></span><button disabled={p.busy||!p.onNext} onClick={p.onNext}>Sonraki ›</button></footer>
    <dialog ref={tools} className="zp-focus-dialog" aria-label="Sorular ve çalışma araçları"><div className="zp-dialog-top"><h2>Sorular ve araçlar</h2><button onClick={()=>tools.current?.close()}>Kapat ✕</button></div><button type="button" className="zp-sound-toggle" aria-pressed={soundOn} aria-label={soundOn?'Sesi kapat':'Sesi aç'} onClick={()=>{sound.enabled=!sound.enabled;if(sound.enabled){sound.unlock();sound.playClick();}}}>{soundOn?<Volume2 size={18} aria-hidden="true"/>:<VolumeX size={18} aria-hidden="true"/>} Ses: {soundOn?'Açık':'Kapalı'}</button>{document.fullscreenEnabled&&<button onClick={()=>void toggleFullScreen()}>{fullScreen?'Tam ekrandan çık':'Tam ekranı aç'}</button>}{screenMessage&&<p role="status">{screenMessage}</p>}{p.tools}</dialog>
    {(p.question.type!=='visual_memory'||p.submitted)&&<dialog ref={zoom} className="zp-focus-dialog zp-zoom-dialog" aria-label="Büyük soru görseli"><div className="zp-dialog-top"><h2>Soru görseli</h2><button onClick={()=>zoom.current?.close()}>Kapat ✕</button></div><p>{p.question.prompt}</p><QuestionRenderer question={p.question}/></dialog>}
  </main>;
  return createPortal(content,document.body);
}
