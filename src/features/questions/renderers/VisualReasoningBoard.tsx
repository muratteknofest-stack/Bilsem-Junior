import React, { useId } from 'react';
import type { VisualBoard, VisualValue, SceneObject, Point } from '../visual-reasoning-lab';
import { CubeLabBoard, CubeView } from './CubeLabBoard';

const COLORS=['#ef7137','#147fc0','#21a878','#9a53d5','#e4a019'];
const DARK_COLORS=['#ab3c1c','#075282','#09674e','#613092','#99610b'];
/** Outer outlines are shared by the material illustration and its exact black silhouette. */
export function objectOutline(kind:SceneObject['kind'],detail:number) {
 const d=detail;
 switch(kind){
 case 'bird':return `M-18 5L-11 -2Q-13 -14 -1 -12Q8 -14 9 -4L${16+d*3} -2L9 2Q10 13 -5 12L-17 ${10+d*3}L-11 5Z`;
 case 'watering-can':return `M-11 -5H5V12H-12ZM5 0L${14+d*3} -10L21 -4L7 5ZM-11 -2C-25 -8 -25 12 -11 8L-11 4C-19 7 -19 -2 -11 2Z`;
 case 'rocket':return `M0 -20Q9 -13 9 5L${16+d*3} 15L8 12L5 18H-5L-8 12L-14 15L-9 4Q-9 -13 0 -20Z`;
 case 'sailboat':return `M-20 8H20L12 17H-12ZM-2 -18V5H-18ZM1 ${-15-d*3}L17 5H1Z`;
 case 'house':return `M-18 -1L0 -17L6 -12V${-17-d*3}H12V-7L19 -1L15 2V18H-14V2Z`;
 case 'fish':return `M-21 -12L-12 -5Q5 -19 20 0Q5 19 -12 5L-21 12L-17 0ZM-3 -10L${1+d*3} -18L6 -10Z`;
 }
}
function ObjectArt({object:o,silhouette,id}:{object:SceneObject;silhouette:boolean;id:string}) {
 return <g transform={`translate(${o.x} ${o.y}) rotate(${o.turn*90}) scale(${o.flipped?-1:1} 1)`}>
  <path d={objectOutline(o.kind,o.detail)} fill={silhouette?'#162a3c':`url(#${id}-${o.color})`} fillRule="evenodd" stroke={silhouette?'#162a3c':'#29485e'} strokeWidth=".9" strokeLinejoin="round"/>
  {!silhouette&&<g fill="none" stroke="#ffffffb8" strokeWidth="1.1" strokeLinecap="round">
   {o.kind==='bird'?<><path d="M-8 1Q-4 -4 4 1Q1 7 -8 1"/><circle cx="4" cy="-7" r="1.4" fill="#182d42" stroke="none"/></>:o.kind==='rocket'?<><circle cy="-6" r="4" fill="#e6f7ff" stroke="#28475d"/><path d="M-5 10H5M-2 13V16"/></>:o.kind==='house'?<><path d="M-5 18V5H2V18" stroke="#253e53"/><rect x="6" y="4" width="5" height="6" fill="#dcf6ff" stroke="#2c4a5d"/><path d="M-12 -1L0 -12L13 -1"/></>:o.kind==='fish'?<><path d="M-7 -6Q-3 0 -7 6M0 -5L4 0L0 5"/><circle cx="12" cy="-2" r="1.5" fill="#162c40" stroke="none"/></>:o.kind==='watering-can'?<><path d="M-8 -2H2M-8 8H2"/><path d="M-9 -5V-8H2V-5" stroke="#29485e"/></>:<><path d="M-13 11H13M-2 -14L-13 3M3 -11L12 3"/><path d="M-2 -19V7" stroke="#263d52"/></>}
  </g>}
 </g>;
}
export function SceneArt({objects,silhouette=false}:{objects:SceneObject[];silhouette?:boolean}) {
 const id=useId().replace(/:/g,'_');
 return <svg viewBox="0 0 100 100" className="bj-vlab-scene" role="img" aria-label={silhouette?'Nesnelerin dış sınırlarından oluşan gölge':'Ayrıntılı nesne resmi'} shapeRendering="geometricPrecision">
  <defs>{COLORS.map((color,i)=><linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4d8"/><stop offset=".3" stopColor={color}/><stop offset="1" stopColor={DARK_COLORS[i]}/></linearGradient>)}</defs>
  {objects.map((o,i)=><ObjectArt key={i} object={o} silhouette={silhouette} id={id}/>)}
 </svg>;
}
function SymbolArt({symbol}:{symbol:number}) {
 const paths=['M50 14L88 84H12Z','M17 17H83V83H17Z','M50 10L90 50L50 90L10 50Z','M28 13H72L94 50L72 87H28L6 50Z','M37 10H63V37H90V63H63V90H37V63H10V37H37Z'];
 return <svg viewBox="0 0 100 100" className="bj-vlab-symbol" role="img" aria-label="Sembol" shapeRendering="geometricPrecision">{symbol===0?<circle cx="50" cy="50" r="35" fill="#1874b5" stroke="#123e63" strokeWidth="3"/>:<path d={paths[symbol-1]} fill={['','#e76436','#8a53c5','#16a489','#d99b1f','#4166ca'][symbol]} stroke="#24495d" strokeWidth="3" strokeLinejoin="round"/>}</svg>;
}
export function MarksArt({mask,turn=0}:{mask:number;turn?:number}) {
 return <svg viewBox="0 0 100 100" className="bj-vlab-marks" role="img" aria-label="Geometrik ilişki şekli" shapeRendering="geometricPrecision"><g transform={`rotate(${turn*90} 50 50)`} fill="none" stroke="#154d79" strokeWidth="3.2" strokeLinecap="round">
  {mask&1?<circle cx="50" cy="50" r="30"/>:null}{mask&2?<circle cx="50" cy="50" r="14"/>:null}{mask&4?<path d="M22 50H78"/>:null}{mask&8?<path d="M50 22V78"/>:null}{mask&16?<path d="M30 30L70 70"/>:null}{mask&32?<path d="M30 70L70 30"/>:null}{mask&64?<circle cx="50" cy="8" r="4" fill="#154d79"/>:null}{mask&128?<rect x="84" y="46" width="8" height="8" fill="#154d79"/>:null}
 </g></svg>;
}
function PiecesArt({polygons,outline=false}:{polygons:Point[][];outline?:boolean}) {
 return <svg viewBox="-0.15 -0.15 4.3 4.3" className="bj-vlab-pieces" role="img" aria-label="Tangram parçaları" shapeRendering="geometricPrecision"><rect x="0" y="0" width="4" height="4" fill={outline?'#eef2f8':'#fff'} stroke="#627f9c" strokeWidth=".035" strokeDasharray={outline?undefined:'.08 .07'}/>{polygons.map((p,i)=><polygon key={i} points={p.map(v=>v.join(',')).join(' ')} fill={outline?COLORS[i%5]:'#2668ad'} stroke={outline?'#fff':'#103b66'} strokeWidth=".035" strokeLinejoin="round"/>)}</svg>;
}
function HoleArt({size,holes,folds}:{size:number;holes:Point[];folds?:('x'|'y')[]}) {
 const width=folds?.includes('x')?size/2:size,height=folds?.includes('y')?size/2:size;
 return <svg viewBox={`-.3 -.3 ${width+.6} ${height+.6}`} className="bj-vlab-holes" role="img" aria-label={folds?'Katlı kâğıtta açılan delikler':'Açılmış kâğıdın delik düzeni'} shapeRendering="geometricPrecision"><rect width={width} height={height} fill="#fffef5" stroke="#527493" strokeWidth=".09"/>{Array.from({length:width-1},(_,i)=><path key={`x${i}`} d={`M${i+1} 0V${height}`} stroke="#dce6ee" strokeWidth=".025"/>)}{Array.from({length:height-1},(_,i)=><path key={`y${i}`} d={`M0 ${i+1}H${width}`} stroke="#dce6ee" strokeWidth=".025"/>)}{!folds&&<><path d={`M${size/2} 0V${size}`} stroke="#93abc4" strokeDasharray=".15 .12" strokeWidth=".04"/><path d={`M0 ${size/2}H${size}`} stroke="#93abc4" strokeDasharray=".15 .12" strokeWidth=".04"/></>}{holes.map(([x,y],i)=><circle key={i} cx={x+.5} cy={y+.5} r=".21" fill="#213c59" stroke="#0c223b" strokeWidth=".035"/>)}</svg>;
}
export function VisualValueArt({value:v}:{value:VisualValue}) {
 if('textNumber'in v)return <span className="bj-vlab-number">{v.textNumber}</span>;
 if('cubeView'in v)return <CubeView value={v}/>;
 switch(v.lab){case'scene':return <SceneArt objects={v.objects} silhouette={v.silhouette}/>;case'holes':return <HoleArt size={v.size} holes={v.holes}/>;case'pieces':return <PiecesArt polygons={v.polygons}/>;case'symbol':return <SymbolArt symbol={v.symbol}/>;case'marks':return <MarksArt mask={v.mask} turn={v.turn}/>;}
}
export function VisualReasoningBoard({board:b}:{board:VisualBoard}) {
 if(b.mechanic==='cube-evidence')return <div className="bj-vlab-cube"><CubeLabBoard board={b.cube}/></div>;
 return <div className="bj-vlab" data-visual-mechanic={b.mechanic}>
  {b.mechanic==='object-shadow'?<SceneArt objects={b.objects}/>:b.mechanic==='scene-difference'?<div className="bj-vlab-pair"><figure><figcaption>1. resim</figcaption><SceneArt objects={b.left}/></figure><figure><figcaption>2. resim</figcaption><SceneArt objects={b.right}/></figure></div>:b.mechanic==='object-mirror'?<div className={`bj-vlab-mirror is-${b.axis}`}><SceneArt objects={b.objects}/><div className="bj-vlab-mirror-line">AYNA</div></div>:b.mechanic==='fold-punch'?<div className="bj-vlab-fold"><div className="bj-vlab-fold-steps">{b.folds.map((axis,i)=><span key={axis}>{i+1}. {axis==='x'?'Sağ → sol':'Alt → üst'}</span>)}<span>Del → tam aç</span></div><HoleArt size={b.size} holes={b.holes} folds={b.folds}/></div>:b.mechanic==='seven-piece'?<PiecesArt polygons={b.pieces} outline/>:b.mechanic==='missing-symbol'?<div className="bj-vlab-grid" style={{gridTemplateColumns:`repeat(${b.side},minmax(0,1fr))`}}>{b.cells.map((v,i)=><div key={i} data-query={i===b.query}>{v===null?(i===b.query?'?':'·'):<SymbolArt symbol={b.symbols[v]}/>}</div>)}</div>:<div className="bj-vlab-grid" style={{gridTemplateColumns:`repeat(${b.side},minmax(0,1fr))`}}>{b.cards.map((v,i)=><div key={i} data-query={v===null}>{v?<MarksArt mask={v.mask} turn={v.turn}/>:<span>?</span>}</div>)}</div>}
 </div>;
}
