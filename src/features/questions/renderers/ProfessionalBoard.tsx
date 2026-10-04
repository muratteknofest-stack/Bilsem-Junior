import React, { useId } from 'react';
import type { Board, Tile } from '../professional-engine';

export function TileDiagram({ tile }: { tile: Tile }) {
  const reactId = useId().replace(/:/g, '_');
  const size = tile.size || 3;
  const padding = 6;
  const boardSize = 88;
  const gap = 2.5;
  const totalGaps = (size - 1) * gap;
  const cell = (boardSize - totalGaps) / size;

  const filledGradId = `tileFill_${reactId}`;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${size} çarpı ${size} 3B desen matrisi`}
      className="w-full h-full max-h-32 select-none"
      shapeRendering="geometricPrecision"
      style={{
        filter: 'drop-shadow(0px 3px 4px rgba(15,23,42,0.1))',
      }}
    >
      <defs>
        {/* 3D Acrylic Cell Volumetric Gradient */}
        <linearGradient id={filledGradId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* 3D Tile Board Frame */}
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="8"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      {/* Top Edge Bevel Highlight */}
      <line
        x1="10"
        y1="4.5"
        x2="90"
        y2="4.5"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Grid Cells */}
      {tile.cells.map((filled, i) => {
        const col = i % size;
        const row = Math.floor(i / size);
        const x = padding + col * (cell + gap);
        const y = padding + row * (cell + gap);

        return (
          <g key={i}>
            {filled ? (
              <g>
                {/* 3D Filled Cell with Bevel */}
                <rect
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx="3.5"
                  fill={`url(#${filledGradId})`}
                  stroke="#1e3a8a"
                  strokeWidth="0.8"
                />
                {/* Specular Highlight on Cell Top */}
                <line
                  x1={x + 2}
                  y1={y + 1}
                  x2={x + cell - 2}
                  y2={y + 1}
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              /* Porcelain Inset Empty Cell */
              <rect
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx="3.5"
                fill="#ffffff"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function ProfessionalBoard({ board }: { board: Board }) {
  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-white p-4 sm:p-6 text-slate-900 space-y-5 shadow-[0_8px_0_0_#e2e8f0] select-none">
      {board.tiles && (
        <>
          {board.kind === 'transform' && !board.sequence && board.tiles.length === 2 && (
            <div className="flex items-center justify-center">
              <span className="text-center text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-4 py-1.5 rounded-full shadow-sm">
                {board.operation === 'rotate'
                  ? `Saat yönünde ${(board.turns || 1) * 90}° döndür`
                  : board.operation === 'mirrorX'
                  ? 'Ayna sağda · Sağ ile sol yer değiştirir'
                  : 'Ayna altta · Üst ile alt yer değiştirir'}
              </span>
            </div>
          )}
          <div
            className="grid gap-3 sm:gap-5 mx-auto max-w-lg"
            style={{
              gridTemplateColumns: `repeat(${Math.min(board.columns || 2, board.tiles.length)}, minmax(0, 1fr))`,
            }}
          >
            {board.tiles.map((tile, i) => (
              <div
                key={i}
                className="aspect-square p-2 sm:p-3 rounded-2xl border-2 border-slate-200/90 flex items-center justify-center bg-slate-50/80 shadow-[0_4px_0_0_#cbd5e1] hover:border-indigo-300 transition-all"
              >
                {tile ? (
                  <TileDiagram tile={tile} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-4xl font-black text-indigo-600 animate-pulse drop-shadow-sm" aria-label="Eksik desen">
                      ?
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Eksik Desen
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {board.kind === 'numbers' && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {[...board.values!, '?'].map((v, i) => {
            const isMissing = v === '?';
            return (
              <span
                key={i}
                className={`min-w-14 sm:min-w-16 rounded-2xl border-2 p-3 sm:p-4 text-xl sm:text-2xl font-black tabular-nums text-center transition-all ${
                  isMissing
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_5px_0_0_#6366f1] animate-pulse ring-2 ring-indigo-400/30'
                    : 'border-slate-300 bg-slate-50 text-slate-800 shadow-[0_5px_0_0_#cbd5e1]'
                }`}
              >
                {v}
              </span>
            );
          })}
        </div>
      )}

      {board.kind === 'machine' && (
        <div className="max-w-md mx-auto space-y-3 bg-slate-50/80 p-4 rounded-2xl border-2 border-slate-200">
          <div className="grid grid-cols-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Girdi</span>
            <span>İşlem Kuralı</span>
            <span>Çıktı</span>
          </div>
          {[...board.examples!, [board.input!, '?']].map(([x, y], i) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-center text-center text-lg sm:text-xl font-bold">
              <span className="rounded-xl bg-white border-2 border-slate-200 shadow-sm p-2 text-slate-800">
                {x}
              </span>
              <span className="text-indigo-600 font-black text-2xl">→</span>
              <span
                className={`rounded-xl border-2 p-2 ${
                  y === '?'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-600 font-black animate-pulse shadow-sm'
                    : 'bg-white border-slate-200 text-indigo-700 shadow-sm'
                }`}
              >
                {y}
              </span>
            </div>
          ))}
        </div>
      )}

      {board.kind === 'symbols' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-3">
            {board.key!.map((k) => (
              <span
                key={k.symbol}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2 text-lg sm:text-xl font-bold text-slate-800 shadow-[0_3px_0_0_#cbd5e1]"
              >
                {k.symbol} = {k.value}
              </span>
            ))}
          </div>
          <p className="text-center text-2xl sm:text-3xl font-black tracking-wider py-2 text-indigo-900">
            {board.symbols!.join(' + ')} = <span className="text-indigo-600 animate-pulse">?</span>
          </p>
        </div>
      )}

      {board.kind === 'count' && (
        <div className="grid grid-cols-6 gap-2 sm:gap-3 max-w-md mx-auto">
          {board.items!.map((v, i) => (
            <span
              key={i}
              className="aspect-square flex items-center justify-center text-2xl sm:text-3xl rounded-xl bg-white border-2 border-slate-200 shadow-[0_3px_0_0_#cbd5e1] hover:border-indigo-300 transition-all"
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {board.kind === 'order' && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {board.names!.map((n) => (
              <span
                key={n}
                className="rounded-full bg-indigo-50 border border-indigo-200 px-3.5 py-1 text-sm font-bold text-indigo-800 shadow-sm"
              >
                {n}
              </span>
            ))}
          </div>
          <ul className="space-y-2 list-disc pl-5 text-sm sm:text-base text-slate-700 font-medium">
            {board.clues!.map(([a, b], i) => (
              <li key={i}>
                <span className="font-bold text-slate-900">{b}</span>,{' '}
                <span className="font-bold text-slate-900">{a}</span> adlı kişinin hemen sağındadır.
              </li>
            ))}
          </ul>
          <div className="flex justify-center gap-2.5">
            {board.names!.map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-2xl text-lg font-black transition-all ${
                  i + 1 === board.position
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50 shadow-[0_4px_0_0_#6366f1] ring-2 ring-indigo-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-400 shadow-[0_3px_0_0_#cbd5e1]'
                }`}
              >
                {i + 1 === board.position ? '?' : i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
