import React from 'react';
import { motion } from 'motion/react';
import { VisualOption, QuestionType } from '../../../types';
import { ShapeSvg, ShapeKind } from '../../../lib/svg-primitives';

interface OptionRendererProps {
  option: VisualOption;
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

  // Determine badge styling based on state
  let cardBorder = 'border-slate-200 hover:border-indigo-400 bg-white ';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';

  if (isSelected && !showCorrect) {
    cardBorder = 'border-indigo-600 bg-indigo-50/50  ring-2 ring-indigo-500/20';
    badgeStyle = 'bg-indigo-600 text-white border-indigo-600';
  } else if (showCorrect) {
    if (isCorrectOption) {
      cardBorder = 'border-emerald-500 bg-emerald-50  ring-2 ring-emerald-500/20';
      badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
    } else if (isSelected && !isCorrectOption) {
      cardBorder = 'border-slate-300 bg-slate-50 text-slate-500 opacity-60';
      badgeStyle = 'bg-rose-500 text-white border-rose-500';
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

    // 1. Direct numerical or text badge (e.g. counting, equation, or number pattern)
    if (vd.textNumber !== undefined && vd.textNumber !== null) {
      return (
        <div className="flex items-center justify-center w-full min-h-[60px] text-xl sm:text-2xl md:text-3xl font-bold font-mono text-slate-800">
          <span className="px-4 py-2 rounded-xl bg-slate-100/90 border border-slate-200 ">
            {vd.textNumber}
          </span>
        </div>
      );
    }

    // 2. Tangram piece (Tangram Puzzle)
    if (vd.tangramPiece) {
      const piece = vd.tangramPiece;
      const color = vd.color || '#6366f1';
      const label = option.label || 'Parça';

      return (
        <div className="flex flex-col items-center justify-center w-full py-1 gap-1.5">
          <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-">
            {piece === 'large_triangle_1' && (
              <polygon points="15,85 85,85 15,15" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
            {piece === 'large_triangle_2' && (
              <polygon points="15,15 85,15 85,85" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
            {piece === 'medium_triangle' && (
              <polygon points="25,75 75,75 25,25" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
            {(piece === 'small_triangle' || piece === 'small_triangle_1' || piece === 'small_triangle_2') && (
              <polygon points="30,70 70,70 30,30" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
            {piece === 'square' && (
              <rect x="25" y="25" width="50" height="50" rx="3" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
            {piece === 'parallelogram' && (
              <polygon points="20,75 60,75 80,25 40,25" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            )}
          </svg>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 text-center leading-tight">
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50/80 border-2 border-slate-300 rounded-xl  relative overflow-hidden flex items-center justify-center">
            {/* Folding axes */}
            <div className="w-1/2 h-full absolute left-0 border-r border-dashed border-indigo-400" />
            {foldType !== 'horizontal_half' && (
              <div className="w-full h-1/2 absolute top-0 border-b border-dashed border-indigo-400" />
            )}

            {/* Holes representation */}
            {count === 1 && (
              <div className="w-3.5 h-3.5 bg-slate-800 rounded-full " />
            )}
            {count === 2 && (
              <div className="flex justify-around w-full px-2">
                <div className="w-3 h-3 bg-slate-800 rounded-full " />
                <div className="w-3 h-3 bg-slate-800 rounded-full " />
              </div>
            )}
            {count === 4 && punchType !== 'corner_cut' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="w-2.5 h-2.5 bg-slate-800 rounded-full " />
                <div className="w-2.5 h-2.5 bg-slate-800 rounded-full " />
                <div className="w-2.5 h-2.5 bg-slate-800 rounded-full " />
                <div className="w-2.5 h-2.5 bg-slate-800 rounded-full " />
              </div>
            )}
            {punchType === 'corner_cut' && (
              <>
                <div className="w-3 h-3 bg-slate-800 rounded-full  absolute top-1.5 left-1.5" />
                <div className="w-3 h-3 bg-slate-800 rounded-full  absolute top-1.5 right-1.5" />
                <div className="w-3 h-3 bg-slate-800 rounded-full  absolute bottom-1.5 left-1.5" />
                <div className="w-3 h-3 bg-slate-800 rounded-full  absolute bottom-1.5 right-1.5" />
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
        <svg viewBox="0 0 100 100" className="w-full h-20 md:h-24">
          <ShapeSvg
            kind={vd.baseShape as ShapeKind}
            cx={50}
            cy={50}
            size={60}
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
        <div className="flex items-end justify-center gap-2 h-18 sm:h-20 py-2 w-full">
          {profile.map((height: number, idx: number) => (
            <div key={idx} className="flex flex-col items-center">
              <div
                className="w-5 sm:w-7 bg-indigo-500 border-2 border-indigo-700 rounded-t-md "
                style={{ height: `${Math.max(height * 16, 8)}px` }}
              />
              <span className="text-[11px] font-bold text-slate-500 mt-0.5">{height}</span>
            </div>
          ))}
        </div>
      );
    }

    // 7. Raven Progressive Matrix Rule Option
    if (vd.ravenRule || vd.optId) {
      const optId = vd.optId;
      return (
        <div className="flex items-center justify-center w-full h-18 sm:h-20">
          <svg viewBox="0 0 100 100" className="w-16 h-16">
            {optId === 'correct' ? (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="4" fill="none" stroke="#4f46e5" strokeWidth="3" />
                <circle cx="50" cy="50" r="12" fill="#6366f1" />
              </g>
            ) : optId === 'wrong_rotation' ? (
              <g transform="rotate(45 50 50)">
                <rect x="25" y="25" width="50" height="50" rx="4" fill="none" stroke="#64748b" strokeWidth="3" />
                <circle cx="50" cy="50" r="12" fill="#94a3b8" />
              </g>
            ) : optId === 'wrong_addition' ? (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="4" fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="4,4" />
              </g>
            ) : (
              <g>
                <rect x="25" y="25" width="50" height="50" rx="4" fill="#6366f1" stroke="#312e81" strokeWidth="3" />
                <circle cx="50" cy="50" r="12" fill="#ffffff" />
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
        <svg viewBox="0 0 100 100" className="w-full h-20 md:h-24">
          {vd.stack.map((item: any, idx: number) => (
            <ShapeSvg
              key={idx}
              kind={item?.kind || item?.shape || 'circle'}
              cx={item?.cx !== undefined ? item.cx : 50}
              cy={item?.cy !== undefined ? item.cy : 50}
              size={item?.size || 50}
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
        <svg viewBox="0 0 100 100" className="w-full h-20 md:h-24">
          {/* Glass beaker */}
          <rect x="25" y="15" width="50" height="70" rx="4" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
          {/* Liquid fill */}
          <rect
            x="27"
            y={83 - fillHeight}
            width="46"
            height={fillHeight}
            rx="2"
            fill={vd.color || '#06b6d4'}
            opacity={0.85}
          />
          {/* Beaker ticks */}
          <line x1="25" y1="32" x2="33" y2="32" stroke="#64748b" strokeWidth="2" />
          <line x1="25" y1="50" x2="35" y2="50" stroke="#64748b" strokeWidth="2" />
          <line x1="25" y1="67" x2="33" y2="67" stroke="#64748b" strokeWidth="2" />
        </svg>
      );
    }

    // 12. Paper folding pattern
    if (vd.paperPattern) {
      return (
        <div className="w-full flex items-center justify-center h-20 md:h-24">
          <div className="w-16 h-16 bg-indigo-50 border-2 border-slate-300 shadow relative">
            <div className="w-1/2 h-full absolute left-0 border-r border-dashed border-slate-300" />
            <div className="w-full h-1/2 absolute top-0 border-b border-dashed border-slate-300" />

            {/* Draw Holes */}
            {vd.paperPattern.includes('center') && (
              <>
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2" />
              </>
            )}
            {vd.paperPattern.includes('top_left') && (
              <>
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-2 left-2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-2 right-2" />
              </>
            )}
            {vd.paperPattern.includes('bottom_right') && (
              <>
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute bottom-2 right-2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute bottom-2 left-2" />
              </>
            )}
            {vd.paperPattern.includes('corner') && (
              <>
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-2 left-2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute top-2 right-2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute bottom-2 left-2" />
                <div className="w-3 h-3 bg-white rounded-full border border-slate-300  absolute bottom-2 right-2" />
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
        <div className="flex items-center justify-center w-full h-20 md:h-24">
          <div
            className="grid gap-1 border-2 border-slate-300 bg-slate-100 p-1 rounded "
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              width: size === 3 ? '4rem' : '5rem',
              height: size === 3 ? '4rem' : '5rem',
            }}
          >
            {is2D
              ? grid.map((row: number[], y: number) =>
                  row.map((cell: number, x: number) => (
                    <div
                      key={`${x}-${y}`}
                      className={`rounded-sm ${cell === 1 ? 'bg-indigo-500 ' : 'bg-white/50'}`}
                    />
                  ))
                )
              : grid.map((cell: number, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-sm ${cell === 1 ? 'bg-indigo-500 ' : 'bg-white/50'}`}
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
        <svg viewBox="0 0 100 100" className="w-full h-20 md:h-24">
          <ShapeSvg
            kind={shapeItem.kind}
            cx={shapeItem.cx !== undefined ? shapeItem.cx : 50}
            cy={shapeItem.cy !== undefined ? shapeItem.cy : 50}
            size={shapeItem.size || 60}
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

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      type="button"
      id={`option-card-${id}`}
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-colors cursor-pointer text-left w-full min-h-[110px] md:min-h-[130px] ${cardBorder}`}
    >
      {/* Option Identifier Badge */}
      <span
        className={`absolute top-2.5 left-2.5 flex items-center justify-center w-7 h-7 rounded-xl text-sm font-bold border transition-colors ${badgeStyle}`}
      >
        {id}
      </span>

      {/* Visual Content Render */}
      <div className="w-full flex items-center justify-center my-auto pt-2">
        {renderVisualContent()}
      </div>
    </motion.button>
  );
};

