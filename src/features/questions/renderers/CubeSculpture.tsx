import React, { useId } from 'react';

/** Orthographic projection: exact unit cubes, back-to-front ordering, no perspective distortion. */
export function CubeSculpture({size, heights}: {size: number; heights: number[]}) {
  const id=useId().replace(/:/g,'_'), unit=30, lift=30, originX=size*unit+18, originY=120;
  const cells=heights.map((height,i)=>({height,row:Math.floor(i/size),col:i%size})).sort((a,b)=>(a.row+a.col)-(b.row+b.col)||a.row-b.row);
  const at=(r:number,c:number,z=0)=>[originX+(c-r)*unit,originY+(r+c)*unit/2-z*lift];
  const diamond=(x:number,y:number)=>`${x},${y} ${x+unit},${y+unit/2} ${x},${y+unit} ${x-unit},${y+unit/2}`;
  return <svg viewBox={`0 0 ${size*unit*2+36} ${originY+size*unit+42}`} className="w-full max-w-md mx-auto" role="img" shapeRendering="geometricPrecision" aria-label={`Üç boyutlu birim küp yapısı. ${heights.map((h,i)=>`${Math.floor(i/size)+1}. satır ${i%size+1}. sütun: ${h} küp`).join('; ')}`}>
    <defs>
      <linearGradient id={`${id}-top`} x2=".8" y2="1"><stop stopColor="#dce8ff"/><stop offset="1" stopColor="#9bbbf6"/></linearGradient>
      <linearGradient id={`${id}-left`} x2="1" y2="1"><stop stopColor="#749ee7"/><stop offset="1" stopColor="#476eb9"/></linearGradient>
      <linearGradient id={`${id}-right`} x2="1" y2="1"><stop stopColor="#3864ac"/><stop offset="1" stopColor="#203f79"/></linearGradient>
    </defs>
    <ellipse cx={originX} cy={originY+size*unit/2+12} rx={size*unit*.92} ry={size*unit*.47} fill="#243d68" opacity=".06"/>
    {cells.map(({row,col})=>{const [x,y]=at(row,col);return <polygon key={`floor-${row}-${col}`} points={diamond(x,y)} fill="#edf2fa" stroke="#c4d2e8" strokeWidth=".8"/>;})}
    {cells.flatMap(({height,row,col})=>Array.from({length:height},(_,z)=>{const [x,y]=at(row,col,z+1);return <g key={`${row}-${col}-${z}`} data-unit-cube="true" stroke="#223f72" strokeWidth=".7" strokeLinejoin="round">
      <path d={`M${x-unit} ${y+unit/2}L${x} ${y+unit}V${y+unit+lift}L${x-unit} ${y+unit/2+lift}Z`} fill={`url(#${id}-left)`}/>
      <path d={`M${x} ${y+unit}L${x+unit} ${y+unit/2}V${y+unit/2+lift}L${x} ${y+unit+lift}Z`} fill={`url(#${id}-right)`}/>
      <polygon points={diamond(x,y)} fill={`url(#${id}-top)`}/>
      <path d={`M${x-unit+2} ${y+unit/2}L${x} ${y+1}L${x+unit-2} ${y+unit/2}`} fill="none" stroke="#f4f8ff" strokeWidth="1.1"/>
    </g>;}))}
    <text x={originX} y={originY+size*unit+31} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3a527a">ÖN ↓</text>
  </svg>;
}
