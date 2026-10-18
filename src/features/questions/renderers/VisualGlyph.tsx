import React, { useId } from 'react';
import { isVisualSymbol, VISUAL_SYMBOLS } from '../visual-vocabulary';
import { materialFor } from '../question-materials';

export function GlyphBody({ path, color, flat = false }: { path: string; color: string; flat?: boolean }) {
  const id = useId().replace(/:/g, '_');
  const material=materialFor(color);
  return <>
    <defs>
      <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2=".3" y2="1"><stop stopColor={material.light}/><stop offset=".22" stopColor={color}/><stop offset=".74" stopColor={color}/><stop offset="1" stopColor={material.shade}/></linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={material.shade}/><stop offset="1" stopColor={material.edge}/></linearGradient>
    </defs>
    {!flat && <>
      <path d={path} transform="translate(0 5)" fill="#142b43" opacity=".13"/>
      <path d={path} transform="translate(0 3.5)" fill={`url(#${id}-edge)`} stroke={material.edge} strokeWidth="1.5" strokeLinejoin="round"/>
    </>}
    <path d={path} fill={flat?color:`url(#${id}-glyph)`} stroke={flat?color:material.edge} strokeWidth="1.2" strokeLinejoin="round"/>
    {!flat && <path d={path} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth=".65" strokeLinejoin="round"/>}
  </>;
}

export function SymbolDiagram({ symbol, flat = false }: { symbol: string; flat?: boolean }) {
  if (!isVisualSymbol(symbol)) return <span className="qb-unknown-symbol" role="img" aria-label={`Tanımsız sembol: ${symbol}`}>{symbol}</span>;
  const entry = VISUAL_SYMBOLS[symbol];
  return <svg viewBox="0 0 64 68" className="qb-symbol-svg" role="img" aria-label={entry.label} data-symbol={symbol} shapeRendering="geometricPrecision">
    <GlyphBody path={entry.path} color={entry.color} flat={flat} />
  </svg>;
}

