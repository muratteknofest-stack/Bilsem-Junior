import React, { useId } from 'react';
import { isVisualSymbol, VISUAL_SYMBOLS } from '../visual-vocabulary';

export function GlyphBody({ path, color, flat = false }: { path: string; color: string; flat?: boolean }) {
  const id = useId().replace(/:/g, '_');
  return <>
    <defs><linearGradient id={`${id}-glyph`} x1="0" y1="0" x2=".8" y2="1">
      <stop stopColor="#fff" stopOpacity=".28" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".15" />
    </linearGradient></defs>
    {!flat && <path d={path} transform="translate(0 2)" fill={color} stroke={color} strokeWidth="1.5" opacity=".7" />}
    <path d={path} fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    {!flat && <path d={path} fill={`url(#${id}-glyph)`} stroke="#fff" strokeOpacity=".18" strokeWidth=".7" strokeLinejoin="round" />}
  </>;
}

export function SymbolDiagram({ symbol, flat = false }: { symbol: string; flat?: boolean }) {
  if (!isVisualSymbol(symbol)) return <span className="qb-unknown-symbol" role="img" aria-label={`Tanımsız sembol: ${symbol}`}>{symbol}</span>;
  const entry = VISUAL_SYMBOLS[symbol];
  return <svg viewBox="0 0 64 68" className="qb-symbol-svg" role="img" aria-label={entry.label} data-symbol={symbol} shapeRendering="geometricPrecision">
    <GlyphBody path={entry.path} color={entry.color} flat={flat} />
  </svg>;
}
