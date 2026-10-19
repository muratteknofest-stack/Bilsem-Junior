import React, { useId } from 'react';
import type { ColorfulValue, ObjectArt } from '../colorful-engine';
import type { DisplayColorfulBoard as Board, DisplayMosaic } from '../public-visual';
import { PUZZLE_COLORS as colors, materialFor } from '../question-materials';
import { objectSilhouette } from '../object-geometry';
/** Color always has a second cue: a distinct geometric motif. */
function Motif({color}:{color:number}) {
  const id=useId().replace(/:/g,'_'),m=materialFor(colors[color]);
  return <g data-puzzle-piece="ceramic"><defs><linearGradient id={`${id}-tile`} x2=".12" y2="1"><stop stopColor={m.light}/><stop offset=".18" stopColor={m.face}/><stop offset=".8" stopColor={m.face}/><stop offset="1" stopColor={m.shade}/></linearGradient></defs>
    <rect x="1" y="5" width="98" height="94" rx="12" fill={m.edge}/><rect x="1" y="1" width="98" height="93" rx="12" fill={`url(#${id}-tile)`} stroke={m.edge} strokeWidth="1.5"/>
    <path d="M6 30V13Q6 6 13 6H86" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5"/>
    <g fill={m.ink}>{color===0?<circle cx="50" cy="47" r="21"/>:color===1?<path d="M50 18L80 74H20Z"/>:color===2?<path d="M50 14L83 47L50 80L17 47Z"/>:color===3?<path d="M38 16H62V36H82V60H62V80H38V60H18V36H38Z"/>:color===4?<><circle cx="30" cy="47" r="13"/><circle cx="70" cy="47" r="13"/></>:<path d="M25 22H75V72H25Z M37 34V60H63V34Z" fillRule="evenodd"/>}</g>
  </g>;
}
export function ObjectShape({value,shadow=false}:{value:ObjectArt;shadow?:boolean}) {
  const id=useId().replace(/:/g,'_'),m=materialFor(colors[value.shape]),paths=objectSilhouette(value);
  return <g data-object-shape={value.shape} data-object-variant={value.variant} data-object-shadow={shadow} strokeLinejoin="round">
    <defs><clipPath id={`${id}-contour`}>{paths.map((d,i)=><path key={i} d={d} clipRule="evenodd"/>)}</clipPath><linearGradient id={`${id}-body`} x2="1" y2=".65"><stop stopColor={m.light}/><stop offset=".24" stopColor={m.face}/><stop offset=".72" stopColor={m.face}/><stop offset="1" stopColor={m.edge}/></linearGradient></defs>
    {paths.map((d,i)=><path key={i} data-object-contour="true" d={d} fill={shadow?'#13283d':`url(#${id}-body)`} fillRule="evenodd" stroke={shadow?'#13283d':m.edge} strokeWidth="1.7"/>)}
    {!shadow&&<g clipPath={`url(#${id}-contour)`}>
      {paths.map((d,i)=><path key={i} d={d} transform="translate(0 -2)" fill="none" stroke="#fff" strokeOpacity=".52" strokeWidth="1.25"/>)}
      {value.shape===0?<><path d="M20 27H69" stroke={m.edge} strokeWidth="3"/><path d="M27 35V66Q27 73 36 74" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="3"/><path d="M39 43H49V53H59V63H49V73H39V63H29V53H39Z" fill={m.ink} opacity=".86"/></>:value.shape===1?<><path d="M31 69H69L61 84H39Z" fill={m.edge}/>{value.variant===3?<circle cx="50" cy="43" r="8" fill="none" stroke={m.ink} strokeWidth="3"/>:<><circle cx="50" cy="42" r="12" fill="#123f68" stroke="#f4f6df" strokeWidth="3"/><path d="M43 39A8 8 0 0 1 52 35" fill="none" stroke="#bce9f5" strokeWidth="2.5" strokeLinecap="round"/></>}<path d="M47 16Q37 31 38 56" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="3"/></>:<><path d="M37 38Q31 50 37 62" fill="none" stroke={m.edge} strokeWidth="2.4"/><circle cx="70" cy="43" r="6" fill="#fff"/><circle cx="71" cy="43" r="3" fill="#172d46"/><path d="M45 35Q56 26 65 32" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round"/></>}
    </g>}
  </g>;
}
function Crayon({color}:{color:number}) {
  const id=useId().replace(/:/g,'_'),m=materialFor(colors[color]);
  return <g><defs><linearGradient id={`${id}-pencil`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={m.light}/><stop offset=".3" stopColor={m.face}/><stop offset=".65" stopColor={m.face}/><stop offset="1" stopColor={m.edge}/></linearGradient></defs>
    <path d="M-55 -11H64Q73 -11 73 0Q73 11 64 11H-55Z" fill={`url(#${id}-pencil)`} stroke={m.edge} strokeWidth="1.2"/>
    <path d="M-83 0L-55 -11V11Z" fill="#e8c89b" stroke="#795a3b" strokeWidth="1"/><path d="M-83 0L-73 -4V4Z" fill={m.edge}/>
    <path d="M-51 -8H56" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5"/><path d="M58 -10V10" stroke={m.edge} strokeWidth="2"/>
    <rect x="34" y="-8" width="16" height="16" rx="4" fill="#fffef5" stroke={m.edge} strokeWidth=".7"/><text x="42" y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#152d46">{color+1}</text>
  </g>;
}
export function ColorfulArt({value,shadow=false,locale='tr'}:{value:ColorfulValue | DisplayMosaic;shadow?:boolean;locale?:'tr'|'en'}) {
  return <svg viewBox={value.art==='crayon'?'-95 -30 190 60':'0 0 100 100'} shapeRendering="geometricPrecision" role="img" aria-label={value.art==='object'?(locale==='en'?'Object drawing':'Nesne çizimi'):value.art==='crayon'?(locale==='en'?`Crayon number ${value.color+1}`:`${value.color+1} numaralı kalem`):(locale==='en'?'Colourful geometric pattern':'Renkli geometrik desen')} className="zp-colorful-art" style={{width:'100%',height:'100%',maxHeight:'100%',display:'block'}}>
    {value.art==='mosaic'?value.cells.map((color,i)=><g key={i} data-mosaic-cell={i} transform={`translate(${i%value.size*100/value.size} ${Math.floor(i/value.size)*100/value.size}) scale(${.96/value.size})`}>{color===null?<g aria-label={locale==='en'?'Missing tile':'Eksik kare'}><rect width="100" height="100" rx="9" fill="#f1f5f9" stroke="#64748b" strokeWidth="3" strokeDasharray="8 5"/><text x="50" y="67" textAnchor="middle" fontSize="55" fontWeight="800" fill="#172033">?</text></g>:<Motif color={color}/>}</g>):value.art==='swatch'?<Motif color={value.color}/>:value.art==='object'?<g transform={`rotate(${value.tilt*90} 50 50)`}><ObjectShape value={value} shadow={shadow}/></g>:<Crayon color={value.color}/>}
  </svg>;
}
export function ColorfulBoard({board:b,locale='tr'}:{board:Board;locale?:'tr'|'en'}) {
  return <div className="zp-colorful-stage" data-colorful-kind={b.kind} style={{width:432,maxWidth:'100%',aspectRatio:'1.45',display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
    {b.kind==='spatial_relationship'?<svg viewBox="-110 -110 220 220" role="img" aria-label={locale==='en'?'Four overlapping numbered crayons':'Üst üste duran dört numaralı kalem'} style={{height:'100%',maxWidth:'100%'}}>{b.layers!.map((color,i)=><g key={color} transform={`rotate(${b.angles![i]})`}><Crayon color={color}/></g>)}</svg>:<>
      <div className="zp-colorful-source" style={{height:'100%',aspectRatio:'1'}}><ColorfulArt locale={locale} value={b.source?.art==='mosaic'&&b.missing!==undefined?{...b.source,cells:b.source.cells.map((color,i)=>i===b.missing?null:color)}:b.source!}/></div>
      {b.kind==='mirror_reflection'&&<svg viewBox="0 0 36 180" style={{height:'90%',width:36}} role="img" aria-label={locale==='en'?'Vertical mirror on the right':'Sağda dikey ayna'}><rect x="4" y="4" width="28" height="172" rx="10" fill="#dbf4ff" stroke="#367e9c" strokeWidth="3"/><path d="M10 40L26 20M10 85L26 65M10 130L26 110" stroke="white" strokeWidth="5"/></svg>}
    </>}
  </div>;
}
