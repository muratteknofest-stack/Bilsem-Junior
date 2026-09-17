import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ArrowRight, Settings } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const MechanicsRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // 17. Gear System
  if (mode === 'gear_system') {
    const gears = visualConfig.gears || [];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-0">
          {gears.map((g: any, idx: number) => {
            // Calculate a pseudo-size
            const w = g.size * 1.5;
            return (
              <div key={idx} className="flex flex-col items-center -mx-2 relative z-10" style={{ zIndex: gears.length - idx }}>
                <div 
                  className="flex items-center justify-center rounded-full bg-slate-200 border-4 border-slate-400 "
                  style={{ width: w, height: w, backgroundColor: g.color }}
                >
                  <div className="w-1/3 h-1/3 rounded-full bg-white border-2 border-slate-600  flex items-center justify-center text-[10px] font-bold">
                    {g.id}
                  </div>
                </div>
                {/* Direction Indicator */}
                <div className="mt-2 text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded  border border-slate-200">
                  {g.startDir === 'clockwise' ? '↻ Sağ' : g.startDir === 'counter_clockwise' ? '↺ Sol' : '?'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 23. Operation Machine
  if (mode === 'operation_machine') {
    const pairs = visualConfig.pairs || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-full max-w-sm flex flex-col gap-4 relative">
          <div className="absolute top-0 bottom-0 left-1/2 w-16 bg-slate-200 -translate-x-1/2 rounded-full z-0 " />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white font-bold px-4 py-6 rounded-xl z-10  flex items-center justify-center min-w-[80px]">
            <Settings className="w-8 h-8 animate-spin-slow text-indigo-300" />
          </div>
          
          {pairs.map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center w-full relative z-20">
              <div className="w-24 h-16 bg-white border-2 border-slate-300 rounded-xl shadow flex items-center justify-center text-2xl font-bold text-slate-700">
                {p.in}
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-16 h-8 opacity-0">spacer</div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className={`w-24 h-16 border-2 rounded-xl shadow flex items-center justify-center text-2xl font-bold ${p.out === '?' ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-white border-slate-300 text-slate-700'}`}>
                {p.out}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
