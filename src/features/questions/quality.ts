import type { BaseQuestion } from '../../types';
import { solvePuzzle } from './solvers/puzzle';
import { uniqueLinearValue } from './solvers/linear';
import { TASK_TYPES, puzzlePrompt } from './puzzle-contract';
export function canonicalContent(value:any):string {
  if(Array.isArray(value))return '['+value.map(canonicalContent).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalContent(value[k])).join(',')+'}';
  return JSON.stringify(value)??'null';
}
const equal=(a:any,b:any)=>canonicalContent(a)===canonicalContent(b);
const mod=(n:number,m=360)=>(n%m+m)%m;
const positions=['top','right','bottom','left'];
function shape(value:any):any {
  const periods:Record<string,number>={circle:1,ring:1,square:90,diamond:90,triangle:120,hexagon:60,pentagon:72,star:72,cross:90};
  const rotation=mod(value.rotation||0),marker=value.marker||'none',pos=value.markerPos||'center';
  return {kind:value.kind,fill:value.fill,rotation:mod(rotation,periods[value.kind]||360),marker,markerColor:marker==='none'?null:value.markerColor,markerPosition:marker==='none'?null:pos==='center'?'center':mod(positions.indexOf(pos)*90+rotation)};
}
export function optionContent(value:any):string {
  if(value&&typeof value==='object') {
    if(value.textNumber!==undefined)return canonicalContent({textNumber:String(value.textNumber).trim()});
    if(value.kind)return canonicalContent(shape(value));
    if(value.cells)return canonicalContent({size:value.size,cells:value.cells.map((c:any)=>c.join(',')).sort()});
  }
  return canonicalContent(value);
}
export function questionContentKey(q:BaseQuestion):string {
  return canonicalContent({type:q.type,prompt:q.prompt.trim(),secondaryPrompt:q.secondaryPrompt?.trim(),visualConfig:q.visualConfig});
}
export interface SolverResult {supported:boolean;matchingIds:string[];reason?:string;}
const SUPPORTED_MODES:Record<string,string[]>={odd_one_out:['options_only'],visual_sequence:['sequence'],matrix_2x2:['matrix_2x2'],figure_rotation:['single_target'],spatial_relationship:['3d_stack'],visual_analogy:['analogy_pairs'],shape_counting:['scatter_counting'],direction_path:['grid_path'],visual_memory:['memory_board'],symbol_coding:['symbol_code_table'],classification:['group_classification'],visual_attention:['reference_match'],number_pattern:['number_sequence_cards'],logical_sequence:['liquid_levels'],matrix_3x3:['matrix_3x3'],shape_equation:['shape_equation'],latin_square:['shape_grid'],balance_scale:['balance_scale'],gear_rotation:['gear_system'],venn_diagram:['venn_diagram'],cryptogram:['cryptogram'],operation_machine:['operation_machine'],number_pyramid:['number_pyramid'],maze_path:['maze_path'],detail_detection:['detail_detection'],weight_comparison:['weight_comparison']};
export function solveQuestion(q:BaseQuestion):SolverResult {
  try{return solve(q);}catch{return {supported:true,matchingIds:[],reason:'Görünür soru verileri eksik veya geçersiz.'};}
}
function solve(q:BaseQuestion):SolverResult {
  const v=q.visualConfig;
  let predicate:((d:any)=>boolean)|undefined;
  const numeric=(n:number|null)=>(d:any)=>n!==null&&Number.isFinite(n)&&Math.abs(Number(d?.textNumber)-n)<1e-8;
  const shapeMatch=(expected:any)=>(d:any)=>equal(shape(d),shape(expected));
  if(TASK_TYPES[q.type]) {
    if(v.displayMode!=='verified_puzzle'||v.task?.kind!==TASK_TYPES[q.type])return {supported:false,matchingIds:[],reason:'Eski soru biçimi; yeni motorla yeniden üretin.'};
    if(q.prompt!==puzzlePrompt(q.type,v.task))return {supported:true,matchingIds:[],reason:'Yönerge, doğrulanan soru kuralıyla eşleşmiyor.'};
    predicate=d=>solvePuzzle(v.task,d);
  } else if(!SUPPORTED_MODES[q.type]?.includes(v.displayMode))return {supported:false,matchingIds:[],reason:'Soru tipi veya görsel biçimi desteklenmiyor.'};
  else switch(q.type) {
    case 'number_pattern': {
      const nums=v.displayNumbers.slice(0,-1).map(Number);if(nums.length<3||!nums.every(Number.isFinite))break;
      const [a,b]=nums;const step=b-a,ratio=b/a;
      const candidates=new Set<number>();
      if(nums.every((n:number,i:number)=>!i||n-nums[i-1]===step))candidates.add(nums.at(-1)+step);
      if(a!==0&&nums.every((n:number,i:number)=>!i||Math.abs(n-nums[i-1]*ratio)<1e-8))candidates.add(nums.at(-1)*ratio);
      predicate=numeric(candidates.size===1?[...candidates][0]:null);break;
    }
    case 'number_pyramid': {
      const p=v.pyramid;if(p.length!==6||p.filter((x:number)=>x===-1).length!==1)break;
      predicate=d=>{const a=p.map((x:number)=>x===-1?Number(d.textNumber):x);return a.every(Number.isFinite)&&a[0]===a[1]+a[2]&&a[1]===a[3]+a[4]&&a[2]===a[4]+a[5];};break;
    }
    case 'operation_machine': {
      const known=v.pairs.filter((p:any)=>p.out!=='?'),target=v.pairs.filter((p:any)=>p.out==='?');
      if(known.length<2||target.length!==1)break;
      predicate=numeric(uniqueLinearValue(known.map((p:any)=>[p.in,1,Number(p.out)]),[target[0].in,1]));break;
    }
    case 'figure_rotation': {
      const delta=v.direction==='saat yönünde'?v.rotationAngle:-v.rotationAngle;
      predicate=shapeMatch({...v.targetItem,rotation:mod((v.targetItem.rotation||0)+delta)});break;
    }
    case 'visual_attention': predicate=shapeMatch(v.referenceItem);break;
    case 'visual_memory': predicate=d=>v.memoryItems.some((s:any)=>shapeMatch(s)(d));break;
    case 'detail_detection': predicate=d=>d.gridSize===v.gridSize&&equal([...d.detailCells].sort((a,b)=>a-b),[...v.detailCells].sort((a,b)=>a-b));break;
    case 'spatial_relationship': predicate=d=>equal(v.stack,d.stack);break;
    case 'classification': {
      const curved=['circle','crescent','ring','clover'];
      if(!v.groupShapes.every((s:string)=>curved.includes(s)))break;
      predicate=d=>curved.includes(d.kind);break;
    }
    case 'visual_sequence': {
      const seq=v.sequenceItems;if(seq.length<3)break;
      const [a,b]=seq;const last=seq.at(-1);let expected:any;
      if(seq.every((s:any,i:number)=>equal(s,seq[i%2])))expected=seq[seq.length%2];
      else if(seq.every((s:any)=>s.kind===a.kind&&s.fill===a.fill&&s.marker===a.marker)) {
        if(a.rotation!==b.rotation) {
          const delta=mod(b.rotation-a.rotation);
          if(seq.every((s:any,i:number)=>mod(s.rotation-a.rotation)===mod(delta*i)))expected={...last,rotation:mod(last.rotation+delta)};
        } else {
          const p=positions.indexOf(a.markerPos),delta=mod(positions.indexOf(b.markerPos)-p,4);
          if(p>=0&&seq.every((s:any,i:number)=>positions.indexOf(s.markerPos)===mod(p+delta*i,4)))expected={...last,markerPos:positions[mod(p+delta*seq.length,4)]};
        }
      }
      predicate=expected?shapeMatch(expected):()=>false;break;
    }
    case 'visual_analogy': case 'matrix_2x2': {
      const [a,b,c]=q.type==='matrix_2x2'?[v.grid[0][0],v.grid[0][1],v.grid[1][0]]:[v.pairA,v.pairB,v.pairC];
      const expected={...c};
      for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(!equal(a[key],b[key]))expected[key]=key==='rotation'?mod((c.rotation||0)+(b.rotation||0)-(a.rotation||0)):b[key];
      predicate=shapeMatch(expected);break;
    }
    case 'shape_counting': {
      if(!Array.isArray(v.coords)||v.coords.some((c:any)=>c.x<8||c.x>92||c.y<8||c.y>92))break;
      if(v.coords.some((a:any,i:number)=>v.coords.some((b:any,j:number)=>j>i&&Math.hypot(a.x-b.x,a.y-b.y)<13)))break;
      predicate=numeric(v.coords.length);break;
    }
    case 'direction_path': {
      let x=0,y=0;for(const s of v.steps){const step=Number(s.match(/^\d+/)?.[0]||1);if(s.includes('→'))x+=step;else if(s.includes('←'))x-=step;else if(s.includes('↓'))y+=step;else if(s.includes('↑'))y-=step;else throw Error();if(x<0||x>2||y<0||y>2)throw Error();}
      predicate=d=>d.kind===v.gridSymbols[y*3+x];break;
    }
    case 'maze_path': {
      let {x,y}=v.start;for(const c of v.commands){if(c.dir==='R')x+=c.steps;else if(c.dir==='L')x-=c.steps;else if(c.dir==='U')y-=c.steps;else if(c.dir==='D')y+=c.steps;else throw Error();if(x<0||y<0||x>=v.gridSize||y>=v.gridSize)throw Error();}
      const targets=v.targetPositions.filter((p:any)=>p.x===x&&p.y===y);predicate=d=>targets.length===1&&d.target.id===targets[0].target.id;break;
    }
    case 'symbol_coding': {
      const mapping=new Map(v.mapping.map((m:any)=>[m.shape,m.code]));
      const codes=v.targetSequence.map((s:any)=>mapping.get(s.shape));if(codes.some((x:any)=>x===undefined))break;
      predicate=d=>d.textNumber===codes.join(' - ');break;
    }
    case 'cryptogram': {
      const map=new Map<string,string>();let valid=true;let target='';
      for(const p of v.pairs){if(p.code==='?'){target=p.word;continue;}if(p.word.length!==p.code.length)valid=false;Array.from(p.word as string).forEach((c,i)=>{if(map.has(c)&&map.get(c)!==p.code[i])valid=false;map.set(c,p.code[i]);});}
      const chars=Array.from(target);predicate=d=>valid&&chars.length>0&&chars.every(c=>map.has(c))&&d.textNumber===chars.map(c=>map.get(c)).join('');break;
    }
    case 'logical_sequence': {
      const [a,b]=v.levels,step=b-a;predicate=numeric(null);
      if(v.levels.every((x:number,i:number)=>x===a+i*step))predicate=d=>d.fillPercent===a+v.levels.length*step;break;
    }
    case 'matrix_3x3': case 'latin_square': {
      const n=q.type==='matrix_3x3'?3:v.gridSize;
      const g=q.type==='matrix_3x3'?v.grid:v.grid.reduce((rows:any[],s:any,i:number)=>{if(i%n===0)rows.push([]);rows.at(-1).push(s.isHidden?'?':s.kind);return rows;},[]);
      const symbols=new Set(g.flat().filter((s:any)=>s!=='?'));if(symbols.size!==n||g.flat().filter((s:any)=>s==='?').length!==1)break;
      predicate=d=>{
        if(!symbols.has(d.kind))return false;
        const grid=g.map((row:any[])=>row.map(s=>s==='?'?d.kind:s));
        return grid.every((row:any[])=>new Set(row).size===n)&&grid[0].every((_:any,c:number)=>new Set(grid.map((row:any[])=>row[c])).size===n);
      };break;
    }
    case 'shape_equation': {
      const symbols=[...new Set<string>(v.equations.flatMap((e:any)=>e.left.map((s:any)=>s.shape)))];
      const vector=(e:any)=>symbols.map(s=>e.left.filter((x:any)=>x.shape===s).length);
      const target=v.equations.filter((e:any)=>e.right==='?');if(target.length!==1||v.equations.some((e:any)=>e.op!=='+'))break;
      predicate=numeric(uniqueLinearValue(v.equations.filter((e:any)=>e.right!=='?').map((e:any)=>[...vector(e),Number(e.right)]),vector(target[0])));break;
    }
    case 'balance_scale': case 'weight_comparison': {
      const kind=(x:any)=>typeof x==='string'?x:x.kind;
      const known=v.scales.filter((s:any)=>Array.isArray(s.right));
      const symbols=[...new Set<string>(known.flatMap((s:any)=>[...s.left,...s.right].map(kind)))];
      const vector=(items:any[])=>symbols.map(s=>items.filter(x=>kind(x)===s).length);
      const equations=known.map((s:any)=>vector(s.left).map((x:number,i:number)=>x-vector(s.right)[i]).concat(0));
      equations.push(symbols.map((_,i)=>i===symbols.length-1?1:0).concat(1));
      if(q.type==='balance_scale') {
        const target=v.scales.find((s:any)=>s.right==='?');
        predicate=d=>uniqueLinearValue(equations,vector(target.left).map((x:number,i:number)=>x-vector(d.stack)[i]))===0;
      } else {
        const values=symbols.map((_,i)=>uniqueLinearValue(equations,symbols.map((_,j)=>i===j?1:0)));
        if(values.some(x=>x===null||x<=0))break;
        const numericValues=values as number[];
        const label=q.prompt.includes('EN AĞIR')?symbols[numericValues.indexOf(Math.max(...numericValues))]:q.prompt.includes('EN HAFİF')?symbols[numericValues.indexOf(Math.min(...numericValues))]:null;
        predicate=label?d=>d.label.includes(label):d=>Number(d.label.match(/^\d+/)?.[0])===numericValues[symbols.indexOf('🟩')]/numericValues[symbols.indexOf('🔺')];
      }break;
    }
    case 'gear_rotation': {
      const gears=v.gears;const clockwise=(gears[0].startDir==='clockwise')===(gears.length%2===1);
      predicate=d=>d.textNumber===(clockwise?'Saat Yönünde (Sağa ↻)':'Ters Yönde (Sola ↺)');break;
    }
    case 'venn_diagram': {
      const common=v.leftSet.items.filter((s:any)=>v.rightSet.items.includes(s));predicate=d=>common.length===1&&d.kind===common[0];break;
    }
    case 'odd_one_out': {
      const data=q.options.map(o=>o.visualData);
      const classifications=[(s:any)=>s.fill,(s:any)=>['square','diamond','trapezoid'].includes(s.kind)?'four':'other',(s:any)=>mod(s.rotation||0,90)===0?'axis':'diagonal'];
      const candidates=new Set<string>();
      for(const feature of classifications){const values=data.map(feature);for(let i=0;i<values.length;i++)if(values.filter(x=>x===values[i]).length===1&&new Set(values.filter((_,j)=>j!==i)).size===1)candidates.add(q.options[i].id);}
      if(data.every(s=>s.marker==='dot')) {
        const offsets=data.map(s=>positions.indexOf(s.markerPos));
        offsets.forEach((x,i)=>{if(offsets.filter(y=>y===x).length===1&&new Set(offsets.filter((_,j)=>j!==i)).size===1)candidates.add(q.options[i].id);});
      }
      return {supported:true,matchingIds:candidates.size===1?[...candidates]:[]};
    }
  }
  if(!predicate)return {supported:true,matchingIds:[],reason:'Verilen bilgilerle tek bir cevap hesaplanamadı.'};
  return {supported:true,matchingIds:q.options.filter(o=>predicate!(o.visualData)).map(o=>o.id)};
}
