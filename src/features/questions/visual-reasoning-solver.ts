import { generateVisualFingerprint as fp } from './fingerprint';
import { independentlySolveCube } from './cube-solver';
import { validVisualValue, validateVisualBoard, type VisualValue, type Point } from './visual-reasoning-lab';

/** Candidate proof uses inverse maps, physical preimages and row permutations, not the answer key. */
export function independentlyMatchesVisual(board:unknown,candidate:unknown):candidate is VisualValue {
 try {
  if(!validVisualValue(candidate))return false;
  const b=validateVisualBoard(board),v=candidate;
  if(b.mechanic==='cube-evidence')return fp(independentlySolveCube(b.cube))===fp(v);
  if(b.mechanic==='scene-difference')return 'textNumber'in v&&v.textNumber===b.left.reduce((n,o,i)=>n+Number(Object.keys(o).some(k=>o[k as keyof typeof o]!==b.right[i][k as keyof typeof o])),0);
  if(b.mechanic==='object-shadow'||b.mechanic==='object-mirror'){
   if(!('lab'in v)||v.lab!=='scene'||v.silhouette!==(b.mechanic==='object-shadow')||v.objects.length!==b.objects.length)return false;
   return b.objects.every(o=>{
    const mirrored=b.mechanic==='object-mirror',vertical=mirrored&&b.axis==='vertical';
    const x=mirrored&&vertical?100-o.x:o.x,y=mirrored&&!vertical?100-o.y:o.y;
    const other=v.objects.filter(c=>c.x===x&&c.y===y);if(other.length!==1)return false;
    const c=other[0];
    if(c.kind!==o.kind||c.detail!==o.detail)return false;
    if(!mirrored)return c.turn===o.turn&&c.flipped===o.flipped;
    // D_axis * R(theta) * D_flip, compared as signed 2×2 matrices.
    const basis=(turn:number,flip:boolean)=>{const angles=[[1,0],[0,1],[-1,0],[0,-1]], [cos,sin]=angles[turn],sign=flip?-1:1;return [cos*sign,-sin,sin*sign,cos];};
    const a=basis(o.turn,o.flipped),actual=basis(c.turn,c.flipped),sx=vertical?-1:1,sy=vertical?1:-1;
    return c.color===o.color&&actual.every((n,i)=>n===a[i]*(i<2?sx:sy));
   });
  }
  if(b.mechanic==='fold-punch'){
   if(!('lab'in v)||v.lab!=='holes'||v.size!==b.size||v.holes.length!==b.holes.length*2**b.folds.length)return false;
   const punched=new Set(b.holes.map(p=>p.join(','))),folded=(x:number,y:number)=>[b.folds.includes('x')?Math.min(x,b.size-1-x):x,b.folds.includes('y')?Math.min(y,b.size-1-y):y].join(',');
   for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++)if(v.holes.some(p=>p[0]===x&&p[1]===y)!==punched.has(folded(x,y)))return false;
   return true;
  }
  if(b.mechanic==='seven-piece'){
   if(!('lab'in v)||v.lab!=='pieces'||v.polygons.length!==7-b.pieces.length)return false;
   // Signed edge half-planes on a finer triangular lattice independently verify the complete partition.
   const covers=(p:Point[],x:number,y:number)=>{const cross=p.map((a,i)=>{const c=p[(i+1)%p.length];return (c[0]-a[0])*(y-a[1])-(c[1]-a[1])*(x-a[0]);});return cross.every(n=>n>0)||cross.every(n=>n<0);};
   for(let y=0;y<8;y++)for(let x=0;x<8;x++)for(const [dx,dy]of [[.31,.13],[.87,.31],[.69,.87],[.13,.69]]){
    const px=(x+dx)/2,py=(y+dy)/2;if([...b.pieces,...v.polygons].filter(p=>covers(p,px,py)).length!==1)return false;
   }
   return true;
  }
  if(b.mechanic==='missing-symbol'){
   if(!('lab'in v)||v.lab!=='symbol')return false;
   const symbol=b.symbols.indexOf(v.symbol);if(symbol<0)return false;
   const permutations:number[][]=[];
   const permute=(a:number[])=>{if(a.length===b.side){permutations.push(a);return;}for(let k=0;k<b.side;k++)if(!a.includes(k))permute([...a,k]);};permute([]);
   let solutions=0;
   const visit=(rows:number[][])=>{if(rows.length===b.side){solutions++;return;}const r=rows.length;for(const row of permutations){if(row.some((n,c)=>b.cells[r*b.side+c]!==null&&b.cells[r*b.side+c]!==n||r*b.side+c===b.query&&n!==symbol||rows.some(previous=>previous[c]===n)))continue;visit([...rows,row]);}};visit([]);
   return solutions===1;
  }
  if(!('lab'in v)||v.lab!=='marks')return false;
  const c=b.cards as {mask:number;turn:number}[];
  if(b.side===2)return v.mask===c[2].mask&&((v.turn-c[2].turn+4)%4)===(c[1].turn-c[0].turn+4)%4;
  if(v.turn!==0)return false;
  let matchingRules=0;
  for(const truth of [(a:boolean,c:boolean)=>a||c,(a:boolean,c:boolean)=>a&&c,(a:boolean,c:boolean)=>a!==c]){
   const cards=[...c.slice(0,8),{mask:v.mask,turn:0}];
   if(Array.from({length:8},(_,bit)=>bit).every(bit=>[0,1,2].every(k=>{
    const present=(i:number)=>Boolean(cards[i].mask&(1<<bit));
    return truth(present(k*3),present(k*3+1))===present(k*3+2)&&truth(present(k),present(k+3))===present(k+6);
   })))matchingRules++;
  }
  return matchingRules===1;
 } catch {return false;}
}
