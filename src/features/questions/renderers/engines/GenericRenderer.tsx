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

  // 19. Venn Diagram
  if (mode === 'venn_diagram') {
    const { leftSet, rightSet } = visualConfig;
    const MAX_ITEMS = 3;
    return (
      <div className="w-full flex items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="relative w-64 h-40 sm:w-80 sm:h-48 flex items-center justify-center">
          {/* Left Circle */}
          <div 
            className="absolute left-0 w-40 h-40 sm:w-48 sm:h-48 rounded-full mix-blend-multiply flex items-center justify-start p-4 opacity-80"
            style={{ backgroundColor: leftSet.color }}
          >
            <div className="flex flex-col gap-2 ml-4">
              {leftSet.items.slice(0, MAX_ITEMS).map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white/90 rounded-md p-1 ">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={80} style={{fill:'#1e293b'}} /></svg>
                </div>
              ))}
              {leftSet.items.length > MAX_ITEMS && (
                <div className="text-sm font-bold text-slate-800 bg-white/60 rounded px-1 text-center">
                  +{leftSet.items.length - MAX_ITEMS}
                </div>
              )}
            </div>
          </div>
          {/* Right Circle */}
          <div 
            className="absolute right-0 w-40 h-40 sm:w-48 sm:h-48 rounded-full mix-blend-multiply flex items-center justify-end p-4 opacity-80"
            style={{ backgroundColor: rightSet.color }}
          >
            <div className="flex flex-col gap-2 mr-4">
              {rightSet.items.slice(0, MAX_ITEMS).map((k: any, i: number) => (
                <div key={i} className="w-8 h-8 bg-white/90 rounded-md p-1 ">
                  <svg viewBox="0 0 100 100"><ShapeSvg kind={k} size={80} style={{fill:'#1e293b'}} /></svg>
                </div>
              ))}
              {rightSet.items.length > MAX_ITEMS && (
                <div className="text-sm font-bold text-slate-800 bg-white/60 rounded px-1 text-center">
                  +{rightSet.items.length - MAX_ITEMS}
                </div>
              )}
            </div>
          </div>
          {/* Center (Intersection) Indicator */}
          <div className="absolute z-10 font-bold text-3xl text-white drop-">?</div>
        </div>
      </div>
    );
  }

  // 25. Shape Pieces
  if (mode === 'shape_pieces') {
    const kind = visualConfig.targetShape;
    const color = visualConfig.color;
    const pieces = visualConfig.pieces;

    if (pieces && Array.isArray(pieces) && pieces.length > 0) {
      return (
        <div className="w-full flex items-center justify-center p-8 bg-slate-50/80 rounded-xl border border-slate-200">
          <div className="flex flex-wrap gap-4 items-center justify-center w-full min-h-[10rem]">
            {pieces.map((piece: any, idx: number) => (
              <React.Fragment key={idx}>
                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <ShapeSvg kind={piece.kind || kind} style={{fill: piece.fill || color}} size={90} />
                  </svg>
                </div>
                {idx < pieces.length - 1 && (
                  <div className="text-4xl text-slate-400 font-bold">+</div>
                )}
              </React.Fragment>
            ))}
            <div className="text-4xl text-slate-400 font-bold mx-2">=</div>
            <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center opacity-50 border-2 border-dashed border-slate-400 rounded-xl p-2">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ShapeSvg kind={kind} style={{fill: color}} size={90} />
              </svg>
            </div>
          </div>
        </div>
      );
    }
    
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
    const pieces = visualConfig?.tangramPieces || (visualConfig?.tangramPiece ? [visualConfig.tangramPiece] : null);
    
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
        <div className="flex items-center gap-2 bg-indigo-100/80 text-indigo-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          🧩 Tangram Silüeti: {silhouetteName}
        </div>
        <div className="w-48 h-48 sm:w-60 sm:h-60 bg-white rounded-xl border-2 border-slate-300  flex items-center justify-center p-4 relative overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-">
            {pieces && Array.isArray(pieces) ? (
              pieces.map((piece: any, i: number) => (
                <polygon
                  key={i}
                  points={piece.points || '10,90 50,50 10,10'}
                  fill={piece.fill || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]}
                  stroke="#334155"
                  strokeWidth="1"
                  transform={piece.transform || ''}
                />
              ))
            ) : (
              <>
                {/* Base polygon silhouette */}
                <polygon points="10,90 90,90 90,10 10,10" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" />
                <polygon points="10,90 50,50 10,10" fill={color} opacity="0.85" stroke="#1e293b" strokeWidth="1.5" />
                <polygon points="50,50 90,90 90,10" fill={color} opacity="0.7" stroke="#1e293b" strokeWidth="1.5" />
                <polygon points="50,50 50,90 90,90" fill="#f1f5f9" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" />
                <text x="63" y="77" fontSize="16" fill="#6366f1" fontWeight="bold">?</text>
              </>
            )}
          </svg>
        </div>
        <span className="text-xs text-slate-500 font-medium">Noktalı boşluk alanına hangi parça tam oturur?</span>
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
