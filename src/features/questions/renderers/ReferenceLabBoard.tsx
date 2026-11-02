import React from 'react';
import{OBJECT_NAMES,REFERENCE_TITLES,type ObjectId,type ReferenceBoard,type ReferenceValue}from'../reference-lab';
import{useMemoryStudy}from'./MemoryStudy';
import{AnswerValue}from'./AnswerValue';
const colors=['#2276b6','#df5a3a','#e6aa20','#518b53','#8a56ae','#2e9d9d'];
const art:Record<ObjectId,React.ReactNode>={
 key:<><circle cx="22" cy="21" r="12" fill="#f4c75b"/><circle cx="22" cy="21" r="5" fill="#fff"/><path d="M30 30L49 49L55 43L49 37L44 42L38 36" fill="#f4c75b"/></>,
 lock:<><path d="M20 27V17A12 12 0 0 1 44 17V27" fill="none" strokeWidth="6"/><rect x="14" y="25" width="36" height="29" rx="6" fill="#f4c75b"/><circle cx="32" cy="37" r="4" fill="#264e72"/><path d="M32 40V47"/></>,
 brush:<><path d="M17 45L41 13Q47 5 52 12L27 43" fill="#62bddb"/><path d="M27 38Q9 33 11 54Q32 56 33 43Z" fill="#ea9560"/></>,
 palette:<><path d="M53 31Q57 11 35 8Q9 5 8 32Q8 54 31 55Q43 54 36 43Q31 34 43 35Q50 37 53 31Z" fill="#edca8a"/><circle cx="22" cy="19" r="4" fill="#e85f53"/><circle cx="38" cy="18" r="4" fill="#4c9dd2"/><circle cx="18" cy="35" r="4" fill="#58a46c"/><circle cx="31" cy="48" r="3" fill="#fff"/></>,
 scissors:<><circle cx="17" cy="43" r="9" fill="#69c3dc"/><circle cx="40" cy="43" r="9" fill="#69c3dc"/><path d="M21 36L43 9M36 36L17 9" stroke="#668398" strokeWidth="5"/><circle cx="29" cy="27" r="3" fill="#fff"/></>,
 paper:<><path d="M15 7H39L51 20V56H15Z" fill="#fff"/><path d="M39 7V20H51M22 30H43M22 38H43M22 46H37" fill="none"/></>,
 hammer:<><path d="M30 27L19 56L28 59L40 29" fill="#c89556"/><path d="M12 16L17 7L34 14L47 13L56 22L49 29L37 23L31 31L22 27L25 20Z" fill="#88a1b6"/></>,
 nail:<><path d="M26 14H38L33 57L29 57Z" fill="#91aabd"/><path d="M16 9H47V17H16Z" fill="#bdcedc"/></>,
 watering:<><path d="M12 26H38L44 49H9Z" fill="#67bb9c"/><path d="M35 32L52 18L58 25L43 41" fill="#67bb9c"/><path d="M14 26Q10 4 28 9Q41 13 34 26" fill="none" strokeWidth="5"/></>,
 plant:<><path d="M31 41V14" fill="none" stroke="#42805c" strokeWidth="4"/><path d="M31 29Q9 29 12 13Q30 12 31 29M31 22Q49 20 49 7Q31 6 31 22" fill="#72af63"/><path d="M16 39H47L42 57H21Z" fill="#d88e59"/></>,
 spoon:<><ellipse cx="32" cy="17" rx="12" ry="14" fill="#c6dbe7"/><path d="M28 30H36L37 56Q32 62 27 56Z" fill="#91b3ca"/></>,
 bowl:<><ellipse cx="32" cy="24" rx="25" ry="8" fill="#e5f5fc"/><path d="M7 24Q10 51 32 51Q54 51 57 24Q32 37 7 24Z" fill="#74b8d8"/><path d="M24 52H40" strokeWidth="4"/></>,
 };
export function ReferenceObject({id}:{id:ObjectId}){
 return <svg className="bj-ref-object" viewBox="0 0 64 64" role="img" aria-label={OBJECT_NAMES[id]} shapeRendering="geometricPrecision"><g stroke="#244c6c" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">{art[id]}</g></svg>;
}
function Texture({cells,width,height}:{cells:readonly(number|null)[];width:number;height:number}){
 return <svg className="bj-ref-texture" viewBox={`0 0 ${width*32+4} ${height*32+4}`} role="img" aria-label={`${height} satır ${width} sütun desen: ${cells.map(v=>v===null?'boşluk':['yatay çizgi','dikey çizgi','çarpı','nokta'][v]).join(', ')}`}>
 {cells.map((v,i)=><g key={i} transform={`translate(${i%width*32+2} ${Math.floor(i/width)*32+2})`}><rect width="32" height="32" fill={v===null?'#fff':'#e7f6f4'} stroke={v===null?'#769bb7':'none'} strokeDasharray={v===null?'3 2':undefined}/>{v===null?<text x="16" y="23" textAnchor="middle" fontSize="23" fill="#487a99">?</text>:v===3?<circle cx="16" cy="16" r="4" fill="#205b65"/>:<path d={v===0?'M7 16H25':v===1?'M16 7V25':'M8 8L24 24M24 8L8 24'} stroke="#205b65" strokeWidth="3" strokeLinecap="round"/>}</g>)}
 </svg>;
}
function Tile({size,cells}:{size:number;cells:number[]}){return <svg className="bj-ref-tile" viewBox={`0 0 ${size*24} ${size*24}`} role="img" aria-label={`Parça deseni: ${cells.map(n=>n?'dolu':'boş').join(', ')}`}>{cells.map((v,i)=><rect key={i} x={i%size*24+1} y={Math.floor(i/size)*24+1} width="22" height="22" rx="2" fill={v?'#315f9e':'#f5f8fc'} stroke={v?'#173e6c':'#a8bdd1'}/>)}</svg>;}
const polygon=(shape:string,r:number,cy=0)=>shape==='square'?`${-r/Math.sqrt(2)},${cy-r/Math.sqrt(2)} ${r/Math.sqrt(2)},${cy-r/Math.sqrt(2)} ${r/Math.sqrt(2)},${cy+r/Math.sqrt(2)} ${-r/Math.sqrt(2)},${cy+r/Math.sqrt(2)}`:`0,${cy-r} ${r*Math.sqrt(3)/2},${cy+r/2} ${-r*Math.sqrt(3)/2},${cy+r/2}`;
export function LayerView({layers,three=false}:{layers:Extract<ReferenceValue,{reference:'layers'}>['layers'];three?:boolean}){
 const thickness=12,depthScale=.48,baseY=26;
 const layerY=(i:number)=>baseY-i*thickness*depthScale;
 const top=Math.min(...layers.map((_,i)=>layerY(i)-48*.45**i*depthScale))-8,bottom=baseY+(48+thickness)*depthScale+8;
 return <svg className={three?'bj-ref-layers-three':'bj-ref-layers'} viewBox={three?`-56 ${top} 112 ${bottom-top}`:'-54 -54 108 108'} role="img" aria-label={`${three?'Üç boyutlu yapı':'Üst görünüş'}. Alttan üste: ${layers.map(l=>`${['mavi','turuncu','sarı','yeşil','mor','turkuaz'][l.color]} ${l.shape==='circle'?'daire':l.shape==='square'?'kare':'üçgen'}`).join(', ')}`}>
 {layers.map((l,i)=>{const r=48*.45**i,y=three?layerY(i):0;
 const points=l.shape==='circle'?[]:polygon(l.shape,r).split(' ').map(p=>p.split(',').map(Number));
 return <g key={i} transform={three?`translate(0 ${y}) scale(1 ${depthScale})`:undefined} stroke="#244b65" strokeWidth="1.2">
 {three&&(l.shape==='circle'?<path d={`M${-r} 0v${thickness}a${r} ${r} 0 0 0 ${2*r} 0v${-thickness}Z`} fill={colors[l.color]}/>:points.map(([x,y],j)=>{const [nx,ny]=points[(j+1)%points.length];return <polygon key={j} points={`${x},${y} ${nx},${ny} ${nx},${ny+thickness} ${x},${y+thickness}`} fill={colors[l.color]}/>;}))}
 {l.shape==='circle'?<circle r={r} fill={colors[l.color]}/>:<polygon points={polygon(l.shape,r)} fill={colors[l.color]}/>}<path d={`M${-r*.4} ${-r*.2}L${r*.15} ${-r*.45}`} stroke="#fff" strokeOpacity=".2"/>
 </g>;})}
 </svg>;
}
export function ReferenceValueArt({value}:{value:ReferenceValue}){
 if('textNumber'in value)return String(value.textNumber).length>4?<span className="bj-ref-answer-code">{value.textNumber}</span>:<AnswerValue value={value.textNumber}/>;
 if(value.reference==='object')return <ReferenceObject id={value.id}/>;
 if(value.reference==='patch')return <Texture cells={value.cells} width={value.width} height={value.height}/>;
 if(value.reference==='layers')return <LayerView layers={value.layers}/>;
 return <div className="bj-ref-parts-choice">{value.pieces.map(p=><div key={p.index}><Tile {...p}/><strong>{p.index}</strong></div>)}</div>;
}
export function ReferenceLabBoard({board:b}:{board:ReferenceBoard}){
 const memory=useMemoryStudy();let content:React.ReactNode;
 if(b.mechanic==='semantic-analogy')content=<div className="bj-ref-pair-list">{[...b.examples,[b.query,null]].map(([a,c],i)=><div className="bj-ref-pair" key={i}><ReferenceObject id={a! as ObjectId}/><span>→</span>{c?<ReferenceObject id={c as ObjectId}/>:<strong className="bj-ref-hole">?</strong>}</div>)}</div>;
 else if(b.mechanic==='broken-pattern')content=<><p>Tekrar birimi</p><div className="bj-ref-inline">{b.unit.map((id,i)=><ReferenceObject key={i} id={id}/>)}</div><div className="bj-ref-pattern">{b.sequence.map((id,i)=><div key={i}><ReferenceObject id={id}/><span>{i+1}</span></div>)}</div></>;
 else if(b.mechanic==='paired-memory')content=<>{!memory.hidden&&<div className="bj-ref-memory">{b.pairs.map(([a,c],i)=><div key={i}><ReferenceObject id={a}/><span>↔</span><ReferenceObject id={c}/></div>)}</div>}{!memory.locked&&<div className="bj-ref-inline"><ReferenceObject id={b.query}/><span>Eşi hangisiydi?</span></div>}</>;
 else if(b.mechanic==='number-memory')content=<>{!memory.hidden&&<div className="bj-ref-inline">{b.digits.map((digit,i)=><strong className="bj-ref-digit" key={i}>{digit}</strong>)}</div>}{!memory.locked&&<p className="bj-ref-recall">{b.position}. sırada hangi sayı vardı?</p>}</>;
 else if(b.mechanic==='symbol-code')content=<><div className="bj-ref-key">{b.key.map(([id,n])=><div key={id}><ReferenceObject id={id}/><strong>= {n}</strong></div>)}</div><div className="bj-ref-inline bj-ref-query">{b.query.map((id,i)=><ReferenceObject key={i} id={id}/>)}<strong>→ ?</strong></div></>;
 else if(b.mechanic==='word-code')content=<div className="bj-ref-word-code">{b.examples.map(([word,code])=><div key={word}><strong>{word}</strong><span>→</span><strong>{code}</strong></div>)}<div className="bj-ref-query"><strong>{b.query}</strong><span>→</span><strong>?</strong></div></div>;
 else if(b.mechanic==='texture-patch')content=<div className="bj-ref-patch-givens"><div><p>Örnek desen</p><Texture cells={b.motif} width={b.motifSize} height={b.motifSize}/></div><div><p>Boşluğu tamamla</p><Texture cells={b.cells} width={b.size} height={b.size}/></div></div>;
 else if(b.mechanic==='parts-union')content=<><div className="bj-ref-target"><p>Hedef şekil</p><Tile size={b.size} cells={b.target}/></div><div className="bj-ref-pieces">{b.pieces.map((p,i)=><div key={i}><Tile {...p}/><strong>{i+1}</strong></div>)}</div><p>{b.use} parça · döndürmeden · üst üste</p></>;
 else content=<div className="bj-ref-stack"><LayerView layers={b.layers} three/><p>Alttaki katmanlar büyük, üsttekiler küçüktür.</p></div>;
 return <section className="bj-reference-lab" data-reference-mechanic={b.mechanic} aria-label={REFERENCE_TITLES[b.mechanic]}><h3>{REFERENCE_TITLES[b.mechanic]}</h3>{content}</section>;
}
