import React, { useId, useRef, useState } from 'react';
import type { BaseQuestion } from '../../../types';
import type { Board, Tile } from '../professional-engine';
import { emptyResponse, interactionModes, placeInOrder, type AnswerMode, type QuestionResponse } from '../answer-interactions';
import { OptionRenderer } from './OptionRenderer';
import { TileDiagram } from './ProfessionalBoard';
import { questionVisualTheme, symbolLabel, type VisualTheme } from '../visual-vocabulary';
import { SymbolDiagram } from './VisualGlyph';
import { WorkshopShape } from './WorkshopBoard';
import type { WorkshopValue } from '../workshop-mechanics';
import { useMemoryStudy } from './MemoryStudy';

const labels: Record<AnswerMode, string> = { choice: 'Şık seç', place: 'Sürükle bırak', order: 'Sırayı kur', match: 'Eşleştir', number: 'Cevabı yaz' };
type Props = { compact?: boolean; question: BaseQuestion; response: QuestionResponse | null; onChange: (r: QuestionResponse) => void; submitted?: boolean; allowedModes?: AnswerMode[]; preferredMode?: AnswerMode };

function CardValue({ value, theme }: { value: unknown; theme: VisualTheme }) {
  if(value&&typeof value==='object'&&('figure' in value||'symbol' in value||'polygon' in value))return <WorkshopShape value={value as WorkshopValue}/>;
  const data = value as Partial<Tile> & { textNumber?: string | number };
  return data?.cells && data.size ? <span className="block w-24 max-w-full mx-auto"><TileDiagram tile={data as Tile} theme={theme} /></span> :
    <span className="text-xl font-black">{data?.textNumber ?? String(value)}</span>;
}

/** Pointer events support mouse, touch and pen; every placement also works with Tab + Enter. */
export function AnswerWorkspace({ question, response, onChange, submitted = false, compact = false, allowedModes, preferredMode }: Props) {
  const memory=useMemoryStudy();
  const theme = questionVisualTheme(question);
  const modes = interactionModes(question).filter(m => !allowedModes || allowedModes.includes(m));
  const [mode, setMode] = useState<AnswerMode>(response?.mode ?? (preferredMode && modes.includes(preferredMode) ? preferredMode : modes[0]));
  const [picked, setPicked] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [ghost, setGhost] = useState<{ x: number; y: number; token: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ token: string; x: number; y: number; moved: boolean; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  const helpId = useId();
  const activeMode = response?.mode ?? mode;
  const current = response ?? emptyResponse(activeMode, question);
  const b = question.visualConfig as Board;
  const tokens = activeMode === 'order' ? b.names!.map(n => ({ id: n, value: n, label: n })) :
    activeMode === 'match' ? [...new Set(b.key!.map(k => k.value))].sort((a, c) => a - c).map(n => ({ id: String(n), value: n, label: String(n) })) :
    question.options.map(o => ({ id: o.id, value: o.visualData, label: `${o.label} kartı` }));
  const place = (token: string, target: string) => {
    if (submitted) return;
    if (current.mode === 'place') onChange({ mode: 'place', optionId: token });
    else if (current.mode === 'order') onChange({ mode: 'order', slots: placeInOrder(current.slots, token, Number(target)) });
    else if (current.mode === 'match') onChange({ ...current, pairs: { ...current.pairs, [target]: token } });
    setPicked(null);
    setAnnouncement(`${token} yerleştirildi.`);
  };
  const target = (id: string, title: string, value: string | null | undefined) => (
    <button key={id} type="button" data-answer-target={id} disabled={submitted}
      aria-label={`${title}: ${value ?? 'boş'}`} aria-describedby={helpId}
      onClick={() => { if (picked !== null) place(picked, id); }}
      className={`min-h-24 min-w-20 flex-1 rounded-2xl border-2 border-dashed p-3 text-center focus-visible:outline-4 focus-visible:outline-indigo-500 ${value !== null && value !== undefined ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white'} ${picked !== null ? 'ring-2 ring-indigo-200' : ''}`}>
      <span className="block text-xs font-bold text-slate-600 mb-2">{title}</span>
      {current.mode === 'match' && <span className="qb-match-symbol"><SymbolDiagram symbol={id} /></span>}
      {value !== null && value !== undefined ? <CardValue theme={theme} value={tokens.find(t => t.id === value)?.value ?? value} /> : <span className="text-slate-500 text-sm">Buraya bırak</span>}
    </button>
  );
  const numberInput = (value: string, change: (v: string) => void, title: string) => (
    <label className="block font-bold text-slate-700">{title}
      <input type="text" inputMode="numeric" autoComplete="off" maxLength={16} value={value} disabled={submitted}
        onChange={e => change(e.target.value)} placeholder="Sonucu yaz" className="block mt-2 w-full rounded-xl border-2 border-indigo-200 bg-white p-4 text-2xl font-black text-indigo-900 focus:border-indigo-500 focus:outline-none" />
      <span className="block mt-1 text-xs font-normal text-slate-500">Tam sayı gir. Negatif sonuçlar için eksi işareti kullanabilirsin.</span>
    </label>
  );
  if(memory.locked)return <p role="status" className="text-sm text-indigo-800">Önce deseni belleğinde tut. Deseni gizlediğinde cevap alanı açılır.</p>;
  return <div ref={root} className="zp-answer-workspace space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-3 sm:p-5" aria-label="Cevap alanı">
    {!compact && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Çözme biçimi">
      {modes.map(m => <button key={m} type="button" aria-pressed={activeMode === m} disabled={submitted}
        onClick={() => { if (m === activeMode) return; setMode(m); setPicked(null); setGhost(null); onChange(emptyResponse(m, question)); setAnnouncement('Çözme biçimi değişti. Cevap alanı temizlendi.'); }}
        className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold focus-visible:outline-4 focus-visible:outline-indigo-400 ${activeMode === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>{labels[m]}</button>)}
    </div>}
    {!compact && <p id={helpId} className="text-sm text-slate-600">
      {activeMode === 'order' ? 'İpuçlarına göre tüm sırayı soldan sağa kur. Bütün yerleşimler kontrol edilecek. ' : activeMode === 'match' ? 'Sembolleri değerleriyle eşleştir, sonra toplamı yaz. Bir değeri tekrar kullanabilirsin. ' : ''}
      {['place', 'order', 'match'].includes(activeMode) ? 'Kartı sürükle veya önce karta, sonra hedefe dokun. Klavyede Tab ve Enter kullan.' : activeMode === 'choice' ? 'Cevabını seç.' : 'Şıklara bakmadan sonucu bul.'}
    </p>}
    {current.mode === 'choice' ? <div className="zp-answer-grid grid grid-cols-2 sm:grid-cols-4 gap-3">{question.options.map(o =>
      <OptionRenderer key={o.id} option={o} question={question} questionType={question.type} isSelected={current.optionId === o.id} onSelect={() => onChange({ mode: 'choice', optionId: o.id })}
        disabled={submitted} showCorrect={submitted} isCorrectOption={o.id === question.correctOptionId} />)}</div> : null}
    {current.mode === 'number' ? numberInput(current.value, value => onChange({ mode: 'number', value }), 'Cevabın') : null}
    {['place', 'order', 'match'].includes(activeMode) && <>
      <div className="flex flex-wrap justify-center gap-3" aria-label="Kartlar">{tokens.map(token => {
        const used = current.mode === 'order' && current.slots.includes(token.id);
        return <button key={token.id} type="button" disabled={submitted} aria-label={token.label} aria-pressed={picked === token.id}
          onPointerDown={e => { if (submitted || !e.isPrimary || e.button !== 0) return; suppressClick.current = false; drag.current = { token: token.id, x: e.clientX, y: e.clientY, moved: false, pointer: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { const d = drag.current; if (!d || d.pointer !== e.pointerId) return; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true; if (d.moved) setGhost({ x: e.clientX, y: e.clientY, token: d.token }); }}
          onPointerUp={e => { const d = drag.current; if (!d || d.pointer !== e.pointerId) return; if (d.moved) { suppressClick.current = true; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-answer-target]'); if (el && root.current?.contains(el)) place(d.token, el.dataset.answerTarget!); else setAnnouncement('Kart yerleştirilmedi. Bir hedef seç.'); } drag.current = null; setGhost(null); }}
          onPointerCancel={() => { drag.current = null; setGhost(null); suppressClick.current = true; }}
          onLostPointerCapture={() => { drag.current = null; setGhost(null); }}
          onClick={e => { if (suppressClick.current && e.detail !== 0) { suppressClick.current = false; return; } setPicked(picked === token.id ? null : token.id); setAnnouncement(`${token.label} seçildi. Şimdi hedefi seç.`); }}
          className={`touch-none select-none min-h-16 min-w-16 rounded-xl border-2 p-3 focus-visible:outline-4 focus-visible:outline-indigo-400 ${picked === token.id ? 'border-indigo-600 bg-indigo-100 shadow-md' : 'border-slate-200 bg-white'} ${used ? 'opacity-50' : ''}`}>
          {activeMode === 'place' && <span className="block text-xs font-bold mb-1">{token.id}</span>}<CardValue theme={theme} value={token.value} />
        </button>;
      })}</div>
      <div className="flex flex-wrap gap-2" aria-label="Yerleştirme alanları">
        {current.mode === 'place' && target('answer', 'Cevabın', current.optionId)}
        {current.mode === 'order' && current.slots.map((value, i) => target(String(i), `${i + 1}. sıra`, value))}
        {current.mode === 'match' && [...new Set(b.symbols!)].map(symbol => target(symbol, `${symbolLabel(symbol)} değeri`, current.pairs[symbol]))}
      </div>
      {current.mode === 'match' && numberInput(current.total, total => onChange({ ...current, total }), 'Sembol dizisinin toplamı')}
    </>}
    {!compact && !submitted && <button type="button" onClick={() => { onChange(emptyResponse(activeMode, question)); setPicked(null); setAnnouncement('Cevap temizlendi.'); }} className="min-h-11 text-sm font-semibold text-slate-600 underline underline-offset-4">Cevabı temizle</button>}
    {submitted && current.mode !== 'choice' && <p className="text-sm font-bold text-indigo-800">Cevabın kaydedildi. Çözüm açıklaması aşağıda.</p>}
    <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    {ghost && <div aria-hidden="true" className="fixed z-50 pointer-events-none rounded-xl border-2 border-indigo-500 bg-white p-3 shadow-xl" style={{ left: ghost.x + 12, top: ghost.y + 12 }}><CardValue theme={theme} value={tokens.find(t => t.id === ghost.token)?.value} /></div>}
  </div>;
}


