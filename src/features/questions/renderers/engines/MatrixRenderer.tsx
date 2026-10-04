import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg, PALETTE } from '../../../../lib/svg-primitives';
import { HelpCircle } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const MatrixRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // 2. Matrix 2x2 Mode
  if (mode === 'matrix_2x2') {
    const grid = visualConfig.grid || [];
    return (
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/90 rounded-2xl border-2 border-slate-200 shadow-inner">
        <div className="grid grid-cols-2 gap-3 md:gap-5 p-3.5 bg-slate-200/80 rounded-2xl shadow-inner">
          {/* Row 0, Col 0 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center p-2">
            {grid[0]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[0][0].kind} style={grid[0][0]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 0, Col 1 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center p-2">
            {grid[0]?.[1] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[0][1].kind} style={grid[0][1]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 0 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center p-2">
            {grid[1]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                <ShapeSvg kind={grid[1][0].kind} style={grid[1][0]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 1 (The Missing Question Cell) */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-2xl shadow-[0_4px_0_0_#c7d2fe] flex items-center justify-center">
            <HelpCircle className="w-8 h-8 md:w-10 md:h-10 text-indigo-600 animate-pulse drop-shadow-sm" />
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
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/90 rounded-2xl border-2 border-slate-200 shadow-inner">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 p-3.5 bg-slate-200/80 rounded-2xl shadow-inner">
          {flatCells.map((cell: any, idx: number) => {
            const isMissing = !cell || cell === '?' || (typeof cell === 'object' && (cell.isHidden || cell.isMissing || cell.kind === '?'));
            const kind = typeof cell === 'string' ? cell : cell?.kind;
            const cellFill = (typeof cell === 'object' && cell?.fill) ? cell.fill : color;
            return (
              <div
                key={idx}
                className={`w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-2xl flex items-center justify-center p-2 ${
                  isMissing
                    ? 'bg-indigo-50 border-2 border-dashed border-indigo-400 shadow-[0_3px_0_0_#c7d2fe]'
                    : 'bg-white border-2 border-slate-200 shadow-[0_3px_0_0_#cbd5e1]'
                }`}
              >
                {isMissing ? (
                  <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 animate-pulse drop-shadow-sm" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                    <ShapeSvg kind={kind as any} style={{ ...(typeof cell === 'object' ? cell : {}), fill: cellFill, stroke: '#0f172a' }} size={60} />
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
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div 
          className="grid gap-2 sm:gap-3 p-3 bg-slate-200/70 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((cell: any, idx: number) => (
            <div key={idx} className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-1 sm:p-2">
              {cell.isHidden ? (
                <span className="text-2xl font-black text-indigo-400 animate-pulse">?</span>
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                  <ShapeSvg kind={cell.kind} style={{ fill: cell.fill, stroke: '#1e293b', strokeWidth: 2 }} size={70} />
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
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-slate-200/80 rounded-xl">
          {/* Row 1 */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-700" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center relative">
            <div className="w-8 h-8 border-2 border-slate-700 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-slate-700" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-700 rotate-45" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-8 h-0.5 bg-slate-700" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center relative">
            <div className="w-8 h-8 border-2 border-slate-700 rotate-45 flex items-center justify-center">
              <div className="w-8 h-0.5 bg-slate-700" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-dashed border-slate-700" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl border border-slate-300  flex items-center justify-center">
            <div className="w-3 h-3 bg-slate-700 rounded-full" />
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-400 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
