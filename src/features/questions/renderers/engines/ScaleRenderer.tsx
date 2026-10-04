import React, { useId } from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';
import { ArrowRight } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const ScaleRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;
  const reactId = useId().replace(/:/g, '_');

  // -------------------------------------------------------------
  // 12. Liquid Levels (3D Cam Dereceli Kaplar)
  // -------------------------------------------------------------
  if (mode === 'liquid_levels') {
    const levels = visualConfig.levels || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-3.5 py-1 rounded-full shadow-sm">
            🧪 3B Sıvı Seviyesi & Hacim Karşılaştırma
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
          {levels.map((lvl: number, idx: number) => {
            const fillHeight = (70 * lvl) / 100;
            const liqId = `levelLiq_${reactId}_${idx}`;
            const glassId = `levelGlass_${reactId}_${idx}`;

            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-20 h-28 sm:w-24 sm:h-32 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] p-2 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                      <defs>
                        <linearGradient id={liqId} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="65%" stopColor="#0891b2" />
                          <stop offset="100%" stopColor="#0e7490" />
                        </linearGradient>
                        <linearGradient id={glassId} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>

                      {/* Glass Container Outer Rim */}
                      <rect x="22" y="12" width="56" height="76" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2.5" />

                      {/* Liquid Column */}
                      <rect
                        x="24"
                        y={86 - fillHeight}
                        width="52"
                        height={fillHeight}
                        rx="4"
                        fill={`url(#${liqId})`}
                        opacity={0.92}
                      />

                      {/* Meniscus Curve */}
                      {fillHeight > 3 && (
                        <ellipse cx="50" cy={86 - fillHeight} rx="26" ry="3.5" fill="#22d3ee" opacity="0.85" />
                      )}

                      {/* Specular Glint */}
                      <rect x="23" y="13" width="54" height="74" rx="7" fill={`url(#${glassId})`} pointerEvents="none" />

                      {/* Graduation Marks */}
                      <line x1="22" y1="30" x2="32" y2="30" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                      <line x1="22" y1="50" x2="36" y2="50" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="22" y1="70" x2="32" y2="70" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xs font-black text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                    %{lvl}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 font-bold" />
              </React.Fragment>
            );
          })}

          {/* Missing Target Container */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-28 sm:w-24 sm:h-32 bg-indigo-50/80 border-2 border-dashed border-indigo-400 rounded-2xl shadow-[0_5px_0_0_#c7d2fe] flex flex-col items-center justify-center gap-1">
              <span className="text-3xl font-black text-indigo-600 animate-pulse">?</span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">HEDEF</span>
            </div>
            <span className="text-xs font-black text-indigo-600">Sırada ?</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 15. Balance Scale (3B Eşit Kollu Terazi)
  // -------------------------------------------------------------
  if (mode === 'balance_scale') {
    const scales = visualConfig.scales || [];
    const beamGradId = `beamGrad_${reactId}`;
    const panGradId = `panGrad_${reactId}`;

    return (
      <div className="w-full flex flex-col items-center justify-center gap-6 p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
            ⚖️ 3B Hassas Denge Terazisi
          </span>
        </div>

        {scales.map((scale: any, idx: number) => (
          <div key={idx} className="flex flex-col items-center w-full max-w-md relative bg-white/60 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            {/* Shapes on the left and right pans */}
            <div className="flex items-end justify-between w-full px-6 relative z-10 pb-1">
              {/* Left Pan Shapes */}
              <div className="flex items-center justify-center gap-1.5 min-w-[70px]">
                {scale.left === '?' ? (
                  <span className="text-3xl font-black text-indigo-600 mb-1 animate-pulse">?</span>
                ) : (
                  (scale.left as any[]).map((item, i) => (
                    <div key={i} className="w-9 h-9 sm:w-11 sm:h-11">
                      <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                        <ShapeSvg kind={item.kind} style={{ fill: item.fill, stroke: '#0f172a', strokeWidth: 2 }} size={78} />
                      </svg>
                    </div>
                  ))
                )}
              </div>

              {/* Right Pan Shapes */}
              <div className="flex items-center justify-center gap-1.5 min-w-[70px]">
                {scale.right === '?' ? (
                  <span className="text-3xl font-black text-indigo-600 mb-1 animate-pulse">?</span>
                ) : (
                  (scale.right as any[]).map((item, i) => (
                    <div key={i} className="w-9 h-9 sm:w-11 sm:h-11">
                      <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                        <ShapeSvg kind={item.kind} style={{ fill: item.fill, stroke: '#0f172a', strokeWidth: 2 }} size={78} />
                      </svg>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3D Mechanical Brass Balance Beam SVG */}
            <svg viewBox="0 0 240 60" className="w-full h-14 sm:h-16 select-none" shapeRendering="geometricPrecision">
              <defs>
                <linearGradient id={beamGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
                <linearGradient id={panGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
              </defs>

              {/* Central Fulcrum Pyramid (Base) */}
              <polygon points="120,20 106,56 134,56" fill="url(#beamGradId)" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="100" y1="56" x2="140" y2="56" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />

              {/* Central Pivot Pin */}
              <circle cx="120" cy="20" r="4.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />

              {/* Crossbeam with 3D gradient */}
              <rect x="24" y="17.5" width="192" height="5" rx="2.5" fill={`url(#${beamGradId})`} stroke="#334155" strokeWidth="1.2" />

              {/* Left Suspension Rods & Tray */}
              <line x1="38" y1="22" x2="28" y2="40" stroke="#64748b" strokeWidth="1.5" />
              <line x1="38" y1="22" x2="48" y2="40" stroke="#64748b" strokeWidth="1.5" />
              <ellipse cx="38" cy="42" rx="22" ry="4.5" fill={`url(#${panGradId})`} stroke="#334155" strokeWidth="1.2" />

              {/* Right Suspension Rods & Tray */}
              <line x1="202" y1="22" x2="192" y2="40" stroke="#64748b" strokeWidth="1.5" />
              <line x1="202" y1="22" x2="212" y2="40" stroke="#64748b" strokeWidth="1.5" />
              <ellipse cx="202" cy="42" rx="22" ry="4.5" fill={`url(#${panGradId})`} stroke="#334155" strokeWidth="1.2" />
            </svg>
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 32. Weight Comparison (Ağırlık Sıralama & Kıyaslama)
  // -------------------------------------------------------------
  if (mode === 'weight_comparison') {
    const { comparisons } = visualConfig;
    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/90 gap-4 shadow-inner select-none">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
          ⚖️ Ağır - Hafif Kıyaslama İfadeleri
        </span>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {comparisons?.map((c: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]"
            >
              <div className="w-12 h-12 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                  <ShapeSvg kind={c.heavy.kind} style={{ fill: c.heavy.fill, stroke: '#0f172a' }} size={70} />
                </svg>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                  Daha Ağır &gt;
                </span>
              </div>

              <div className="w-12 h-12 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
                  <ShapeSvg kind={c.light.kind} style={{ fill: c.light.fill, stroke: '#0f172a' }} size={70} />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
