import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';
import { ArrowRight } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const ScaleRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // 12. Liquid Levels
  if (mode === 'liquid_levels') {
    const levels = visualConfig.levels || [];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
          {levels.map((lvl: number, idx: number) => {
            const fillHeight = (70 * lvl) / 100;
            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-white rounded-xl border border-slate-300 p-2 ">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect x="25" y="15" width="50" height="70" rx="4" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
                      <rect x="27" y={83 - fillHeight} width="46" height={fillHeight} rx="2" fill="#06b6d4" opacity={0.85} />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 font-semibold">%{lvl}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </React.Fragment>
            );
          })}
          <div className="flex flex-col items-center">
            <div className="w-16 h-20 sm:w-20 sm:h-24 bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-600">?</span>
            </div>
            <span className="text-xs text-indigo-600 mt-1 font-bold">Hedef</span>
          </div>
        </div>
      </div>
    );
  }

  // 15. Balance Scale
  if (mode === 'balance_scale') {
    const scales = visualConfig.scales || [];
    return (
      <div className="w-full flex flex-col items-center justify-center gap-6 p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        {scales.map((scale: any, idx: number) => (
          <div key={idx} className="flex flex-col items-center w-full max-w-sm relative">
            <div className="flex items-end justify-between w-full px-4 relative z-10 pb-1">
              {/* Left Pan */}
              <div className="flex items-center gap-1">
                {scale.left === '?' ? (
                  <span className="text-3xl font-black text-indigo-500 mb-2">?</span>
                ) : (
                  (scale.left as any[]).map((item, i) => (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                        <ShapeSvg kind={item.kind} style={{ fill: item.fill, stroke: '#1e293b', strokeWidth: 2 }} size={80} />
                      </svg>
                    </div>
                  ))
                )}
              </div>
              {/* Right Pan */}
              <div className="flex items-center gap-1">
                {scale.right === '?' ? (
                  <span className="text-3xl font-black text-indigo-500 mb-2">?</span>
                ) : (
                  (scale.right as any[]).map((item, i) => (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                        <ShapeSvg kind={item.kind} style={{ fill: item.fill, stroke: '#1e293b', strokeWidth: 2 }} size={80} />
                      </svg>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Scale Base */}
            <svg viewBox="0 0 200 40" className="w-full h-8 sm:h-10 text-slate-400 drop-">
              <line x1="20" y1="20" x2="180" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <polygon points="100,5 90,35 110,35" fill="currentColor" />
              <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="2" />
              <line x1="180" y1="0" x2="180" y2="20" stroke="currentColor" strokeWidth="2" />
              <line x1="0" y1="0" x2="40" y2="0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <line x1="160" y1="0" x2="200" y2="0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>
    );
  }

  // 32. Weight Comparison (Terazi Dengesi)
  if (mode === 'weight_comparison') {
    const scales = visualConfig.scales || [];
    return (
      <div className="w-full flex flex-wrap items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-4 sm:gap-6">
        {scales.map((scale: any, idx: number) => (
          <div key={idx} className="flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200  min-w-[140px]">
            {/* Pans and Beam */}
            <div className="flex items-center justify-between w-32 border-b-4 border-slate-600 pb-2 relative">
              {/* Left Pan */}
              <div className="flex gap-1 text-lg">{scale.left.join(' ')}</div>
              {/* Center Pivot */}
              <div className="w-3 h-3 bg-slate-800 rotate-45 absolute left-1/2 -bottom-2 -translate-x-1/2" />
              {/* Right Pan */}
              <div className="flex gap-1 text-lg">{scale.right.join(' ')}</div>
            </div>
            {/* Stand */}
            <div className="w-2 h-6 bg-slate-400 mt-2" />
            <div className="w-12 h-2 bg-slate-600 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 mt-1">{idx + 1}. Terazi (Dengede)</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
