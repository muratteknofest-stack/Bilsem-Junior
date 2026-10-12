import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BaseQuestion } from '../types';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
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
type Props={question:BaseQuestion;sessionKey:string;index:number;total:number;remaining:number;busy:boolean;submitted:boolean;response:QuestionResponse|null;error:string;onChange:(r:QuestionResponse)=>void;onLeave:()=>void;onPrevious?:()=>void;onNext?:()=>void;onRetry?:()=>void;tools:React.ReactNode};
export function FocusedQuestionScreen(p:Props) {
  const tools=useRef<HTMLDialogElement>(null),zoom=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});tools.current?.close();zoom.current?.close();},[p.sessionKey]);
  const content=<main className="zp-focus" aria-label="Soru çözme ekranı">
    <header className="zp-focus-header"><button onClick={p.onLeave} disabled={p.busy} aria-label="Çalışmadan çık">‹ Çık</button><span><b>ZekaPark</b><small>{p.question.targetGrade || ''}. sınıf · Zorluk {p.question.difficulty}</small></span><span role="timer" aria-label="Kalan süre">{Math.floor(p.remaining/60)}:{String(p.remaining%60).padStart(2,'0')}</span><button onClick={()=>tools.current?.showModal()} aria-label="Sorular ve çalışma araçları">☰</button></header>
    {p.error&&<div role="alert" className="zp-focus-error">{p.error}{p.onRetry&&<button onClick={p.onRetry} disabled={p.busy}>Yeniden gönder</button>}</div>}
    <h2 className="zp-focus-prompt" tabIndex={-1} ref={heading}>{p.question.prompt}{p.question.secondaryPrompt&&<small>{p.question.secondaryPrompt}</small>}</h2>
    <MemoryStudy key={p.sessionKey} question={p.question} review={p.submitted}>
      <div className="zp-focus-visual"><FitQuestionVisual question={p.question}/>{(p.question.type!=='visual_memory'||p.submitted)&&<button className="zp-zoom-button" onClick={()=>zoom.current?.showModal()} aria-label="Soru görselini büyüt">⤢</button>}</div>
      <fieldset className="zp-focus-answers" disabled={p.busy}><legend className="sr-only">Cevabın</legend><AnswerWorkspace compact allowedModes={['choice']} preferredMode="choice" question={p.question} response={p.response?.mode==='choice'?p.response:null} onChange={p.onChange} submitted={p.submitted}/></fieldset>
    </MemoryStudy>
    <footer className="zp-focus-footer"><button disabled={p.busy||!p.onPrevious} onClick={p.onPrevious}>‹ Önceki</button><span aria-live="polite"><b>{p.index+1} / {p.total}</b><small>{p.busy?'Kaydediliyor…':p.submitted?'Cevabı incele':'Seçince ilerler'}</small></span><button disabled={p.busy||!p.onNext} onClick={p.onNext}>Sonraki ›</button></footer>
    <dialog ref={tools} className="zp-focus-dialog" aria-label="Sorular ve çalışma araçları"><div className="zp-dialog-top"><h2>Sorular ve araçlar</h2><button onClick={()=>tools.current?.close()}>Kapat ✕</button></div>{p.tools}</dialog>
    {(p.question.type!=='visual_memory'||p.submitted)&&<dialog ref={zoom} className="zp-focus-dialog zp-zoom-dialog" aria-label="Büyük soru görseli"><div className="zp-dialog-top"><h2>Soru görseli</h2><button onClick={()=>zoom.current?.close()}>Kapat ✕</button></div><p>{p.question.prompt}</p><QuestionRenderer question={p.question}/></dialog>}
  </main>;
  return createPortal(content,document.body);
}
