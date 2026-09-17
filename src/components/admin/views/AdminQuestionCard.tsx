import React from 'react';
import { BaseQuestion, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS, COGNITIVE_CATEGORY_LABELS } from '../../../types';
import { GRADE_CONFIGS } from '../../../features/questions/grade-config';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { QuestionRenderer } from '../../../features/questions/renderers/QuestionRenderer';
import { ALL_GRADES } from '../../../features/questions/grade-config';
import { sound } from '../../../lib/sound';
import { CheckSquare, Square, Eye, Edit3, ExternalLink, Trash2, Play } from 'lucide-react';

interface AdminQuestionCardProps {
  q: BaseQuestion;
  isSelected: boolean;
  toggleSelectQuestion: (id: string) => void;
  setActiveQuestion: (q: BaseQuestion) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  setActiveSimulatorQuestion: (q: BaseQuestion) => void;
  setIsEditModalOpen: (open: boolean) => void;
  onInspectInStudio: (type: any, seed: number, difficulty: any) => void;
  handleDuplicate: (id: string, grade: 1 | 2 | 3 | 4) => void;
  handleDelete: (id: string, prompt: string) => void;
}

export const AdminQuestionCard: React.FC<AdminQuestionCardProps> = ({
  q, isSelected, toggleSelectQuestion, setActiveQuestion, setIsDetailModalOpen,
  setActiveSimulatorQuestion, setIsEditModalOpen, onInspectInStudio,
  handleDuplicate, handleDelete
}) => {
  const grade = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
  const gradeCfg = GRADE_CONFIGS[grade];
  const catTheme = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.visual_perception;

  return (
    <div
      className={`bg-white rounded-xl border p-5 space-y-4 transition-all flex flex-col justify-between ${
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-200'
          : 'border-zinc-200 hover:border-purple-300'
      }`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleSelectQuestion(q.id)}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title={isSelected ? 'Seçimi Kaldır' : 'Soruyu Seç'}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-purple-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
              )}
            </button>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
            >
              <span>{gradeCfg.icon}</span>
              <span>{gradeCfg.title}</span>
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
              DIFFICULTY_COLORS[q.difficulty]
            }`}
          >
            Zorluk {q.difficulty}: {DIFFICULTY_LABELS[q.difficulty]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${catTheme.pill}`}
          >
            <span>{CATEGORY_ICONS[q.category]}</span>
            <span>{COGNITIVE_CATEGORY_LABELS[q.category]}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            #{q.id.replace('q_', '')}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-zinc-200/80">
          <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {q.prompt}
          </h4>
          {q.secondaryPrompt && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {q.secondaryPrompt}
            </p>
          )}
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>{QUESTION_TYPE_LABELS[q.type]}</span>
            <span className="font-mono text-emerald-700 font-bold">
              Doğru: {q.correctOptionId}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl border border-zinc-200 overflow-hidden flex items-center justify-center min-h-[140px]">
        <div className="w-full max-w-[260px] pointer-events-none scale-90">
          <QuestionRenderer question={q} />
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              sound.playClick();
              setActiveQuestion(q);
              setIsDetailModalOpen(true);
            }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            title="Soruyu tam ekranda ve çözümüyle incele"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveSimulatorQuestion(q);
            }}
            className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Öğrenci Gibi Çöz (Simülatör)"
          >
            <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
            <span className="text-[11px] font-bold">Çöz</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveQuestion(q);
              setIsEditModalOpen(true);
            }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            title="Soru parametrelerini ve metinlerini düzenle"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onInspectInStudio(q.type, q.seed, q.difficulty);
            }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            title="Soru Mimarı & SVG Stüdyosunda Aç"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleDuplicate(q.id, Number(e.target.value) as 1 | 2 | 3 | 4);
                e.target.value = '';
              }
            }}
            className="text-[11px] font-bold p-1.5 rounded-xl border border-zinc-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer focus:outline-hidden"
            title="Başka bir sınıf düzeyine kopyala"
          >
            <option value="" disabled>
              Sınıfa Çoğalt...
            </option>
            {ALL_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}. Sınıfa Kopyala
              </option>
            ))}
          </select>

          <button
            onClick={() => handleDelete(q.id, q.prompt)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-zinc-200 transition-colors cursor-pointer"
            title="Soruyu Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
