import React, { useState } from 'react';
import type { BaseQuestion } from '../types';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import { MemoryStudy } from '../features/questions/renderers/MemoryStudy';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';

export interface ReviewedAnswer { id: string; question: BaseQuestion; response: QuestionResponse; correct: boolean; }
const readOnly = () => undefined;
export function AnswerHistory({ items }: { items: ReviewedAnswer[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(item => item.id === selectedId);
  if (!items.length) return null;
  return <section aria-label="Önceki cevaplarım" className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4 text-left">
    <h2 className="font-bold text-slate-900">Önceki cevaplarım</h2>
    <p className="text-sm text-slate-600">Bir soruya dokunarak kendi cevabını ve doğru çözümü incele.</p>
    <nav aria-label="Cevap geçmişi" className="flex flex-wrap gap-2">{items.map((item, i) => <button key={item.id} type="button" aria-pressed={item.id === selectedId} onClick={() => setSelectedId(item.id)} className={`min-h-11 rounded-lg border px-3 font-semibold ${item.correct ? 'border-emerald-300 text-emerald-800' : 'border-amber-300 text-amber-900'}`}>
      {i + 1}. soru · {item.correct ? 'Doğru' : 'Yanlış'}
    </button>)}</nav>
    {selected && <div className="space-y-4" key={selected.id}>
      <h3 className="font-bold">{selected.question.prompt}</h3>
      {selected.question.secondaryPrompt && <p>{selected.question.secondaryPrompt}</p>}
      <MemoryStudy question={selected.question} review><QuestionRenderer question={selected.question} />
        <AnswerWorkspace question={selected.question} response={selected.response} submitted onChange={readOnly} />
      </MemoryStudy>
      <p className="font-semibold">{selected.correct ? 'Cevabın doğru.' : 'Cevabın yanlış. Doğru cevap ve çözümü aşağıda.'}</p>
      <VisualExplanationOverlay explanation={selected.question.explanation} correctOptionId={selected.question.correctOptionId} />
      <button type="button" onClick={() => setSelectedId(null)} className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white">İncelemeyi kapat</button>
    </div>}
  </section>;
}
