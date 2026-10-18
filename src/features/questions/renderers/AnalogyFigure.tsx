import React, { useId } from 'react';
import type { AnalogyFigure as Figure } from '../figure-analogy';
const names={circle:'daire',square:'kare',diamond:'eşkenar dörtgen',pentagon:'beşgen',triangle:'üçgen'};
const fills={empty:'boş',solid:'dolu',hatched:'taralı'};
export function AnalogyFigure({figure:f}:{figure:Figure}) {
  const id=useId().replace(/:/g,'');
  const path=f.shape==='circle'?'M50 10A40 40 0 1 0 50 90A40 40 0 1 0 50 10Z':f.shape==='square'?'M10 10H90V90H10Z':f.shape==='diamond'?'M50 8L92 50L50 92L8 50Z':'M50 8L92 38L77 90H23L8 38Z';
  const inner=f.inner==='circle'?'M50 33A17 17 0 1 0 50 67A17 17 0 1 0 50 33Z':f.inner==='diamond'?'M50 28L72 50L50 72L28 50Z':'M50 28L73 69H27Z';
  const fill=(v:Figure['outerFill'])=>v==='empty'?'white':v==='solid'?'#2456d8':`url(#${id}-hatch)`;
  const nested=f.outerFill!=='empty'||f.innerFill!=='empty';
  const label=`${f.half?'Sol yarım ':''}${names[f.shape]}; ${nested?`dış bölge ${fills[f.outerFill]}, iç ${names[f.inner]} ${fills[f.innerFill]}`:`çizgiler: ${[1,2,4,8].filter(bit=>f.lines&bit).map(bit=>({1:'dikey',2:'yatay',4:'sol üstten sağ alta',8:'sağ üstten sol alta'}[bit])).join(', ')||'yok'}`}`;
  return <svg viewBox="0 0 100 100" role="img" shapeRendering="geometricPrecision" aria-label={label} data-analogy-figure={f.shape} className="w-24 sm:w-32 max-w-full mx-auto">
    <defs><pattern id={`${id}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="white"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#2456d8" strokeWidth="2"/></pattern><clipPath id={`${id}-outline`}><path d={path}/></clipPath><clipPath id={`${id}-half`}><rect width={f.half?50:100} height="100"/></clipPath></defs>
    <g clipPath={`url(#${id}-half)`}><path d={path} transform="translate(0 2)" fill="#b4c5e7"/><path d={path} fill={fill(f.outerFill)} stroke="#2456d8" strokeWidth="3" strokeLinejoin="round"/>
      {nested&&<path d={inner} fill={fill(f.innerFill)} stroke="#2456d8" strokeWidth="3"/>}
      <g clipPath={`url(#${id}-outline)`} stroke="#2456d8" strokeWidth="3">{Boolean(f.lines&1)&&<path d="M50 0V100"/>}{Boolean(f.lines&2)&&<path d="M0 50H100"/>}{Boolean(f.lines&4)&&<path d="M0 0L100 100"/>}{Boolean(f.lines&8)&&<path d="M100 0L0 100"/>}</g>
    </g>{f.half&&<path d="M50 10V90" stroke="#2456d8" strokeWidth="3"/>}
  </svg>;
}
