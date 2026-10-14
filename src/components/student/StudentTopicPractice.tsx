import React, { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { QUESTION_TYPE_LABELS, type QuestionType } from '../../types';
import { LEARNING_TOPICS } from '../../features/student/learning-topics';
import type { SchoolGrade } from '../../features/questions/quality-policy';

export function StudentTopicPractice({ grade, onStart }: {
  grade: SchoolGrade; onStart: (topic: QuestionType) => void;
}) {
  const [topic, setTopic] = useState<QuestionType>(LEARNING_TOPICS[0]);
  return <section aria-label="Konuya göre test" className="min-w-0 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6 dark:border-indigo-900 dark:bg-indigo-950/40">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-indigo-950 dark:text-indigo-100"><BookOpen size={22} aria-hidden="true" />Konuya göre test çöz</h2>
      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">{grade}. sınıf · {LEARNING_TOPICS.length} konu</span>
    </div>
    <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-200">Çalışmak istediğin soru türünü seç. Testte yalnızca bu konunun sınıfına uygun soruları gelir.</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 text-sm font-semibold text-indigo-950 dark:text-indigo-100">
        <span>Soru konusu</span>
        <select aria-label="Test konusu" value={topic} onChange={e => setTopic(e.target.value as QuestionType)} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-indigo-200 bg-white p-3 text-base text-slate-900">
          {LEARNING_TOPICS.map(type => <option key={type} value={type}>{QUESTION_TYPE_LABELS[type]}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => onStart(topic)} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white hover:bg-indigo-800 focus-visible:outline-4 focus-visible:outline-indigo-300">Konu testini aç<ArrowRight size={18} aria-hidden="true" /></button>
    </div>
    <p className="mt-3 text-xs text-indigo-800 dark:text-indigo-200">Zorluk düzeyini sonraki ekranda seçebilirsin.</p>
  </section>;
}
