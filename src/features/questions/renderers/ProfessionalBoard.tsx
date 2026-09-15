import React from 'react';
import type { Board, Tile } from '../professional-engine';

export function TileDiagram({ tile }: { tile: Tile }) {
  const cell = 88 / tile.size;
  return <svg viewBox="0 0 100 100" role="img" aria-label={tile.size + ' çarpı ' + tile.size + ' desen ızgarası'} className="w-full h-full max-h-32">
    <rect x="4" y="4" width="92" height="92" rx="3" fill="white" stroke="#94a3b8" strokeWidth="1.2" />
    {tile.cells.map((filled, i) => <rect key={i} x={6 + i % tile.size * cell} y={6 + Math.floor(i / tile.size) * cell} width={cell} height={cell} fill={filled ? '#253557' : '#ffffff'} stroke="#cbd5e1" strokeWidth=".7" />)}
  </svg>;
}

export function ProfessionalBoard({ board }: { board: Board }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-slate-900 space-y-4">
    {board.tiles && <>
      {board.kind === 'transform' && !board.sequence && board.tiles.length === 2 && <p className="text-center text-sm font-semibold text-indigo-700">
        {board.operation === 'rotate' ? 'Saat yönünde ' + (board.turns || 1) * 90 + '° döndür' : board.operation === 'mirrorX' ? 'Ayna sağda · sağ ile sol yer değiştirir' : 'Ayna altta · üst ile alt yer değiştirir'}
      </p>}
      <div className="grid gap-2 sm:gap-4 mx-auto max-w-lg" style={{ gridTemplateColumns: 'repeat(' + Math.min(board.columns || 2, board.tiles.length) + ', minmax(0, 1fr))' }}>
        {board.tiles.map((tile, i) => <div key={i} className="aspect-square p-1 sm:p-2 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
          {tile ? <TileDiagram tile={tile} /> : <span className="text-3xl font-semibold text-indigo-600" aria-label="Eksik desen">?</span>}
        </div>)}
      </div>
    </>}
    {board.kind === 'numbers' && <div className="flex flex-wrap items-center justify-center gap-2">{[...board.values!, '?'].map((v, i) => <span key={i} className="min-w-12 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xl font-semibold tabular-nums text-center">{v}</span>)}</div>}
    {board.kind === 'machine' && <div className="max-w-sm mx-auto space-y-2">
      <div className="grid grid-cols-3 text-center text-sm text-slate-500"><span>Girdi</span><span>Aynı kural</span><span>Çıktı</span></div>
      {[...board.examples!, [board.input!, '?']].map(([x, y], i) => <div key={i} className="grid grid-cols-3 gap-3 items-center text-center text-xl font-semibold"><span className="rounded-lg bg-slate-100 p-2">{x}</span><span className="text-indigo-600">→</span><span className="rounded-lg bg-indigo-50 p-2">{y}</span></div>)}
    </div>}
    {board.kind === 'symbols' && <>
      <div className="flex flex-wrap justify-center gap-3">{board.key!.map(k => <span key={k.symbol} className="rounded-lg border px-3 py-2 text-lg">{k.symbol} = {k.value}</span>)}</div>
      <p className="text-center text-2xl tracking-wider py-4">{board.symbols!.join(' + ')} = ?</p>
    </>}
    {board.kind === 'count' && <div className="grid grid-cols-6 gap-2 max-w-md mx-auto">{board.items!.map((v, i) => <span key={i} className="aspect-square flex items-center justify-center text-xl sm:text-2xl rounded-md bg-slate-50 border border-slate-100">{v}</span>)}</div>}
    {board.kind === 'order' && <div className="max-w-lg mx-auto space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">{board.names!.map(n => <span key={n} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-800">{n}</span>)}</div>
      <ul className="space-y-2 list-disc pl-5 text-base">{board.clues!.map(([a, b], i) => <li key={i}>{b}, {a} adlı kişinin hemen sağındadır.</li>)}</ul>
      <div className="flex justify-center gap-2">{board.names!.map((_, i) => <div key={i} className={'w-12 h-12 flex items-center justify-center border rounded-lg ' + (i + 1 === board.position ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-400')}>{i + 1 === board.position ? '?' : i + 1}</div>)}</div>
    </div>}
  </div>;
}
