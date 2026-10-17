import React from 'react';
import { VisualExplanation } from '../../../types';
import { Lightbulb, CheckCircle2, Sparkles, Compass, BookOpen } from 'lucide-react';

interface VisualExplanationOverlayProps {
  explanation: VisualExplanation;
  correctOptionId: string;
  onOpenGlossary?: () => void;
}

export const VisualExplanationOverlay: React.FC<VisualExplanationOverlayProps> = ({
  explanation,
  correctOptionId,
  onOpenGlossary,
}) => {
  const handleOpenGlossary = () => {
    if (onOpenGlossary) {
      onOpenGlossary();
    } else {
      window.dispatchEvent(new CustomEvent('open-glossary'));
    }
  };
  return (
    <div className="w-full mt-4 p-4 md:p-5 rounded-xl bg-amber-50/80 border-2 border-amber-200/80 text-slate-800  animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center ">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-sm md:text-base text-amber-950 flex items-center gap-1.5">
            <span>Çözüm ve Mantık Kuralı</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </h4>
          <span className="text-xs font-semibold text-amber-800">{explanation.ruleTitle}</span>
        </div>
      </div>

      {/* Summary statement */}
      <p className="text-sm text-slate-700 font-medium mb-3 bg-white/70 p-3 rounded-xl border border-amber-100">
        {explanation.summary}
      </p>

      {/* Step by step logic */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Nasıl Düşünmeliyiz?
        </span>
        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
          {explanation.steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Correct answer callout & Glossary Link */}
      <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-emerald-800">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Doğru Seçenek: <strong>{correctOptionId}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          {explanation.visualHint?.details && (
            <div className="flex items-center gap-1 text-slate-500">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>{explanation.visualHint.details}</span>
            </div>
          )}

          <button
            onClick={handleOpenGlossary}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all cursor-pointer  active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Terim Sözlüğünde Aç</span>
          </button>
        </div>
      </div>
    </div>
  );
};
