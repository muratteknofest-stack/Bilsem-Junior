import React,{lazy,Suspense,useCallback,useContext,useId,useMemo,useState} from 'react';
import {createSpatialScene,spatialQuality} from '../spatial-scene';
import {cubeIsometricGeometry} from '../cube-isometric';
import {SpatialPresentation} from './spatial-presentation';
const SpatialCanvas=lazy(()=>import('./SpatialCanvas'));
class SceneBoundary extends React.Component<{children:React.ReactNode;fallback:React.ReactNode;onFailure:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?this.props.fallback:this.props.children;}}

/** Analytic isometric projection stays sharp at every pixel density. */
export function CubeSculptureSvg({size, heights}: {size: number; heights: number[]}) {
 const id=useId().replace(/:/g,'_'),geometry=useMemo(()=>cubeIsometricGeometry(size,heights),[size,heights]);
 const points=(p:number[][])=>p.map(x=>x.join(',')).join(' ');
 return <svg viewBox={geometry.viewBox.join(' ')} className="bj-cube-sculpture w-full max-w-md mx-auto" role="img" shapeRendering="geometricPrecision" aria-label="Birim küplerin sabit, eş ölçülü üç boyutlu görünümü. ÖN oku planın alt kenarını, SAĞ oku sağ kenarını gösterir.">
  <defs>
   <linearGradient id={`${id}-top`} x2=".3" y2="1"><stop stopColor="#e4fbff"/><stop offset="1" stopColor="#95d9fa"/></linearGradient>
   <linearGradient id={`${id}-left`} x2=".8" y2="1"><stop stopColor="#58b7ec"/><stop offset="1" stopColor="#287cbd"/></linearGradient>
   <linearGradient id={`${id}-right`} x2=".8" y2="1"><stop stopColor="#286fac"/><stop offset="1" stopColor="#174778"/></linearGradient>
   <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#133d6b"/></marker>
  </defs>
  {geometry.floor.map((p,i)=><polygon key={`floor-${i}`} points={points(p)} fill="#eef5fb" stroke="#9fb7cf" strokeWidth=".65"/>)}
  {geometry.cubes.map(c=><g key={`${c.x}-${c.y}-${c.z}`} data-unit-cube="true" stroke="#174571" strokeWidth=".9" strokeLinejoin="round">
   {c.left&&<polygon data-cube-face="left" points={points(c.left)} fill={`url(#${id}-left)`}/>}
   {c.right&&<polygon data-cube-face="right" points={points(c.right)} fill={`url(#${id}-right)`}/>}
   {c.top&&<polygon data-cube-face="top" points={points(c.top)} fill={`url(#${id}-top)`} stroke="#326d98"/>}
  </g>)}
  {(['front','right'] as const).map(side=>{const [from,to]=geometry[side];return <g key={side} data-cube-direction={side}><line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="#133d6b" strokeWidth="1.6" markerEnd={`url(#${id}-arrow)`}/><text x={from[0]} y={from[1]+14} textAnchor="middle" fontSize="10" fontWeight="800" fill="#133d6b">{side==='front'?'ÖN':'SAĞ'}</text></g>;})}
 </svg>;
}

export function CubeSculpture({size,heights}:{size:number;heights:number[]}){
 const presentation=useContext(SpatialPresentation),[three,setThree]=useState(presentation.method==='webgl'),[unavailable,setUnavailable]=useState(false);
 const onLost=useCallback(()=>{setThree(false);setUnavailable(true);presentation.onUnavailable?.();},[presentation.onUnavailable]),scene=useMemo(()=>createSpatialScene(size,heights),[size,heights]);
 const quality=spatialQuality(typeof window==='undefined'||typeof navigator==='undefined'?{}:{cores:navigator.hardwareConcurrency,memoryGb:(navigator as Navigator&{deviceMemory?:number}).deviceMemory,pixelRatio:window.devicePixelRatio});
 const fallback=<CubeSculptureSvg size={size} heights={heights}/>;
 return <div className="w-full max-w-md min-w-0 mx-auto" data-spatial-scene="unit-cubes">
  {three?<div className="relative w-full overflow-hidden rounded-2xl bg-blue-50" style={{height:'min(38dvh,300px)',minHeight:160}} role="img" aria-label="Birim küplerin sabit bakış açısıyla üç boyutlu görünümü"><SceneBoundary fallback={fallback} onFailure={onLost}><Suspense fallback={fallback}><SpatialCanvas scene={scene} quality={quality} onLost={onLost} perspective={presentation.perspective}/></Suspense></SceneBoundary><span className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-xs font-bold text-indigo-900">ÖN ↗ · ↖ SAĞ</span></div>:fallback}
  {presentation.controls&&<button type="button" aria-pressed={three} onClick={()=>{setUnavailable(false);setThree(value=>!value);}} className="mt-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-800 shadow-sm">{three?'Net çizim':'3B görünüm'}</button>}
  {unavailable&&presentation.controls&&<p role="status" className="text-xs text-indigo-800">Bu cihazda net çizim kullanılıyor.</p>}
 </div>;
}
