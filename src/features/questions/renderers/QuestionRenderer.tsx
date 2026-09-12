import React from 'react';
import { motion } from 'motion/react';
import { BaseQuestion } from '../../../types';
import { ShapeSvg, PALETTE } from '../../../lib/svg-primitives';
import { ArrowRight, HelpCircle, Compass, Settings } from 'lucide-react';

interface QuestionRendererProps {
  question: BaseQuestion;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question }) => {
  const { visualConfig, type } = question;
  const mode = visualConfig?.displayMode || 'default';

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

  // 2. Matrix 2x2 Mode
  if (mode === 'matrix_2x2') {
    const grid = visualConfig.grid || [];
    return (
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 bg-slate-200/70 rounded-xl">
          {/* Row 0, Col 0 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-xl border border-slate-300  flex items-center justify-center p-2">
            {grid[0]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={grid[0][0].kind} style={grid[0][0]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 0, Col 1 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-xl border border-slate-300  flex items-center justify-center p-2">
            {grid[0]?.[1] && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={grid[0][1].kind} style={grid[0][1]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 0 */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-xl border border-slate-300  flex items-center justify-center p-2">
            {grid[1]?.[0] && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={grid[1][0].kind} style={grid[1][0]} size={65} />
              </svg>
            )}
          </div>

          {/* Row 1, Col 1 (The Missing Question Cell) */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-8 h-8 md:w-10 md:h-10 text-indigo-600 animate-pulse" />
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
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-slate-200/70 rounded-xl">
          {flatCells.map((cell: any, idx: number) => {
            const isMissing = !cell || cell === '?' || (typeof cell === 'object' && (cell.isHidden || cell.isMissing || cell.kind === '?'));
            const kind = typeof cell === 'string' ? cell : cell?.kind;
            const cellFill = (typeof cell === 'object' && cell?.fill) ? cell.fill : color;
            return (
              <div
                key={idx}
                className={`w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-xl flex items-center justify-center p-2 ${
                  isMissing
                    ? 'bg-indigo-50 border-2 border-dashed border-indigo-400'
                    : 'bg-white border border-slate-300 '
                }`}
              >
                {isMissing ? (
                  <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 animate-pulse" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <ShapeSvg kind={kind as any} style={{ fill: cellFill, stroke: '#1e293b' }} size={60} />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. Single Target Figure (Rotation)
  if (mode === 'single_target') {
    const target = visualConfig.targetItem;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-3">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ShapeSvg kind={target.kind} style={target} size={70} />
          </svg>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
          <Compass className="w-4 h-4" />
          <span>{visualConfig.direction} {visualConfig.rotationAngle}°</span>
        </div>
      </div>
    );
  }

  // 5. Mirror Target Mode
  if (mode === 'mirror_target') {
    const base = visualConfig.baseItem;
    const axis = visualConfig.mirrorAxis;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-3">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <ShapeSvg kind={base.kind} style={base} size={65} />
            </svg>
          </div>

          {/* Mirror axis line */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-1 h-28 bg-indigo-500 rounded-full flex flex-col justify-between py-1 ">
              <div className="w-2 h-2 bg-indigo-600 rounded-full -ml-0.5" />
              <div className="w-2 h-2 bg-indigo-600 rounded-full -ml-0.5" />
            </div>
            <span className="text-[11px] font-bold text-indigo-700 mt-1 uppercase tracking-wider">Ayna</span>
          </div>

          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-indigo-50/50 rounded-xl border-2 border-dashed border-indigo-400 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 6. Symmetry Half Mode
  if (mode === 'symmetry_half') {
    const shape = visualConfig.halfShape;
    const color = visualConfig.color;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-48 h-32 md:w-56 md:h-40 bg-white rounded-xl border-2 border-slate-200  flex items-center relative overflow-hidden">
          {/* Left half with actual shape clipped */}
          <div className="w-1/2 h-full flex items-center justify-end pr-0.5 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-32 h-32 transform translate-x-1/2">
              <ShapeSvg kind={shape} style={{ fill: color, stroke: '#1e293b', strokeWidth: 3 }} size={75} />
            </svg>
          </div>
          {/* Center symmetry dotted line */}
          <div className="w-0.5 h-full border-r-2 border-dashed border-indigo-500 z-10" />
          {/* Right missing half */}
          <div className="w-1/2 h-full bg-indigo-50/60 flex items-center justify-center">
            <span className="text-xl font-bold text-indigo-600">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 7. Missing Corner (Parça Bütün)
  if (mode === 'missing_corner') {
    const mainShape = visualConfig.mainShape;
    const color = visualConfig.color;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-36 h-36 md:w-44 md:h-44 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-3 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ShapeSvg kind={mainShape} style={{ fill: color, stroke: '#1e293b', strokeWidth: 3 }} size={75} />
          </svg>
          {/* Missing cut overlay badge */}
          <div className="absolute top-4 right-4 w-10 h-10 bg-slate-50 border-2 border-dashed border-indigo-500 rounded-lg flex items-center justify-center ">
            <span className="text-xs font-bold text-indigo-600">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 8. Analogy Pairs (A : B :: C : ?)
  if (mode === 'analogy_pairs') {
    const { pairA, pairB, pairC } = visualConfig;
    return (
      <div className="w-full flex flex-wrap items-center justify-center gap-3 p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        {/* Pair 1: A -> B */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 ">
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <ShapeSvg kind={pairA.kind} style={pairA} size={65} />
            </svg>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-500" />
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <ShapeSvg kind={pairB.kind} style={pairB} size={65} />
            </svg>
          </div>
        </div>

        <span className="text-lg font-bold text-slate-400 px-1">::</span>

        {/* Pair 2: C -> ? */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 ">
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <ShapeSvg kind={pairC.kind} style={pairC} size={65} />
            </svg>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-500" />
          <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center">
            <span className="text-base font-bold text-indigo-600">?</span>
          </div>
        </div>
      </div>
    );
  }

  // 9. Scatter Counting Arena
  if (mode === 'scatter_counting') {
    const { shape, color, coords = [] } = visualConfig;
    return (
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-64 h-48 sm:w-80 sm:h-56 md:w-96 md:h-64 bg-white rounded-xl border-2 border-slate-300  relative overflow-hidden p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {coords.map((pt: { x: number; y: number }, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={shape}
                cx={pt.x}
                cy={pt.y}
                size={16}
                style={{ fill: color, stroke: '#1e293b', strokeWidth: 1.5 }}
              />
            ))}
          </svg>
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

  // 13. Shape Equations
  if (mode === 'shape_equation') {
    const equations = visualConfig.equations || [];
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4 p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        {equations.map((eq: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 sm:gap-4 text-xl sm:text-2xl font-bold font-mono text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 ">
            {eq.left.map((item: any, i: number) => (
              <React.Fragment key={i}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                    <ShapeSvg kind={item.shape} style={{ fill: item.fill, stroke: '#1e293b', strokeWidth: 2 }} size={80} />
                  </svg>
                </div>
                {i < eq.left.length - 1 && <span className="text-slate-400">{eq.op}</span>}
              </React.Fragment>
            ))}
            <span className="text-slate-400 mx-2">=</span>
            <span className={eq.right === '?' ? 'text-indigo-600 border-b-2 border-indigo-400 border-dashed pb-1' : ''}>{eq.right}</span>
          </div>
        ))}
      </div>
    );
  }

  // 14. Stack Target (e.g. Shadow Matching)
  if (mode === 'stack_target') {
    const stack = visualConfig.stack || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-4 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {stack.map((item: any, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={item.kind}
                cx={50}
                cy={50}
                size={item.size}
                style={{ fill: item.fill, stroke: '#1e293b', strokeWidth: 2, rotation: item.rotation || 0 }}
              />
            ))}
          </svg>
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

  // 19. Venn Diagram
  if (mode === 'venn_diagram') {
    const { leftSet, rightSet } = visualConfig;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="relative w-64 h-40 sm:w-80 sm:h-48 flex items-center justify-center">
          {/* Left Circle */}
          <div 
            className="absolute left-0 w-40 h-40 sm:w-48 sm:h-48 rounded-full mix-blend-multiply flex items-center justify-start p-4 opacity-80"
            style={{ backgroundColor: leftSet.color }}
          >
            <div className="flex flex-col gap-2 ml-4">
              {leftSet.items.map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white/90 rounded-md p-1 ">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={80} style={{fill:'#1e293b'}} /></svg>
                </div>
              ))}
            </div>
          </div>
          {/* Right Circle */}
          <div 
            className="absolute right-0 w-40 h-40 sm:w-48 sm:h-48 rounded-full mix-blend-multiply flex items-center justify-end p-4 opacity-80"
            style={{ backgroundColor: rightSet.color }}
          >
            <div className="flex flex-col gap-2 mr-4">
              {rightSet.items.map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white/90 rounded-md p-1 ">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={80} style={{fill:'#1e293b'}} /></svg>
                </div>
              ))}
            </div>
          </div>
          {/* Center (Intersection) Indicator */}
          <div className="absolute z-10 font-bold text-3xl text-white drop-">?</div>
        </div>
      </div>
    );
  }

  // 20. Cube Stack
  if (mode === 'cube_stack') {
    const cubes = visualConfig.cubes || []; // {x, y, z}
    
    // Sort cubes back to front for isometric rendering:
    const sortedCubes = [...cubes].sort((a, b) => {
      const depthA = a.x + a.y;
      const depthB = b.x + b.y;
      if (depthA !== depthB) return depthA - depthB;
      return a.z - b.z;
    });
    
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-64 sm:h-64 drop-">
          {sortedCubes.map((c: any, i: number) => {
            const W = 20; // half width
            const H = 10; // half height
            // Center grid roughly at cx=100, cy=100
            const cx = 100 + (c.x - c.y) * W;
            const cy = 140 + (c.x + c.y) * H - c.z * 2 * H;
            
            return (
              <g key={i}>
                {/* Top face */}
                <polygon points={`${cx},${cy - 2*H} ${cx+W},${cy-H} ${cx},${cy} ${cx-W},${cy-H}`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" strokeLinejoin="round" />
                {/* Left face */}
                <polygon points={`${cx-W},${cy-H} ${cx},${cy} ${cx},${cy+2*H} ${cx-W},${cy+H}`} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" strokeLinejoin="round" />
                {/* Right face */}
                <polygon points={`${cx},${cy} ${cx+W},${cy-H} ${cx+W},${cy+H} ${cx},${cy+2*H}`} fill="#94a3b8" stroke="#64748b" strokeWidth="1" strokeLinejoin="round" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 21. Dice Net
  if (mode === 'dice_net') {
    const netFaces = visualConfig.netFaces || [];
    const targetIdx = visualConfig.targetIndex;
    
    const positions = [
      {col: 1, row: 0}, // 0
      {col: 0, row: 1}, // 1
      {col: 1, row: 1}, // 2
      {col: 2, row: 1}, // 3
      {col: 1, row: 2}, // 4
      {col: 1, row: 3}  // 5
    ];
    
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="relative w-48 h-64 sm:w-60 sm:h-80">
          {positions.map((pos, i) => {
            const size = 25; // percentage
            return (
              <div 
                key={i} 
                className={`absolute bg-white border-2 border-slate-300  flex items-center justify-center ${i === targetIdx ? 'ring-4 ring-rose-400 z-10' : ''}`}
                style={{
                  left: `${pos.col * size}%`,
                  top: `${pos.row * size}%`,
                  width: `${size}%`,
                  height: `${size}%`
                }}
              >
                <div className="w-2/3 h-2/3">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                    <ShapeSvg kind={netFaces[i]} style={{fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2}} size={80} />
                  </svg>
                </div>
                {i === targetIdx && (
                  <div className="absolute top-1 left-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ">HEDEF</div>
                )}
              </div>
            );
          })}
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

  // 25. Shape Pieces
  if (mode === 'shape_pieces') {
    const kind = visualConfig.targetShape;
    const color = visualConfig.color;
    
    return (
      <div className="w-full flex items-center justify-center p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex gap-8 items-center justify-center w-full h-40">
          <div className="w-24 h-48 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                <ShapeSvg kind={kind} style={{fill: color}} size={90} />
              </svg>
            </div>
          </div>
          <div className="text-4xl text-slate-300 font-bold">+</div>
          <div className="w-24 h-48 overflow-hidden relative">
            <div className="absolute left-0 top-0 w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-">
                <ShapeSvg kind={kind} style={{fill: color}} size={90} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 26. Verbal Analogy
  if (mode === 'verbal_analogy') {
    const pairs = visualConfig.pairs || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-6">
        {pairs.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-4 sm:gap-8 text-2xl sm:text-4xl font-black text-slate-700 bg-white px-8 py-4 rounded-xl  border border-slate-200 w-full max-w-lg justify-between">
            <span className="flex-1 text-center">{p.w1}</span>
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className={`flex-1 text-center ${p.w2 === '?' ? 'text-indigo-500' : ''}`}>{p.w2}</span>
          </div>
        ))}
      </div>
    );
  }

  // 27. Tangram Puzzle
  if (mode === 'tangram_puzzle') {
    const { silhouetteName, color } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        <div className="flex items-center gap-2 bg-indigo-100/80 text-indigo-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          🧩 Tangram Silüeti: {silhouetteName}
        </div>
        <div className="w-48 h-48 sm:w-60 sm:h-60 bg-white rounded-xl border-2 border-slate-300  flex items-center justify-center p-4 relative overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-">
            {/* Base polygon silhouette */}
            <polygon points="10,90 90,90 90,10 10,10" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" />
            <polygon points="10,90 50,50 10,10" fill={color} opacity="0.85" stroke="#1e293b" strokeWidth="1.5" />
            <polygon points="50,50 90,90 90,10" fill={color} opacity="0.7" stroke="#1e293b" strokeWidth="1.5" />
            <polygon points="50,50 50,90 90,90" fill="#f1f5f9" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" />
            <text x="63" y="77" fontSize="16" fill="#6366f1" fontWeight="bold">?</text>
          </svg>
        </div>
        <span className="text-xs text-slate-500 font-medium">Noktalı boşluk alanına hangi parça tam oturur?</span>
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

  // 31. Detail Detection
  if (mode === 'detail_detection') {
    const { baseShape, color } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <div className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-3">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ShapeSvg kind={baseShape as any} style={{ fill: color, stroke: '#1e293b', strokeWidth: 2 }} size={70} />
          </svg>
        </div>
        <span className="text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
          Referans Model
        </span>
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

  // 33. Multiview Perspective (3B Perspektif)
  if (mode === 'multiview_perspective') {
    const { blocks } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-60 sm:h-60 drop-">
          {blocks.map((b: any, idx: number) => {
            const W = 22;
            const H = 11;
            const cx = 100 + (b.x - b.y) * W;
            const cy = 130 + (b.x + b.y) * H - b.z * 2 * H;
            return (
              <g key={idx}>
                <polygon points={`${cx},${cy - 2 * H} ${cx + W},${cy - H} ${cx},${cy} ${cx - W},${cy - H}`} fill="#818cf8" stroke="#312e81" strokeWidth="1.2" />
                <polygon points={`${cx - W},${cy - H} ${cx},${cy} ${cx},${cy + 2 * H} ${cx - W},${cy + H}`} fill="#6366f1" stroke="#312e81" strokeWidth="1.2" />
                <polygon points={`${cx},${cy} ${cx + W},${cy - H} ${cx + W},${cy + H} ${cx},${cy + 2 * H}`} fill="#4f46e5" stroke="#312e81" strokeWidth="1.2" />
              </g>
            );
          })}
        </svg>
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

  // 36. Spatial Origami Box
  if (mode === 'spatial_origami') {
    const { faces, targetFace } = visualConfig;
    const positions = [
      { col: 1, row: 0, idx: 0 },
      { col: 0, row: 1, idx: 1 },
      { col: 1, row: 1, idx: 2 },
      { col: 2, row: 1, idx: 3 },
      { col: 1, row: 2, idx: 4 },
      { col: 1, row: 3, idx: 5 },
    ];
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="relative w-48 h-64 sm:w-60 sm:h-80">
          {positions.map((pos) => {
            const sym = faces[pos.idx];
            const isTarget = sym === targetFace;
            const size = 25;
            return (
              <div
                key={pos.idx}
                className={`absolute bg-white border-2 border-slate-300  flex items-center justify-center text-2xl sm:text-3xl ${
                  isTarget ? 'ring-4 ring-rose-400 bg-rose-50 z-10' : ''
                }`}
                style={{
                  left: `${pos.col * size}%`,
                  top: `${pos.row * size}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                }}
              >
                <span>{sym}</span>
                {isTarget && (
                  <span className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1 rounded">
                    HEDEF
                  </span>
                )}
              </div>
            );
          })}
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

  // 38. Memory Board (Görsel Bellek)
  if (mode === 'memory_board') {
    const items = visualConfig.memoryItems || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
          🧠 Örnek Hafıza Grubu
        </span>
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200 ">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-2 ">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={item.kind} style={item} size={60} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 39. Group Classification (Kümeleme ve Sınıflama)
  if (mode === 'group_classification') {
    const groupShapes = visualConfig.groupShapes || [];
    const groupAttribute = visualConfig.groupAttribute || 'Grup Örnekleri';
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
          🏷️ Ortak Özellik: {groupAttribute}
        </span>
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200 ">
          {groupShapes.map((shape: any, idx: number) => (
            <div key={idx} className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50/40 rounded-xl border border-emerald-200 flex items-center justify-center p-2 ">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={shape} style={{ fill: '#0d9488', stroke: '#1e293b', strokeWidth: 2 }} size={60} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 40. Reference Match (Görsel Dikkat)
  if (mode === 'reference_match') {
    const refItem = visualConfig.referenceItem;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
          🔍 Referans Hedef Şekil
        </span>
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-xl border-2 border-indigo-300  flex items-center justify-center p-3">
          {refItem && (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <ShapeSvg kind={refItem.kind} style={refItem} size={65} />
            </svg>
          )}
        </div>
      </div>
    );
  }

  // 41. 3D Stack / Spatial Relationship
  if (mode === '3d_stack') {
    const stack = visualConfig.stack || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
          📐 Katmanlı Şekil Dizilimi (Üst Üste)
        </span>
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-xl border-2 border-slate-200  flex items-center justify-center p-3 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {stack.map((item: any, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={item.kind}
                cx={50}
                cy={50}
                size={item.size || 60 - idx * 12}
                style={{ fill: item.fill, stroke: '#1e293b', strokeWidth: 2, rotation: item.rotation || 0 }}
              />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // 42. Text / Story Logic
  if (mode === 'text_only') {
    return (
      <div className="w-full flex items-center justify-center p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-800">
          <span>📖</span>
          <span>Mantıksal çıkarım yaparak doğru seçeneği bulunuz.</span>
        </div>
      </div>
    );
  }

  // 43. Options Only (e.g. Odd One Out)
  if (mode === 'options_only') {
    return (
      <div className="w-full flex items-center justify-center p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-600">
        <span>💡 Aşağıdaki seçenekleri karşılaştırarak kurala uymayan farklı şekli işaretleyiniz.</span>
      </div>
    );
  }

  // Generic fallback if visualConfig has secondary prompt or unrecognized content
  if (question.secondaryPrompt) {
    return (
      <div className="w-full flex items-center justify-center p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
        <span className="text-xs sm:text-sm font-semibold text-indigo-900">{question.secondaryPrompt}</span>
      </div>
    );
  }

  return null;
};

