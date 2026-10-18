import React, { useId } from 'react';
import type { ColorfulValue, ObjectArt } from '../colorful-engine';
import type { DisplayColorfulBoard as Board, DisplayMosaic } from '../public-visual';
const colors=['#ef476f','#168aad','#ffba08','#06a77d','#805ad5','#f07822'];
/** Color always has a second cue: a distinct geometric motif. */
function Motif({color}:{color:number}) {
  const id=useId().replace(/:/g,'_');
  return <g><defs><linearGradient id={`${id}-tile`} x2=".3" y2="1"><stop stopColor="#fff" stopOpacity=".32"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#14233f" stopOpacity=".22"/></linearGradient></defs><rect y="4" width="100" height="96" rx="9" fill="#263b56"/><rect width="100" height="95" rx="9" fill={colors[color]}/><rect width="100" height="95" rx="9" fill={`url(#${id}-tile)`}/><path d="M4 84V10Q4 4 10 4H89" fill="none" stroke="white" strokeOpacity=".55" strokeWidth="2"/>
    {color===0?<circle cx="50" cy="50" r="22" fill="white"/>:color===1?<path d="M50 20L80 76H20Z" fill="white"/>:color===2?<path d="M50 16L84 50L50 84L16 50Z" fill="white"/>:color===3?<path d="M38 18H62V38H82V62H62V82H38V62H18V38H38Z" fill="white"/>:color===4?<g fill="white"><circle cx="30" cy="50" r="13"/><circle cx="70" cy="50" r="13"/></g>:<path d="M25 25H75V75H25Z M37 37V63H63V37Z" fill="white" fillRule="evenodd"/>}</g>;
}
function ObjectShape({value,shadow=false}:{value:ObjectArt;shadow?:boolean}) {
  const id=useId().replace(/:/g,'_');
  const {shape,variant}=value,fill=shadow?'#172033':`url(#${id}-object)`, detail=shadow?fill:'#ffdd73';
  // Original cup, rocket and fish outlines; variants alter physical geometry.
  return <g stroke={shadow?fill:'#25324a'} strokeWidth="2" strokeLinejoin="round">
    {!shadow&&<defs><linearGradient id={`${id}-object`} x2=".7" y2="1"><stop stopColor={colors[shape]}/><stop offset=".5" stopColor={colors[shape]}/><stop offset="1" stopColor="#27465c"/></linearGradient></defs>}
    {shape===0?<><path d={variant===1?'M25 22H70V72Q47 92 25 72Z M70 30H93V62H70 M77 38V54H85V38Z':'M20 25H65V72Q42 90 20 72Z M65 32H88V63H65 M72 40V55H81V40Z'} fill={fill} fillRule="evenodd"/>{variant===2&&<path d="M30 12Q40 3 40 18M49 12Q59 3 59 18" stroke={fill} strokeWidth="7" fill="none"/>}{variant===3&&<path d="M13 81H82V88H13Z" fill={fill}/>}</>:shape===1?<><path d={variant===1?'M50 8Q70 28 65 69L82 84L63 81L50 94L37 81L18 84L35 69Q30 28 50 8Z':'M50 8Q74 31 65 71L80 89L59 82H41L20 89L35 71Q26 31 50 8Z'} fill={fill}/>{variant!==2&&<circle cx="50" cy={variant===3?59:42} r="10" fill="white"/ >}</>:<><path d={variant===1?'M18 50Q52 8 78 50Q52 92 18 50L4 73V27Z':'M18 50Q52 18 78 50Q52 82 18 50L4 70V30Z'} fill={fill}/>{variant===2&&<path d="M34 30L48 10L56 28Z" fill={fill}/>}<circle cx={variant===3?52:63} cy="45" r="4" fill="white"/></>}
    {!shadow&&shape===0&&<path d="M30 38H53V62H30Z" fill={detail} stroke="none"/>}
  </g>;
}
function Crayon({color}:{color:number}) {return <g><path d="M-83 0L-55 -11H64Q73 -11 73 0Q73 11 64 11H-55Z" fill={colors[color]} stroke="#26324a" strokeWidth="1.5"/><path d="M-38 -11V11M51 -11V11" stroke="#26324a" strokeWidth="2"/><rect x="-28" y="-5" width="56" height="10" rx="4" fill="white" fillOpacity=".4"/><text x="42" y="5" fontSize="14" fontWeight="bold" fill="#111827">{color+1}</text></g>;}
export function ColorfulArt({value,shadow=false,locale='tr'}:{value:ColorfulValue | DisplayMosaic;shadow?:boolean;locale?:'tr'|'en'}) {
  return <svg viewBox={value.art==='crayon'?'-95 -30 190 60':'0 0 100 100'} shapeRendering="geometricPrecision" role="img" aria-label={value.art==='object'?(locale==='en'?'Object drawing':'Nesne çizimi'):value.art==='crayon'?(locale==='en'?`Crayon number ${value.color+1}`:`${value.color+1} numaralı kalem`):(locale==='en'?'Colourful geometric pattern':'Renkli geometrik desen')} className="zp-colorful-art" style={{width:'100%',height:'100%',maxHeight:'100%',display:'block'}}>
    {value.art==='mosaic'?value.cells.map((color,i)=><g key={i} data-mosaic-cell={i} transform={`translate(${i%value.size*100/value.size} ${Math.floor(i/value.size)*100/value.size}) scale(${.96/value.size})`}>{color===null?<g aria-label={locale==='en'?'Missing tile':'Eksik kare'}><rect width="100" height="100" rx="9" fill="#f1f5f9" stroke="#64748b" strokeWidth="3" strokeDasharray="8 5"/><text x="50" y="67" textAnchor="middle" fontSize="55" fontWeight="800" fill="#172033">?</text></g>:<Motif color={color}/>}</g>):value.art==='swatch'?<Motif color={value.color}/>:value.art==='object'?<g transform={`rotate(${value.tilt*90} 50 50)`}><ObjectShape value={value} shadow={shadow}/></g>:<Crayon color={value.color}/>}
  </svg>;
}
export function ColorfulBoard({board:b,locale='tr'}:{board:Board;locale?:'tr'|'en'}) {
  return <div data-colorful-kind={b.kind} style={{width:360,maxWidth:'100%',aspectRatio:'1.45',display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
    {b.kind==='spatial_relationship'?<svg viewBox="-110 -110 220 220" role="img" aria-label={locale==='en'?'Four overlapping numbered crayons':'Üst üste duran dört numaralı kalem'} style={{height:'100%',maxWidth:'100%'}}>{b.layers!.map((color,i)=><g key={color} transform={`rotate(${b.angles![i]})`}><Crayon color={color}/></g>)}</svg>:<>
      <div style={{height:'100%',aspectRatio:'1'}}><ColorfulArt locale={locale} value={b.source?.art==='mosaic'&&b.missing!==undefined?{...b.source,cells:b.source.cells.map((color,i)=>i===b.missing?null:color)}:b.source!}/></div>
      {b.kind==='mirror_reflection'&&<svg viewBox="0 0 36 180" style={{height:'90%',width:36}} role="img" aria-label={locale==='en'?'Vertical mirror on the right':'Sağda dikey ayna'}><rect x="4" y="4" width="28" height="172" rx="10" fill="#dbf4ff" stroke="#367e9c" strokeWidth="3"/><path d="M10 40L26 20M10 85L26 65M10 130L26 110" stroke="white" strokeWidth="5"/></svg>}
    </>}
  </div>;
}
