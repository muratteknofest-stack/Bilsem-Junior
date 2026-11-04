import React, { useId } from 'react';
import type { ShadowBoard, ShadowValue } from '../composite-shadow';
const COLORS = ['#009e78', '#5544e7', '#087db6', '#be347f', '#ed8b22'];
/** The same polygons and through-holes draw the coloured target and every silhouette. */
export function CompositeShadowArt({ board, value }: { board?: ShadowBoard; value?: ShadowValue }) {
  const id = 'shadow-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const polygons = board ? board.shapes.map(s => s.points) : value!.polygons;
  const holes = board ? board.holes : value!.holes;
  return <svg viewBox="0 0 100 100" className={`bj-shadow-art${board ? ' is-target' : ' is-choice'}`} role="img" aria-label={board ? 'Birleşik renkli hedef şekil ve iç boşlukları' : 'Birleşik şeklin gölge seçeneği'} shapeRendering="geometricPrecision">
    <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="white"/>{holes.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={h.r} fill="black"/>)}</mask></defs>
    {board && <circle cx="50" cy="50" r="44" fill="#f1f2ff" stroke="#d2d4ff" strokeWidth=".55"/>}
    <g mask={`url(#${id})`}>{polygons.map((p, i) => <polygon key={i} points={p.map(v => v.join(',')).join(' ')} fill={board ? COLORS[board.shapes[i].color] : '#141d35'}/>)}</g>
  </svg>;
}
export function CompositeShadowBoard({ board }: { board: ShadowBoard }) {
  return <figure className="bj-shadow-board" data-shadow-board><CompositeShadowArt board={board}/><figcaption>HEDEF ŞEKİL</figcaption></figure>;
}
