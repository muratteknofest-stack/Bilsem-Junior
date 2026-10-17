import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg, PALETTE } from '../../../../lib/svg-primitives';
import { HelpCircle } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const MatrixRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const visualConfig = (question.visualConfig || {}) as Record<string, any>;

  // 2. Matrix 2x2 Mode
  if (mode === 'matrix_2x2') {
    const grid = visualConfig.grid || [];
    return (
      <div className="w-full flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 p-3 sm:p-5 bg-slate-200/90 rounded-3xl shadow-inner">
          {/* Row 0, Col 0 */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-3xl border-2 border-slate-300/90 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-3 sm:p-4 transition-all">
            {grid[0]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[0][0].kind} style={grid[0][0]} size={78} />
              </svg>
            )}
          </div>

          {/* Row 0, Col 1 */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-3xl border-2 border-slate-300/90 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-3 sm:p-4 transition-all">
            {grid[0]?.[1] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[0][1].kind} style={grid[0][1]} size={78} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 0 */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-3xl border-2 border-slate-300/90 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-3 sm:p-4 transition-all">
            {grid[1]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[1][0].kind} style={grid[1][0]} size={78} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 1 (The Missing Question Cell) */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-indigo-50 border-3 border-dashed border-indigo-500 rounded-3xl shadow-[0_8px_0_0_#c7d2fe] flex flex-col items-center justify-center gap-1">
            <HelpCircle className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-600 animate-pulse drop-shadow-sm" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-400">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Matrix 3x3 Mode
  if (mode === 'matrix_3x3') {
    const rawGrid = visualConfig.grid || [];
    const color = visualConfig.color || PALETTE.indigo;
    
    // Support both 2D grid ([[a,b,c],...]) and flat 1D array ([a,b,c,...])
    const flatCells = Array.isArray(rawGrid)
      ? rawGrid.flatMap((item: any) => (Array.isArray(item) ? item : [item]))
      : [];

    return (
      <div className="w-full flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2.5 sm:p-5 bg-slate-200/90 rounded-3xl shadow-inner">
          {flatCells.map((cell: any, idx: number) => {
            const isMissing = !cell || cell === '?' || (typeof cell === 'object' && (cell.isHidden || cell.isMissing || cell.kind === '?'));
            const kind = typeof cell === 'string' ? cell : cell?.kind;
            const cellFill = (typeof cell === 'object' && cell?.fill) ? cell.fill : color;
            return (
              <div
                key={idx}
                className={`w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-3xl flex items-center justify-center p-2 sm:p-3 transition-all ${
                  isMissing
                    ? 'bg-indigo-50 border-3 border-dashed border-indigo-400 shadow-[0_5px_0_0_#c7d2fe]'
                    : 'bg-white border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1]'
                }`}
              >
                {isMissing ? (
                  <HelpCircle className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 animate-pulse drop-shadow-sm" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                    <ShapeSvg kind={kind as any} style={{ ...(typeof cell === 'object' ? cell : {}), fill: cellFill, stroke: '#0f172a' }} size={70} />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 16. Shape Grid (4x4 or other N x N without specific matrix dividers)
  if (mode === 'shape_grid') {
    const grid = visualConfig.grid || [];
    const size = visualConfig.gridSize || 4;
    return (
      <div className="w-full flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner">
        <div 
          className="grid gap-2 sm:gap-3.5 p-3 sm:p-5 bg-slate-200/90 rounded-3xl shadow-inner"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((cell: any, idx: number) => (
            <div key={idx} className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] flex items-center justify-center p-1.5 sm:p-2.5">
              {cell.isHidden ? (
                <span className="text-2xl sm:text-3xl font-black text-indigo-500 animate-pulse">?</span>
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                  <ShapeSvg kind={cell.kind} style={{ fill: cell.fill, stroke: '#1e293b', strokeWidth: 2 }} size={76} />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 34. Raven Matrix
  if (mode === 'raven_matrix') {
    return (
      <div className="w-full flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-5 bg-slate-200/90 rounded-3xl shadow-inner">
          {/* Row 1 */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 border-slate-700 rounded-lg shadow-sm" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-3 border-slate-700 shadow-sm" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center relative">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 border-slate-700 rounded-lg flex items-center justify-center shadow-sm">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-slate-700" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 border-slate-700 rotate-45 rounded-lg shadow-sm" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-10 sm:w-14 h-1 sm:h-1.5 bg-slate-700 rounded-full" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center relative">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 border-slate-700 rotate-45 rounded-lg flex items-center justify-center shadow-sm">
              <div className="w-10 sm:w-14 h-1 sm:h-1.5 bg-slate-700 rounded-full" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 border-dashed border-slate-700 rounded-lg" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center">
            <div className="w-5 h-5 sm:w-7 sm:h-7 bg-slate-700 rounded-full shadow-sm" />
          </div>
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-indigo-50 rounded-2xl sm:rounded-3xl border-3 border-dashed border-indigo-400 shadow-[0_5px_0_0_#c7d2fe] flex items-center justify-center">
            <HelpCircle className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 animate-pulse drop-shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

