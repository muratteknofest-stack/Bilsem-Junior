import React, { useEffect, useId, useRef, useState } from 'react';
import { Expand, Layers, Shapes, X } from 'lucide-react';
import type { Board, Tile } from '../professional-engine';
import { orderClueText } from '../professional-engine';
import { DEFAULT_VISUAL_THEME, TILE_MOTIFS, type VisualTheme } from '../visual-vocabulary';
import { GlyphBody, SymbolDiagram } from './VisualGlyph';

/** Fixed logical cells; only the uniform, orientation-neutral motif varies. */
export function TileDiagram({ tile, flat = false, hideRight = false, theme = DEFAULT_VISUAL_THEME }: { tile: Tile; flat?: boolean; hideRight?: boolean; theme?: VisualTheme }) {
  const id = useId().replace(/:/g, '_');
  const cell = (208 - (tile.size - 1) * 9) / tile.size;
  const motif = TILE_MOTIFS[theme.motif];
  const rows = Array.from({ length: tile.size }, (_, r) => `${r + 1}. satır: ${tile.cells.slice(r * tile.size, (r + 1) * tile.size).map((v, c) => hideRight && c >= Math.ceil(tile.size / 2) ? 'tamamlanacak' : v ? 'dolu' : 'boş').join(', ')}`).join('; ');
  return <svg viewBox="0 0 240 246" role="img" aria-label={`${tile.size} çarpı ${tile.size} desen; ${motif.label} işaretleri. ${rows}`} className="qb-tile-svg" data-motif={theme.motif} shapeRendering="geometricPrecision">
    <defs><linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor={theme.tint} /></linearGradient></defs>
    {!flat && <rect x="4" y="9" width="232" height="232" rx="22" fill="#c7d0de" />}
    <rect x="4" y="4" width="232" height="232" rx="22" fill={flat ? '#fff' : `url(#${id}-frame)`} stroke="#c6cce0" strokeWidth="1.5" />
    {tile.cells.map((filled, i) => {
      const x = 16 + (i % tile.size) * (cell + 9), y = 16 + Math.floor(i / tile.size) * (cell + 9);
      if (hideRight && i % tile.size >= Math.ceil(tile.size / 2)) return <g key={i}><rect x={x} y={y} width={cell} height={cell} rx="9" fill="#f3f0ff" stroke="#9381ca" strokeDasharray="4 3" /><text x={x + cell / 2} y={y + cell / 2} textAnchor="middle" dominantBaseline="central" fontSize="24" fill="#68539c">?</text></g>;
      return <g key={i} data-cell={filled ? 'filled' : 'empty'}>
        <rect x={x} y={y} width={cell} height={cell} rx="9" fill={filled ? theme.tint : '#fff'} stroke={filled ? '#bdc8d8' : '#d7dfe9'} strokeWidth="1.3" />
        {filled === 1 && <svg x={x + cell * .07} y={y + cell * .05} width={cell * .86} height={cell * .88} viewBox="0 0 64 68" aria-hidden="true"><GlyphBody path={motif.path} color={theme.color} flat={flat} /></svg>}
      </g>;
    })}
    {hideRight && <line x1="120" y1="9" x2="120" y2="231" stroke="#b44830" strokeWidth="2" strokeDasharray="5 4" />}
  </svg>;
}

function BoardContent({ board, flat, theme }: { board: Board; flat: boolean; theme: VisualTheme }) {
  return <div className="qb-content" data-flat={flat}>
    {board.tiles && <>
      {board.kind === 'transform' && !board.sequence && board.tiles.length === 2 && <p className="qb-instruction">{board.operation === 'rotate' ? `Saat yönünde ${(board.turns || 1) * 90}° döndür` : board.operation === 'mirrorX' ? 'Ayna sağda · Sağ ile sol yer değiştirir' : 'Ayna altta · Üst ile alt yer değiştirir'}</p>}
      {board.sequence && <p className="qb-instruction">Soldan sağa ilerle: 1 → 2 → 3 → ?</p>}
      <div className={`qb-grid-scroll ${board.sequence ? 'qb-sequence-scroll' : ''}`} tabIndex={board.sequence ? 0 : undefined} role={board.sequence ? 'region' : undefined} aria-label={board.sequence ? 'Desen dizisi; gerektiğinde yatay kaydır' : undefined}>
        <div className={`qb-board-grid ${board.sequence ? 'qb-sequence' : ''}`} style={{ '--qb-columns': Math.min(board.columns || 2, board.tiles.length) } as React.CSSProperties}>
          {board.tiles.map((tile, i) => <div key={i} className={`qb-tile-card ${tile ? '' : 'qb-missing'}`}>
            {board.sequence && <span className="qb-card-index">{i + 1}. adım</span>}
            {tile ? <TileDiagram tile={tile} theme={theme} flat={flat} hideRight={board.kind === 'symmetry'} /> : <div className="qb-missing-content" aria-label="Eksik desen"><span>?</span><small>Sen tamamla</small></div>}
          </div>)}
        </div>
      </div>
      {board.sequence && <p className="qb-scroll-note">Tüm adımları görmek için gerekirse sağa kaydır.</p>}
    </>}
    {board.kind === 'pyramid' && <div className="qb-pyramid" aria-label="Sayı piramidi">{Array.from({ length: board.base!.length }, (_, r) => <div key={r} className="qb-pyramid-row">{Array.from({ length: r + 1 }, (_, c) => <span key={c} className="qb-number-card">{r === board.base!.length - 1 ? board.base![c] : r === 0 ? '?' : '·'}</span>)}</div>)}<p>Alt iki komşunun toplamını bir üst kutuya taşı.</p></div>}
    {board.kind === 'path' && <div className="qb-path"><div className="qb-path-grid" style={{ gridTemplateColumns: `repeat(${board.gridSize}, 1fr)` }} aria-label="Rota ızgarası; satırlar yukarıdan aşağı, sütunlar soldan sağa">{Array.from({ length: board.gridSize! ** 2 }, (_, i) => {
      const row = Math.floor(i / board.gridSize!), col = i % board.gridSize!, start = row === board.start![0] && col === board.start![1];
      return <div key={i} className={start ? 'qb-path-start' : ''}><small>{row + 1}, {col + 1}</small>{start && <strong>Başla</strong>}</div>;
    })}</div><ol className="qb-path-moves" aria-label="İzlenecek adımlar">{board.moves!.map((m, i) => <li key={i} aria-label={`${i + 1}. adım: ${{ up: 'yukarı', down: 'aşağı', left: 'sola', right: 'sağa' }[m]}`}><small>{i + 1}</small><strong aria-hidden="true">{{ up: '↑', down: '↓', left: '←', right: '→' }[m]}</strong></li>)}</ol></div>}
    {board.kind === 'numbers' && <div className="qb-number-sequence">{[...board.values!, '?'].map((value, i) => <div key={i} className={`qb-number-card ${value === '?' ? 'qb-unknown' : ''}`}><small>{i + 1}. adım</small><strong>{value}</strong></div>)}</div>}
    {board.kind === 'machine' && <div className="qb-machine"><div className="qb-machine-head"><span>GİRDİ</span><span>AYNI İŞLEM</span><span>ÇIKTI</span></div>{[...board.examples!, [board.input!, '?']].map(([x, y], i) => <div className="qb-machine-row" key={i}><span>{x}</span><span className="qb-machine-arrow" aria-hidden="true">→</span><span className={y === '?' ? 'qb-unknown' : ''}>{y}</span></div>)}</div>}
    {board.kind === 'symbols' && <div className="qb-symbols"><div className="qb-key" aria-label="Sembol değerleri">{board.key!.map(k => <div key={k.symbol}><SymbolDiagram symbol={k.symbol} flat={flat} /><span>=</span><strong>{k.value}</strong></div>)}</div><div className="qb-equation" aria-label="Toplanacak semboller">{board.symbols!.map((s, i) => <React.Fragment key={i}>{i > 0 && <span>+</span>}<SymbolDiagram symbol={s} flat={flat} /></React.Fragment>)}<span>=</span><strong>?</strong></div></div>}
    {board.kind === 'count' && <div className="qb-count"><div className="qb-target"><span>Aradığın şekil</span><SymbolDiagram symbol={board.target!} flat={flat} /></div><div className="qb-count-grid" aria-label="Sayılacak şekiller">{board.items!.map((s, i) => <div key={i}><SymbolDiagram symbol={s} flat={flat} /></div>)}</div></div>}
    {board.kind === 'order' && <div className="qb-order"><div className="qb-people">{board.names!.map(n => <span key={n}>{n}</span>)}</div><ol className="qb-clues">{[...(board.clues||[]).map(([a,b])=>`${b}, ${a} adlı kişinin hemen sağındadır.`),...(board.constraints||[]).map(orderClueText)].map((text,i)=><li key={i}><span className="qb-clue-number">{i+1}</span><span>{text}</span></li>)}</ol><div className="qb-positions">{board.names!.map((_, i) => <span key={i} className={i + 1 === board.position ? 'qb-unknown' : ''}><small>{i + 1}. sıra</small><strong>{i + 1 === board.position ? '?' : '·'}</strong></span>)}</div></div>}
  </div>;
}

const titles: Record<Board['kind'], string> = { symmetry: 'Simetriyi tamamla', overlay: 'Desenleri birleştir', pyramid: 'Sayı piramidi', path: 'Rotayı izle', transform: 'Şekil ve dönüşüm', matrix: 'Desen ilişkisi', numbers: 'Sayı örüntüsü', machine: 'İşlem makinesi', symbols: 'Sembol anahtarı', count: 'Dikkat alanı', order: 'İpuçlarını birleştir' };
export function ProfessionalBoard({ board, theme = DEFAULT_VISUAL_THEME }: { board: Board; theme?: VisualTheme }) {
  const [flat, setFlat] = useState(false), [expanded, setExpanded] = useState(false);
  const modal = useRef<HTMLDialogElement>(null), opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!expanded || !modal.current) return;
    const el = modal.current, overflow = document.body.style.overflow;
    el.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; el.close(); };
  }, [expanded]);
  const close = () => { setExpanded(false); opener.current?.focus(); };
  return <section className="qb-studio" aria-label="Soru görseli" style={{ '--qb-accent': theme.color, '--qb-tint': theme.tint } as React.CSSProperties}>
    <div className="qb-toolbar"><span><Shapes size={16} /> {titles[board.kind]}</span><div><button type="button" aria-pressed={flat} onClick={() => setFlat(!flat)}><Layers size={14} /><span>Sade görünüm</span></button><button ref={opener} type="button" onClick={() => setExpanded(true)} aria-label="Soru görselini büyüt"><Expand size={15} /><span>Büyüt</span></button></div></div>
    <BoardContent board={board} flat={flat} theme={theme} />
    <dialog ref={modal} className="qb-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); close(); }} onClose={() => setExpanded(false)} onClick={e => { if (e.target === e.currentTarget) close(); }} onKeyDown={e => {
      if (e.key !== 'Tab') return;
      const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
      if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
    }}>
      <div className="qb-dialog-inner"><div className="qb-dialog-header"><div><h2 id={titleId}>{titles[board.kind]}</h2><p>Aynı soru, daha geniş inceleme alanı.</p></div><button type="button" autoFocus onClick={close} aria-label="Büyütülmüş görseli kapat"><X size={21} /></button></div><BoardContent board={board} flat={flat} theme={theme} /><p className="qb-dialog-note">İncelemeyi bitirdiğinde kapatıp cevabını yerleştirebilirsin.</p></div>
    </dialog>
  </section>;
}
