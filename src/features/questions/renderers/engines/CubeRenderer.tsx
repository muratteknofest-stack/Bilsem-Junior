import React from 'react';
import { BaseQuestion } from '../../../../types';
import { ShapeSvg } from '../../../../lib/svg-primitives';

interface EngineProps {
  question: BaseQuestion;
  mode: string;
}

export const CubeRenderer: React.FC<EngineProps> = ({ question, mode }) => {
  const { visualConfig } = question;

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

  return null;
};
