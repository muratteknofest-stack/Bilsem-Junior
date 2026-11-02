import React from 'react';
import { PERCEPTUAL_TITLES, type PerceptualBoard as Board, type PerceptualValue } from '../perceptual-engine';

const paths: Record<PerceptualValue['shape'], string> = {
  arrow: 'M4 11H17V5L29 16L17 27V21H4Z',
  flag: 'M7 28V4H26L22 10L26 16H11V28Z',
  key: 'M13 4A8 8 0 1 0 18 18L28 28L31 25L28 22L26 24L24 22L26 20L21 15A8 8 0 0 0 13 4Z',
  leaf: 'M5 27C1 10 10 3 28 4C29 19 21 29 8 25L5 29Z',
};
const colors = { arrow: '#2854a4', flag: '#a43f29', key: '#166c58', leaf: '#7841a1' };
const names = { arrow: 'ok', flag: 'bayrak', key: 'anahtar', leaf: 'yaprak' };
const directions = ['başlangıç yönünde', 'saat yönünde bir çeyrek tur', 'yarım tur', 'saat yönünde üç çeyrek tur'];
export function PerceptualCard({ value }: { value: PerceptualValue }) {
  const positions = value.count === 1 ? [[50, 50]] : value.count === 2 ? [[29, 50], [71, 50]] : value.count === 3 ? [[50, 28], [29, 70], [71, 70]] : value.count === 4 ? [[29, 29], [71, 29], [29, 71], [71, 71]] : Array.from({ length: value.count }, (_, i) => [20 + i % 3 * 30, 30 + Math.floor(i / 3) * 40]);
  const size = value.count === 1 ? 58 : value.count <= 4 ? 35 : 27;
  return <svg className="bj-perceptual-card" viewBox="0 0 100 100" role="img" aria-label={`${value.count} ${names[value.shape]}, ${directions[value.rotation]}, ${value.filled ? 'dolu' : 'içi boş'}`} data-perceptual-card="true">
    {positions.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${value.rotation * 90}) scale(${size / 32}) translate(-16 -16)`}>
      <path d={paths[value.shape]} fill={value.filled ? colors[value.shape] : '#fff'} stroke={colors[value.shape]} strokeWidth="2" strokeLinejoin="round"/>
      {value.shape === 'key' && <circle cx="12" cy="11" r="2.5" fill="#fff" stroke={colors.key} strokeWidth="1.5"/>}
      {value.shape === 'leaf' && <path d="M7 25L23 9M14 18L12 11M18 14L24 15" fill="none" stroke={value.filled ? '#fff' : colors.leaf} strokeWidth="1.8" strokeLinecap="round"/>}
    </g>)}
  </svg>;
}
export function PerceptualBoard({ board }: { board: Board }) {
  const paired = board.mechanic === 'paired-analogy', matrix = board.mechanic === 'matrix-attributes', grid = board.mechanic === 'analogy-grid', classify = board.mechanic === 'feature-classification';
  const title = PERCEPTUAL_TITLES[board.mechanic];
  const cell = (v: PerceptualValue | null, i: number) => <div className={`bj-perceptual-cell ${v ? '' : 'bj-perceptual-missing'}`} key={i}>
    {!paired && !matrix && !grid && <span className="bj-perceptual-order">{classify ? `Örnek ${i + 1}` : `${i + 1}. kart`}</span>}
    {v ? <PerceptualCard value={v}/> : <span className="bj-perceptual-question" role="img" aria-label="Eksik kart">?</span>}
  </div>;
  return <section className="bj-perceptual-board" data-perceptual-mechanic={board.mechanic} aria-label={title}>
    <p className="bj-perceptual-title">{title}</p>
    {paired ? <div className="bj-perceptual-pairs">{[0, 2, 4].map((i, row) => <div className="bj-perceptual-pair" key={i}><span className="bj-perceptual-pair-label">{row < 2 ? `${row + 1}. örnek` : 'Sen tamamla'}</span>{cell(board.cards[i], i)}<span className="bj-perceptual-arrow" aria-hidden="true">→</span>{cell(board.cards[i + 1], i + 1)}</div>)}</div> : <div className={`bj-perceptual-layout ${matrix ? 'bj-perceptual-matrix' : grid ? 'bj-perceptual-grid' : classify ? 'bj-perceptual-examples' : 'bj-perceptual-sequence'}`}>{board.cards.map(cell)}</div>}
  </section>;
}
