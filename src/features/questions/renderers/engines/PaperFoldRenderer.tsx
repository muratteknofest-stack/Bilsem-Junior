import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const PaperFoldRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // 18. Paper Folding
  if (mode === 'paper_folding') {
    const steps = visualConfig.steps || [];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 sm:gap-6 flex-wrap justify-center">
          {steps.map((step: any, idx: number) => (
            <React.Fragment key={idx}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded border-2 border-slate-300 shadow flex items-center justify-center relative overflow-hidden">
                {step.type === 'paper_full' && (
                  <div className="w-full h-full bg-indigo-50" />
                )}
                {step.type === 'paper_folded_half' && (
                  <>
                    <div className="absolute left-0 w-1/2 h-full bg-slate-100 border-r-2 border-dashed border-slate-300" />
                    <div className="absolute right-0 w-1/2 h-full bg-indigo-100 " />
                  </>
                )}
                {step.type.startsWith('paper_folded_hole_') && (
                  <>
                    <div className="absolute left-0 w-1/2 h-full bg-slate-100 border-r-2 border-dashed border-slate-300" />
                    <div className="absolute right-0 w-1/2 h-full bg-indigo-100  flex items-center justify-center relative">
                      {/* Place a hole */}
                      <div className={`w-4 h-4 bg-white rounded-full  absolute ${
                        step.type.includes('center') ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                        step.type.includes('top_left') ? 'top-2 left-2' :
                        'bottom-2 right-2'
                      }`} />
                    </div>
                  </>
                )}
              </div>
              {idx < steps.length - 1 && <ArrowRight className="w-5 h-5 text-indigo-400" />}
            </React.Fragment>
          ))}
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded border-2 border-dashed border-indigo-400 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-500 animate-pulse">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 30. Punch Folding (Kağıt Delme & Katlama)
  if (mode === 'punch_folding') {
    const { foldType, punchPosition } = visualConfig;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
          {/* Step 1: Open sheet */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl border-2 border-slate-300  flex items-center justify-center relative">
              <div className="w-full h-full bg-indigo-50/50 rounded-lg" />
              <div className="absolute inset-0 border-r-2 border-dashed border-indigo-400 w-1/2" />
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">1. Katlama</span>
          </div>

          <ArrowRight className="w-5 h-5 text-indigo-400" />

          {/* Step 2: Folded + Punched */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl border-2 border-slate-300  flex items-center justify-center relative overflow-hidden">
              <div className="w-1/2 h-full bg-indigo-100 border-r-2 border-slate-400 ml-auto flex items-center justify-center relative">
                {/* Punch hole */}
                <div className={`w-3.5 h-3.5 bg-slate-800 rounded-full  absolute ${
                  punchPosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                  punchPosition === 'top_left' ? 'top-2 left-2' :
                  'bottom-2 right-2'
                }`} />
              </div>
            </div>
            <span className="text-[11px] text-indigo-600 font-bold">2. Delik Açma</span>
          </div>

          <ArrowRight className="w-5 h-5 text-indigo-400" />

          {/* Step 3: Question mark */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50/70 rounded-xl border-2 border-dashed border-indigo-400 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <span className="text-[11px] text-indigo-600 font-bold">Tam Açılım ?</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
