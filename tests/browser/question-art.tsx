import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {ColorfulArt} from '../../src/features/questions/renderers/ColorfulBoard';
import type {ObjectArt} from '../../src/features/questions/colorful-engine';
import {AnswerValue} from '../../src/features/questions/renderers/AnswerValue';
declare global {interface Window {__renderArt:(value:ObjectArt,shadow:boolean)=>void;}}
function QA(){
 const [sample,setSample]=useState({value:{art:'object' as const,shape:0,variant:0,tilt:0},shadow:true});
 window.__renderArt=(value,shadow)=>setSample({value,shadow});
 return <main style={{padding:24,background:'#eef2f4',color:'#19364e'}}>
  <h1 style={{fontSize:28,fontWeight:800}}>Bilsem Junior · Soru atölyesi</h1><p>Özgün çizimler · fiziksel konturlar · net işaretler</p>
  <div className="art-sample" style={{width:220,height:220}}><ColorfulArt value={sample.value} shadow={sample.shadow}/></div>
  <section style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:16}}>{Array.from({length:12},(_,i)=><figure key={i} style={{height:170,padding:18,border:'1px solid #cbd5df',borderRadius:18,background:'#fffefb'}}><ColorfulArt value={{art:'object',shape:Math.floor(i/4),variant:i%4,tilt:0}}/></figure>)}</section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:16,marginTop:24}}>{Array.from({length:6},(_,color)=><figure key={color} style={{height:110}}><ColorfulArt value={{art:'swatch',color}}/></figure>)}</section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginTop:24}}>{[8,24,'Saat yönü','Saat yönünün tersi'].map(value=><div key={value} style={{height:130,background:'#fffefb',borderRadius:16,padding:10}}><AnswerValue value={value}/></div>)}</section>
 </main>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
