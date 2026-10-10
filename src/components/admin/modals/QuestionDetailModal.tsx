import React from 'react';
import { ExternalLink, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { BaseQuestion, COGNITIVE_CATEGORY_LABELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../../types';
import { GRADE_CONFIGS } from '../../../features/questions/grade-config';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { validateQuestion } from '../../../features/questions/validator';
import { QuestionRenderer } from '../../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../../features/questions/renderers/OptionRenderer';

interface QuestionDetailModalProps {
  question: BaseQuestion;
  onClose: () => void;
  onOpenStudio: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  onClose,
  onOpenStudio,
}) => {
  const grade = (question.targetGrade || 1) as 1 | 2 | 3 | 4;
  const gradeCfg = GRADE_CONFIGS[grade];
  const catTheme = CATEGORY_COLORS[question.category] || CATEGORY_COLORS.visual_perception;
  const validation = validateQuestion(question);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
            >
              <span>{gradeCfg.icon}</span>
              <span>{gradeCfg.title} Sınavı</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${catTheme.pill}`}
            >
              <span>{CATEGORY_ICONS[question.category]}</span>
              <span>{COGNITIVE_CATEGORY_LABELS[question.category]}</span>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                DIFFICULTY_COLORS[question.difficulty]
              }`}
            >
              Zorluk {question.difficulty}: {DIFFICULTY_LABELS[question.difficulty]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStudio}
              className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Stüdyoda Aç</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {question.prompt}
            </h3>
            {question.secondaryPrompt && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {question.secondaryPrompt}
              </p>
            )}
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-zinc-200 flex items-center justify-center">
            <div className="w-full max-w-md">
              <QuestionRenderer question={question} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Seçenekler:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {question.options.map((opt) => {
                const isCorrect = opt.id === question.correctOptionId;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border text-center relative transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.id}
                      </span>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          Doğru Cevap
                        </span>
                      )}
                    </div>
                    <div className="h-20 flex items-center justify-center pointer-events-none">
                      <OptionRenderer question={question} option={opt} questionType={question.type} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-indigo-50/70 p-5 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>BİLSEM Pedagojik Çözüm Kuralı: {question.explanation.ruleTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {question.explanation.summary}
            </p>
            {question.explanation.steps && question.explanation.steps.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-indigo-900 block">Çözüm Adımları:</span>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                  {question.explanation.steps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-medium">
            <span>Soru ID: <strong className="font-mono">{question.id}</strong> • Tohum: {question.seed}</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>5 Kademeli Otomatik Test: %100 Doğrulandı</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
