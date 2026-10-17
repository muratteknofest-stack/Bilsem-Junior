import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Brain, Info, Lightbulb, Pause, Play, Sparkles, Star, Trophy, Volume2, VolumeX, X, ZoomIn } from 'lucide-react';
import type { QuestionType, VisualOption } from '../types';
import { sound } from '../lib/sound';
import { studentMotion, useStudentReducedMotion } from '../features/student/experience-preferences';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import './free-test.css';
export interface FreeTestFeedback { correct: boolean; correctOptionId: string; summary: string; steps: string[]; points?: number; }
interface Props {
  questionKey: string; title: string; index: number; total: number;
  prompt: string; secondaryPrompt?: string; type: QuestionType;
  options: Pick<VisualOption, 'id' | 'label' | 'visualData'>[]; visual: React.ReactNode;
  selectedId: string; busy?: boolean; error?: string; feedback: FreeTestFeedback | null;
  completed?: boolean; onSelect: (id: string) => void; onLeave: () => void;
  onContinue: () => void; continueLabel: string; onRetry?: () => void;
  picker?: React.ReactNode; tools?: React.ReactNode;
}
/** Fit the diagram, preserving option touch targets and legible UI text. */
function FitFreeVisual({ children, identity }: { children: React.ReactNode; identity: string }) {
  const frame = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      if (!frame.current || !content.current) return;
      setScale(Math.min(1, frame.current.clientWidth / 520, frame.current.clientHeight / Math.max(1, content.current.scrollHeight)));
    };
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    if (content.current) observer.observe(content.current);
    measure(); return () => observer.disconnect();
  }, [identity]);
  return <div ref={frame} className="zp-free-fit"><div ref={content} className="zp-free-fit-content" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>{children}</div></div>;
}
export function FreeTestScreen(p: Props) {
  const root = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const help = useRef<HTMLDialogElement>(null), zoom = useRef<HTMLDialogElement>(null);
  const reduced = useStudentReducedMotion();
  const soundOn = useSyncExternalStore(sound.subscribe, sound.getSnapshot, sound.getServerSnapshot);
  const [flash, setFlash] = useState(false), [memorized, setMemorized] = useState(false);
  const initialFeedbackKey = p.feedback ? `${p.questionKey}:${p.selectedId}` : '';
  const played = useRef(initialFeedbackKey);
  const memoryLocked = p.type === 'visual_memory' && !memorized && !p.feedback;
  const memoryHidden = p.type === 'visual_memory' && memorized && !p.feedback;
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const app = document.getElementById('root'), wasInert = app?.inert ?? false;
    if (app) app.inert = true;
    return () => { document.body.style.overflow = previous; if (app) app.inert = wasInert; };
  }, []);
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => { if (root.current && (!viewport || viewport.scale === 1)) root.current.style.setProperty('--zp-free-height', `${viewport?.height || window.innerHeight}px`); };
    resize(); viewport?.addEventListener('resize', resize); window.addEventListener('resize', resize);
    return () => { viewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [p.questionKey]);
  useEffect(() => {
    const key = `${p.questionKey}:${p.selectedId}`;
    if (!p.feedback || played.current === key) return;
    played.current = key; setFlash(true);
    if (p.feedback.correct) sound.playSuccess(); else sound.playError();
  }, [p.questionKey, p.selectedId, p.feedback?.correct]);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), reduced ? 350 : 850);
    return () => window.clearTimeout(timer);
  }, [flash, reduced]);
  useEffect(() => {
    const back = (event: Event) => {
      if (help.current?.open) help.current.close();
      else if (zoom.current?.open) zoom.current.close();
      else if (!p.busy) p.onLeave();
      event.preventDefault(); event.stopImmediatePropagation();
    };
    window.addEventListener('zekapark:native-back', back, true);
    return () => window.removeEventListener('zekapark:native-back', back, true);
  }, [p.onLeave, p.busy]);
  const select = (id: string) => { if (!p.busy && !p.feedback && !p.completed) { sound.unlock(); sound.playClick(); p.onSelect(id); } };
  return createPortal(<main ref={root} className="zp-free-test" data-reduced-motion={reduced} data-feedback={p.feedback ? (p.feedback.correct ? 'correct' : 'incorrect') : undefined} aria-label="Ücretsiz tam ekran test">
    <header className="zp-free-header"><button type="button" onClick={p.onLeave} disabled={p.busy} aria-label="Ücretsiz testten çık"><ArrowLeft size={22}/></button>
      <div><span><Sparkles size={14} aria-hidden="true"/>{p.title}</span><strong>{p.index} <small>/ {p.total}</small></strong></div>
      <button type="button" aria-label={soundOn ? 'Test sesini kapat' : 'Test sesini aç'} aria-pressed={soundOn} onClick={() => { sound.enabled = !sound.enabled; if (sound.enabled) { sound.unlock(); sound.playClick(); } }}>{soundOn ? <Volume2 size={21}/> : <VolumeX size={21}/>}</button>
      <button type="button" aria-label={reduced ? 'Test animasyonlarını aç' : 'Test animasyonlarını durdur'} aria-pressed={!reduced} onClick={() => studentMotion.setEnabled(reduced)}>{reduced ? <Play size={19}/> : <Pause size={19}/>}</button>
    </header>
    {p.completed ? <section className="zp-free-complete"><span className="zp-free-trophy"><Trophy size={62}/></span><h1 ref={heading} tabIndex={-1}>İlk keşfin tamam!</h1><p>Yeni sorular için bir velinle ücretsiz hesap oluştur.</p><button type="button" onClick={p.onContinue}>{p.continueLabel}<ArrowRight size={19}/></button><button type="button" className="zp-free-home-link" onClick={p.onLeave}>Ana ekrana dön</button></section> : <>
      <h1 className="zp-free-prompt" ref={heading} tabIndex={-1}>{p.prompt}{p.secondaryPrompt && <small>{p.secondaryPrompt}</small>}</h1>
      <div className="zp-free-play" key={p.questionKey}>
        <div className="zp-free-board">{memoryHidden ? <div className="zp-free-memory"><Brain size={52}/><p>Desen aklında mı?<br/>Doğru seçeneğe dokun.</p></div> : <FitFreeVisual identity={p.questionKey}>{p.visual}</FitFreeVisual>}
          {!memoryHidden && <button type="button" className="zp-free-zoom" aria-label="Ücretsiz soru görselini büyüt" onClick={() => zoom.current?.showModal()}><ZoomIn size={19}/></button>}
        </div>
        {memoryLocked ? <button type="button" className="zp-free-memory-ready" onClick={() => { sound.unlock(); sound.playClick(); zoom.current?.close(); setMemorized(true); }}>Deseni gizle ve cevapla <ArrowRight size={20}/></button> : <div className="zp-free-choices" role="group" aria-label="Ücretsiz test cevapları">{p.options.map(option => <OptionRenderer key={option.id} option={option} questionType={p.type} isSelected={p.selectedId === option.id} onSelect={() => select(option.id)} disabled={p.busy || !!p.feedback} showCorrect={!!p.feedback} isCorrectOption={p.feedback?.correctOptionId === option.id}/>)}</div>}
      </div>
      <footer className="zp-free-footer">
        {p.error && <div className="zp-free-error" role="alert"><span>{p.error}</span>{p.onRetry && <button type="button" disabled={p.busy} onClick={p.onRetry}>Yeniden gönder</button>}</div>}
        {p.feedback ? <><div className="zp-free-result" role="status">{p.feedback.correct ? <Star size={20} fill="currentColor"/> : <Lightbulb size={20}/>}<strong>{p.feedback.correct ? 'Harika, doğru cevap!' : 'Birlikte öğrenelim.'}</strong>{p.feedback.correct && !!p.feedback.points && <span>+{p.feedback.points} puan</span>}</div><div className="zp-free-result-actions"><button type="button" onClick={() => help.current?.showModal()}>Çözümü gör</button><button type="button" disabled={p.busy} onClick={p.onContinue}>{p.continueLabel}<ArrowRight size={17}/></button></div></> : <div className="zp-free-tip"><span role="status">{p.busy ? 'Cevabın kontrol ediliyor…' : memoryLocked ? 'Deseni incele, sonra gizle.' : 'Cevabına dokun, sonucu keşfet.'}</span>{p.picker}</div>}
        <button type="button" className="zp-free-help-button" onClick={() => help.current?.showModal()} aria-label="Ücretsiz test yardımı"><Info size={17}/></button>
      </footer>
      {flash && <div className="zp-free-celebration" data-kind={p.feedback?.correct ? 'correct' : 'incorrect'} aria-hidden="true"><div>{p.feedback?.correct ? <Star size={55} fill="currentColor"/> : <Lightbulb size={50}/>}<strong>{p.feedback?.correct ? 'Başardın!' : 'Yeni bir şey öğrendin!'}</strong></div><div className="zp-free-sparks">{Array.from({length:12},(_,i)=><span key={i} style={{left:`${6+i*8}%`,animationDelay:`${i%3*70}ms`}}>✦</span>)}</div></div>}
    </>}
    <dialog ref={help} className="zp-free-dialog" aria-label={p.feedback ? 'Ücretsiz test çözümü' : 'Ücretsiz test yardımı'}><div className="zp-free-dialog-head"><h2>{p.feedback ? 'Birlikte bakalım' : 'Nasıl oynanır?'}</h2><button type="button" onClick={() => help.current?.close()} aria-label="Test yardımını kapat"><X size={22}/></button></div>{p.feedback ? <><p>{p.feedback.summary}</p><ol>{p.feedback.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></> : <p>Şekilleri incele. Doğru olduğunu düşündüğün cevaba dokun. Sonucunu renkli işaretlerle göreceksin. Ses ve animasyonları üstteki düğmelerden değiştirebilirsin.</p>}{p.tools}</dialog>
    <dialog ref={zoom} className="zp-free-dialog zp-free-zoom-dialog" aria-label="Ücretsiz test büyük görsel"><div className="zp-free-dialog-head"><h2>Soruyu incele</h2><button type="button" onClick={() => zoom.current?.close()} aria-label="Büyük görseli kapat"><X size={22}/></button></div><p>{p.prompt}</p>{!memoryHidden && p.visual}</dialog>
  </main>, document.body);
}
