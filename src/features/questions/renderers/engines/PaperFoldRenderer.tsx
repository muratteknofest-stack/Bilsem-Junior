import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const PaperFoldRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // -------------------------------------------------------------
  // 18. Paper Folding (3B Kağıt Katlama Simülasyonu)
  // -------------------------------------------------------------
  if (mode === 'paper_folding') {
    const steps = visualConfig.steps || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
            📄 3B Kağıt Katlama & Açılım
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-5 flex-wrap justify-center">
          {steps.map((step: any, idx: number) => (
            <React.Fragment key={idx}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl border-2 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] flex items-center justify-center relative overflow-hidden transition-transform hover:-translate-y-0.5">
                {step.type === 'paper_full' && (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Açık Kağıt</span>
                  </div>
                )}
                {step.type === 'paper_folded_half' && (
                  <>
                    <div className="absolute left-0 w-1/2 h-full bg-slate-100 border-r-2 border-dashed border-indigo-300 shadow-inner" />
                    <div className="absolute right-0 w-1/2 h-full bg-gradient-to-br from-indigo-100 to-indigo-200 border-l border-white/50 shadow-md" />
                  </>
                )}
                {step.type.startsWith('paper_folded_hole_') && (
                  <>
                    <div className="absolute left-0 w-1/2 h-full bg-slate-100 border-r-2 border-dashed border-indigo-300 shadow-inner" />
                    <div className="absolute right-0 w-1/2 h-full bg-gradient-to-br from-indigo-100 to-indigo-200 border-l border-white/50 shadow-md flex items-center justify-center relative">
                      {/* 3D Punched Hole with Depth */}
                      <div
                        className={`w-4 h-4 rounded-full bg-slate-800 shadow-inner border border-slate-900 absolute ${
                          step.type.includes('center')
                            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                            : step.type.includes('top_left')
                            ? 'top-2.5 left-2.5'
                            : 'bottom-2.5 right-2.5'
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>
              {idx < steps.length - 1 && <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />}
            </React.Fragment>
          ))}

          <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />

          {/* Missing Step */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50/80 rounded-xl border-2 border-dashed border-indigo-400 shadow-[0_5px_0_0_#c7d2fe] flex flex-col items-center justify-center gap-1">
            <span className="text-3xl font-black text-indigo-600 animate-pulse">?</span>
            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Açılım</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 30. Punch Folding (Kağıt Delme & Çift Katlama)
  // -------------------------------------------------------------
  if (mode === 'punch_folding') {
    const { foldType, punchPosition } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
            🕳️ Delik Delme & Katlama Analizi
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
          {/* Step 1: Open sheet with fold axis */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] flex items-center justify-center relative overflow-hidden">
              <div className="w-full h-full bg-indigo-50/60" />
              <div className="absolute inset-0 border-r-2 border-dashed border-indigo-500 w-1/2" />
              {foldType === 'quarter_fold' && (
                <div className="absolute inset-0 border-b-2 border-dashed border-indigo-500 h-1/2" />
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
              1. Katlama
            </span>
          </div>

          <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />

          {/* Step 2: Folded + Punched */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] flex items-center justify-center relative overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-br from-indigo-100 to-indigo-200 border-l border-white/60 shadow-md ml-auto flex items-center justify-center relative">
                {/* 3D Punched hole */}
                <div
                  className={`w-4 h-4 bg-slate-800 rounded-full shadow-inner border border-slate-900 absolute ${
                    punchPosition === 'center'
                      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                      : punchPosition === 'top_left'
                      ? 'top-2.5 left-2.5'
                      : 'bottom-2.5 right-2.5'
                  }`}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-sm">
              2. Delik Açma
            </span>
          </div>

          <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />

          {/* Step 3: Question mark */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50/80 rounded-2xl border-2 border-dashed border-indigo-400 shadow-[0_5px_0_0_#c7d2fe] flex flex-col items-center justify-center gap-1">
              <HelpCircle className="w-8 h-8 text-indigo-600 animate-pulse drop-shadow-sm" />
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Açılım</span>
            </div>
            <span className="text-xs font-black text-indigo-600">Tam Açılım ?</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
