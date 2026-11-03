import React, { useId } from 'react';
import type { PrecisionBoard as Board, PrecisionToken, PrecisionValue, Polygon } from '../precision-lab';
import { PRECISION_TITLES } from '../precision-lab';
import { CubeSculpture } from './CubeSculpture';
import { AnswerValue } from './AnswerValue';

const palette=['#3465d9','#dd7040','#168775','#9456bd'];
const names=['mavi','turuncu','yeşil','mor'];
const paths=[
  'M9 24H30V11L50 32L30 53V40H9Z',
  'M13 53V8H46L39 21L46 34H18V53Z',
  'M22 10A12 12 0 1 0 25 32L42 49L48 43L44 39L40 43L36 39L40 35L30 25A12 12 0 0 0 22 10Z',
  'M10 45C3 23 20 8 48 10C49 33 33 51 15 44L11 51Z',
  'M30 7L37 23L55 25L41 37L45 55L30 46L15 55L19 37L5 25L23 23Z',
  'M17 9H43L56 32L43 55H17L4 32Z',
];
function MaterialGlyph({symbol,color=0,rotation=0}:{symbol:number;color?:number;rotation?:number}){
  const id=useId().replace(/:/g,'_'),fill=palette[color];
  return <svg viewBox="0 0 64 64" role="img" aria-label={`Sembol ${symbol+1}`} shapeRendering="geometricPrecision" className="bj-precision-glyph">
    <defs><linearGradient id={id} x1="0" y1="0" x2=".6" y2="1"><stop stopColor="#fff" stopOpacity=".32"/><stop offset=".4" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#102b4e" stopOpacity=".24"/></linearGradient></defs>
    <g transform={`rotate(${rotation*90} 32 32)`}>
      <path d={paths[symbol]} fill="#17334b" opacity=".2" transform="translate(0 2)"/>
      <path d={paths[symbol]} fill={fill} stroke="#193c58" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d={paths[symbol]} fill={`url(#${id})`} stroke="#fff" strokeOpacity=".32" strokeWidth=".65" strokeLinejoin="round"/>
      {symbol===2&&<circle cx="19" cy="21" r="4" fill="#fff" stroke="#193c58" strokeWidth="1.4"/>}
      {symbol===3&&<path d="M14 42L39 18M25 32L22 23M31 26L40 27" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"/>}
    </g>
  </svg>;
}
export function PrecisionTokenArt({token}:{token:PrecisionToken}){
  return <div className="bj-precision-token" role="img" aria-label={`${names[token.color]}, şekil ${token.shape+1}, saat yönünde ${token.rotation*90} derece, ${token.dots} nokta`} data-precision-token="true">
    <MaterialGlyph symbol={token.shape} color={token.color} rotation={token.rotation}/>
    <svg viewBox="0 0 64 14" aria-hidden="true" className="bj-precision-dots">{Array.from({length:token.dots},(_,i)=><circle key={i} cx={32-(token.dots-1)*6+i*12} cy="7" r="3.4" fill="#173a54"/>)}</svg>
  </div>;
}
function GridArt({cells,size,axis}:{cells:number[];size:number;axis?:Extract<Board,{kind:'symmetry_completion'}>['axis']}){
  const side=size*32,id=useId().replace(/:/g,'_');
  const line=axis==='vertical'?[side/2,0,side/2,side]:axis==='horizontal'?[0,side/2,side,side/2]:axis==='diagonal'?[0,0,side,side]:[side,0,0,side];
  return <svg viewBox={`-4 -4 ${side+8} ${side+8}`} className="bj-precision-grid" role="img" aria-label={`${size} satır ve sütunlu ${axis?'ayna çizgili ':''}desen. ${cells.map((n,i)=>n?`${Math.floor(i/size)+1}. satır ${i%size+1}. sütun renk ${n}`:'').filter(Boolean).join('; ')}`} shapeRendering="geometricPrecision">
    <defs><linearGradient id={id} x2=".35" y2="1"><stop stopColor="#fff" stopOpacity=".32"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#0d2742" stopOpacity=".2"/></linearGradient></defs>
    {cells.map((n,i)=><g key={i} transform={`translate(${i%size*32} ${Math.floor(i/size)*32})`}><rect x="1" y="2.5" width="30" height="29" rx="3" fill={n?'#294c65':'#d9e4ee'}/><rect x="1" y="1" width="30" height="28" rx="3" fill={n?palette[n-1]:'#f5f9fc'} stroke={n?'#234c68':'#b1c7d9'} strokeWidth=".8"/>{n>0&&<><rect x="1.5" y="1.5" width="29" height="27" rx="2.5" fill={`url(#${id})`}/><text x="16" y="20" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{n}</text></>}</g>)}
    {axis&&<><line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="#fff" strokeWidth="4"/><line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="#152c49" strokeWidth="2" strokeDasharray="5 3"/></>}
  </svg>;
}
function TangramArt({pieces,choice=false}:{pieces:Polygon[];choice?:boolean}){
  const id=useId().replace(/:/g,'_');
  return <svg viewBox="-0.18 -0.18 4.36 4.36" className="bj-precision-tangram" role="img" aria-label={choice?'Tangram parçası; bir kare aralığı bir birim':'Altı parça ile kurulmuş kare; beyaz boşluğu tamamla'} shapeRendering="geometricPrecision" data-tangram-assembly={!choice||undefined}>
    <defs>{pieces.map((_,i)=><linearGradient key={i} id={`${id}-${i}`} x2=".4" y2="1"><stop stopColor={palette[i%4]}/><stop offset="1" stopColor={palette[(i+1)%4]} stopOpacity=".84"/></linearGradient>)}</defs>
    <rect width="4" height="4" fill="#f8fbfe" stroke="#42617a" strokeWidth=".035"/>
    {[1,2,3].map(n=><g key={n} stroke="#d8e3ee" strokeWidth=".018"><path d={`M${n} 0V4M0 ${n}H4`}/></g>)}
    {pieces.map((p,i)=><g key={i} data-tangram-piece="true"><polygon points={p.map(v=>v.join(',')).join(' ')} fill="#132e47" opacity=".22" transform="translate(0 .045)"/><polygon points={p.map(v=>v.join(',')).join(' ')} fill={`url(#${id}-${i})`} stroke="#1e405d" strokeWidth=".045" strokeLinejoin="round"/><polygon points={p.map(v=>v.join(',')).join(' ')} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".018"/></g>)}
  </svg>;
}
function MazeArt({board:b}:{board:Extract<Board,{kind:'maze_path'}>}){
  const s=44,n=b.size*s,open=(a:number,c:number)=>b.passages.some(([x,y])=>x===a&&y===c||y===a&&x===c);
  return <svg viewBox={`-8 -8 ${n+16} ${n+16}`} className="bj-precision-maze" role="img" aria-label={`${b.size} satır ve sütunlu labirent; başlangıç ${Math.floor(b.start/b.size)+1}. satır ${b.start%b.size+1}. sütun; bayrak ${Math.floor(b.goal/b.size)+1}. satır ${b.goal%b.size+1}. sütun`} shapeRendering="geometricPrecision">
    <rect x="-3" y="0" width={n+6} height={n+5} rx="7" fill="#9ab6cd"/><rect x="-3" y="-3" width={n+6} height={n+6} rx="7" fill="#f3f8fc" stroke="#24435f" strokeWidth="2"/>
    {Array.from({length:b.size**2},(_,i)=>{const x=i%b.size*s,y=Math.floor(i/b.size)*s;return <g key={i}>
      <rect x={x+3} y={y+3} width={s-6} height={s-6} rx="6" fill={i===b.start?'#d3f5e8':i===b.goal?'#ffe6da':'#e6f0f8'}/>
      {i%b.size<b.size-1&&!open(i,i+1)&&<path d={`M${x+s} ${y}V${y+s}`} stroke="#24435f" strokeWidth="3.5" strokeLinecap="round"/>}
      {i<b.size*(b.size-1)&&!open(i,i+b.size)&&<path d={`M${x} ${y+s}H${x+s}`} stroke="#24435f" strokeWidth="3.5" strokeLinecap="round"/>}
      {i===b.start&&<><circle cx={x+22} cy={y+22} r="12" fill="#117b64"/><path d={`M${x+18} ${y+15}L${x+28} ${y+22}L${x+18} ${y+29}Z`} fill="#fff"/></>}
      {i===b.goal&&<g stroke="#9b4322" strokeWidth="2.4" strokeLinejoin="round"><path d={`M${x+15} ${y+33}V${y+10}L${x+32} ${y+13}L${x+26} ${y+20}L${x+15} ${y+18}`} fill="#ee9156"/></g>}
    </g>;})}
  </svg>;
}
export function PrecisionValueArt({value:v}:{value:PrecisionValue}){
  if(v.precision==='token')return <PrecisionTokenArt token={v}/>;
  if(v.precision==='grid')return <GridArt cells={v.cells} size={v.size}/>;
  if(v.precision==='piece')return <TangramArt pieces={[v.points]} choice/>;
  if(v.precision==='number')return <AnswerValue value={v.value}/>;
  if(v.precision==='code')return <svg viewBox={`0 0 ${v.digits.length*27+10} 44`} className="bj-precision-code-answer" role="img" aria-label={v.digits.join(' ')} shapeRendering="geometricPrecision">{v.digits.map((n,i)=><g key={i}><rect x={i*27+2} y="3" width="24" height="36" rx="5" fill="#edf3fb" stroke="#c0d2e5"/><text x={i*27+14} y="29" textAnchor="middle" fontSize="24" fontWeight="800" fill="#193b59">{n}</text></g>)}</svg>;
  const cols=Math.min(4,v.moves.length),rows=Math.ceil(v.moves.length/cols),angle={U:270,R:0,D:90,L:180};
  return <svg viewBox={`0 0 ${cols*33} ${rows*30}`} className="bj-precision-route" role="img" aria-label={v.moves.map((d,i)=>`${i+1}. adım ${d==='U'?'yukarı':d==='D'?'aşağı':d==='R'?'sağ':'sol'}`).join(', ')} shapeRendering="geometricPrecision">{v.moves.map((d,i)=><g key={i} transform={`translate(${i%cols*33} ${Math.floor(i/cols)*30})`}><rect x="1" y="1" width="30" height="27" rx="5" fill="#edf4fb" stroke="#bfd0e2"/><text x="5" y="9" fontSize="6.5" fill="#526c82" fontWeight="700">{i+1}</text><path d="M7 11H17V6L25 14L17 22V17H7Z" transform={`rotate(${angle[d]} 16 14)`} fill="#285ec5"/></g>)}</svg>;
}
export function PrecisionBoard({board:b}:{board:Board}){
  let content:React.ReactNode;
  if(b.kind==='maze_path')content=<MazeArt board={b}/>;
  else if(b.kind==='visual_sequence')content=<div className="bj-precision-sequence" data-lanes={b.lanes}>{b.cards.map((c,i)=><figure key={i}><figcaption>{i+1}</figcaption>{c?<PrecisionTokenArt token={c}/>:<span className="bj-precision-missing" aria-label="Eksik kart">?</span>}</figure>)}</div>;
  else if(b.kind==='symbol_coding')content=<div className="bj-precision-cipher"><div className="bj-precision-key" style={{gridTemplateColumns:`repeat(${b.key.length},minmax(0,1fr))`}}>{b.key.map(k=><div key={k.symbol}><MaterialGlyph symbol={k.symbol}/><strong>{k.digit}</strong></div>)}</div><p>{b.reading==='forward'?'Soldan sağa →':'← Sağdan sola'}</p><div className="bj-precision-query">{b.query.map((s,i)=><div key={i}><MaterialGlyph symbol={s}/></div>)}</div></div>;
  else if(b.kind==='visual_attention')content=<div className="bj-precision-attention"><figure><figcaption>Hedef</figcaption><PrecisionTokenArt token={b.target}/></figure><div className="bj-precision-search" style={{gridTemplateColumns:`repeat(${b.size},minmax(0,1fr))`}}>{b.cards.map((t,i)=><PrecisionTokenArt key={i} token={t}/>)}</div></div>;
  else if(b.kind==='odd_one_out')content=<div className="bj-precision-pairs">{b.cards.map(([a,c],i)=><figure key={i}><figcaption>{i+1}. kart</figcaption><div><PrecisionTokenArt token={a}/><span aria-hidden="true">→</span><PrecisionTokenArt token={c}/></div></figure>)}</div>;
  else if(b.kind==='symmetry_completion')content=<GridArt cells={b.cells} size={b.size} axis={b.axis}/>;
  else if(b.kind==='tangram_puzzle')content=<TangramArt pieces={b.pieces}/>;
  else content=<div className="bj-cube-givens"><div className="bj-cube-model"><CubeSculpture size={b.size} heights={b.heights}/></div><figure className="bj-cube-plan"><figcaption>Yükseklik planı</figcaption><div className="bj-cube-plan-grid" style={{gridTemplateColumns:`repeat(${b.size},1fr)`}}>{b.heights.map((h,i)=><span key={i} data-cube-height={h}>{h}</span>)}</div><span className="bj-cube-plan-front">ÖN ↑</span><span className="bj-cube-plan-right">← SAĞ</span><p>0 = boş hücre</p></figure></div>;
  return <section className="bj-precision-board" data-precision-kind={b.kind} aria-label={PRECISION_TITLES[b.kind]}><p className="bj-precision-title">{PRECISION_TITLES[b.kind]}</p><div className="bj-precision-surface">{content}</div></section>;
}
