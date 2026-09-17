import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const LogicGridRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // 1. Sequence Mode (Görsel Örüntü)
  if (mode === 'sequence') {
    const items = visualConfig.sequenceItems || [];
    return (
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 max-w-full">
          {items.map((item: any, idx: number) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <ShapeSvg kind={item.kind} style={item} size={60} />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 mt-1 font-semibold">{idx + 1}. Adım</span>
              </div>

              <div className="text-slate-500 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
              </div>
            </React.Fragment>
          ))}

          {/* Missing Step '?' */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-indigo-50/70 border-2 border-dashed border-indigo-400 rounded-xl flex items-center justify-center ">
              <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 animate-pulse" />
            </div>
            <span className="text-xs text-indigo-600 mt-1 font-bold">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 10. Number Sequence Cards
  if (mode === 'number_sequence_cards') {
    const nums = visualConfig.displayNumbers || [];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          {nums.map((n: any, idx: number) => {
            const isMissing = n === '?';
            return (
              <React.Fragment key={idx}>
                <div
                  className={`w-14 h-16 sm:w-18 sm:h-20 md:w-20 md:h-24 rounded-xl flex items-center justify-center font-mono font-bold text-xl sm:text-2xl  border-2 ${
                    isMissing
                      ? 'bg-indigo-50 border-dashed border-indigo-500 text-indigo-600 animate-pulse'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {n}
                </div>
                {idx < nums.length - 1 && (
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // 11. Symbol Coding Table Key
  if (mode === 'symbol_code_table') {
    const { mapping, targetSequence } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        {/* Key table */}
        <div className="flex items-center gap-2 sm:gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200 ">
          {mapping.map((m: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center gap-1 px-2 border-r last:border-0 border-slate-200">
              <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
                <ShapeSvg kind={m.shape} style={{ fill: m.fill, stroke: '#1e293b' }} size={70} />
              </svg>
              <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                = {m.code}
              </span>
            </div>
          ))}
        </div>

        {/* Target Sequence */}
        <div className="flex items-center gap-3 bg-indigo-50/70 px-6 py-3 rounded-xl border border-indigo-200">
          <span className="text-sm font-semibold text-indigo-900">Soru:</span>
          {targetSequence.map((s: any, idx: number) => (
            <div key={idx} className="w-10 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={s.shape} style={{ fill: s.fill, stroke: '#1e293b' }} size={70} />
              </svg>
            </div>
          ))}
          <ArrowRight className="w-4 h-4 text-indigo-500" />
          <span className="text-lg font-bold font-mono text-indigo-600">?</span>
        </div>
      </div>
    );
  }

  // 22. Cryptogram
  if (mode === 'cryptogram') {
    const pairs = visualConfig.pairs || [];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex flex-col gap-3">
          {pairs.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-4 sm:gap-6 text-xl sm:text-2xl md:text-3xl font-bold font-mono text-slate-700 bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl border border-slate-200 ">
              <span className="tracking-widest">{p.word}</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              <span className={p.code === '?' ? 'text-rose-500 border-b-4 border-rose-400 border-dashed pb-1 tracking-widest' : 'tracking-widest text-indigo-600'}>
                {p.code}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 24. Number Pyramid
  if (mode === 'number_pyramid') {
    const p = visualConfig.pyramid || []; // [A, B, C, D, E, F]
    
    const Box = ({ val }: { val: number }) => (
      <div className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-xl  border-2 transition-all ${
        val === -1 ? 'bg-indigo-50 border-indigo-400 text-indigo-600 animate-pulse' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        {val === -1 ? '?' : val}
      </div>
    );
    
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-12 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex flex-col items-center gap-2 sm:gap-4">
          {/* Row 1 */}
          <div className="flex gap-2 sm:gap-4">
            <Box val={p[0]} />
          </div>
          {/* Row 2 */}
          <div className="flex gap-2 sm:gap-4">
            <Box val={p[1]} />
            <Box val={p[2]} />
          </div>
          {/* Row 3 */}
          <div className="flex gap-2 sm:gap-4">
            <Box val={p[3]} />
            <Box val={p[4]} />
            <Box val={p[5]} />
          </div>
        </div>
      </div>
    );
  }

  // 28. Maze Path Navigation
  if (mode === 'maze_path') {
    const { gridSize, commands, targetPositions } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-6">
        {/* Commands badge row */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
          {commands.map((cmd: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl  text-xs font-semibold">
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                {idx + 1}
              </span>
              <span>{cmd.text}</span>
            </div>
          ))}
        </div>

        {/* Maze Grid */}
        <div
          className="grid gap-1.5 p-3 bg-slate-200/80 rounded-xl border border-slate-300 "
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => {
              const isStart = r === 0 && c === 0;
              const targetItem = targetPositions.find((t: any) => t.x === c && t.y === r);

              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold  transition-all ${
                    isStart
                      ? 'bg-amber-100 border-2 border-amber-400 ring-2 ring-amber-200'
                      : targetItem
                      ? 'bg-white border-2 border-indigo-300 ring-2 ring-indigo-100'
                      : 'bg-white/90 border border-slate-200'
                  }`}
                >
                  {isStart && '🚀'}
                  {targetItem && targetItem.target.symbol}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 29. Logic Grid Puzzle
  if (mode === 'logic_grid') {
    const { scenarioTitle, clues } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        <div className="bg-indigo-600 text-white font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-wider">
          {scenarioTitle}
        </div>
        <div className="w-full max-w-md flex flex-col gap-2.5 bg-white p-5 rounded-xl border border-slate-200 ">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Verilen İpuçları:</div>
          {clues.map((clue: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{clue}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 35. Word Scramble Logic
  if (mode === 'word_scramble_logic') {
    const { original, category } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-6 md:p-10 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Kategori: {category}
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          {original.split(' ').map((char: string, idx: number) => (
            <div key={idx} className="w-12 h-14 sm:w-16 sm:h-18 bg-white border-2 border-slate-300  rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black text-slate-800">
              {char}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 37. Direction Path Grid (Yön ve Rota)
  if (mode === 'grid_path') {
    const steps = visualConfig.steps || [];
    const gridSymbols = visualConfig.gridSymbols || ['star', 'circle', 'diamond', 'triangle', 'clover', 'heart', 'cross', 'pacman', 'ring'];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
          {steps.map((step: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl  text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center p-3 bg-white rounded-xl border border-slate-200 ">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {gridSymbols.map((sym: any, i: number) => (
              <div
                key={i}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center p-2 relative  ${
                  i === 0
                    ? 'bg-amber-50 border-2 border-amber-400 ring-2 ring-amber-200'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                {i === 0 && (
                  <span className="absolute -top-2 -left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md  z-10">
                    Başlangıç
                  </span>
                )}
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <ShapeSvg kind={sym} style={{ fill: '#4f46e5', stroke: '#1e293b', strokeWidth: 2 }} size={65} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
