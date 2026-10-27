import React, { createContext, useContext, useId } from 'react';
import type { QuestionType } from '../../types';

const C = { blue: '#2b83f6', yellow: '#ffbd35', pink: '#f263a1', green: '#12ad91', ice: '#dceeff', ink: '#173c59' };
const ScenePaint = createContext('lesson');
const tones = Object.entries(C);
function shade(color: string, amount: number) {
 return /^#[0-9a-f]{6}$/i.test(color) ? '#' + [1, 3, 5].map(n => Math.round(parseInt(color.slice(n, n + 2), 16) * amount).toString(16).padStart(2, '0')).join('') : C.ink;
}
function SolidShape({ kind, x, y, color, size }: { kind: string; x: number; y: number; color: string; size: number }) {
 const prefix = useContext(ScenePaint);
 const tone = tones.find(([, value]) => value === color)?.[0];
 const fill = tone && tone !== 'ink' ? 'url(#' + prefix + '-' + tone + (kind === 'circle' ? '-sphere' : '') + ')' : color;
 const geometry = (paint: string) => {
  if (kind === 'triangle') return <polygon points={[x + ',' + (y-size), (x+size) + ',' + (y+size), (x-size) + ',' + (y+size)].join(' ')} fill={paint}/>;
  if (kind === 'square') return <rect x={x-size} y={y-size} width={size*2} height={size*2} rx={7} fill={paint}/>;
  if (kind === 'star') return <path d="M0 -30 9 -10 30 -9 14 6 19 29 0 18 -19 29 -14 6 -30 -9 -9 -10Z" fill={paint} transform={'translate(' + x + ' ' + y + ') scale(' + size/24 + ')'}/>;
  return <circle cx={x} cy={y} r={size} fill={paint}/>;
 };
 return <g className="bj-lesson-solid" data-solid={kind}>
  <ellipse cx={x+2} cy={y+size+9} rx={size*.88} ry={Math.max(3,size*.12)} fill={C.ink} opacity={.12}/>
  <g transform="translate(0 5)">{geometry(shade(color,.62))}</g>
  <g stroke="#fff" strokeOpacity={.55} strokeWidth={1.1} strokeLinejoin="round">{geometry(fill)}</g>
  {tone !== 'ink' && (kind === 'circle' ? <ellipse cx={x-size*.29} cy={y-size*.35} rx={size*.38} ry={size*.2} fill="#fff" opacity={.58} transform={'rotate(-30 ' + (x-size*.29) + ' ' + (y-size*.35) + ')'}/> : kind === 'square' ? <path d={'M' + (x-size+7) + ' ' + (y-size+5) + 'h' + (size*1.25)} fill="none" stroke="#fff" strokeOpacity={.6} strokeWidth={3} strokeLinecap="round"/> : kind === 'triangle' ? <path d={'M' + (x-size*.67) + ' ' + (y+size*.55) + 'L' + x + ' ' + (y-size*.65)} fill="none" stroke="#fff" strokeOpacity={.55} strokeWidth={3} strokeLinecap="round"/> : null)}
 </g>;
}
function shape(kind: string, x: number, y: number, color: string = C.blue, size = 24) {
 return <SolidShape kind={kind} x={x} y={y} color={color} size={size}/>;
}
function PrismFace({ points, color }: { points: string; color: string }) {
 const prefix = useContext(ScenePaint), tone = tones.find(([, value]) => value === color)?.[0];
 return <g className="bj-lesson-solid" data-solid="prism"><polygon points={points} fill={shade(color,.6)} transform="translate(0 7)"/><polygon points={points} fill={tone ? 'url(#' + prefix + '-' + tone + ')' : color} stroke="#fff" strokeOpacity={.7} strokeWidth={2} strokeLinejoin="round"/></g>;
}
function IsoCube({ x, y, color }: { x: number; y: number; color: string }) {
 const prefix = useContext(ScenePaint), tone = tones.find(([, value]) => value === color)?.[0];
 const points = (pairs: number[][]) => pairs.map(([dx,dy]) => (x+dx) + ',' + (y+dy)).join(' ');
 return <g className="bj-lesson-isometric" data-solid="cube" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round">
  <polygon points={points([[0,0],[44,25],[0,50],[-44,25]])} fill={tone ? 'url(#' + prefix + '-' + tone + ')' : color}/>
  <polygon points={points([[-44,25],[0,50],[0,94],[-44,69]])} fill={color}/>
  <polygon points={points([[0,50],[44,25],[44,69],[0,94]])} fill={shade(color,.7)}/>
 </g>;
}
function SceneMaterials({ prefix }: { prefix: string }) {
 return <defs>{tones.map(([tone,color]) => <React.Fragment key={tone}>
  <linearGradient id={prefix+'-'+tone} x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stopColor="#fff"/><stop offset=".16" stopColor={color} stopOpacity={.65}/><stop offset=".55" stopColor={color}/><stop offset="1" stopColor={shade(color,.72)}/></linearGradient>
  <radialGradient id={prefix+'-'+tone+'-sphere'} cx=".3" cy=".25" r=".8"><stop offset="0" stopColor="#fff"/><stop offset=".23" stopColor={color} stopOpacity={.66}/><stop offset=".62" stopColor={color}/><stop offset="1" stopColor={shade(color,.6)}/></radialGradient>
 </React.Fragment>)}</defs>;
}
const label = (text: string, x: number, y: number, size = 22) => <text x={x} y={y} fontSize={size} textAnchor="middle" fill={C.ink} fontWeight={750}>{text}</text>;
export function LessonScene({id,step,playing,title}:{id:QuestionType;step:number;playing:boolean;title:string}){
 const uid=useId().replace(/[^a-zA-Z0-9_-]/g,''),revealed=step>=2;
 const paint=(color:string)=>{const tone=tones.find(([,value])=>value===color)?.[0];return tone?'url(#'+uid+'-'+tone+')':color;};
 let content:React.ReactNode;
 switch(id){
 case 'visual_sequence':content=<>{[0,1,2,3,4,5].map((n)=><g key={n} className="bj-lesson-pop" style={{animationDelay:`${n*.16}s`}}>{n<5||revealed?shape(n%2?'triangle':'circle',46+n*58,116,n%2?C.yellow:C.blue,18):label('?',46+n*58,125,32)}</g>)}<path d="M27 166h95 M143 166h95 M259 166h95" stroke={C.green} strokeWidth={5} strokeLinecap="round"/>{label('Küçük grup, aynı sıra',200,213,18)}</>;break;
 case 'visual_analogy':content=<>{label('İlk çift',86,46,16)}{label('↑',62,110,64)}{label('→',170,110,40)}<g className="bj-lesson-turn" style={{transformOrigin:'294px 91px'}}>{label('↑',294,110,64)}</g>{label('Yeni çift',86,164,16)}{label('→',62,221,64)}{label('→',170,218,40)}{label(revealed?'↓':'?',294,221,64)}</>;break;
 case 'dice_unfold':return <figure className="bj-lesson-stage bj-cube-stage" aria-label={title} data-playing={playing} data-scene-step={step}><div className="bj-cube-pedestal" aria-hidden="true"/><div className="bj-teaching-cube">{['1','2','6','5','3','4'].map((n,i)=><span key={n} className={`bj-cube-face bj-cube-face-${i}`}><span>{n}</span><i aria-hidden="true"/></span>)}</div><figcaption><span>6 yüz</span><span>12 ayrıt</span><span>8 köşe</span></figcaption></figure>;
 case 'matrix_2x2':content=<>{[0,1,2,3].map(n=>{const x=101+(n%2)*160,y=61+Math.floor(n/2)*120;return <g key={n}><rect className="bj-lesson-panel" x={x-62} y={y-44} width={124} height={90} rx={18} fill="#fff" stroke="#cbdcde" strokeWidth={2}/>{n===3&&!revealed?label('?',x,y+12,32):<>{shape(n<2?'circle':'triangle',x-(n%2?22:0),y,C.blue,17)}{n%2===1&&shape(n<2?'circle':'triangle',x+22,y,C.blue,17)}</>}</g>;})}</>;break;
 case 'symmetry_completion':content=<><path d="M200 26v200" stroke={C.ink} strokeWidth={2} strokeDasharray="6 6"/><path d="M170 60H98v66h44v66h28Z" fill={paint(C.pink)}/><path d="M230 60h72v66h-44v66h-28Z" fill={paint(C.pink)} opacity={revealed?1:.12} className="bj-lesson-reveal"/><path d="M142 218h116" stroke={C.green} strokeWidth={3}/>{label('Aynı uzaklık',200,248,17)}</>;break;
 case 'visual_attention':content=<>{label('Hedef',67,47,17)}{shape('circle',67,108,C.ice,32)}{shape('circle',67,108,C.blue,7)}{label('Hangisi aynı?',267,47,17)}{[0,1,2,3].map(n=><g key={n}>{shape('circle',199+(n%2)*103,95+Math.floor(n/2)*100,revealed&&n===2?'#c9f2de':C.ice,32)}{shape('circle',199+(n%2)*103+(n===0?17:n===3?-17:0),95+Math.floor(n/2)*100+(n===1?17:0),C.blue,7)}</g>)}</>;break;
 case 'direction_path':content=<>{Array.from({length:15},(_,n)=><rect className="bj-lesson-panel" key={n} x={42+n%5*60} y={34+Math.floor(n/5)*60} width={58} height={58} rx={10} fill="#fff" stroke="#d6e8df"/>)}<g className="bj-lesson-travel" style={{transform:`translate(${72+(step===0?0:step===1?60:120)}px,${184-(step>=3?120:0)}px)`,'--path-from-x':`${step<=1?72:step===2?132:192}px`,'--path-from-y':'184px','--path-x':`${72+(step===0?0:step===1?60:120)}px`,'--path-y':`${184-(step>=3?120:0)}px`} as React.CSSProperties}><circle r={20} fill={paint(C.green)}/><text y={7} fontSize={20} textAnchor="middle" fill="white">★</text></g>{label('→   →   ↑   ↑',200,249,25)}</>;break;
 case 'symbol_coding':content=<>{['circle','triangle','square'].map((s,n)=><g key={s}>{shape(s,88+n*108,57,[C.blue,C.yellow,C.pink][n],18)}{label(['A','B','C'][n],88+n*108,108,23)}</g>)}<path d="M48 134h302" stroke="#c9dfe0" strokeWidth={2}/>{['circle','triangle','circle'].map((s,n)=><g key={n}>{shape(s,88+n*108,174,n===1?C.yellow:C.blue,20)}{revealed&&label(n===1?'B':'A',88+n*108,235,26)}</g>)}</>;break;
 case 'shadow_matching':content=<>{shape('star',108,120,C.yellow,46)}{label('→',200,135,40)}{shape('star',294,120,revealed?C.ink:'#d8e2e5',46)}{label('Dış çizgi aynı kalır',200,224,19)}</>;break;
 case 'spatial_relationship':content=<><rect className="bj-lesson-panel" x={82} y={47} width={154} height={125} rx={22} fill={paint(C.pink)}/><rect className="bj-lesson-panel" x={137} y={82} width={154} height={125} rx={22} fill={paint(C.blue)}/><rect className="bj-lesson-panel" x={185} y={121} width={154} height={105} rx={22} fill={paint(C.yellow)}/>{revealed&&<>{label('1',270,186,36)}{label('2',176,119,23)}{label('3',109,79,23)}</>}</>;break;
 case 'verbal_analogy':content=<>{[['Kuş','Yuva'],['Arı',revealed?'Kovan':'?']].map((pair,n)=><g key={n}><rect className="bj-lesson-panel" x={40} y={32+n*120} width={119} height={72} rx={22} fill="#fff"/>{label(pair[0],100,78+n*120,25)}{label('→',198,78+n*120,30)}<rect className="bj-lesson-panel" x={235} y={32+n*120} width={125} height={72} rx={22} fill={revealed&&n===1?'#d8f0e5':'#fff'}/>{label(pair[1],297,78+n*120,25)}</g>)}</>;break;
 case 'top_view':content=step<2?<>{[0,1,2].map(n=><IsoCube key={n} x={155} y={137-n*44} color={C.blue}/>)}<IsoCube x={199} y={162} color={C.yellow}/>{label('Bakışını yukarı taşı',200,28,17)}</>:<>{[0,1].map(n=><rect className="bj-lesson-panel" key={n} x={111+n*89} y={77} width={86} height={86} rx={10} fill={paint(n?C.yellow:C.blue)}/>)}{label('Her sütun bir taban karesi',200,213,18)}</>;break;
 case 'shape_combination':content=<><g className="bj-lesson-slide" style={{transform:`translateX(${revealed?20:0}px)`,'--join-from':revealed?'-20px':'0px'} as React.CSSProperties}><PrismFace points="100,54 100,194 240,194" color={C.blue}/></g><g className="bj-lesson-slide" style={{transform:`translateX(${revealed?-20:35}px)`,'--join-from':revealed?'55px':'0px'} as React.CSSProperties}><PrismFace points="140,54 280,54 280,194" color={C.yellow}/></g>{label(revealed?'İki yarım, bir bütün':'Kenarları eşleştir',200,241,19)}</>;break;
 case 'figure_completion':content=<>{[0,1,2,3].map(n=><g key={n}><rect className="bj-lesson-panel" x={109+n%2*84} y={34+Math.floor(n/2)*84} width={80} height={80} rx={14} fill={n===3&&!revealed?'#fff':n===1||n===2?C.yellow:C.blue} stroke={n===3&&!revealed?'#a3bcc7':'none'} strokeWidth={2} strokeDasharray="6 5"/>{n===3&&!revealed&&label('?',233,174,33)}</g>)}{label('Desenin devamını izle',200,239,19)}</>;break;
 case 'weight_comparison':content=<><path d="M175 100 142 215h66Z" fill="#a3b8bd"/><path d="M70 111 284 77" stroke={C.ink} strokeWidth={8} strokeLinecap="round"/><path d="M70 111v74M284 77v74" stroke={C.ink} strokeWidth={3}/><path d="M32 185q38 35 76 0Z" fill={paint(C.pink)}/><path d="M246 151q38 35 76 0Z" fill={paint(C.blue)}/>{shape('circle',70,166,C.pink,18)}{shape('circle',284,132,C.blue,18)}{revealed&&label('Ağır taraf aşağıda',200,246,20)}</>;break;
 case 'shape_equation':content=<>{step<2?<>{shape('star',80,111,C.yellow,25)}{label('+',141,125,31)}{shape('star',200,111,C.yellow,25)}{label('=',259,125,31)}{label('6',318,126,45)}</>:<>{shape('star',140,109,C.yellow,31)}{label('= 3',240,124,44)}</>}{label(revealed?'3 + 3 = 6':'İki eşit parçanın toplamı 6',200,210,21)}</>;break;
 case 'visual_memory':content=<>{['circle','triangle','square'].map((s,n)=><g key={s}><rect className="bj-lesson-panel" x={37+n*113} y={65} width={100} height={119} rx={23} fill={step===2?'#294e63':'#fff'}/>{step===2?<text x={87+n*113} y={141} fontSize={38} textAnchor="middle" fill="white">?</text>:shape(s,87+n*113,125,[C.blue,C.yellow,C.pink][n],25)}</g>)}{label(step===2?'Ortada hangisi vardı?':'Gör · Gruplandır · Hatırla',200,233,19)}</>;break;
 case 'number_pattern':content=<>{[2,4,6,8,10].map((n,i)=><g key={n}><circle cx={48+i*76} cy={127} r={29} fill={i===4?'#ddf2e9':'#fff'}/>{label(i===4&&!revealed?'?':String(n),48+i*76,138,31)}{i<4&&label('+2',86+i*76,69,17)}</g>)}{label('Her adımda aynı miktar',200,214,19)}</>;break;
 default:content=null;
 }
 return <ScenePaint.Provider value={uid}><figure className="bj-lesson-stage" data-playing={playing} data-scene-step={step}><svg viewBox="0 0 400 270" role="img" aria-labelledby={uid}><title id={uid}>{title}</title><SceneMaterials prefix={uid}/><g className="bj-lesson-scene-content">{content}</g></svg></figure></ScenePaint.Provider>;
}
