import React, { useId } from 'react';
import type { CompleteBoard as Board, CompleteValue, Token } from '../complete-curriculum';
import { GlyphBody } from './VisualGlyph';
import { PUZZLE_COLORS as COLORS, materialFor } from '../question-materials';
import { AnswerValue } from './AnswerValue';


export function CompleteToken({shape,color}:Token){
  const paths=['M10 32a22 22 0 1 0 44 0a22 22 0 1 0-44 0','M32 8L56 54H8Z','M14 10H50Q54 10 54 14V50Q54 54 50 54H14Q10 54 10 50V14Q10 10 14 10Z','M32 5L39 23H59L43 36L49 56L32 44L15 56L21 36L5 23H25Z','M32 5L59 32L32 59L5 32Z','M19 8H45L58 32L45 56H19L6 32Z'];
  return <svg viewBox="0 0 64 68" className="zp-curriculum-token" role="img" shapeRendering="geometricPrecision" aria-label={`Şekil ${shape+1}, renk ${color+1}`}>
    <GlyphBody path={paths[shape]} color={COLORS[color]}/>
  </svg>;
}
export function CompleteGrid({cells,size,axis}:{cells:number[];size:number;axis?:Board['axis']}){
  const id=useId().replace(/:/g,'_');
  return <svg viewBox={`0 0 ${size*30} ${size*30}`} className="zp-curriculum-grid" role="img" shapeRendering="geometricPrecision" aria-label="Hücre deseni">
    <defs><linearGradient id={`${id}-cell`} x2=".35" y2="1"><stop stopColor="#fff" stopOpacity=".25"/><stop offset=".25" stopColor="#fff" stopOpacity="0"/><stop offset=".82" stopColor="#102440" stopOpacity="0"/><stop offset="1" stopColor="#102440" stopOpacity=".14"/></linearGradient></defs>
    {cells.map((n,i)=>{const m=n?materialFor(COLORS[n-1]):null;return <g key={i} transform={`translate(${i%size*30} ${Math.floor(i/size)*30})`}><rect x="1" y="3" width="28" height="26" rx="4" fill={m?.edge||'#d8e1ed'}/><rect x="1" y="1" width="28" height="26" rx="4" fill={m?.face||'#f8fafc'} stroke={m?.edge||'#94a3b8'} strokeWidth=".8"/>{m&&<><rect x="1.5" y="1.5" width="27" height="25" rx="3.5" fill={`url(#${id}-cell)`}/><text x="15" y="20" textAnchor="middle" fontSize="13" fill={m.ink} fontWeight="800">{n}</text></>}</g>;})}
    {(axis==='x'||axis==='xy')&&<line x1={size*15} y1="0" x2={size*15} y2={size*30} stroke="#0f172a" strokeWidth="2" strokeDasharray="4 3"/>}
    {(axis==='y'||axis==='xy')&&<line x1="0" y1={size*15} x2={size*30} y2={size*15} stroke="#0f172a" strokeWidth="2" strokeDasharray="4 3"/>}
  </svg>;
}
export function CompletePiece({points,outline=false}:{points:number[][];outline?:boolean}){
  const id=useId().replace(/:/g,'_'),m=materialFor(COLORS[1]);
  return <svg viewBox="-0.2 -0.2 4.4 4.4" className="zp-curriculum-piece" shapeRendering="geometricPrecision" role="img" aria-label={outline?'Boş parçanın sınırı':'Tangram parçası'}><defs><linearGradient id={`${id}-piece`} x2=".2" y2="1"><stop stopColor={m.light}/><stop offset=".3" stopColor={m.face}/><stop offset="1" stopColor={m.shade}/></linearGradient></defs>{!outline&&<polygon points={points.map(p=>p.join(',')).join(' ')} transform="translate(0 .1)" fill={m.edge}/>}<polygon points={points.map(p=>p.join(',')).join(' ')} fill={outline?'#f8fafc':`url(#${id}-piece)`} stroke={m.edge} strokeWidth="0.065" strokeDasharray={outline?'0.15 0.1':undefined}/></svg>;
}
export function CompleteOption({value}:{value:CompleteValue}){
  if('textNumber' in value)return <AnswerValue value={value.textNumber}/>;
  if(value.curriculum==='grid')return <CompleteGrid cells={value.cells} size={value.size}/>;
  if(value.curriculum==='token')return <CompleteToken shape={value.shape} color={value.color}/>;
  return <CompletePiece points={value.points}/>;
}
const Badge=({children}:{children:React.ReactNode})=><span className="zp-curriculum-number rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 font-bold text-indigo-950 text-base sm:text-xl">{typeof children==='number'&&!Number.isFinite(children)?'?':children}</span>;
function Equation({row,scale=false}:{row:number[];scale?:boolean}){
  return <div className={`flex flex-wrap justify-center items-center gap-2 ${scale?'border-b-4 border-amber-500 pb-2':''}`}>
    {[...Array.from({length:row[0]},()=>({shape:2,color:0})),...Array.from({length:row[1]},()=>({shape:0,color:1}))].map((token,i)=><React.Fragment key={i}>{i>0&&<span className="font-bold">+</span>}<CompleteToken {...token}/></React.Fragment>)}
    <span className="font-bold">=</span><Badge>{row[2]}</Badge>
  </div>;
}
export function CompleteBoard({board:b}:{board:Board}){
  const className='flex flex-wrap justify-center items-center gap-3 w-full min-w-0';
  if(b.sequence)return <div className={className}>{b.sequence.map((t,i)=><div key={i} className="rounded-xl border-2 border-indigo-100 bg-white p-1">{t?<CompleteToken {...t}/>:<span className="text-3xl font-bold text-indigo-500 px-3">?</span>}</div>)}</div>;
  if(b.matrix)return <div className="grid grid-cols-3 gap-2 mx-auto max-w-xs">{b.matrix.map((t,i)=><div key={i} className="flex items-center justify-center rounded-xl border-2 border-indigo-100 bg-white p-1 sm:p-3">{t?<CompleteToken {...t}/>:<span className="text-3xl font-bold text-indigo-500">?</span>}</div>)}</div>;
  if(b.walls)return <svg viewBox={`0 0 ${b.size*42} ${b.size*42}`} className="w-56 max-w-full mx-auto" role="img" aria-label="Başlangıç ve dört hedefli labirent">{b.walls.map((wall,i)=><g key={i}><rect x={i%b.size*42+1} y={Math.floor(i/b.size)*42+1} width="40" height="40" rx="4" fill={wall?'#334155':'#eef2ff'} stroke="#94a3b8"/>{!wall&&(i===b.start||b.goals!.includes(i))&&<text x={i%b.size*42+21} y={Math.floor(i/b.size)*42+28} textAnchor="middle" fontSize="19" fontWeight="bold" fill={i===b.start?'#059669':'#4338ca'}>{i===b.start?'★':'ABCD'[b.goals!.indexOf(i)]}</text>}</g>)}</svg>;
  if(b.pieces)return <div className="w-full space-y-2"><p className="text-xs text-center text-slate-600">Yedi parçanın yerleşimi — kesikli sınırdaki boşluğu tamamla</p><div className="grid grid-cols-4 gap-2">{b.pieces.map((points,i)=><div key={i} className="bg-indigo-50 rounded-xl border border-indigo-100"><CompletePiece points={points} outline={i===b.missing}/></div>)}</div></div>;
  if(b.source)return <div className={b.copy?'zp-curriculum-pair':className}><CompleteGrid cells={b.source} size={b.size} axis={b.axis}/>{b.copy&&<><span className="text-xl">→</span><CompleteGrid cells={b.copy} size={b.size}/></>}</div>;
  if(b.grids)return <div className="zp-curriculum-comparison">{b.grids.map((cells,i)=><div key={i} className="space-y-1 text-center"><CompleteGrid cells={cells} size={b.size}/>{b.kind==='odd_one_out'&&<strong>{'ABCD'[i]}</strong>}</div>)}</div>;
  if(b.values)return <div className={className}>{b.values.map((v,i)=><Badge key={i}>{v}</Badge>)}<Badge>?</Badge></div>;
  if(b.base){const rows:number[][]=[b.base];while(rows[0].length>1)rows.unshift(rows[0].slice(1).map((v,i)=>v+rows[0][i]));return <div className="space-y-2">{rows.map((row,r)=><div key={r} className={className}>{row.map((v,i)=><Badge key={i}>{r===0?'?':v}</Badge>)}</div>)}</div>;}
  if(b.equations)return <div className="space-y-3 w-full">{b.equations.map((r,i)=><Equation key={i} row={r} scale={b.kind==='balance_scale'}/>)}<div className="rounded-xl bg-indigo-50 p-2"><Equation row={[...b.expression!,NaN]}/><p className="text-center text-indigo-800 text-sm">Son satırdaki toplam kaçtır?</p></div></div>;
  if(b.examples)return <div className="space-y-2">{[...b.examples,[b.input!,NaN]].map(([i,o],n)=><div key={n} className={className}><Badge>{i}</Badge><span className="rounded-lg bg-purple-100 p-2">⚙ →</span><Badge>{Number.isFinite(o)?o:'?'}</Badge></div>)}</div>;
  if(b.gears)return <div className={className}>{b.gears.map((teeth,i)=><div key={i} className="text-center"><svg viewBox="0 0 64 64" className="w-14 sm:w-16" aria-label={`${i+1}. çark, ${teeth} diş`}><circle cx="32" cy="32" r="20" fill={i===b.target?'#fde68a':'#c7d2fe'} stroke="#312e81" strokeWidth="3"/>{Array.from({length:teeth},(_,j)=><rect key={j} x="29" y="5" width="6" height="10" rx="1" fill="#4f46e5" transform={`rotate(${j*360/teeth} 32 32)`}/>)}<text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="bold">{i+1}</text></svg>{i===0&&<strong>{b.direction!>0?'↻':'↺'}</strong>}{i===b.target&&<strong>?</strong>}</div>)}</div>;
  if(b.clues)return <div className="space-y-2 text-center">{b.clues.map(([a,c],i)=><p key={i} className="rounded-xl bg-indigo-50 p-2 text-indigo-950"><strong>{a}</strong> → hemen ardından → <strong>{c}</strong></p>)}</div>;
  if(b.letters)return <div className="space-y-3"><div className={className}>{b.letters.map((l,i)=><div key={i} className="text-center"><Badge>{l}</Badge><p className="text-xs mt-1">{i+1}</p></div>)}</div><p className="text-center font-bold text-indigo-900">Kod: {b.order!.map(i=>i+1).join(' → ')}</p></div>;
  if(b.words)return <div className={className}><Badge>{b.words[0]}</Badge><span>→</span><Badge>{b.words[1]}</Badge><span className="w-full"/><Badge>{b.words[2]}</Badge><span>→</span><Badge>?</Badge></div>;
  return <p role="alert">Müfredat çizimi eksik.</p>;
}
