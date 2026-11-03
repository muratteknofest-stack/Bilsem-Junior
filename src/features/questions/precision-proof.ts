import { validatePrecisionBoard, validPrecisionValue, type PrecisionValue, type PrecisionToken } from './precision-lab';

/** Candidate proof uses walks, completed relations, voxels and triangular coverage.
 * It does not call the primary solver, RNG, answer key or primary geometry clipper. */
export function independentlyMatchesPrecision(board:unknown,candidate:unknown):candidate is PrecisionValue {
  try{
    if(!validPrecisionValue(candidate))return false;
    const b=validatePrecisionBoard(board),v=candidate;
    if(b.kind==='maze_path'){
      if(v.precision!=='route')return false;
      let x=b.start%b.size,y=Math.floor(b.start/b.size);const seen=new Set([b.start]);
      for(const d of v.moves){const old=y*b.size+x;x+=d==='R'?1:d==='L'?-1:0;y+=d==='D'?1:d==='U'?-1:0;if(x<0||y<0||x>=b.size||y>=b.size)return false;const next=y*b.size+x;if(seen.has(next)||!b.passages.some(([a,c])=>a===old&&c===next||c===old&&a===next))return false;seen.add(next);}
      return y*b.size+x===b.goal;
    }
    if(b.kind==='visual_sequence'){
      if(v.precision!=='token')return false;
      const complete=b.cards.map((c,i)=>c??(i===b.cards.length-1?v:null));
      for(let lane=0;lane<b.lanes;lane++){
        const cards=complete.filter((c,i):c is PrecisionToken=>c!==null&&i%b.lanes===lane);
        if(cards.some(c=>c.shape!==cards[0].shape))return false;
        for(const field of ['rotation','dots','color'] as const)for(let i=2;i<cards.length;i++)if(((cards[i][field]-2*cards[i-1][field]+cards[i-2][field])%4+4)%4!==0)return false;
      }
      return true;
    }
    if(b.kind==='cube_counting'){
      if(v.precision!=='number')return false;
      const voxels=new Set<string>();for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++)for(let z=0;z<b.heights[y*b.size+x];z++)voxels.add(`${x},${y},${z}`);
      let answer=0;
      if(b.task==='total')answer=voxels.size;
      else if(b.task==='layer'){for(const key of voxels)if(Number(key.split(',')[2])===b.level-1)answer++;}
      else if(b.task==='complete'){for(let z=0;z<b.level;z++)for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++)if(!voxels.has(`${x},${y},${z}`))answer++;}
      else for(const key of voxels){const [x,y,z]=key.split(',').map(Number);for(const [dx,dy,dz] of [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,1]])if(!voxels.has(`${x+dx},${y+dy},${z+dz}`))answer++;}
      return v.value===answer;
    }
    if(b.kind==='symbol_coding'){
      if(v.precision!=='code'||v.digits.length!==b.query.length)return false;
      return b.query.every((symbol,i)=>{const at=b.reading==='forward'?i:b.query.length-1-i;return b.key.some(k=>k.symbol===symbol&&k.digit===v.digits[at]);});
    }
    if(b.kind==='visual_attention'){
      if(v.precision!=='number')return false;
      let count=0;for(const c of b.cards)if(c.shape===b.target.shape&&c.rotation===b.target.rotation&&c.color===b.target.color&&c.dots===b.target.dots)count++;
      return v.value===count;
    }
    if(b.kind==='odd_one_out'){
      if(v.precision!=='number'||v.value<1||v.value>4)return false;
      const relation=(i:number)=>{const [a,c]=b.cards[i];return [a.shape===c.shape,((c.rotation-a.rotation)%4+4)%4,((c.dots-a.dots)%4+4)%4,((c.color-a.color)%4+4)%4].join(':');};
      const others=[0,1,2,3].filter(i=>i!==v.value-1).map(relation);
      return others.every(r=>r===others[0])&&relation(v.value-1)!==others[0];
    }
    if(b.kind==='symmetry_completion'){
      if(v.precision!=='grid'||v.size!==b.size)return false;
      for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++){
        const [rx,ry]=b.axis==='vertical'?[b.size-1-x,y]:b.axis==='horizontal'?[x,b.size-1-y]:b.axis==='diagonal'?[y,x]:[b.size-1-y,b.size-1-x];
        const a=y*b.size+x,c=ry*b.size+rx;
        if(v.cells[a]!==v.cells[c]||v.cells[a]!==Math.max(b.cells[a],b.cells[c]))return false;
      }
      return true;
    }
    if(v.precision!=='piece')return false;
    // Integer horizontal/vertical/45-degree edges divide each unit square into
    // four triangles. Their interior centroids give an exact finite coverage test.
    const contains=(poly:readonly (readonly number[])[],x:number,y:number)=>{
      let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>y)!==(poly[j][1]>y)&&x<(poly[j][0]-poly[i][0])*(y-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])inside=!inside;return inside;
    };
    const minX=Math.min(...v.points.map(p=>p[0])),minY=Math.min(...v.points.map(p=>p[1])),p=v.points.map(([x,y])=>[x-minX,y-minY]),width=Math.max(...p.map(p=>p[0])),height=Math.max(...p.map(p=>p[1]));
    for(let dy=0;dy<=4-height;dy++)for(let dx=0;dx<=4-width;dx++){
      let valid=true;for(let y=0;y<4&&valid;y++)for(let x=0;x<4&&valid;x++)for(const [sx,sy] of [[.5,1/6],[5/6,.5],[.5,5/6],[1/6,.5]]){
        const coverage=b.pieces.reduce((n,poly)=>n+Number(contains(poly,x+sx,y+sy)),0)+Number(contains(p,x+sx-dx,y+sy-dy));if(coverage!==1){valid=false;break;}
      }
      if(valid)return true;
    }
    return false;
  }catch{return false;}
}
