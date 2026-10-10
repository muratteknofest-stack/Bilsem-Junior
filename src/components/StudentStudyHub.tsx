import { AVAILABLE_CATEGORIES } from '../features/student/available-categories';
import React, { useState } from 'react';
import { ArrowRight, Bookmark, Check, Compass, Play, RotateCcw } from 'lucide-react';
import { COGNITIVE_CATEGORY_LABELS, type CognitiveCategory, type SkillMastery } from '../types';
import { recommendStudy, resumableExam } from '../features/student/study-hub-model';

interface Props {
  masteries: SkillMastery[];
  unresolved: number;
  savedExam: unknown;
  favorites: CognitiveCategory[];
  onFavoriteChange: (favorites: CognitiveCategory[]) => void;
  onPractice: (category?: string) => void;
  onMistakes: () => void;
  onResumeExam: () => void;
}

export function StudentStudyHub({ masteries, unresolved, savedExam, favorites,
  onFavoriteChange, onPractice, onMistakes, onResumeExam }: Props) {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const recommendation = recommendStudy(masteries, unresolved);
  const exam = resumableExam(savedExam);
  const toggle = (category: CognitiveCategory) => {
    const exists = favorites.includes(category);
    if (!exists && favorites.length >= 3) return;
    onFavoriteChange(exists ? favorites.filter(item => item !== category) : [...favorites, category]);
    setFeedback(`${COGNITIVE_CATEGORY_LABELS[category]} ${exists ? 'listenden çıkarıldı' : 'listene eklendi'}.`);
  };

  return (
    <section aria-label="Kişisel çalışma merkezim" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative min-w-0 overflow-hidden rounded-3xl bg-indigo-950 p-5 sm:p-7 text-white">
        <div aria-hidden="true" className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[24px] border-indigo-400/10" />
        <div className="relative flex h-full flex-col items-start">
          <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-indigo-200">
            {exam ? <RotateCcw size={16} /> : <Compass size={16} />}
            {exam ? 'KALDIĞIN YERDEN' : 'SIRADAKİ ADIMIN'}
          </span>
          <h2 className="mt-4 max-w-lg text-xl sm:text-2xl font-extrabold leading-tight">
            {exam ? 'Denemen seni bekliyor' : recommendation.title}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-indigo-100">
            {exam ? `${exam.total} sorunun ${exam.answered} tanesini yanıtladın. Kayıtlı cevaplarınla devam edebilirsin.` : recommendation.reason}
          </p>
          {exam && <progress aria-label="Denemede yanıtlanan sorular" value={exam.answered} max={exam.total}
            className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full accent-amber-300" />}
          <button type="button" onClick={exam ? onResumeExam : recommendation.kind === 'mistakes'
            ? onMistakes : () => onPractice(recommendation.category)}
            className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-950 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <Play size={16} /> {exam ? 'Denemeye devam et' : recommendation.action} <ArrowRight size={16} />
          </button>
          {exam && <button type="button" onClick={() => onPractice()} className="mt-3 min-h-11 text-xs text-indigo-100 underline underline-offset-4 hover:text-white">Şimdilik karışık pratik yap</button>}
        </div>
      </div>

      <div className="zp-dashboard-surface min-w-0 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><Bookmark size={19} className="text-indigo-500" /> Çalışma listem</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">En çok çalışmak istediğin 3 alanı buraya ekle.</p>
          </div>
          <button type="button" aria-expanded={editing} aria-controls="study-favorite-picker" onClick={() => setEditing(!editing)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950">
            {editing ? 'Tamam' : 'Düzenle'}
          </button>
        </div>
        {favorites.length > 0 ? <div className="mt-4 space-y-2">
          {favorites.map(category => <button key={category} type="button" onClick={() => onPractice(category)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:bg-indigo-950">
            <span className="min-w-0">{COGNITIVE_CATEGORY_LABELS[category]}</span><ArrowRight size={16} className="shrink-0 text-indigo-500" />
          </button>)}
        </div> : <button type="button" onClick={() => setEditing(true)} className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center dark:border-indigo-800 dark:bg-indigo-950/30">
          <Bookmark size={24} className="text-indigo-400" /><span className="text-sm font-bold">İlk çalışma alanını seç</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Bir dokunuşla pratiğe başla.</span>
        </button>}
        {editing && <fieldset id="study-favorite-picker" className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <legend className="sr-only">Favori çalışma alanları</legend>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{favorites.length}/3 alan seçili{favorites.length === 3 ? ' · Yeni alan eklemek için bir seçimi kaldır.' : ''}</p>
          <div className="flex flex-wrap gap-2">{AVAILABLE_CATEGORIES.map(category => {
            const selected = favorites.includes(category);
            return <button type="button" key={category} aria-pressed={selected} disabled={!selected && favorites.length >= 3} onClick={() => toggle(category)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'border-zinc-200 hover:border-indigo-300 dark:border-zinc-700'}`}>
              {selected && <Check size={13} />}{COGNITIVE_CATEGORY_LABELS[category]}
            </button>;
          })}</div>
        </fieldset>}
        <p role="status" className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{feedback}</p>
      </div>
    </section>
  );
}


