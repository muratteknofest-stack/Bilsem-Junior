import React from 'react';
import { motion } from 'motion/react';
import { VisualOption, QuestionType } from '../../../types';
import { ShapeSvg, ShapeKind } from '../../../lib/svg-primitives';
import { TileDiagram } from './ProfessionalBoard';

interface OptionRendererProps {
  option: Pick<VisualOption, 'id' | 'label' | 'visualData'>;
  isSelected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  showCorrect?: boolean;
  isCorrectOption?: boolean;
  questionType?: QuestionType | string;
}

export const OptionRenderer: React.FC<OptionRendererProps> = ({
  option,
  isSelected = false,
  onSelect = () => {},
  disabled = false,
  showCorrect = false,
  isCorrectOption = false,
  questionType,
}) => {
  const { id, visualData } = option;

  // Determine 3D tactile button styling based on state
  let cardStyle =
    'border-slate-200/90 bg-white shadow-[0_5px_0_0_#cbd5e1] hover:-translate-y-1 hover:shadow-[0_8px_0_0_#94a3b8] hover:border-indigo-400 active:translate-y-1 active:shadow-[0_1px_0_0_#cbd5e1]';
  let badgeStyle =
    'bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800 border-slate-300 shadow-[0_2px_0_0_#cbd5e1]';

  if (isSelected && !showCorrect) {
    cardStyle =
      'border-indigo-500 bg-indigo-50/90 shadow-[0_5px_0_0_#4f46e5] ring-4 ring-indigo-500/20 transform -translate-y-1';
    badgeStyle =
      'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border-indigo-600 shadow-[0_2px_0_0_#3730a3]';
  } else if (showCorrect) {
    if (isCorrectOption) {
      cardStyle =
        'border-emerald-500 bg-emerald-50 shadow-[0_5px_0_0_#059669] ring-4 ring-emerald-500/20 scale-[1.02]';
      badgeStyle =
        'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-[0_2px_0_0_#047857]';
    } else if (isSelected && !isCorrectOption) {
      cardStyle = 'border-rose-400 bg-rose-50 opacity-80 shadow-[0_2px_0_0_#e11d48] translate-y-1';
      badgeStyle = 'bg-rose-600 text-white border-rose-600';
    } else {
      cardStyle = 'border-slate-200 bg-slate-50 opacity-50 shadow-none translate-y-1 grayscale-[50%]';
    }
  }

  const renderVisualContent = () => {
    if (!visualData && !option.label) {
      return (
        <div className="flex items-center justify-center w-full min-h-[60px] text-lg font-bold text-slate-700">
          {id}
        </div>
      );
    }

    const vd: any = visualData || {};
    if (Array.isArray(vd.cells) && [3, 4].includes(vd.size)) return <div className="w-20 sm:w-24 mx-auto"><TileDiagram tile={vd} /></div>;

    // 1. Direct numerical or text badge (e.g. counting, equation, or number pattern)
    if (vd.textNumber !== undefined && vd.textNumber !== null) {
      return (
        <div className={`flex items-center justify-center w-full min-w-0 min-h-[60px] font-bold text-slate-800 ${String(vd.textNumber).length > 8 ? 'text-sm sm:text-base text-center' : 'text-xl sm:text-2xl md:text-3xl font-mono'}`}>
          <span className="max-w-full break-words px-3 py-2.5 rounded-2xl bg-gradient-to-b from-white to-slate-50 border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]">
            {vd.textNumber}
          </span>
        </div>
      );
    }

    // 2. Tangram piece (Tangram Puzzle)
    if (vd.tangramPiece) {
      const piece = vd.tangramPiece;
      const color = vd.color || '#4f46e5';
      const label = option.label || 'Parça';

      return (
        <div className="flex flex-col items-center justify-center w-full py-1 gap-1.5 select-none">
          <svg viewBox="0 0 100 100" className="w-18 h-18 sm:w-22 sm:h-22" shapeRendering="geometricPrecision">
            <g style={{ filter: 'drop-shadow(0px 4px 6px rgba(15,23,42,0.22))' }}>
              {piece === 'large_triangle_1' && (
                <polygon points="15,85 85,85 15,15" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
              {piece === 'large_triangle_2' && (
                <polygon points="15,15 85,15 85,85" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
              {piece === 'medium_triangle' && (
                <polygon points="25,75 75,75 25,25" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
              {(piece === 'small_triangle' || piece === 'small_triangle_1' || piece === 'small_triangle_2') && (
                <polygon points="30,70 70,70 30,30" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
              {piece === 'square' && (
                <rect x="25" y="25" width="50" height="50" rx="6" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
              {piece === 'parallelogram' && (
                <polygon points="20,75 60,75 80,25 40,25" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
              )}
            </g>
          </svg>
          <span className="text-xs sm:text-sm font-bold text-slate-700 text-center leading-tight">
            {label}
          </span>
        </div>
      );
    }

    // 3. Maze Target (Maze Path Navigation)
    if (vd.target) {
      const target = vd.target;
      return (
        <div className="flex flex-col items-center justify-center w-full py-1 gap-1">
          <span className="text-3xl sm:text-4xl drop-">{target.symbol}</span>
          <span className="text-xs sm:text-sm font-bold text-slate-700 text-center">
            {target.label}
          </span>
        </div>
      );
    }

    // 4. Punch Folding (Paper Hole Punch)
    if (vd.punchOpt) {
      const { punchOpt, foldType } = vd;
      const count = punchOpt?.unfoldedHoles || 4;
      const punchType = punchOpt?.punchType || 'center';

      return (
        <div className="w-full flex items-center justify-center py-1">
          <div className="w-18 h-18 sm:w-22 sm:h-22 bg-indigo-50/90 border-2 border-slate-300 rounded-2xl shadow-[0_3px_0_0_#cbd5e1] relative overflow-hidden flex items-center justify-center">
            {/* Folding axes */}
            <div className="w-1/2 h-full absolute left-0 border-r-2 border-dashed border-indigo-400" />
            {foldType !== 'horizontal_half' && (
              <div className="w-full h-1/2 absolute top-0 border-b-2 border-dashed border-indigo-400" />
            )}

            {/* Holes representation */}
            {count === 1 && (
              <div className="w-4 h-4 bg-slate-900 rounded-full shadow-inner" />
            )}
            {count === 2 && (
              <div className="flex justify-around w-full px-2">
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner" />
              </div>
            )}
            {count === 4 && punchType !== 'corner_cut' && (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <div className="w-3 h-3 bg-slate-900 rounded-full shadow-inner" />
                <div className="w-3 h-3 bg-slate-900 rounded-full shadow-inner" />
                <div className="w-3 h-3 bg-slate-900 rounded-full shadow-inner" />
                <div className="w-3 h-3 bg-slate-900 rounded-full shadow-inner" />
              </div>
            )}
            {punchType === 'corner_cut' && (
              <>
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-1.5 left-1.5" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-1.5 right-1.5" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-1.5 left-1.5" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-1.5 right-1.5" />
              </>
            )}
          </div>
        </div>
      );
    }

    // 5. Detail Detection Shape
    if (vd.baseShape) {
      const isDiff = vd.isDifferent;
      return (
        <svg viewBox="0 0 100 100" className="w-full h-22 sm:h-24 md:h-26" shapeRendering="geometricPrecision">
          <ShapeSvg
            kind={vd.baseShape as ShapeKind}
            cx={50}
            cy={50}
            size={68}
            style={{
              fill: vd.color || '#6366f1',
              stroke: '#1e293b',
              strokeWidth: 2.5,
              marker: isDiff ? 'plus' : 'dot',
              markerPos: isDiff ? 'right' : 'top',
              markerColor: '#ffffff',
            }}
          />
        </svg>
      );
    }

    // 6. Multiview Perspective Profile
    if (vd.viewOption) {
      const matrix = vd.viewOption?.matrix || [[1, 3, 1], [0, 0, 0]];
      const profile = matrix[0] || [1, 3, 1];

      return (
        <div className="flex items-end justify-center gap-2 h-20 sm:h-24 py-2 w-full">
          {profile.map((height: number, idx: number) => (
            <div key={idx} className="flex flex-col items-center">
              <div
                className="w-6 sm:w-8 bg-gradient-to-t from-indigo-600 to-indigo-500 border-2 border-indigo-700 rounded-t-lg shadow-sm"
                style={{ height: `${Math.max(height * 18, 10)}px` }}
              />
              <span className="text-xs font-black text-slate-600 mt-1">{height}</span>
            </div>
          ))}
        </div>
      );
    }

    // 7. Raven Progressive Matrix Rule Option
    if (vd.ravenRule || vd.optId) {
      const optId = vd.optId;
      return (
        <div className="flex items-center justify-center w-full h-20 sm:h-24">
          <svg viewBox="0 0 100 100" className="w-18 h-18 sm:w-20 sm:h-20" shapeRendering="geometricPrecision">
            {optId === 'correct' ? (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="6" fill="none" stroke="#4f46e5" strokeWidth="3.5" />
                <circle cx="50" cy="50" r="14" fill="#6366f1" />
              </g>
            ) : optId === 'wrong_rotation' ? (
              <g transform="rotate(45 50 50)">
                <rect x="25" y="25" width="50" height="50" rx="6" fill="none" stroke="#64748b" strokeWidth="3.5" />
                <circle cx="50" cy="50" r="14" fill="#94a3b8" />
              </g>
            ) : optId === 'wrong_addition' ? (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="6" fill="none" stroke="#64748b" strokeWidth="3.5" strokeDasharray="5,5" />
              </g>
            ) : (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="6" fill="#6366f1" stroke="#312e81" strokeWidth="3.5" />
                <circle cx="50" cy="50" r="14" fill="#ffffff" />
              </g>
            )}
          </svg>
        </div>
      );
    }

    // 8. Spatial Origami Symbol
    if (vd.symbol) {
      return (
        <div className="flex items-center justify-center w-full min-h-[60px] text-3xl sm:text-4xl">
          <span className="p-2 rounded-xl bg-slate-100/90 border border-slate-200 ">
            {vd.symbol}
          </span>
        </div>
      );
    }

    // 9. Word Scramble (Anagram) Word
    if (vd.word) {
      return (
        <div className="flex items-center justify-center w-full min-h-[60px] px-2 text-center">
          <span className="text-base sm:text-lg md:text-xl font-black font-mono tracking-widest text-slate-800 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-xl ">
            {vd.word}
          </span>
        </div>
      );
    }

    // 10. Stack view (spatial 3D stack / balance scale / shadow matching)
    if (vd.stack && Array.isArray(vd.stack)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-22 sm:h-24 md:h-26" shapeRendering="geometricPrecision">
          {vd.stack.map((item: any, idx: number) => (
            <ShapeSvg
              key={idx}
              kind={item?.kind || item?.shape || 'circle'}
              cx={item?.cx !== undefined ? item.cx : 50}
              cy={item?.cy !== undefined ? item.cy : 50}
              size={item?.size || 58}
              style={{
                fill: item?.fill || '#6366f1',
                stroke: item?.stroke || '#1e293b',
                strokeWidth: 2.5,
                rotation: item?.rotation || 0,
                marker: item?.marker,
                markerPos: item?.markerPos,
                markerColor: item?.markerColor,
              }}
            />
          ))}
        </svg>
      );
    }

    // 11. Liquid container level
    if (vd.fillPercent !== undefined) {
      const pct = vd.fillPercent;
      const fillHeight = (70 * pct) / 100;
      return (
        <svg viewBox="0 0 100 100" className="w-full h-22 sm:h-24 md:h-26 select-none" shapeRendering="geometricPrecision">
          <defs>
            <linearGradient id={`liqGrad_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="65%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <linearGradient id={`beakerGlass_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* Glass beaker body */}
          <rect x="23" y="12" width="54" height="74" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2.5" />
          {/* Liquid fill */}
          <rect
            x="25"
            y={84 - fillHeight}
            width="50"
            height={fillHeight}
            rx="3"
            fill={`url(#liqGrad_${id})`}
            opacity={0.92}
          />
          {/* Liquid Meniscus Curve */}
          {fillHeight > 2 && (
            <ellipse cx="50" cy={84 - fillHeight} rx="25" ry="3.5" fill="#22d3ee" opacity="0.85" />
          )}
          {/* Glass Reflection Overlay */}
          <rect x="24" y="13" width="52" height="72" rx="7" fill={`url(#beakerGlass_${id})`} pointerEvents="none" />
          {/* Beaker ticks */}
          <line x1="23" y1="30" x2="32" y2="30" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="23" y1="49" x2="35" y2="49" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="23" y1="68" x2="32" y2="68" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }

    // 12. Paper folding pattern
    if (vd.paperPattern) {
      return (
        <div className="w-full flex items-center justify-center h-22 sm:h-24 md:h-26">
          <div className="w-18 h-18 sm:w-20 sm:h-20 bg-indigo-50/90 border-2 border-slate-300 rounded-2xl shadow-[0_3px_0_0_#cbd5e1] relative overflow-hidden">
            <div className="w-1/2 h-full absolute left-0 border-r-2 border-dashed border-indigo-400" />
            <div className="w-full h-1/2 absolute top-0 border-b-2 border-dashed border-indigo-400" />

            {/* Draw Holes */}
            {vd.paperPattern.includes('center') && (
              <>
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2" />
              </>
            )}
            {vd.paperPattern.includes('top_left') && (
              <>
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-2 left-2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-2 right-2" />
              </>
            )}
            {vd.paperPattern.includes('bottom_right') && (
              <>
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-2 right-2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-2 left-2" />
              </>
            )}
            {vd.paperPattern.includes('corner') && (
              <>
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-2 left-2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute top-2 right-2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-2 left-2" />
                <div className="w-3.5 h-3.5 bg-slate-900 rounded-full shadow-inner absolute bottom-2 right-2" />
              </>
            )}
          </div>
        </div>
      );
    }

    // 13. 2D Grid (Top View)
    if (vd.grid2D && Array.isArray(vd.grid2D)) {
      const grid = vd.grid2D;
      const is2D = Array.isArray(grid[0]);
      const size = is2D ? grid.length : Math.sqrt(grid.length) || 3;
      return (
        <div className="flex items-center justify-center w-full h-22 sm:h-24 md:h-26">
          <div
            className="grid gap-1.5 border-2 border-slate-300 bg-slate-100 p-1.5 rounded-xl shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              width: size === 3 ? '4.8rem' : '5.8rem',
              height: size === 3 ? '4.8rem' : '5.8rem',
            }}
          >
            {is2D
              ? grid.map((row: number[], y: number) =>
                  row.map((cell: number, x: number) => (
                    <div
                      key={`${x}-${y}`}
                      className={`rounded-lg transition-all ${
                        cell === 1
                          ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-[0_2px_0_0_#3730a3] border border-indigo-400'
                          : 'bg-white border border-slate-200 shadow-inner'
                      }`}
                    />
                  ))
                )
              : grid.map((cell: number, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg transition-all ${
                      cell === 1
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-[0_2px_0_0_#3730a3] border border-indigo-400'
                        : 'bg-white border border-slate-200 shadow-inner'
                    }`}
                  />
                ))}
          </div>
        </div>
      );
    }

    // 14. Nested item or standard shape visual
    const shapeItem = vd.kind ? vd : vd.item?.kind ? vd.item : vd.shape ? { ...vd, kind: vd.shape } : null;
    if (shapeItem && shapeItem.kind) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-22 sm:h-24 md:h-26" shapeRendering="geometricPrecision">
          <ShapeSvg
            kind={shapeItem.kind}
            cx={shapeItem.cx !== undefined ? shapeItem.cx : 50}
            cy={shapeItem.cy !== undefined ? shapeItem.cy : 50}
            size={shapeItem.size || 68}
            style={{
              fill: shapeItem.fill || '#6366f1',
              stroke: shapeItem.stroke || '#1e293b',
              strokeWidth: shapeItem.strokeWidth || 3,
              rotation: shapeItem.rotation || 0,
              marker: shapeItem.marker,
              markerColor: shapeItem.markerColor,
              markerPos: shapeItem.markerPos,
            }}
          />
        </svg>
      );
    }

    // 15. Text, verbal analogy, logic grid, weight comparison, story logic & universal text fallback
    const textContent =
      vd.textOnly ||
      vd.text ||
      vd.label ||
      vd.val ||
      vd.value ||
      vd.title ||
      (typeof vd === 'string' || typeof vd === 'number' ? String(vd) : null) ||
      (option.label && option.label !== id ? option.label : null);

    if (textContent) {
      return (
        <div className="flex items-center justify-center w-full min-h-[60px] px-3 text-center">
          <span className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-snug">
            {textContent}
          </span>
        </div>
      );
    }

    // Final fallback: Option label or ID so it's NEVER blank
    return (
      <div className="flex items-center justify-center w-full min-h-[60px] text-base sm:text-lg font-bold text-slate-700">
        <span className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
          {option.label || id}
        </span>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect();
    }
  };

  const optionValue = visualData as { textNumber?: string | number } | undefined;
  // Let the SVG description participate in the accessible name for visual choices.
  const optionLabelText = optionValue?.textNumber !== undefined ? `${id} seçeneği: ${optionValue.textNumber}` : undefined;

  return (
    <button
      type="button"
      id={`option-card-${id}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      aria-label={optionLabelText}
      className={`relative flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all duration-200 cursor-pointer text-left w-full min-h-[120px] sm:min-h-[140px] md:min-h-[155px] min-w-[56px] touch-manipulation focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/50 ${cardStyle} ${disabled && !showCorrect ? 'opacity-70 pointer-events-none shadow-none translate-y-1' : ''}`}
    >
      {/* Option Identifier Badge */}
      <span
        className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black border transition-colors ${badgeStyle}`}
      >
        {id}
      </span>

      {/* Visual Content Render */}
      <div className="w-full flex items-center justify-center my-auto pt-7">
        {renderVisualContent()}
      </div>
    </button>
  );
};

