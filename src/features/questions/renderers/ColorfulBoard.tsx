import React from 'react';
import type { ColorfulBoard as Board, ColorfulValue, ObjectArt } from '../colorful-engine';
const colors=['#ef476f','#168aad','#ffba08','#06a77d','#805ad5','#f07822'];
/** Color always has a second cue: a distinct geometric motif. */
function Motif({color}:{color:number}) {
  return <g><rect width="100" height="100" rx="9" fill={colors[color]}/><path d="M5 95V5H95" fill="none" stroke="white" strokeOpacity=".3" strokeWidth="5"/>
    {color===0?<circle cx="50" cy="50" r="22" fill="white"/>:color===1?<path d="M50 20L80 76H20Z" fill="white"/>:color===2?<path d="M50 16L84 50L50 84L16 50Z" fill="white"/>:color===3?<path d="M38 18H62V38H82V62H62V82H38V62H18V38H38Z" fill="white"/>:color===4?<g fill="white"><circle cx="30" cy="50" r="13"/><circle cx="70" cy="50" r="13"/></g>:<path d="M25 25H75V75H25Z M37 37V63H63V37Z" fill="white" fillRule="evenodd"/>}</g>;
}
function ObjectShape({value,shadow=false}:{value:ObjectArt;shadow?:boolean}) {
  const {shape,variant}=value,fill=shadow?'#172033':colors[shape], detail=shadow?fill:'#ffdd73';
  // Original cup, rocket and fish outlines; variants alter physical geometry.
  return <g stroke={shadow?fill:'#25324a'} strokeWidth="2" strokeLinejoin="round">
    {shape===0?<><path d={variant===1?'M25 22H70V72Q47 92 25 72Z M70 30H93V62H70 M77 38V54H85V38Z':'M20 25H65V72Q42 90 20 72Z M65 32H88V63H65 M72 40V55H81V40Z'} fill={fill} fillRule="evenodd"/>{variant===2&&<path d="M30 12Q40 3 40 18M49 12Q59 3 59 18" stroke={fill} strokeWidth="7" fill="none"/>}{variant===3&&<path d="M13 81H82V88H13Z" fill={fill}/>}</>:shape===1?<><path d={variant===1?'M50 8Q70 28 65 69L82 84L63 81L50 94L37 81L18 84L35 69Q30 28 50 8Z':'M50 8Q74 31 65 71L80 89L59 82H41L20 89L35 71Q26 31 50 8Z'} fill={fill}/>{variant!==2&&<circle cx="50" cy={variant===3?59:42} r="10" fill="white"/ >}</>:<><path d={variant===1?'M18 50Q52 8 78 50Q52 92 18 50L4 73V27Z':'M18 50Q52 18 78 50Q52 82 18 50L4 70V30Z'} fill={fill}/>{variant===2&&<path d="M34 30L48 10L56 28Z" fill={fill}/>}<circle cx={variant===3?52:63} cy="45" r="4" fill="white"/></>}
    {!shadow&&shape===0&&<path d="M30 38H53V62H30Z" fill={detail} stroke="none"/>}
  </g>;
}
function Crayon({color}:{color:number}) {return <g><path d="M-83 0L-55 -11H64Q73 -11 73 0Q73 11 64 11H-55Z" fill={colors[color]} stroke="#26324a" strokeWidth="1.5"/><path d="M-38 -11V11M51 -11V11" stroke="#26324a" strokeWidth="2"/><rect x="-28" y="-5" width="56" height="10" rx="4" fill="white" fillOpacity=".4"/><text x="42" y="5" fontSize="14" fontWeight="bold" fill="#111827">{color+1}</text></g>;}
export function ColorfulArt({value,shadow=false}:{value:ColorfulValue;shadow?:boolean}) {
  return <svg viewBox={value.art==='crayon'?'-95 -30 190 60':'0 0 100 100'} role="img" aria-label={value.art==='object'?'Nesne çizimi':value.art==='crayon'?`${value.color+1} numaralı kalem`:'Renkli geometrik desen'} className="zp-colorful-art" style={{width:'100%',height:'100%',maxHeight:'100%',display:'block'}}>
    {value.art==='mosaic'?value.cells.map((color,i)=><g key={i} transform={`translate(${i%value.size*100/value.size} ${Math.floor(i/value.size)*100/value.size}) scale(${.96/value.size})`}><Motif color={color}/></g>):value.art==='swatch'?<Motif color={value.color}/>:value.art==='object'?<g transform={`rotate(${value.tilt*90} 50 50)`}><ObjectShape value={value} shadow={shadow}/></g>:<Crayon color={value.color}/>}
  </svg>;
}
export function ColorfulBoard({board:b}:{board:Board}) {
  return <div data-colorful-kind={b.kind} style={{width:360,maxWidth:'100%',aspectRatio:'1.45',display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
    {b.kind==='spatial_relationship'?<svg viewBox="-110 -110 220 220" role="img" aria-label="Üst üste duran dört numaralı kalem" style={{height:'100%',maxWidth:'100%'}}>{b.layers!.map((color,i)=><g key={color} transform={`rotate(${b.angles![i]})`}><Crayon color={color}/></g>)}</svg>:<>
      <div style={{position:'relative',height:'100%',aspectRatio:'1'}}><ColorfulArt value={b.source!}/>
        {b.missing!==undefined&&b.source?.art==='mosaic'&&<div style={{position:'absolute',left:`${b.missing%b.source.size*100/b.source.size}%`,top:`${Math.floor(b.missing/b.source.size)*100/b.source.size}%`,width:`${100/b.source.size}%`,height:`${100/b.source.size}%`,display:'grid',placeItems:'center',background:'#f1f5f9',border:'2px dashed #64748b',borderRadius:6,fontSize:32,fontWeight:800}}>?</div>}
      </div>
      {b.kind==='mirror_reflection'&&<svg viewBox="0 0 36 180" style={{height:'90%',width:36}} role="img" aria-label="Sağda dikey ayna"><rect x="4" y="4" width="28" height="172" rx="10" fill="#dbf4ff" stroke="#367e9c" strokeWidth="3"/><path d="M10 40L26 20M10 85L26 65M10 130L26 110" stroke="white" strokeWidth="5"/></svg>}
    </>}
  </div>;
}
