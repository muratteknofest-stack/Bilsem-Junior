import { validFigure } from './figure-analogy';
import type { WorkshopBoard, WorkshopValue } from './workshop-mechanics';
import { POLYGON_SYMBOLS } from './workshop-mechanics';

/** Candidate predicates do not call the generator, primary solver or answer key. */
export function independentlyMatchesWorkshop(b:WorkshopBoard, value:WorkshopValue):boolean {
  const text='textNumber' in value?value.textNumber:undefined;
  const cells='cells' in value?value.cells:undefined;
  const symbol='symbol' in value?value.symbol:undefined;
  const tileMatches=(predicate:(i:number)=>number) => !!cells&&'size' in value&&value.size===(b.tiles?.[0]?.size||b.size||4)&&cells.length===value.size**2&&cells.every((v,i)=>v===predicate(i));
  switch(b.kind) {
    case 'odd_one_out': return symbol!==undefined&&b.symbols!.includes(symbol)&&!POLYGON_SYMBOLS.includes(symbol);
    case 'classification': return symbol!==undefined&&POLYGON_SYMBOLS.includes(symbol);
    case 'shadow_matching': case 'visual_memory': return tileMatches(i=>b.tiles![0].cells[i]);
    case 'figure_completion': return tileMatches(i=>b.tiles![0].cells[i]===1&&b.tiles![1].cells[i]===0?1:0);
    case 'detail_detection': return typeof text==='string'&&b.tiles![0].cells.every((v,i)=>v===b.tiles![1].cells[i]||text===`${Math.floor(i/b.tiles![0].size)+1}. satır, ${i%b.tiles![0].size+1}. sütun`);
    case 'spatial_relationship': {const row=Math.floor(b.index!/b.size!)-1,col=b.index!%b.size!;return symbol===b.symbols![row*b.size!+col];}
    case 'visual_attention': {const pattern=b.reference!.join('|');let hits=0;for(let i=1;i<b.symbols!.length;i++)if(b.symbols!.slice(i-1,i+1).join('|')===pattern)hits++;return text===hits;}
    case 'logical_sequence': return text===b.labels!.find((_,i)=>b.order![i]===b.position!+1);
    case 'shape_equation': {
      if(typeof text!=='number')return false;
      if(!b.equations)return Array.from({length:16},(_,x)=>x).some(x=>x+x===b.totals![0]&&x+text===b.totals![1]);
      const n=b.equations.length, matches:number[][]=[];
      const enumerate=(values:number[])=>{
        if(values.length===n){if(b.equations!.every(row=>row.slice(0,n).reduce((s,c,i)=>s+c*values[i],0)===row[n]))matches.push(values);return;}
        for(let value=1;value<=12;value++)enumerate([...values,value]);
      };
      enumerate([]);
      return matches.length===1&&b.expression!.reduce((s,c,i)=>s+c*matches[0][i],0)===text;
    }
    case 'balance_scale': return typeof text==='number'&&Array.from({length:b.counts![0]},()=>text).reduce((a,v)=>a+v,0)===b.totals![0];
    case 'latin_square': {
      if(typeof text!=='number'||text<1||text>b.size!)return false;
      const size=b.size!, rows=permutations(Array.from({length:size},(_,i)=>i+1));
      const solutions:number[][]=[];
      const extend=(grid:number[])=>{
        if(solutions.length>1)return;
        const r=grid.length/size;
        if(r===size){solutions.push(grid);return;}
        for(const row of rows){
          if(row.some((v,c)=>(b.cells![r*size+c]!==0&&b.cells![r*size+c]!==v)||grid.some((n,i)=>i%size===c&&n===v)))continue;
          extend([...grid,...row]);
        }
      };
      extend([]);return solutions.length===1&&solutions[0][b.index!]===text;
    }
    case 'gear_rotation': {let clockwise=b.direction==='clockwise';for(let i=1;i<b.counts![0];i++)clockwise=!clockwise;return text===(clockwise?'Saat yönünde':'Saat yönünün tersine');}
    case 'paper_folding': case 'punch_folding': return tileMatches(i=>{const size=b.size!;let r=Math.floor(i/size),c=i%size;for(const axis of b.folds!)if(axis==='x'&&c>=size/2)c=size-1-c;else if(axis==='y'&&r>=size/2)r=size-1-r;return Number(b.holes!.some(([rr,cc])=>rr===r&&cc===c));});
    case 'venn_diagram': {const membership=new Map<string,number>();for(const group of b.groups!)for(const name of group)membership.set(name,(membership.get(name)||0)+1);return text===[...membership.values()].filter(n=>n===2).length;}
    case 'cube_counting': {let count=0;for(let level=1;level<=3;level++)for(const height of b.heights!)if(height>=level)count++;return text===count;}
    case 'top_view': return tileMatches(i=>b.heights![i]===0?0:1);
    case 'multiview_perspective': return tileMatches(i=>{const level=b.size!-Math.floor(i/b.size!),col=i%b.size!;for(let row=0;row<b.size!;row++)if(b.heights![row*b.size!+col]>=level)return 1;return 0;});
    case 'cryptogram': {if(b.cipherRows){
      if(typeof text!=='string')return false;
      const symbols=[...new Set(b.cipherRows.flat())],digits=[...new Set(b.numberCodes!.join(''))],keys:Map<string,string>[]=[];
      // Enumerate assignments directly; compare codes by decoding back to shapes.
      for(const a of digits)for(const c of digits)for(const d of digits){if(new Set([a,c,d]).size!==3)continue;
        const key=new Map([[a,symbols[0]],[c,symbols[1]],[d,symbols[2]]]);
        const decoded=b.numberCodes!.map(code=>[...code].map(n=>key.get(n)).join('')).sort();
        if(decoded.join('|')===b.cipherRows.map(row=>row.join('')).sort().join('|'))keys.push(key);
      }
      return keys.length===1&&text.length===b.querySymbols!.length&&[...text].every((digit,i)=>keys[0].get(digit)===b.querySymbols![i]);
    }if(typeof text!=='string'||text.length!==b.code!.length)return false;return [...text].every((letter,i)=>b.entries!.some(e=>e.letter===letter&&e.code===b.code![i]));}
    case 'word_scramble_logic': {if(typeof text!=='string'||text.length!==b.letters!.length)return false;for(let source=0;source<b.letters!.length;source++)if(text[b.order!.indexOf(source+1)]!==b.letters![source])return false;return true;}
    case 'verbal_analogy': return typeof text==='string'&&b.pairs!.some(([word,partner])=>word===b.pairs![b.target!][0]&&partner===text);
    case 'story_logic': case 'weight_comparison': {const solutions=permutations(b.labels!).filter(order=>b.edges!.every(([a,c])=>order.indexOf(a)<order.indexOf(c)));return solutions.length===1&&text===solutions[0][b.kind==='weight_comparison'?b.labels!.length-1:b.position!];}
    case 'tangram_puzzle': {if(!('polygon' in value))return false;const given=b.polygon!,candidate=value.polygon;if(candidate.length!==3)return false;const area=(p:number[][])=>Math.abs(p.reduce((s,v,i)=>s+v[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*v[1],0))/2;if(area(given)!==8||area(candidate)!==8)return false;const center=(p:number[][])=>p.reduce((v,p)=>[v[0]+p[0]/3,v[1]+p[1]/3],[0,0]);const a=center(given),c=center(candidate);return Math.abs(a[0]+c[0]-4)<1e-8&&Math.abs(a[1]+c[1]-4)<1e-8;}
    case 'maze_path': {if(typeof text!=='string'||!/^[A-D]$/.test(text))return false;const destination=b.goals!['ABCD'.indexOf(text)],visited=new Set<number>();const explore=(i:number):boolean=>{if(i===destination)return true;visited.add(i);const r=Math.floor(i/b.size!),c=i%b.size!;for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){const rr=r+dr,cc=c+dc,j=rr*b.size!+cc;if(rr>=0&&cc>=0&&rr<b.size!&&cc<b.size!&&!b.cells![j]&&!visited.has(j)&&explore(j))return true;}return false;};return explore(b.start!);}
    case 'visual_analogy': {
      if(b.figures){
        if(!('figure' in value)||!validFigure(value.figure))return false;
        const f=value.figure,fs=b.figures,source=fs[b.figureTask==='line_union'?3:2];
        if(f.shape!==source.shape||f.inner!==source.inner)return false;
        if(b.figureTask==='fill_exchange')return f.lines===source.lines&&f.half===source.half&&f.outerFill===source.innerFill&&f.innerFill===source.outerFill;
        if(b.figureTask==='half_completion')return !f.half&&f.lines===0&&f.outerFill==='empty'&&f.innerFill==='empty';
        if(f.half||f.outerFill!=='empty'||f.innerFill!=='empty')return false;
        return [1,2,4,8].every(bit=>Boolean(f.lines&bit)===(Boolean(fs[3].lines&bit)||Boolean(fs[4].lines&bit)));
      }
      if(!cells||!('size' in value)||value.size!==b.tiles![0].size)return false;
      const size=value.size, permutations:number[][]=[];
      // D4 maps are expressed as coordinate equations, independently of forward tile rotation.
      for(const swap of [false,true])for(const flipR of [false,true])for(const flipC of [false,true])permutations.push(Array.from({length:size**2},(_,i)=>{let r=Math.floor(i/size),c=i%size;if(swap)[r,c]=[c,r];if(flipR)r=size-1-r;if(flipC)c=size-1-c;return r*size+c;}));
      const compatible=permutations.filter(map=>map.every((source,i)=>b.tiles![0].cells[source]===b.tiles![1].cells[i]));
      return compatible.length===1&&cells.length===size**2&&compatible[0].every((source,i)=>cells[i]===b.tiles![2].cells[source]);
    }
    case 'dice_unfold': case 'spatial_origami': {const normals=independentlyFoldNet(b.net!),a=normals.get(b.face!)!,other=typeof text==='string'?normals.get(text):undefined;return !!other&&a.reduce((sum,n,i)=>sum+n*other[i],0)===-1;}
    default:return false;
  }
}
function permutations<T>(items:T[]):T[][]{return items.length?items.flatMap((v,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];}
type V=[number,number,number];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Quarter-turn hinge rotations, not the primary solver's face-frame transitions. */
export function independentlyFoldNet(net:NonNullable<WorkshopBoard['net']>):Map<string,V>{
  const frames=new Map<string,{u:V;v:V}>([[net[0].label,{u:[1,0,0],v:[0,1,0]}]]);
  function visit(cell:typeof net[number]){const frame=frames.get(cell.label)!;for(const other of net){const dx=other.x-cell.x,dy=other.y-cell.y;if(Math.abs(dx)+Math.abs(dy)!==1)continue;const axis=dx?frame.v:frame.u,sign=dx||-dy;const rotate=(vector:V):V=>{const dot=vector.reduce((s,n,i)=>s+n*axis[i],0),c=cross(axis,vector);return c.map((n,i)=>n*sign+axis[i]*dot) as V;};const next={u:rotate(frame.u),v:rotate(frame.v)},previous=frames.get(other.label);if(previous&&JSON.stringify(previous)!==JSON.stringify(next))throw Error('Bağımsız katlama çakışması.');if(!previous){frames.set(other.label,next);visit(other);}}}
  visit(net[0]);const normals=new Map([...frames].map(([k,f])=>[k,cross(f.u,f.v)]));
  if(normals.size!==6||new Set([...normals.values()].map(v=>v.join(','))).size!==6)throw Error('Bağımsız katlama altı yüz vermedi.');return normals;
}

