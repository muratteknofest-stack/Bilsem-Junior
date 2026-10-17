import React, { useId } from 'react';
import { isVisualSymbol, VISUAL_SYMBOLS } from '../visual-vocabulary';

export function GlyphBody({ path, color, flat = false }: { path: string; color: string; flat?: boolean }) {
  const id = useId().replace(/:/g, '_');
  return <>
    <defs>
      <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#fff" stopOpacity=".48"/><stop offset=".42" stopColor="#fff" stopOpacity=".05"/><stop offset="1" stopColor="#091732" stopOpacity=".25"/></linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0d1934" stopOpacity=".15"/><stop offset="1" stopColor="#0d1934" stopOpacity=".55"/></linearGradient>
    </defs>
    {!flat && <>
      <path d={path} transform="translate(0 4)" fill={color} stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d={path} transform="translate(0 4)" fill={`url(#${id}-edge)`} stroke="#142641" strokeOpacity=".3" strokeWidth="1" strokeLinejoin="round"/>
    </>}
    <path d={path} fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    {!flat && <path d={path} fill={`url(#${id}-glyph)`} stroke="#fff" strokeOpacity=".5" strokeWidth="1" strokeLinejoin="round"/>}
  </>;
}

export function SymbolDiagram({ symbol, flat = false }: { symbol: string; flat?: boolean }) {
  if (!isVisualSymbol(symbol)) return <span className="qb-unknown-symbol" role="img" aria-label={`Tanımsız sembol: ${symbol}`}>{symbol}</span>;
  const entry = VISUAL_SYMBOLS[symbol];
  return <svg viewBox="0 0 64 68" className="qb-symbol-svg" role="img" aria-label={entry.label} data-symbol={symbol} shapeRendering="geometricPrecision">
    <GlyphBody path={entry.path} color={entry.color} flat={flat} />
  </svg>;
}

