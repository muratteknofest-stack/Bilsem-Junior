import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';
import { ArrowRight, HelpCircle, Compass } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const GenericRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

  // -------------------------------------------------------------
  // 4. Single Target Figure (Rotation / Döndürme)
  // -------------------------------------------------------------
  if (mode === 'single_target') {
    const target = visualConfig.targetItem;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-4">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            <ShapeSvg kind={target.kind} style={target} size={70} />
          </svg>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-200/80 shadow-sm">
          <Compass className="w-4 h-4 text-indigo-600 animate-spin-slow" />
          <span>
            {visualConfig.direction === 'clockwise' ? 'Saat Yönünde' : 'Saatin Tersi Yönde'}{' '}
            {visualConfig.rotationAngle}° Döndür
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. Mirror Target Mode (Ayna Yansıması)
  // -------------------------------------------------------------
  if (mode === 'mirror_target') {
    const base = visualConfig.baseItem;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Base Item */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center p-3">
            <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
              <ShapeSvg kind={base.kind} style={base} size={65} />
            </svg>
          </div>

          {/* 3D Glass Mirror Axis Line */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-1.5 h-32 bg-gradient-to-b from-indigo-300 via-indigo-600 to-indigo-300 rounded-full flex flex-col justify-between py-1 shadow-md">
              <div className="w-3 h-3 bg-indigo-700 rounded-full -ml-0.5 border border-white shadow-sm" />
              <div className="w-3 h-3 bg-indigo-700 rounded-full -ml-0.5 border border-white shadow-sm" />
            </div>
            <span className="text-[10px] font-black text-indigo-700 mt-1.5 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              AYNA
            </span>
          </div>

          {/* Mirror Target Missing Box */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-indigo-50/80 rounded-2xl border-2 border-dashed border-indigo-400 shadow-[0_6px_0_0_#c7d2fe] flex flex-col items-center justify-center gap-1">
            <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 animate-pulse drop-shadow-sm" />
            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">YANSIMA</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 6. Symmetry Half Mode (Simetri Tamamlama)
  // -------------------------------------------------------------
  if (mode === 'symmetry_half') {
    const shape = visualConfig.halfShape;
    const color = visualConfig.color;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-56 h-36 sm:w-64 sm:h-44 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center relative overflow-hidden">
          {/* Left half with actual shape */}
          <div className="w-1/2 h-full flex items-center justify-end pr-0.5 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-36 h-36 transform translate-x-1/2" shapeRendering="geometricPrecision">
              <ShapeSvg kind={shape} style={{ fill: color, stroke: '#0f172a', strokeWidth: 2 }} size={78} />
            </svg>
          </div>
          {/* Center symmetry dotted line */}
          <div className="w-1 h-full bg-indigo-500/20 border-r-2 border-dashed border-indigo-600 z-10" />
          {/* Right missing half */}
          <div className="w-1/2 h-full bg-indigo-50/60 flex flex-col items-center justify-center gap-1">
            <span className="text-3xl font-black text-indigo-600 animate-pulse drop-shadow-sm">?</span>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Diğer Yarısı</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 7. Missing Corner (Parça Bütün / Köşe Tamamlama)
  // -------------------------------------------------------------
  if (mode === 'missing_corner') {
    const mainShape = visualConfig.mainShape;
    const color = visualConfig.color;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-4 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            <ShapeSvg kind={mainShape} style={{ fill: color, stroke: '#0f172a', strokeWidth: 2 }} size={78} />
          </svg>
          {/* Missing cut overlay badge */}
          <div className="absolute top-4 right-4 w-12 h-12 bg-indigo-50 border-2 border-dashed border-indigo-500 rounded-2xl flex items-center justify-center shadow-md animate-pulse">
            <span className="text-lg font-black text-indigo-600">?</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8. Analogy Pairs (A : B :: C : ?)
  // -------------------------------------------------------------
  if (mode === 'analogy_pairs') {
    const { pairA, pairB, pairC } = visualConfig;
    return (
      <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        {/* Pair 1: A -> B */}
        <div className="flex items-center gap-2.5 bg-white px-4 py-3 rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]">
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
              <ShapeSvg kind={pairA.kind} style={pairA} size={65} />
            </svg>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
              <ShapeSvg kind={pairB.kind} style={pairB} size={65} />
            </svg>
          </div>
        </div>

        <span className="text-2xl font-black text-indigo-400 px-1">::</span>

        {/* Pair 2: C -> ? */}
        <div className="flex items-center gap-2.5 bg-white px-4 py-3 rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]">
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
              <ShapeSvg kind={pairC.kind} style={pairC} size={65} />
            </svg>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-500 font-bold" />
          <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-xl font-black text-indigo-600 animate-pulse">?</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 9. Scatter Counting Arena (Şekil Sayma Arenası)
  // -------------------------------------------------------------
  if (mode === 'scatter_counting') {
    const { shape, color, coords = [] } = visualConfig;
    return (
      <div className="w-full flex items-center justify-center p-3 md:p-6 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-72 h-52 sm:w-88 sm:h-60 md:w-[420px] md:h-68 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] relative overflow-hidden p-3">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            {coords.map((pt: { x: number; y: number }, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={shape}
                cx={pt.x}
                cy={pt.y}
                size={18}
                style={{ fill: color, stroke: '#0f172a', strokeWidth: 1.5 }}
              />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 13. Shape Equations (3B Şekilsel Denklemler)
  // -------------------------------------------------------------
  if (mode === 'shape_equation') {
    const equations = visualConfig.equations || [];
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        {equations.map((eq: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 sm:gap-4 text-xl sm:text-2xl font-black font-mono text-slate-800 bg-white px-5 py-3 rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]"
          >
            {eq.left.map((item: any, i: number) => (
              <React.Fragment key={i}>
                <div className="w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                    <ShapeSvg kind={item.shape} style={{ fill: item.fill, stroke: '#0f172a', strokeWidth: 2 }} size={78} />
                  </svg>
                </div>
                {i < eq.left.length - 1 && <span className="text-indigo-600 font-black">{eq.op}</span>}
              </React.Fragment>
            ))}
            <span className="text-slate-400 mx-2 font-black">=</span>
            <span
              className={
                eq.right === '?'
                  ? 'text-indigo-600 bg-indigo-50 border-2 border-indigo-400 border-dashed px-3 py-1 rounded-xl animate-pulse font-black'
                  : 'text-slate-900 font-black'
              }
            >
              {eq.right}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 14. Stack Target (3B Katmanlı Gölge Eşleştirme)
  // -------------------------------------------------------------
  if (mode === 'stack_target') {
    const stack = visualConfig.stack || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-4 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            {stack.map((item: any, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={item.kind}
                cx={50}
                cy={50}
                size={item.size}
                style={{ fill: item.fill, stroke: '#0f172a', strokeWidth: 2, rotation: item.rotation || 0 }}
              />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 19. Venn Diagram (3B Kümeler & Kesişim Analizi)
  // -------------------------------------------------------------
  if (mode === 'venn_diagram') {
    const { leftSet, rightSet } = visualConfig;
    const MAX_ITEMS = 3;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="relative w-72 h-44 sm:w-88 sm:h-52 flex items-center justify-center">
          {/* Left Translucent Acrylic Disc */}
          <div
            className="absolute left-0 w-44 h-44 sm:w-52 sm:h-52 rounded-full flex items-center justify-start p-4 shadow-lg border-2 border-indigo-400/40"
            style={{ backgroundColor: leftSet.color, opacity: 0.85 }}
          >
            <div className="flex flex-col gap-2 ml-4">
              {leftSet.items.slice(0, MAX_ITEMS).map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white rounded-xl shadow-md p-1 border border-slate-200">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={75} style={{ fill: '#0f172a' }} /></svg>
                </div>
              ))}
            </div>
          </div>

          {/* Right Translucent Acrylic Disc */}
          <div
            className="absolute right-0 w-44 h-44 sm:w-52 sm:h-52 rounded-full flex items-center justify-end p-4 shadow-lg border-2 border-rose-400/40"
            style={{ backgroundColor: rightSet.color, opacity: 0.85 }}
          >
            <div className="flex flex-col gap-2 mr-4">
              {rightSet.items.slice(0, MAX_ITEMS).map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white rounded-xl shadow-md p-1 border border-slate-200">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={75} style={{ fill: '#0f172a' }} /></svg>
                </div>
              ))}
            </div>
          </div>

          {/* Center (Intersection) Indicator */}
          <div className="absolute z-20 font-black text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-pulse">
            ?
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 27. Tangram Puzzle (3B Tangram Silüet & Geometri)
  // -------------------------------------------------------------
  if (mode === 'tangram_puzzle') {
    const { silhouetteName } = visualConfig;
    const pieces = visualConfig?.tangramPieces || (visualConfig?.tangramPiece ? [visualConfig.tangramPiece] : null);

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 gap-4 shadow-inner select-none">
        <div className="flex items-center gap-2 bg-indigo-100 text-indigo-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm border border-indigo-200">
          🧩 Tangram Hedef Silüeti: {silhouetteName || 'Şekil'}
        </div>
        <div className="w-52 h-52 sm:w-64 sm:h-64 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-4 relative overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            {pieces && Array.isArray(pieces) ? (
              pieces.map((piece: any, i: number) => (
                <polygon
                  key={i}
                  points={piece.points || '10,90 50,50 10,10'}
                  fill={piece.fill || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  transform={piece.transform || ''}
                />
              ))
            ) : (
              <polygon
                points="15,85 85,85 85,15 15,15"
                fill="#334155"
                stroke="#0f172a"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Fallback / Text / Options Only
  // -------------------------------------------------------------
  if (visualConfig?.targetItem) {
    const item = visualConfig.targetItem;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_8px_0_0_#cbd5e1] flex items-center justify-center p-4">
          <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
            <ShapeSvg kind={item.kind} style={item} size={70} />
          </svg>
        </div>
      </div>
    );
  }

  return null;
};
