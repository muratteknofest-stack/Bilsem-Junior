import React,{lazy,Suspense,useCallback,useContext,useId,useMemo,useState} from 'react';
import {createSpatialScene,spatialQuality} from '../spatial-scene';
import {SpatialPresentation} from './spatial-presentation';
const SpatialCanvas=lazy(()=>import('./SpatialCanvas'));
class SceneBoundary extends React.Component<{children:React.ReactNode;fallback:React.ReactNode;onFailure:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?this.props.fallback:this.props.children;}}

/** Orthographic projection: exact unit cubes, back-to-front ordering, no perspective distortion. */
function CubeSculptureSvg({size, heights}: {size: number; heights: number[]}) {
  const id=useId().replace(/:/g,'_'), unit=30, lift=30, originX=size*unit+18, originY=Math.max(1,...heights)*lift+8;
  const cells=heights.map((height,i)=>({height,row:Math.floor(i/size),col:i%size})).sort((a,b)=>(a.row+a.col)-(b.row+b.col)||a.row-b.row);
  const at=(r:number,c:number,z=0)=>[originX+(c-r)*unit,originY+(r+c)*unit/2-z*lift];
  const diamond=(x:number,y:number)=>`${x},${y} ${x+unit},${y+unit/2} ${x},${y+unit} ${x-unit},${y+unit/2}`;
  return <svg viewBox={`0 0 ${size*unit*2+36} ${originY+size*unit+42}`} className="w-full max-w-md mx-auto" role="img" shapeRendering="geometricPrecision" aria-label={`Üç boyutlu birim küp yapısı. ${heights.map((h,i)=>`${Math.floor(i/size)+1}. satır ${i%size+1}. sütun: ${h} küp`).join('; ')}`}>
    <defs>
      <linearGradient id={`${id}-top`} x2=".8" y2="1"><stop stopColor="#b4d0ff"/><stop offset="1" stopColor="#5e95ed"/></linearGradient>
      <linearGradient id={`${id}-left`} x2="1" y2="1"><stop stopColor="#4c87e1"/><stop offset="1" stopColor="#2d63bc"/></linearGradient>
      <linearGradient id={`${id}-right`} x2="1" y2="1"><stop stopColor="#2859ae"/><stop offset="1" stopColor="#173b7b"/></linearGradient>
    </defs>
    <ellipse cx={originX} cy={originY+size*unit/2+12} rx={size*unit*.92} ry={size*unit*.47} fill="#243d68" opacity=".06"/>
    {cells.map(({row,col})=>{const [x,y]=at(row,col);return <polygon key={`floor-${row}-${col}`} points={diamond(x,y)} fill="#edf2fa" stroke="#c4d2e8" strokeWidth=".8"/>;})}
    {cells.flatMap(({height,row,col})=>Array.from({length:height},(_,z)=>{const [x,y]=at(row,col,z+1);return <g data-unit-cube="true" key={`${row}-${col}-${z}`} stroke="#223f72" strokeWidth=".9" strokeLinejoin="round">
      <path d={`M${x-unit} ${y+unit/2}L${x} ${y+unit}V${y+unit+lift}L${x-unit} ${y+unit/2+lift}Z`} fill={`url(#${id}-left)`}/>
      <path d={`M${x} ${y+unit}L${x+unit} ${y+unit/2}V${y+unit/2+lift}L${x} ${y+unit+lift}Z`} fill={`url(#${id}-right)`}/>
      <polygon points={diamond(x,y)} fill={`url(#${id}-top)`}/>
      <path d={`M${x-unit+2} ${y+unit/2}L${x} ${y+1}L${x+unit-2} ${y+unit/2}`} fill="none" stroke="#f4f8ff" strokeWidth="1.1"/>
    </g>;}))}
    <text x={originX} y={originY+size*unit+31} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3a527a">ÖN ↓</text>
  </svg>;
}

export function CubeSculpture({size,heights}:{size:number;heights:number[]}){
 const presentation=useContext(SpatialPresentation),[three,setThree]=useState(presentation.method==='webgl'),[unavailable,setUnavailable]=useState(false);
 const onLost=useCallback(()=>{setThree(false);setUnavailable(true);presentation.onUnavailable?.();},[presentation.onUnavailable]),scene=useMemo(()=>createSpatialScene(size,heights),[size,heights]);
 const quality=spatialQuality(typeof window==='undefined'||typeof navigator==='undefined'?{}:{cores:navigator.hardwareConcurrency,memoryGb:(navigator as Navigator&{deviceMemory?:number}).deviceMemory,pixelRatio:window.devicePixelRatio});
 const fallback=<CubeSculptureSvg size={size} heights={heights}/>;
 return <div className="w-full max-w-md min-w-0 mx-auto" data-spatial-scene="unit-cubes">
  {three?<div className="relative w-full overflow-hidden rounded-2xl bg-blue-50" style={{height:'min(38dvh,300px)',minHeight:160}} role="img" aria-label="Birim küplerin sabit bakış açısıyla üç boyutlu görünümü"><SceneBoundary fallback={fallback} onFailure={onLost}><Suspense fallback={fallback}><SpatialCanvas scene={scene} quality={quality} onLost={onLost} perspective={presentation.perspective}/></Suspense></SceneBoundary><span className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-xs font-bold text-indigo-900">ÖN ↓</span></div>:fallback}
  {presentation.controls&&<button type="button" aria-pressed={three} onClick={()=>{setUnavailable(false);setThree(value=>!value);}} className="mt-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-800 shadow-sm">{three?'Net çizim':'3B görünüm'}</button>}
  {unavailable&&presentation.controls&&<p role="status" className="text-xs text-indigo-800">Bu cihazda net çizim kullanılıyor.</p>}
 </div>;
}
