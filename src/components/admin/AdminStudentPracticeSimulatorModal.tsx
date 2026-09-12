import React, { useState, useEffect } from 'react';
import { BaseQuestion, VisualOption } from '../../types';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../../lib/sound';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';

interface AdminStudentPracticeSimulatorModalProps {
  question: BaseQuestion;
  onClose: () => void;
}

export const AdminStudentPracticeSimulatorModal: React.FC<
  AdminStudentPracticeSimulatorModalProps
> = ({ question, onClose }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(question.estimatedSeconds || 40);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Countdown timer simulation
  useEffect(() => {
    if (!isTimerRunning || isSubmitted) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isSubmitted]);

  const handleSelectOption = (option: VisualOption) => {
    if (isSubmitted) return;
    sound.playClick();
    setSelectedOptionId(option.id);
    setIsSubmitted(true);
    setIsTimerRunning(false);

    const isCorrect = option.id === question.correctOptionId;
    if (isCorrect) {
      sound.playSuccess();
    } else {
      sound.playError();
    }
    setShowExplanation(true);
  };

  const handleReset = () => {
    sound.playClick();
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setShowExplanation(false);
    setTimerSeconds(question.estimatedSeconds || 40);
    setIsTimerRunning(true);
  };

  const isCorrect = selectedOptionId === question.correctOptionId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Simulator Banner */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Öğrenci Deneyimi Simülatörü
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  İnteraktif Test
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Öğrencinin bu soruyu çözerken gördüğü arayüzü, seçenek tıklamalarını ve ses efektlerini test edin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Yeniden Başlat"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Tekrar Çöz</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Simulator Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Top Timer & Status Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-zinc-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Kalan Süre:</span>
              <span
                className={`font-mono text-sm px-2 py-0.5 rounded-md ${
                  timerSeconds <= 10
                    ? 'bg-rose-100 text-rose-800 font-black animate-pulse'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {timerSeconds} sn
              </span>
            </div>

            {isSubmitted && (
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  isCorrect
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tebrikler, Doğru Cevap! (+15 XP)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Yanlış Cevap. Doğru Seçenek: {question.correctOptionId}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Question Prompt */}
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
              {question.prompt}
            </h2>
            {question.secondaryPrompt && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {question.secondaryPrompt}
              </p>
            )}
          </div>

          {/* Question SVG Main Visual */}
          <div className="bg-slate-50/70 p-4 sm:p-6 rounded-xl border border-zinc-200  flex items-center justify-center min-h-[220px]">
            <div className="w-full max-w-[420px]">
              <QuestionRenderer question={question} />
            </div>
          </div>

          {/* Options Grid (Interactive) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Bir seçenek işaretleyin:</span>
              {!isSubmitted && <span className="text-purple-600">Tek tıkla yanıtlayın</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {question.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isTargetCorrect = opt.id === question.correctOptionId;

                let cardBorder = 'border-zinc-200 hover:border-purple-300 hover:bg-purple-50/40';
                let badgeBg = 'bg-slate-100 text-slate-700';

                if (isSubmitted) {
                  if (isTargetCorrect) {
                    cardBorder = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400';
                    badgeBg = 'bg-emerald-600 text-white';
                  } else if (isSelected && !isTargetCorrect) {
                    cardBorder = 'border-rose-500 bg-rose-50 ring-2 ring-rose-400';
                    badgeBg = 'bg-rose-600 text-white';
                  } else {
                    cardBorder = 'border-zinc-200 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-3 rounded-xl border bg-white flex flex-col items-center gap-2 transition-all cursor-pointer text-center relative ${cardBorder}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${badgeBg}`}>
                        {opt.id}
                      </span>
                      {isSubmitted && isTargetCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      {isSubmitted && isSelected && !isTargetCorrect && (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>

                    <div className="w-full flex items-center justify-center min-h-[90px] py-1 pointer-events-none">
                      <OptionRenderer option={opt} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation Drawer */}
          {showExplanation && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Pedagojik Çözüm & Akıl Yürütme Adımları</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {question.explanation.summary}
              </p>

              {question.explanation.steps && question.explanation.steps.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-purple-100">
                  <span className="text-[11px] font-bold text-purple-900 block">
                    Adım Adım Analiz:
                  </span>
                  <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside">
                    {question.explanation.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Soruyu Sıfırla & Yeniden Dene</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Simülasyondan Çık
          </button>
        </div>
      </div>
    </div>
  );
};
