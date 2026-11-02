import { validateCubeBoard, validCubeValue, type CubeValue } from './cube-lab';
/** Integer voxel occupancy and 90-degree vector rotation. Never reads a seed,
 * generated key, primary solver, or primary net-fold result. */
export function independentlySolveCube(value:unknown):CubeValue {
 const b=validateCubeBoard(value);
 if(b.mechanic==='net-opposite'){
  type V=[number,number,number];const cross=(a:V,c:V):V=>[a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]];
  const rotate=(v:V,axis:V,sign:number):V=>{const c=cross(axis,v),dot=axis.reduce((s,k,i)=>s+k*v[i],0);return c.map((k,i)=>sign*k+axis[i]*dot) as V;};
  const states=new Map<number,{r:V;d:V;n:V}>([[0,{r:[1,0,0],d:[0,1,0],n:[0,0,1]}]]),queue=[0];
  for(const i of queue){const state=states.get(i)!,f=b.faces[i];for(let j=0;j<6;j++){
   const dx=b.faces[j].x-f.x,dy=b.faces[j].y-f.y;if(Math.abs(dx)+Math.abs(dy)!==1)continue;
   const axis=dx?state.d:state.r,sign=dx?dx:-dy,next={r:rotate(state.r,axis,sign),d:rotate(state.d,axis,sign),n:rotate(state.n,axis,sign)};
   if(states.has(j)){if(['r','d','n'].some(k=>states.get(j)![k as keyof typeof next].some((v,t)=>v!==next[k as keyof typeof next][t])))throw Error('NET_ROTATION_CONFLICT');}
   else{states.set(j,next);queue.push(j);}
  }}
  if(states.size!==6||new Set([...states.values()].map(s=>s.n.join(','))).size!==6)throw Error('INVALID_SOLID_NET');
  const target=b.faces.findIndex(f=>f.label===b.target),normal=states.get(target)!.n;
  const opposite=[...states].find(([,s])=>s.n.reduce((sum,n,i)=>sum+n*normal[i],0)===-1);
  if(!opposite)throw Error('MISSING_OPPOSITE');return {textNumber:b.faces[opposite[0]].label};
 }
 const voxels:Array<[number,number,number]>=[];
 for(let z=0;z<4;z++)for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++)if(b.heights[y*b.size+x]>z)voxels.push([x,y,z]);
 if(b.mechanic==='total')return {textNumber:voxels.length};
 if(b.mechanic==='layer-count')return {textNumber:voxels.filter(v=>v[2]===b.layer-1).length};
 if(b.mechanic==='complete-block'){
  const occupied=new Set(voxels.map(v=>v.join(':')));let missing=0;
  for(let z=0;z<b.targetHeight;z++)for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++)if(!occupied.has(`${x}:${y}:${z}`))missing++;
  return {textNumber:missing};
 }
 const height=['front-view','right-view'].includes(b.mechanic)?Math.max(...voxels.map(v=>v[2]+1)):b.size,cells=Array.from({length:b.size*height},()=>0);
 for(const [x,y,z] of voxels){
  if(b.mechanic==='front-view')cells[(height-1-z)*b.size+x]=1;
  else if(b.mechanic==='right-view')cells[(height-1-z)*b.size+(b.size-1-y)]=1;
  else {
   const center=(b.size-1)/2,dx=x-center,dy=y-center;
   const turn=b.mechanic==='rotated-top'?b.turns:0;
   const [cos,sin]=[[1,0],[0,1],[-1,0],[0,-1]][turn];
   cells[(center+sin*dx+cos*dy)*b.size+(center+cos*dx-sin*dy)]=1;
  }
 }
 return {cubeView:true,width:b.size,height,cells};
}
export function independentlyMatchesCube(board:unknown,candidate:unknown):candidate is CubeValue {
 try{if(!validCubeValue(candidate))return false;const a=independentlySolveCube(board);return 'textNumber'in a?'textNumber'in candidate&&candidate.textNumber===a.textNumber:'cells'in candidate&&candidate.width===a.width&&candidate.height===a.height&&a.cells.every((v,i)=>candidate.cells[i]===v);}catch{return false;}
}
