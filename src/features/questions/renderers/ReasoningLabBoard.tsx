import React from 'react';
import type { LabBoard } from '../reasoning-lab';

const colors = ['#6d28d9', '#0369a1', '#b45309'];
function NumberCard({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-2 py-1 text-lg font-bold text-indigo-950">{children}</span>;
}
function Steps({ children }: { children: React.ReactNode[] }) {
  return <ol className="mx-auto w-full max-w-sm space-y-2 text-sm text-slate-800">{children.map((child, i) => <li key={i} className="flex items-center gap-2 rounded-xl bg-indigo-50 p-2"><span className="shrink-0 text-xs font-bold">{i + 1}.</span><span className="flex flex-wrap items-center gap-2">{child}</span></li>)}</ol>;
}
function Domino({ values }: { values: [number, number] | null }) {
  const pipPositions = [[32, 32], [20, 20], [44, 44], [44, 20], [20, 44], [20, 32], [44, 32]];
  const pips = [[], [0], [1, 2], [1, 0, 2], [1, 2, 3, 4], [1, 2, 3, 4, 0], [1, 2, 3, 4, 5, 6]];
  return <svg viewBox="0 0 128 64" role="img" aria-label={values ? `Domino ${values[0]} ve ${values[1]}` : 'Eksik domino'} className="w-28 max-w-full">
    <rect x="2" y="2" width="124" height="60" rx="8" fill={values ? '#fff' : '#eef2ff'} stroke="#4338ca" strokeWidth="3" strokeDasharray={values ? undefined : '5 4'}/>
    {values ? <><line x1="64" y1="4" x2="64" y2="60" stroke="#a5b4fc" strokeWidth="2"/>{values.map((n, side) => <g key={side} transform={`translate(${side * 64} 0)`}>{pips[n].map(i => <circle key={i} cx={pipPositions[i][0]} cy={pipPositions[i][1]} r="5" fill="#312e81"/>)}</g>)}</> : <text x="64" y="43" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#4338ca">?</text>}
  </svg>;
}

/** Purpose-built drawings keep every given visible on narrow screens. */
export function ReasoningLabBoard({ board: b }: { board: LabBoard }) {
  switch (b.mechanic) {
    case 'route-count': case 'boundary-edges':
      return <div className="w-full space-y-2 text-center">{b.mechanic === 'route-count' && <p className="text-sm font-bold text-indigo-900">Yalnız → veya ↓</p>}<svg viewBox={`0 0 ${b.size * 48} ${b.size * 48}`} className="mx-auto w-64 max-w-full" role="img" aria-label={b.mechanic === 'route-count' ? `Yol ızgarası, ${b.size} satır ve sütun` : 'Birim karelerden oluşan şeklin dış sınırı'}>
        {Array.from({ length: b.size ** 2 }, (_, i) => {
          const blocked = b.mechanic === 'route-count' && b.blocked.includes(i), filled = b.mechanic === 'boundary-edges' && b.cells[i];
          const label = b.mechanic === 'route-count' ? i === 0 ? 'S' : i === b.size ** 2 - 1 ? 'H' : blocked ? '×' : '' : '';
          return <g key={i} aria-label={`${Math.floor(i / b.size) + 1}. satır ${i % b.size + 1}. sütun: ${label || (filled ? 'dolu' : 'boş')}`}><rect x={i % b.size * 48 + 1} y={Math.floor(i / b.size) * 48 + 1} width="46" height="46" rx={b.mechanic === 'route-count' ? 5 : 0} fill={blocked ? '#334155' : filled ? '#c4b5fd' : '#f8fafc'} stroke={filled ? '#5b21b6' : '#94a3b8'} strokeWidth="2"/><text x={i % b.size * 48 + 24} y={Math.floor(i / b.size) * 48 + 32} textAnchor="middle" fontSize="24" fontWeight="bold" fill={blocked ? '#fff' : '#4338ca'}>{label}</text></g>;
        })}
      </svg></div>;
    case 'domino-chain':
      return <div className="flex w-full flex-wrap items-center justify-center gap-2" aria-label="Soldan sağa domino zinciri">{b.chain.map((d, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden="true" className="text-indigo-500">→</span>}<Domino values={d}/></React.Fragment>)}</div>;
    case 'box-transfer':
      return <div className="w-full space-y-4"><div className="flex flex-wrap justify-center gap-3" aria-label="Başlangıçtaki top sayıları">{b.initial.map((n, i) => <div key={i} className="text-center"><strong className="block">{'ABC'[i]} kutusu</strong><NumberCard>{n}</NumberCard></div>)}</div><Steps>{b.transfers.map((t, i) => <React.Fragment key={i}><strong>{'ABC'[t.from]}</strong><span>→ {t.amount} top →</span><strong>{'ABC'[t.to]}</strong></React.Fragment>)}</Steps></div>;
    case 'switch-parity':
      return <div className="w-full space-y-4"><div className="flex flex-wrap justify-center gap-3" aria-label="Lambaların başlangıç durumu">{b.lamps.map((on, i) => <div key={i} className="text-center"><svg viewBox="0 0 48 58" className="mx-auto w-12" role="img" aria-label={`${i + 1}. lamba ${on ? 'yanıyor' : 'sönük'}`}><circle cx="24" cy="22" r="18" fill={on ? '#facc15' : '#e2e8f0'} stroke="#475569" strokeWidth="2"/><path d="M16 40H32V50H16Z" fill="#64748b"/><text x="24" y="28" textAnchor="middle" fontSize="17" fontWeight="bold">{on ? '1' : '0'}</text></svg><strong>{i + 1}</strong><p className="text-xs">{on ? 'Yanıyor' : 'Sönük'}</p></div>)}</div><Steps>{b.presses.map((p, i) => <React.Fragment key={i}>Düğme: {p.map(j => j + 1).join(', ')}</React.Fragment>)}</Steps></div>;
    case 'position-swaps':
      return <div className="w-full space-y-4"><div className="flex flex-wrap justify-center gap-2" aria-label="Kartların başlangıç sırası">{b.items.map((item, i) => <div key={i} className="text-center"><NumberCard>{item}</NumberCard><p className="text-xs">{i + 1}. kutu</p></div>)}</div><Steps>{b.swaps.map(([a, c], i) => <React.Fragment key={i}>{a + 1}. kutu ↔ {c + 1}. kutu</React.Fragment>)}</Steps></div>;
    case 'guaranteed-draw':
      return <div className="w-full rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-4"><p className="mb-3 text-center text-sm font-bold text-indigo-950">Torbanın içi · Çekilen top geri konmaz</p><div className="space-y-3">{b.counts.map((n, i) => <div key={i} className="flex flex-wrap items-center justify-center gap-1" aria-label={`${i + 1}. renkten ${n} top`}><strong className="mr-2 text-sm">{i + 1}. renk:</strong>{Array.from({ length: n }, (_, j) => <svg key={j} viewBox="0 0 30 30" className="w-7" aria-hidden="true"><circle cx="15" cy="15" r="12" fill={colors[i]}/><text x="15" y="20" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">{i + 1}</text></svg>)}</div>)}</div></div>;
    case 'cheapest-route':
      return <div className="w-full space-y-2">{b.routes.map((route, i) => <div key={i} className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-indigo-50 p-2" aria-label={`${'ABC'[i]} yolu, bölüm uzunlukları: ${route.join(', ')}`}><strong className="mr-2">{'ABC'[i]}</strong><span className="font-bold text-emerald-700">S</span>{route.map((cost, j) => <React.Fragment key={j}><span aria-hidden="true">—</span><NumberCard>{cost}</NumberCard></React.Fragment>)}<span aria-hidden="true">—</span><span className="font-bold text-rose-700">H</span></div>)}</div>;
  }
}
