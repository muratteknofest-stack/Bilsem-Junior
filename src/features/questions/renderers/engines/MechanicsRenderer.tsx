import React, { useId } from 'react';
import { BaseQuestion } from '../../../../types';
import { ArrowRight, Cpu, Sparkles } from 'lucide-react';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const MechanicsRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;
  const reactId = useId().replace(/:/g, '_');

  // -------------------------------------------------------------
  // 17. Gear System (3B Mekanik Dişli Düzeneği)
  // -------------------------------------------------------------
  if (mode === 'gear_system') {
    const gears = visualConfig.gears || [];
    const totalGears = gears.length;

    return (
      <div className="w-full flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
            ⚙️ 3B Mekanik Dişli Çark Düzeneği
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-3 flex-wrap">
          {gears.map((g: any, idx: number) => {
            const teeth = 8;
            const r = Math.max(30, Math.min(48, (g.size || 35) * 1.1));
            const toothH = 7;
            const color = g.color || '#3b82f6';
            const isClockwise = g.startDir === 'clockwise';
            const isTarget = idx === totalGears - 1;

            // Generate gear teeth path
            const pts: string[] = [];
            for (let i = 0; i < teeth; i++) {
              const a0 = (i * 360 / teeth) * (Math.PI / 180);
              const a1 = ((i + 0.3) * 360 / teeth) * (Math.PI / 180);
              const a2 = ((i + 0.6) * 360 / teeth) * (Math.PI / 180);
              const a3 = ((i + 0.9) * 360 / teeth) * (Math.PI / 180);

              const innerR = r;
              const outerR = r + toothH;

              pts.push(`${innerR * Math.cos(a0)},${innerR * Math.sin(a0)}`);
              pts.push(`${outerR * Math.cos(a1)},${outerR * Math.sin(a1)}`);
              pts.push(`${outerR * Math.cos(a2)},${outerR * Math.sin(a2)}`);
              pts.push(`${innerR * Math.cos(a3)},${innerR * Math.sin(a3)}`);
            }

            const gearGradId = `gearGrad_${reactId}_${idx}`;

            return (
              <div
                key={idx}
                className="flex flex-col items-center relative -mx-1 sm:-mx-2 transition-transform hover:scale-105"
                style={{ zIndex: 10 + (idx % 2 === 0 ? 2 : 1) }}
              >
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 flex items-center justify-center"
                  style={{
                    filter: 'drop-shadow(0px 4px 6px rgba(15,23,42,0.18))',
                  }}
                >
                  <svg viewBox="-60 -60 120 120" className="w-full h-full" shapeRendering="geometricPrecision">
                    <defs>
                      <linearGradient id={gearGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="30%" stopColor={color} />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>

                    {/* Gear Teeth & Outer Ring */}
                    <polygon
                      points={pts.join(' ')}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />

                    {/* 3D Gear Body Disc */}
                    <circle cx="0" cy="0" r={r - 3} fill={`url(#${gearGradId})`} />
                    <circle cx="0" cy="0" r={r - 3} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />

                    {/* Inner Cutouts (Spokes) */}
                    {[0, 90, 180, 270].map((deg) => (
                      <circle
                        key={deg}
                        cx={(r * 0.55) * Math.cos(deg * Math.PI / 180)}
                        cy={(r * 0.55) * Math.sin(deg * Math.PI / 180)}
                        r={r * 0.16}
                        fill="#0f172a"
                        opacity="0.3"
                      />
                    ))}

                    {/* Metallic Central Axis Hub */}
                    <circle cx="0" cy="0" r={r * 0.34} fill="#f8fafc" stroke="#334155" strokeWidth="2" />
                    <circle cx="-2" cy="-2" r={r * 0.12} fill="#ffffff" opacity="0.8" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fill="#0f172a"
                      fontFamily="sans-serif"
                    >
                      {g.id || `${idx + 1}`}
                    </text>
                  </svg>
                </div>

                {/* 3D Tactile Direction Indicator */}
                <div
                  className={`mt-2 text-xs font-black px-3 py-1 rounded-xl border shadow-[0_3px_0_0_#cbd5e1] flex items-center gap-1 ${
                    isTarget
                      ? 'bg-rose-500 text-white border-rose-600 shadow-[0_3px_0_0_#9f1239] animate-pulse'
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  {isTarget ? (
                    <span>? Hedef</span>
                  ) : isClockwise ? (
                    <>
                      <span className="text-sm font-black text-indigo-600">↻</span>
                      <span>Saat Yönü</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-black text-amber-600">↺</span>
                      <span>Ters Yön</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 23. Operation Machine (3B Dönüşüm ve İşlem Makinesi)
  // -------------------------------------------------------------
  if (mode === 'operation_machine') {
    const pairs = visualConfig.pairs || [];
    return (
      <div className="w-full flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-3xl border-2 border-slate-200/90 shadow-inner select-none">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-sm">
            ⚡ 3B Matematiksel İşlem Makinesi
          </span>
        </div>

        <div className="w-full max-w-lg flex flex-col gap-4 relative">
          {/* Machine Vertical Conveyor Beam */}
          <div className="absolute top-0 bottom-0 left-1/2 w-20 bg-gradient-to-b from-slate-200 to-slate-300 -translate-x-1/2 rounded-3xl z-0 border-2 border-slate-300 shadow-inner" />

          {/* Central Processor Unit */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-slate-900 to-slate-950 text-white px-6 py-4.5 rounded-3xl z-20 shadow-[0_8px_0_0_#0f172a] border-2 border-slate-700 flex flex-col items-center gap-1 min-w-[110px]">
            <Cpu className="w-8 h-8 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300">
              KURAL [ f(x) ]
            </span>
          </div>

          {/* Input - Output Rows */}
          {pairs.map((p: any, i: number) => {
            const isMystery = p.out === '?';
            return (
              <div key={i} className="flex justify-between items-center w-full relative z-10 py-1">
                {/* Input Cassette */}
                <div className="w-28 sm:w-36 h-18 sm:h-20 bg-white border-2 border-slate-300 rounded-3xl shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center text-2xl sm:text-3xl font-black text-slate-800">
                  {p.in}
                </div>

                <div className="flex items-center text-indigo-500 font-bold">
                  <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>

                {/* Invisible Spacer for Central Core */}
                <div className="w-24 h-10 opacity-0" />

                <div className="flex items-center text-indigo-500 font-bold">
                  <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>

                {/* Output Cassette */}
                <div
                  className={`w-28 sm:w-36 h-18 sm:h-20 border-2 rounded-3xl flex items-center justify-center text-2xl sm:text-3xl font-black ${
                    isMystery
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-[0_6px_0_0_#6366f1] ring-2 ring-indigo-400/40 animate-pulse'
                      : 'bg-white border-slate-300 text-indigo-900 shadow-[0_6px_0_0_#cbd5e1]'
                  }`}
                >
                  {p.out}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
