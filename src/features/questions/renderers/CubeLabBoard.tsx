import React from 'react';
import type {CubeBoard,CubeValue} from '../cube-lab';
import {CUBE_TITLES} from '../cube-lab';
import {CubeSculpture} from './CubeSculpture';
import {AnswerValue} from './AnswerValue';
export function CubeView({value}:{value:CubeValue}){
 if('textNumber'in value)return <AnswerValue value={value.textNumber}/>;
 return <svg viewBox={`0 0 ${value.width*32+4} ${value.height*32+4}`} className="bj-cube-view" role="img" aria-label={`Görünüş: ${value.height} satır, ${value.width} sütun. ${Array.from({length:value.height},(_,r)=>`${r+1}. satır: ${value.cells.slice(r*value.width,(r+1)*value.width).map(v=>v?'dolu':'boş').join(', ')}`).join('; ')}`} shapeRendering="geometricPrecision">
  {value.cells.map((v,i)=><rect key={i} x={i%value.width*32+3} y={Math.floor(i/value.width)*32+3} width="28" height="28" rx="2" fill={v?'#267fb7':'#f6faff'} stroke={v?'#174c77':'#9eb5cd'} strokeWidth="1.4"/>)}
 </svg>;
}
export function CubeLabBoard({board:b}:{board:CubeBoard}){
 if(b.mechanic==='net-opposite'){
  const width=Math.max(...b.faces.map(f=>f.x))+1,height=Math.max(...b.faces.map(f=>f.y))+1;
  return <section className="bj-cube-lab" aria-label={CUBE_TITLES[b.mechanic]}><div className="bj-cube-title">{CUBE_TITLES[b.mechanic]}</div><svg className="bj-cube-net" viewBox={`-3 -3 ${width*48+6} ${height*48+6}`} role="img" aria-label={`Katlanacak küp açılımı; hedef yüz ${b.target}. ${b.faces.map(f=>`${f.y+1}. satır ${f.x+1}. sütun: ${f.label}`).join('; ')}`}>
   {b.faces.map(f=><g key={f.label} transform={`translate(${f.x*48} ${f.y*48})`}><rect x="1" y="3" width="46" height="44" rx="3" fill="#21618e"/><rect x="1" y="1" width="46" height="44" rx="3" fill={f.label===b.target?'#fff1ba':'#e6f6ff'} stroke="#1f5e86" strokeWidth="1.2"/><text x="24" y="31" textAnchor="middle" fontSize="24" fontWeight="800" fill="#173f64">{f.label}</text>{f.label===b.target&&<path d="M7 39H41" stroke="#a15d09" strokeWidth="2"/>}</g>)}
  </svg><p className="bj-cube-caption">Kalın çizgili hedef yüz: {b.target} · ortak kenarlar katlanır</p></section>;
 }
 return <section className="bj-cube-lab" aria-label={CUBE_TITLES[b.mechanic]}>
  <div className="bj-cube-title">{CUBE_TITLES[b.mechanic]}{b.mechanic==='rotated-top'&&<span> ↻ {b.turns*90}°</span>}{b.mechanic==='layer-count'&&<span> · {b.layer}. katman</span>}{b.mechanic==='complete-block'&&<span> · hedef {b.targetHeight} kat</span>}</div>
  <div className="bj-cube-givens"><div className="bj-cube-model"><CubeSculpture size={b.size} heights={b.heights}/></div><figure className="bj-cube-plan"><figcaption>Yükseklik planı</figcaption><div className="bj-cube-plan-grid" style={{gridTemplateColumns:`repeat(${b.size},1fr)`}} aria-label="Sütun yükseklikleri, üst satırdan alt satıra">
   {b.heights.map((h,i)=><span key={i} data-cube-height={h} aria-label={`${Math.floor(i/b.size)+1}. satır ${i%b.size+1}. sütun: ${h} küp`}>{h}</span>)}
  </div><span className="bj-cube-plan-front">ÖN ↑</span><span className="bj-cube-plan-right">← SAĞ</span><p>0 = boş hücre<br/>Her sayı sütun yüksekliği</p></figure></div>
  <p className="bj-cube-caption">Sabit kamera · küpler zeminden başlayarak boşluksuz dizilir</p>
 </section>;
}
