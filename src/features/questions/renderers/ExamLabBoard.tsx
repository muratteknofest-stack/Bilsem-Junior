import React from 'react';
import type {ExamBoard,ExamTile} from '../exam-lab';
const colors=['#ffffff','#1764d9','#f59b22','#a236ba'];
export function ExamTileArt({value}:{value:ExamTile}){
 return <svg className="bj-exam-tile" viewBox={`0 0 ${value.width*32} ${value.height*32}`} role="img" aria-label="Görsel desen kartı" shapeRendering="geometricPrecision">
  {value.cells.map((v,i)=><rect key={i} x={i%value.width*32+.75} y={Math.floor(i/value.width)*32+.75} width="30.5" height="30.5" fill={colors[v]} stroke="#253e56" strokeWidth="1.5"/>)}
 </svg>;
}
export function ExamLabBoard({board:b}:{board:ExamBoard}){
 if(b.mechanic==='detail-mirror')return <div className={`bj-exam-board bj-exam-mirror ${b.axis==='horizontal'?'is-horizontal':''}`} aria-label={b.axis==='vertical'?'Dikey aynanın yanındaki şekil':'Yatay aynanın üstündeki şekil'}><ExamTileArt value={b.source}/><span className="bj-exam-mirror-line">AYNA</span></div>;
 if(b.mechanic==='context-patch')return <div className="bj-exam-board bj-exam-patch"><svg viewBox={`0 0 ${b.width*32} ${b.height*32}`} role="img" aria-label="Eksik parçası bulunan desen" shapeRendering="geometricPrecision">
  {b.cells.map((v,i)=>v===null?null:<rect key={i} x={i%b.width*32+.75} y={Math.floor(i/b.width)*32+.75} width="30.5" height="30.5" fill={colors[v]} stroke="#253e56" strokeWidth="1.5"/>)}
  <rect x={b.hole.x*32+1} y={b.hole.y*32+1} width={b.hole.width*32-2} height={b.hole.height*32-2} fill="#eaf5ff" stroke="#1670b6" strokeWidth="2" strokeDasharray="4 2"/>
  <text x={(b.hole.x+b.hole.width/2)*32} y={(b.hole.y+b.hole.height/2)*32+8} textAnchor="middle" fontSize="26" fontWeight="800" fill="#1764d9">?</text>
 </svg></div>;
 const side=b.mechanic==='transform-pairs'?2:b.mechanic==='cyclic-matrix'?b.side:3;
 return <div className="bj-exam-board"><div className="bj-exam-grid" style={{gridTemplateColumns:`repeat(${side},minmax(0,1fr))`}} aria-label={side===2?'Örnek dönüşüm çiftleri':'Satır ve sütun kartları'}>{b.cards.map((v,i)=><div key={i} className="bj-exam-cell">{v?<ExamTileArt value={v}/>:<span className="bj-exam-missing" aria-label="Eksik kart">?</span>}</div>)}</div>{b.mechanic==='overlap-rule'&&<p className="bj-exam-caption">Soldaki iki desen → sağdaki sonuç</p>}</div>;
}
