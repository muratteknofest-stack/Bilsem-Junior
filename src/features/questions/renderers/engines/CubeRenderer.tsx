import React, { useId } from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const CubeRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;
  const reactId = useId().replace(/:/g, '_');

  // -------------------------------------------------------------
  // 20. Cube Stack (3D İzometrik Küp Blokları)
  // -------------------------------------------------------------
  if (mode === 'cube_stack') {
    const cubes = visualConfig.cubes || []; // {x, y, z}

    // Sort cubes back-to-front (depth-first) for isometric rendering
    const sortedCubes = [...cubes].sort((a, b) => {
      const depthA = a.x + a.y;
      const depthB = b.x + b.y;
      if (depthA !== depthB) return depthA - depthB;
      return a.z - b.z;
    });

    const topGradId = `cubeTop_${reactId}`;
    const leftGradId = `cubeLeft_${reactId}`;
    const rightGradId = `cubeRight_${reactId}`;
    const shadowGradId = `cubeGround_${reactId}`;

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/80 shadow-inner">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
            🧊 3B İzometrik Yapı
          </span>
        </div>

        <svg
          viewBox="0 0 240 220"
          className="w-56 h-56 sm:w-64 sm:h-64 select-none"
          shapeRendering="geometricPrecision"
        >
          <defs>
            {/* Top Face Volumetric Keylight */}
            <linearGradient id={topGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Left Face Diffuse Light */}
            <linearGradient id={leftGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Right Face Ambient Shadow */}
            <linearGradient id={rightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Ground Contact Shadow */}
            <radialGradient id={shadowGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#0f172a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground Soft Contact Shadow */}
          <ellipse cx="120" cy="180" rx="72" ry="24" fill={`url(#${shadowGradId})`} />

          {/* Render 3D Isometric Cubes */}
          {sortedCubes.map((c: any, i: number) => {
            const W = 22; // half width
            const H = 11; // half height
            const cx = 120 + (c.x - c.y) * W;
            const cy = 146 + (c.x + c.y) * H - c.z * 2 * H;

            return (
              <g
                key={i}
                style={{
                  filter: 'drop-shadow(0px 4px 6px rgba(15,23,42,0.12))',
                }}
              >
                {/* Right Face (Shadow) */}
                <polygon
                  points={`${cx},${cy} ${cx + W},${cy - H} ${cx + W},${cy + H} ${cx},${cy + 2 * H}`}
                  fill={`url(#${rightGradId})`}
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />

                {/* Left Face (Diffuse) */}
                <polygon
                  points={`${cx - W},${cy - H} ${cx},${cy} ${cx},${cy + 2 * H} ${cx - W},${cy + H}`}
                  fill={`url(#${leftGradId})`}
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />

                {/* Top Face (Bright Keylight) */}
                <polygon
                  points={`${cx},${cy - 2 * H} ${cx + W},${cy - H} ${cx},${cy} ${cx - W},${cy - H}`}
                  fill={`url(#${topGradId})`}
                  stroke="#64748b"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />

                {/* Top Edge Specular Bevel Highlights */}
                <line
                  x1={cx}
                  y1={cy - 2 * H + 0.8}
                  x2={cx - W + 1}
                  y2={cy - H + 0.8}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1={cx}
                  y1={cy - 2 * H + 0.8}
                  x2={cx + W - 1}
                  y2={cy - H + 0.8}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 21. Dice Net (3D Dokulu Küp Açılımı)
  // -------------------------------------------------------------
  if (mode === 'dice_net') {
    const netFaces = visualConfig.netFaces || [];
    const targetIdx = visualConfig.targetIndex;

    const positions = [
      { col: 1, row: 0 }, // 0
      { col: 0, row: 1 }, // 1
      { col: 1, row: 1 }, // 2
      { col: 2, row: 1 }, // 3
      { col: 1, row: 2 }, // 4
      { col: 1, row: 3 }, // 5
    ];

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/80 shadow-inner">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full shadow-sm">
            🎲 Katlama & Küp Açılımı
          </span>
        </div>

        <div className="relative w-52 h-68 sm:w-64 sm:h-84 select-none">
          {positions.map((pos, i) => {
            const size = 25; // percentage
            const isTarget = i === targetIdx;

            return (
              <div
                key={i}
                className={`absolute bg-white rounded-xl border-2 transition-all duration-200 flex items-center justify-center ${
                  isTarget
                    ? 'border-rose-500 shadow-[0_6px_0_0_#f43f5e] ring-4 ring-rose-300/40 z-20 bg-rose-50/50'
                    : 'border-slate-300 shadow-[0_4px_0_0_#cbd5e1] hover:border-indigo-400 z-10'
                }`}
                style={{
                  left: `${pos.col * size}%`,
                  top: `${pos.row * size}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                }}
              >
                <div className="w-4/5 h-4/5 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <ShapeSvg
                      kind={netFaces[i]}
                      style={{ fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
                      size={75}
                    />
                  </svg>
                </div>
                {isTarget && (
                  <div className="absolute -top-2.5 bg-rose-600 text-white text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full shadow-md uppercase">
                    HEDEF
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 33. Multiview Perspective (3B Sütun Perspektif Görünümü)
  // -------------------------------------------------------------
  if (mode === 'multiview_perspective') {
    const { blocks } = visualConfig;
    const topGradId = `multiTop_${reactId}`;
    const leftGradId = `multiLeft_${reactId}`;
    const rightGradId = `multiRight_${reactId}`;

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/80 gap-3 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-sm">
            📐 3B Perspektif & Üstten Bakış
          </span>
        </div>

        <svg
          viewBox="0 0 240 220"
          className="w-56 h-56 sm:w-64 sm:h-64 select-none"
          shapeRendering="geometricPrecision"
        >
          <defs>
            <linearGradient id={topGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id={leftGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id={rightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>

          {blocks.map((b: any, idx: number) => {
            const W = 22;
            const H = 11;
            const cx = 120 + (b.x - b.y) * W;
            const cy = 140 + (b.x + b.y) * H - b.z * 2 * H;

            return (
              <g
                key={idx}
                style={{
                  filter: 'drop-shadow(0px 3px 5px rgba(49,46,129,0.18))',
                }}
              >
                {/* Top Face */}
                <polygon
                  points={`${cx},${cy - 2 * H} ${cx + W},${cy - H} ${cx},${cy} ${cx - W},${cy - H}`}
                  fill={`url(#${topGradId})`}
                  stroke="#312e81"
                  strokeWidth="1.2"
                />
                {/* Left Face */}
                <polygon
                  points={`${cx - W},${cy - H} ${cx},${cy} ${cx},${cy + 2 * H} ${cx - W},${cy + H}`}
                  fill={`url(#${leftGradId})`}
                  stroke="#312e81"
                  strokeWidth="1.2"
                />
                {/* Right Face */}
                <polygon
                  points={`${cx},${cy} ${cx + W},${cy - H} ${cx + W},${cy + H} ${cx},${cy + 2 * H}`}
                  fill={`url(#${rightGradId})`}
                  stroke="#312e81"
                  strokeWidth="1.2"
                />

                {/* Top Bevel Highlight */}
                <line
                  x1={cx}
                  y1={cy - 2 * H + 0.8}
                  x2={cx - W + 1}
                  y2={cy - H + 0.8}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 36. Spatial Origami Box
  // -------------------------------------------------------------
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
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/90 rounded-2xl border-2 border-slate-200/80 shadow-inner">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-sm">
            📦 Uzamsal Origami ve Katlama
          </span>
        </div>

        <div className="relative w-52 h-68 sm:w-64 sm:h-84 select-none">
          {positions.map((pos) => {
            const sym = faces[pos.idx];
            const isTarget = sym === targetFace;
            const size = 25;

            return (
              <div
                key={pos.idx}
                className={`absolute bg-white rounded-xl border-2 transition-all flex items-center justify-center text-2xl sm:text-3xl font-black ${
                  isTarget
                    ? 'border-rose-500 bg-rose-50 shadow-[0_6px_0_0_#f43f5e] ring-4 ring-rose-300/40 z-20'
                    : 'border-slate-300 shadow-[0_4px_0_0_#cbd5e1] z-10'
                }`}
                style={{
                  left: `${pos.col * size}%`,
                  top: `${pos.row * size}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                }}
              >
                <span className="drop-shadow-sm">{sym}</span>
                {isTarget && (
                  <span className="absolute -top-2.5 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase">
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

  // -------------------------------------------------------------
  // 41. 3D Stack / Spatial Relationship (Üst Üste Katmanlı Dizilim)
  // -------------------------------------------------------------
  if (mode === '3d_stack') {
    const stack = visualConfig.stack || [];

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-50/90 rounded-2xl border-2 border-slate-200/80 gap-3 shadow-inner">
        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
          📐 3B Katmanlı Şekil Dizilimi (Üst Üste)
        </span>
        <div className="w-36 h-36 sm:w-44 sm:h-44 bg-white rounded-2xl border-2 border-slate-300 shadow-[0_6px_0_0_#cbd5e1] flex items-center justify-center p-3 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full select-none" shapeRendering="geometricPrecision">
            {stack.map((item: any, idx: number) => (
              <ShapeSvg
                key={idx}
                kind={item.kind}
                cx={50}
                cy={50}
                size={item.size || 64 - idx * 14}
                style={{
                  fill: item.fill,
                  stroke: '#0f172a',
                  strokeWidth: 2,
                  rotation: item.rotation || 0,
                }}
              />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  return null;
};
