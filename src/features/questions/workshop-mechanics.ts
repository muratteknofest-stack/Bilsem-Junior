import { solveLinearClues, completeLatinSquare } from './reasoning-constraints';
import type { QuestionType } from '../../types';
import type { Tile } from './professional-engine';
import { isVisualSymbol, type VisualSymbol } from './visual-vocabulary';
import { WORKSHOP_TYPES } from './topic-catalog';

export type WorkshopValue = Tile | { textNumber: string | number } | { symbol: VisualSymbol } | { polygon: number[][] };
export interface WorkshopBoard {
  displayMode: 'workshop_board'; kind: QuestionType;
  tiles?: Tile[]; symbols?: VisualSymbol[]; reference?: VisualSymbol[];
  size?: number; cells?: number[]; target?: number; index?: number;
  equations?: number[][]; expression?: number[];
  totals?: number[]; counts?: number[]; heights?: number[];
  labels?: string[]; edges?: [string,string][]; position?: number;
  groups?: string[][]; entries?: { code: string; letter: string }[]; code?: string[];
  order?: number[]; letters?: string[]; pairs?: [string,string][];
  folds?: ('x'|'y')[]; holes?: [number,number][];
  net?: { x: number; y: number; label: string }[]; face?: string;
  start?: number; goals?: number[]; direction?: 'clockwise'|'counterclockwise';
  polygon?: number[][];
}
export const WORKSHOP_ENGINE_VERSION = 'workshop-2';
export const POLYGON_SYMBOLS: VisualSymbol[] = ['▲','■','◆','⬟','⬢'];
export const TANGRAM_POLYGONS = [ [[0,0],[4,0],[0,4]], [[4,0],[4,4],[0,4]], [[0,0],[4,0],[4,4]], [[0,0],[0,4],[4,4]] ];
const fail = (s: string): never => { throw new Error('MECHANICS: ' + s); };
const integer = (v: unknown, lo: number, hi: number): v is number => Number.isSafeInteger(v) && Number(v)>=lo && Number(v)<=hi;
const list = <T>(v: T[] | undefined, lo: number, hi: number, predicate: (x:T)=>boolean): v is T[] => Array.isArray(v) && v.length>=lo && v.length<=hi && v.every(predicate);
const text = (v:unknown): v is string => typeof v==='string' && v.trim().length>0 && v.length<=30;
const tileOK = (t:Tile) => !!t && integer(t.size,3,4) && list(t.cells,t.size**2,t.size**2,x=>x===0||x===1);
const unique = (v: unknown[]) => new Set(v.map(x=>JSON.stringify(x))).size===v.length;
const fields: Partial<Record<QuestionType,string[]>> = {
  odd_one_out:['symbols'], classification:['reference'], visual_attention:['symbols','reference'], visual_memory:['tiles'],
  figure_completion:['tiles'], visual_analogy:['tiles'], shadow_matching:['tiles'], detail_detection:['tiles'],
  spatial_relationship:['symbols','size','index'], logical_sequence:['labels','order','position'],
  shape_equation:['totals','equations','expression'], balance_scale:['totals','counts'], latin_square:['size','cells','index'],
  gear_rotation:['counts','direction'], paper_folding:['size','folds','holes'], punch_folding:['size','folds','holes'],
  venn_diagram:['groups'], cube_counting:['heights','size'], top_view:['heights','size'], multiview_perspective:['heights','size'],
  dice_unfold:['net','face'], spatial_origami:['net','face'], cryptogram:['entries','code'],
  verbal_analogy:['pairs','target'], story_logic:['labels','edges','position'], weight_comparison:['labels','edges'],
  tangram_puzzle:['polygon'], maze_path:['cells','size','start','goals'], word_scramble_logic:['letters','order'],
};
/** The renderer has an explicit view for every allowed field. Unknown givens fail closed. */
export function validateWorkshopBoard(b: WorkshopBoard): void {
  if (!b || b.displayMode!=='workshop_board' || !WORKSHOP_TYPES.includes(b.kind)) fail('Atölye gösterimi veya konusu geçersiz.');
  const allowed=['displayMode','kind',...(fields[b.kind]||[])];
  if(Object.keys(b).some(k=>!allowed.includes(k))) fail('Görünmeyen veya tanımsız bir kural alanı var.');
  if(b.tiles!==undefined && (!list(b.tiles,1,3,tileOK) || ![...new Set(b.tiles.map(t=>t.size))].every(s=>s===b.tiles![0].size))) fail('Desen ızgarası geçersiz.');
  if(b.symbols!==undefined && !list(b.symbols,4,16,isVisualSymbol)) fail('Şekil listesi geçersiz.');
  if(b.reference!==undefined && !list(b.reference,2,3,isVisualSymbol)) fail('Örnek şekiller geçersiz.');
  if(b.heights!==undefined && (!integer(b.size,3,4)||!list(b.heights,b.size**2,b.size**2,v=>integer(v,0,3))||!b.heights.some(Boolean))) fail('Küp yükseklikleri geçersiz.');
  if(b.labels!==undefined && (!list(b.labels,4,6,text)||!unique(b.labels))) fail('İsimler benzersiz olmalı.');
  if(b.edges!==undefined && (!list(b.edges,1,12,p=>Array.isArray(p)&&p.length===2&&p.every(x=>b.labels?.includes(x))&&p[0]!==p[1])||!unique(b.edges))) fail('Sıralama ipuçları geçersiz.');
  switch(b.kind) {
    case 'odd_one_out': if(b.symbols?.length!==4 || b.symbols.filter(s=>!POLYGON_SYMBOLS.includes(s)).length!==1) fail('Üç köşeli şekil ve bir köşesiz şekil gerekli.'); break;
    case 'classification': if(b.reference?.length!==3 || b.reference.some(s=>!POLYGON_SYMBOLS.includes(s))) fail('Sınıflandırma grubu köşeli olmalı.'); break;
    case 'visual_attention': if(b.reference?.length!==2) fail('İki şekillik hedef gerekli.'); break;
    case 'visual_memory': case 'shadow_matching': if(b.tiles?.length!==1) fail('Bir başlangıç deseni gerekli.'); break;
    case 'figure_completion': case 'detail_detection': if(b.tiles?.length!==2 || b.tiles[1].cells.some((v,i)=>v>b.tiles![0].cells[i])) fail('Parça tam desenin alt kümesi olmalı.'); break;
    case 'visual_analogy': if(b.tiles?.length!==3) fail('A, B ve C desenleri gerekli.'); break;
    case 'spatial_relationship': if(!integer(b.size,3,4)||b.symbols?.length!==b.size**2||!unique(b.symbols)||!integer(b.index,b.size,b.size**2-1)) fail('Konum veya benzersiz sembol ızgarası geçersiz.'); break;
    case 'logical_sequence': if(!b.labels||!list(b.order,b.labels.length,b.labels.length,v=>integer(v,1,b.labels!.length))||!unique(b.order)||!integer(b.position,0,b.labels.length-1)) fail('Olay sırası geçersiz.'); break;
    case 'shape_equation':
      if (b.equations) {
        const n=b.equations.length;
        if (b.totals || ![2,3].includes(n) || !list(b.equations,n,n,row=>list(row,n+1,n+1,v=>integer(v,0,72))&&row.slice(0,n).every(v=>v<=3)&&row.slice(0,n).some(Boolean)) || !list(b.expression,n,n,v=>integer(v,0,3)) || !b.expression.some(Boolean)) fail('Denklem ipuçları veya hedef ifade geçersiz.');
      } else if(b.expression || !list(b.totals,2,2,v=>integer(v,2,30))||b.totals[0]%2||b.totals[1]<=b.totals[0]/2) fail('Denklem yeterli veya geçerli değil.');
      break;
    case 'balance_scale': if(!list(b.totals,1,1,v=>integer(v,1,30))||!list(b.counts,1,1,v=>integer(v,2,4))||b.totals[0]%b.counts[0]) fail('Tam sayılı denge gerekli.'); break;
    case 'latin_square': if(!integer(b.size,3,4)||!list(b.cells,b.size**2,b.size**2,v=>integer(v,0,b.size!))||b.cells.filter(v=>v===0).length<1||b.cells.filter(v=>v===0).length>Math.floor(b.size**2*.65)||!integer(b.index,0,b.cells.length-1)||b.cells[b.index]!==0) fail('Latin karesinde geçerli verilenler ve boş bir hedef hücre gerekli.'); break;
    case 'gear_rotation': if(!list(b.counts,1,1,v=>integer(v,2,5))||!['clockwise','counterclockwise'].includes(b.direction||'')) fail('Dişli zinciri geçersiz.'); break;
    case 'paper_folding': case 'punch_folding': if(!integer(b.size,3,4)||!list(b.folds,1,2,v=>v==='x'||v==='y')||!unique(b.folds)||!list(b.holes,1,2,p=>p.length===2&&p.every(v=>integer(v,0,b.size!-1)))||!unique(b.holes)||b.holes.some(([r,c])=>b.folds!.includes('x')&&c>=b.size!/2||b.folds!.includes('y')&&r>=b.size!/2)) fail('Katlama ve kesim konumu geçersiz.'); break;
    case 'venn_diagram': if(!list(b.groups,2,2,g=>list(g,2,6,text)&&unique(g))) fail('İki açık küme gerekli.'); break;
    case 'dice_unfold': case 'spatial_origami': if(!list(b.net,6,6,n=>integer(n.x,-3,3)&&integer(n.y,-3,3)&&text(n.label))||!unique(b.net.map(n=>n.label))||!unique(b.net.map(n=>[n.x,n.y]))||!b.net.some(n=>n.label===b.face)) fail('Küp açılımı geçersiz.'); break;
    case 'cryptogram': if(!list(b.entries,3,6,e=>text(e.code)&&text(e.letter)&&e.letter.length===1)||!unique(b.entries.map(e=>e.code))||!unique(b.entries.map(e=>e.letter))||!list(b.code,3,6,c=>b.entries!.some(e=>e.code===c))) fail('Şifre anahtarı eksik veya belirsiz.'); break;
    case 'verbal_analogy': if(!list(b.pairs,4,8,p=>p.length===2&&p.every(text))||!unique(b.pairs.map(p=>p[0]))||!unique(b.pairs.map(p=>p[1]))||!integer(b.target,1,b.pairs.length-1)) fail('Sözel ilişki tablosu geçersiz.'); break;
    case 'story_logic': if(!b.labels||!b.edges||!integer(b.position,0,b.labels.length-1)) fail('Sıralama sorusu eksik.'); break;
    case 'weight_comparison': if(!b.labels||!b.edges) fail('Ağırlık ipuçları eksik.'); break;
    case 'tangram_puzzle': if(!b.polygon||!TANGRAM_POLYGONS.some(p=>JSON.stringify(p)===JSON.stringify(b.polygon))) fail('Üçgen parça geçersiz.'); break;
    case 'maze_path': if(!integer(b.size,3,4)||!list(b.cells,b.size**2,b.size**2,v=>v===0||v===1)||!integer(b.start,0,b.cells.length-1)||b.cells[b.start]!==0||!list(b.goals,4,4,v=>integer(v,0,b.cells!.length-1)&&b.cells![v]===0)||!unique(b.goals)||b.goals.includes(b.start)) fail('Labirent başlangıcı, yolları veya hedefleri geçersiz.'); break;
    case 'word_scramble_logic': if(!list(b.letters,3,6,x=>text(x)&&x.length===1)||!list(b.order,b.letters.length,b.letters.length,v=>integer(v,1,b.letters!.length))||!unique(b.order)) fail('Harf sıralaması bir permütasyon olmalı.'); break;
  }
}

export function transformed(t:Tile, variant:number):Tile {
  const cells=Array(t.cells.length).fill(0);
  for(let i=0;i<t.cells.length;i++) {
    let r=Math.floor(i/t.size),c=i%t.size;
    if(variant>=4)c=t.size-1-c;
    for(let k=0;k<variant%4;k++) [r,c]=[c,t.size-1-r];
    cells[r*t.size+c]=t.cells[i];
  }
  return {size:t.size,cells};
}
export function orderedNames(b:WorkshopBoard):string[] {
  const names=b.labels!, incoming=new Map(names.map(n=>[n,b.edges!.filter(e=>e[1]===n).length])), result:string[]=[];
  while(result.length<names.length) {
    const next=names.filter(n=>!result.includes(n)&&incoming.get(n)===0);
    if(next.length!==1) fail('İpuçları tek bir sıralama vermiyor.');
    result.push(next[0]); for(const [from,to] of b.edges!) if(from===next[0]) incoming.set(to,incoming.get(to)!-1);
  }
  return result;
}
type Vec=[number,number,number];
const neg=(v:Vec):Vec=>[-v[0],-v[1],-v[2]];
/** Fold cell frames over shared edges; six different normals are six cube faces. */
export function cubeFaceNormals(net:NonNullable<WorkshopBoard['net']>):Map<string,Vec> {
  const frames=new Map<string,{u:Vec;v:Vec;n:Vec}>([[net[0].label,{u:[1,0,0],v:[0,1,0],n:[0,0,1]}]]), queue=[net[0]];
  while(queue.length) {
    const cell=queue.shift()!, f=frames.get(cell.label)!;
    for(const other of net) {
      const dx=other.x-cell.x,dy=other.y-cell.y;if(Math.abs(dx)+Math.abs(dy)!==1)continue;
      const next=dx===1?{u:neg(f.n),v:f.v,n:f.u}:dx===-1?{u:f.n,v:f.v,n:neg(f.u)}:dy===1?{u:f.u,v:neg(f.n),n:f.v}:{u:f.u,v:f.n,n:neg(f.v)};
      const previous=frames.get(other.label);
      if(previous&&JSON.stringify(previous)!==JSON.stringify(next)) fail('Açılım katlanırken çakışıyor.');
      if(!previous){frames.set(other.label,next);queue.push(other);}
    }
  }
  if(frames.size!==6||!unique([...frames.values()].map(f=>f.n)))fail('Altı farklı küp yüzü oluşmuyor.');
  return new Map([...frames].map(([label,f])=>[label,f.n]));
}
export function solveWorkshopBoard(b:WorkshopBoard, options:WorkshopValue[]=[]):WorkshopValue {
  validateWorkshopBoard(b);
  const n=(v:string|number):WorkshopValue=>({textNumber:v});
  switch(b.kind) {
    case 'odd_one_out': return {symbol:b.symbols!.find(s=>!POLYGON_SYMBOLS.includes(s))!};
    case 'classification': {const matching=options.filter(v=>'symbol' in v&&POLYGON_SYMBOLS.includes(v.symbol));if(matching.length!==1)fail('Sınıflandırmada tek uygun seçenek gerekli.');return matching[0];}
    case 'figure_completion': return {size:b.tiles![0].size,cells:b.tiles![0].cells.map((v,i)=>v-b.tiles![1].cells[i])};
    case 'shadow_matching': case 'visual_memory': return structuredClone(b.tiles![0]);
    case 'visual_analogy': {
      const rules=Array.from({length:8},(_,i)=>i).filter(v=>JSON.stringify(transformed(b.tiles![0],v))===JSON.stringify(b.tiles![1]));
      if(rules.length!==1)fail('Analoji örneği tek dönüşüm tanımlamıyor.');return transformed(b.tiles![2],rules[0]);
    }
    case 'spatial_relationship': return {symbol:b.symbols![b.index!-b.size!]};
    case 'visual_attention': {let count=0;for(let i=0;i<b.symbols!.length-1;i++)if(b.symbols![i]===b.reference![0]&&b.symbols![i+1]===b.reference![1])count++;return n(count);}
    case 'logical_sequence': return n(b.labels![b.order!.indexOf(b.position!+1)]);
    case 'shape_equation': { if (!b.equations) return n(b.totals![1]-b.totals![0]/2); const values=solveLinearClues(b.equations); return n(b.expression!.reduce((sum,c,i)=>sum+c*values[i],0)); }
    case 'balance_scale': return n(b.totals![0]/b.counts![0]);
    case 'latin_square': return n(completeLatinSquare(b.cells!,b.size!)[b.index!]);
    case 'gear_rotation': return n(b.counts![0]%2===1?(b.direction==='clockwise'?'Saat yönünde':'Saat yönünün tersine'):(b.direction==='clockwise'?'Saat yönünün tersine':'Saat yönünde'));
    case 'paper_folding': case 'punch_folding': {
      const size=b.size!,cells=Array(size**2).fill(0);
      for(const [r,c] of b.holes!)for(const rr of b.folds!.includes('y')?[r,size-1-r]:[r])for(const cc of b.folds!.includes('x')?[c,size-1-c]:[c])cells[rr*size+cc]=1;
      return {size,cells};
    }
    case 'venn_diagram': return n(b.groups![0].filter(x=>b.groups![1].includes(x)).length);
    case 'cube_counting': return n(b.heights!.reduce((a,v)=>a+v,0));
    case 'top_view': return {size:b.size!,cells:b.heights!.map(h=>Number(h>0))};
    case 'multiview_perspective': {const size=b.size!,max=Array.from({length:size},(_,c)=>Math.max(...b.heights!.filter((_,i)=>i%size===c)));return {size,cells:Array.from({length:size**2},(_,i)=>Number(size-Math.floor(i/size)<=max[i%size]))};}
    case 'dice_unfold': case 'spatial_origami': {const normals=cubeFaceNormals(b.net!), normal=normals.get(b.face!)!;return n([...normals].find(([,v])=>v.every((x,i)=>x===-normal[i]))![0]);}
    case 'cryptogram': return n(b.code!.map(c=>b.entries!.find(e=>e.code===c)!.letter).join(''));
    case 'verbal_analogy': return n(b.pairs![b.target!][1]);
    case 'story_logic': return n(orderedNames(b)[b.position!]);
    case 'weight_comparison': return n(orderedNames(b).at(-1)!);
    case 'tangram_puzzle': {const idx=TANGRAM_POLYGONS.findIndex(p=>JSON.stringify(p)===JSON.stringify(b.polygon));return {polygon:TANGRAM_POLYGONS[idx^1]};}
    case 'maze_path': {const seen=new Set([b.start!]),queue=[b.start!];while(queue.length){const i=queue.shift()!;for(const j of neighbors(i,b.size!))if(!b.cells![j]&&!seen.has(j)){seen.add(j);queue.push(j);}}const reachable=b.goals!.filter(g=>seen.has(g));if(reachable.length!==1)fail('Labirentte tam bir hedefe ulaşılmalı.');return n('ABCD'[b.goals!.indexOf(reachable[0])]);}
    case 'detail_detection': {const removed=b.tiles![0].cells.map((v,i)=>v-b.tiles![1].cells[i]).flatMap((v,i)=>v?[i]:[]);if(removed.length!==1)fail('Tam bir hücre eksik olmalı.');return n(`${Math.floor(removed[0]/b.tiles![0].size)+1}. satır, ${removed[0]%b.tiles![0].size+1}. sütun`);}
    case 'word_scramble_logic': return n(b.order!.map(i=>b.letters![i-1]).join(''));
    default: return fail('Çözüm kuralı tanımlı değil.');
  }
}
export function neighbors(i:number,size:number):number[]{return [i-size,i+size,...(i%size?[i-1]:[]),...(i%size<size-1?[i+1]:[])].filter(j=>j>=0&&j<size**2);}
