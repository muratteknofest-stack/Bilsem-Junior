import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export const PRECISION_ENGINE = 'precision-lab-1';
export const PRECISION_TYPES = ['maze_path','visual_sequence','cube_counting','symbol_coding','visual_attention','odd_one_out','symmetry_completion','tangram_puzzle'] as const;
export type PrecisionType = typeof PRECISION_TYPES[number];
const int = (min:number,max:number) => z.number().int().min(min).max(max);
export const tokenSchema = z.object({ shape:int(0,3), rotation:int(0,3), dots:int(1,4), color:int(0,3) }).strict();
export type PrecisionToken = z.infer<typeof tokenSchema>;
const point = z.tuple([int(0,4),int(0,4)]);
const polygon = z.array(point).min(3).max(4);
const direction = z.enum(['U','R','D','L']);
export type Direction = z.infer<typeof direction>;
const base = { displayMode:z.literal('precision_lab'), grade:int(1,4) };
export const precisionBoardSchema = z.discriminatedUnion('kind',[
  z.object({...base,kind:z.literal('maze_path'),size:int(3,4),passages:z.array(z.tuple([int(0,15),int(0,15)])).min(8).max(15),start:int(0,15),goal:int(0,15)}).strict(),
  z.object({...base,kind:z.literal('visual_sequence'),lanes:int(1,2),cards:z.array(tokenSchema.nullable()).min(5).max(7)}).strict(),
  z.object({...base,kind:z.literal('cube_counting'),size:int(2,4),heights:z.array(int(0,4)).min(4).max(16),task:z.enum(['total','layer','complete','exposed']),level:int(1,4)}).strict(),
  z.object({...base,kind:z.literal('symbol_coding'),key:z.array(z.object({symbol:int(0,5),digit:int(0,9)}).strict()).min(3).max(6),query:z.array(int(0,5)).min(3).max(6),reading:z.enum(['forward','backward'])}).strict(),
  z.object({...base,kind:z.literal('visual_attention'),size:int(3,4),target:tokenSchema,cards:z.array(tokenSchema).min(9).max(16)}).strict(),
  z.object({...base,kind:z.literal('odd_one_out'),cards:z.array(z.tuple([tokenSchema,tokenSchema])).length(4)}).strict(),
  z.object({...base,kind:z.literal('symmetry_completion'),size:int(3,4),axis:z.enum(['vertical','horizontal','diagonal','antidiagonal']),cells:z.array(int(0,3)).min(9).max(16)}).strict(),
  z.object({...base,kind:z.literal('tangram_puzzle'),pieces:z.array(polygon).length(6)}).strict(),
]);
export type PrecisionBoard = z.infer<typeof precisionBoardSchema>;
export type Polygon = Array<[number,number]>;
export const precisionValueSchema = z.discriminatedUnion('precision',[
  z.object({precision:z.literal('route'),moves:z.array(direction).min(2).max(10)}).strict(),
  z.object({precision:z.literal('token'),...tokenSchema.shape}).strict(),
  z.object({precision:z.literal('grid'),size:int(3,4),cells:z.array(int(0,3)).min(9).max(16)}).strict(),
  z.object({precision:z.literal('piece'),points:polygon}).strict(),
  z.object({precision:z.literal('code'),digits:z.array(int(0,9)).min(3).max(6)}).strict(),
  z.object({precision:z.literal('number'),value:int(0,128)}).strict(),
]);
export type PrecisionValue = z.infer<typeof precisionValueSchema>;
export const mod4 = (n:number) => (n%4+4)%4;
export function normalizePiece(points:Polygon):Polygon {
  const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));
  return points.map(p=>[p[0]-x,p[1]-y]);
}
export function polygonArea(p:readonly (readonly number[])[]):number {
  return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
}
const cross = (a:readonly number[],b:readonly number[],p:readonly number[]) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
/** Exact convex clipping, with integer/half-integer tangram vertices. */
export function intersectionArea(subject:Polygon,clip:Polygon):number {
  let result=subject.map(p=>[...p] as [number,number]);
  const sign=Math.sign(clip.reduce((s,a,i)=>{const b=clip[(i+1)%clip.length];return s+a[0]*b[1]-a[1]*b[0];},0));
  for(let i=0;i<clip.length;i++){
    const a=clip[i],b=clip[(i+1)%clip.length],input=result;result=[];
    for(let j=0;j<input.length;j++){
      const p=input[j],q=input[(j+1)%input.length],cp=sign*cross(a,b,p),cq=sign*cross(a,b,q),inside=cp>=-1e-9,nextInside=cq>=-1e-9;
      if(inside)result.push(p);
      if(inside!==nextInside){const t=cp/(cp-cq);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
    }
    if(!result.length)return 0;
  }
  return polygonArea(result);
}
function validPiece(p:Polygon):boolean {
  if(new Set(p.map(v=>v.join(':'))).size!==p.length||polygonArea(p)<=0)return false;
  const turns=p.map((v,i)=>cross(v,p[(i+1)%p.length],p[(i+2)%p.length]));
  return (turns.every(n=>n>0)||turns.every(n=>n<0))&&p.every((a,i)=>{const b=p[(i+1)%p.length],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);return dx===0||dy===0||dx===dy;});
}
export function precisionValueKey(value:PrecisionValue):string {
  if(value.precision==='piece')return fingerprint({precision:'piece',points:normalizePiece(value.points).map(p=>p.join(':')).sort()});
  return fingerprint(value);
}
export function validPrecisionValue(value:unknown):value is PrecisionValue {
  const p=precisionValueSchema.safeParse(value);if(!p.success)return false;
  return p.data.precision==='grid'?p.data.cells.length===p.data.size**2:p.data.precision==='piece'?validPiece(p.data.points):true;
}
export function precisionAllowed(type:QuestionType,g:SchoolGrade,d:number):type is PrecisionType {
  return (PRECISION_TYPES as readonly string[]).includes(type)&&!!EDUCATION_PROFILES[g]&&Number.isInteger(d)&&d>=1&&d<=EDUCATION_PROFILES[g].maxDifficulty;
}
export function reflectIndex(index:number,size:number,axis:Extract<PrecisionBoard,{kind:'symmetry_completion'}>['axis']):number {
  const x=index%size,y=Math.floor(index/size);
  return axis==='vertical'?y*size+size-1-x:axis==='horizontal'?(size-1-y)*size+x:axis==='diagonal'?x*size+y:(size-1-x)*size+size-1-y;
}
export function pairRelation(pair:[PrecisionToken,PrecisionToken]):number[] {
  const [a,b]=pair;return [Number(a.shape===b.shape),mod4(b.rotation-a.rotation),mod4(b.dots-a.dots),mod4(b.color-a.color)];
}
export function validatePrecisionBoard(value:unknown):PrecisionBoard {
  const b=precisionBoardSchema.parse(value),g=b.grade as SchoolGrade;
  if('size'in b&&b.size>EDUCATION_PROFILES[g].maxGrid)throw Error('PRECISION_GRID_LOAD');
  if(b.kind==='maze_path'){
    if(b.start===b.goal||b.start>=b.size**2||b.goal>=b.size**2||b.passages.length!==b.size**2-1)throw Error('INVALID_MAZE');
    const seen=new Set<string>();
    for(const [a,c] of b.passages){const key=[a,c].sort((x,y)=>x-y).join(':');if(a>=b.size**2||c>=b.size**2||Math.abs(a%b.size-c%b.size)+Math.abs(Math.floor(a/b.size)-Math.floor(c/b.size))!==1||seen.has(key))throw Error('INVALID_PASSAGE');seen.add(key);}
    const reached=new Set([b.start]);for(let i=0;i<b.size**2;i++)for(const [a,c] of b.passages)if(reached.has(a)||reached.has(c)){reached.add(a);reached.add(c);}
    if(reached.size!==b.size**2)throw Error('DISCONNECTED_MAZE');
  }else if(b.kind==='visual_sequence'){
    if(b.cards.length!==(b.lanes===1?5:7)||b.cards.at(-1)!==null||b.cards.slice(0,-1).some(t=>t===null)||g<=2&&b.lanes!==1)throw Error('INVALID_PATTERN_EVIDENCE');
  }else if(b.kind==='cube_counting'){
    if(b.heights.length!==b.size**2||b.size<2||b.heights.reduce((a,n)=>a+n,0)>EDUCATION_PROFILES[g].maxItems||b.heights.every(n=>n===0)||b.heights.some(h=>h>(g===1?2:g===2?3:4)))throw Error('INVALID_CUBE_LOAD');
    const occupied=b.heights.flatMap((h,i)=>h?[i]:[]),seen=new Set([occupied[0]]);for(let n=0;n<b.heights.length;n++)for(const i of occupied)if(occupied.some(j=>seen.has(j)&&Math.abs(i%b.size-j%b.size)+Math.abs(Math.floor(i/b.size)-Math.floor(j/b.size))===1))seen.add(i);
    if(seen.size!==occupied.length||b.task==='complete'&&b.level<Math.max(...b.heights)||b.task==='layer'&&b.level>Math.max(...b.heights)||g<3&&b.task==='exposed')throw Error('INVALID_CUBE_TASK');
  }else if(b.kind==='symbol_coding'){
    if(b.key.length>EDUCATION_PROFILES[g].maxSymbols||new Set(b.key.map(k=>k.symbol)).size!==b.key.length||new Set(b.key.map(k=>k.digit)).size!==b.key.length||b.query.some(s=>!b.key.some(k=>k.symbol===s))||g===1&&b.reading!=='forward')throw Error('INVALID_CODE_KEY');
  }else if(b.kind==='visual_attention'){
    if(b.cards.length!==b.size**2)throw Error('INVALID_ATTENTION_GRID');
  }else if(b.kind==='symmetry_completion'){
    if(b.cells.length!==b.size**2||!b.cells.some(Boolean)||g<=2&&['diagonal','antidiagonal'].includes(b.axis))throw Error('INVALID_REFLECTION');
    for(let i=0;i<b.cells.length;i++)if(b.cells[i]&&b.cells[reflectIndex(i,b.size,b.axis)]&&b.cells[i]!==b.cells[reflectIndex(i,b.size,b.axis)])throw Error('CONFLICTING_REFLECTION');
    if(b.cells.every((v,i)=>v===b.cells[reflectIndex(i,b.size,b.axis)]))throw Error('ALREADY_SYMMETRIC');
  }else if(b.kind==='tangram_puzzle'){
    if(b.pieces.some(p=>!validPiece(p))||b.pieces.reduce((s,p)=>s+polygonArea(p),0)>=16)throw Error('INVALID_TANGRAM_PIECES');
    for(let i=0;i<b.pieces.length;i++)for(let j=i+1;j<b.pieces.length;j++)if(intersectionArea(b.pieces[i],b.pieces[j])>1e-8)throw Error('OVERLAPPING_TANGRAM');
  }
  return b;
}
function route(b:Extract<PrecisionBoard,{kind:'maze_path'}>):Direction[]{
  const queue=[b.start],paths=new Map<number,Direction[]>([[b.start,[]]]);
  for(const a of queue)for(const [x,y] of b.passages){const c=x===a?y:y===a?x:-1;if(c<0||paths.has(c))continue;paths.set(c,[...paths.get(a)!,c===a-b.size?'U':c===a+1?'R':c===a+b.size?'D':'L']);queue.push(c);}
  const path=paths.get(b.goal);if(!path)throw Error('MAZE_ROUTE_LOAD');return path;
}
function tangramFits(b:Extract<PrecisionBoard,{kind:'tangram_puzzle'}>,points:Polygon):boolean {
  const p=normalizePiece(points),width=Math.max(...p.map(v=>v[0])),height=Math.max(...p.map(v=>v[1]));
  if(Math.abs(b.pieces.reduce((n,v)=>n+polygonArea(v),0)+polygonArea(p)-16)>1e-8)return false;
  for(let x=0;x<=4-width;x++)for(let y=0;y<=4-height;y++){
    const placed=p.map(v=>[v[0]+x,v[1]+y] as [number,number]);
    if(b.pieces.every(v=>intersectionArea(v,placed)<1e-8))return true;
  }
  return false;
}
/** Computes from the visible board, never from its seed or generated answer. */
export function solvePrecision(value:unknown,candidates:readonly PrecisionValue[]=[]):PrecisionValue {
  const b=validatePrecisionBoard(value);
  if(b.kind==='maze_path')return {precision:'route',moves:route(b)};
  if(b.kind==='visual_sequence'){
    const lane=(b.cards.length-1)%b.lanes,examples=b.cards.filter((c,i):c is PrecisionToken=>c!==null&&i%b.lanes===lane),first=examples[0],last=examples.at(-1)!;
    if(examples.length<3||examples.some(t=>t.shape!==first.shape))throw Error('PATTERN_SHAPE_CONFLICT');
    const next={...last};for(const field of ['rotation','dots','color'] as const){const step=mod4(examples[1][field]-first[field]);if(examples.slice(1).some((t,i)=>mod4(t[field]-examples[i][field])!==step))throw Error('PATTERN_RULE_CONFLICT');next[field]=field==='dots'?mod4(last[field]-1+step)+1:mod4(last[field]+step);}
    return {precision:'token',...next};
  }
  if(b.kind==='cube_counting'){
    const total=b.heights.reduce((a,h)=>a+h,0);let value=total;
    if(b.task==='layer')value=b.heights.filter(h=>h>=b.level).length;
    if(b.task==='complete')value=b.size**2*b.level-total;
    if(b.task==='exposed')value=b.heights.reduce((sum,h,i)=>sum+Number(h>0)+[[i%b.size-1,Math.floor(i/b.size)],[i%b.size+1,Math.floor(i/b.size)],[i%b.size,Math.floor(i/b.size)-1],[i%b.size,Math.floor(i/b.size)+1]].reduce((s,[x,y])=>s+Math.max(0,h-(x<0||y<0||x>=b.size||y>=b.size?0:b.heights[y*b.size+x])),0),0);
    return {precision:'number',value};
  }
  if(b.kind==='symbol_coding')return {precision:'code',digits:(b.reading==='forward'?b.query:[...b.query].reverse()).map(s=>b.key.find(k=>k.symbol===s)!.digit)};
  if(b.kind==='visual_attention')return {precision:'number',value:b.cards.filter(t=>fingerprint(t)===fingerprint(b.target)).length};
  if(b.kind==='odd_one_out'){
    const relations=b.cards.map(pairRelation).map(r=>r.join(':')),odd=relations.findIndex(r=>relations.filter(v=>v===r).length===1);
    if(odd<0||relations.filter(r=>r===relations[(odd+1)%4]).length!==3)throw Error('AMBIGUOUS_ODD_PAIR');return {precision:'number',value:odd+1};
  }
  if(b.kind==='symmetry_completion'){
    const cells=[...b.cells];b.cells.forEach((v,i)=>{if(v)cells[reflectIndex(i,b.size,b.axis)]=v;});return {precision:'grid',size:b.size,cells};
  }
  const fitting=candidates.filter((c):c is Extract<PrecisionValue,{precision:'piece'}>=>c.precision==='piece'&&validPrecisionValue(c)&&tangramFits(b,c.points));
  if(fitting.length!==1)throw Error('TANGRAM_NEEDS_ONE_EXACT_COMPLEMENT');return fitting[0];
}
const TANGRAM:Polygon[]=[[[0,0],[4,0],[2,2]],[[0,0],[2,2],[0,4]],[[2,4],[4,2],[4,4]],[[4,0],[4,2],[3,1]],[[2,2],[3,3],[1,3]],[[2,2],[3,1],[4,2],[3,3]],[[0,4],[1,3],[3,3],[2,4]]];
function turnPiece(p:Polygon,turns:number,mirror=false):Polygon {return p.map(([a,b])=>{let x=mirror?4-a:a,y=b;for(let t=0;t<turns;t++)[x,y]=[4-y,x];return [x,y];});}
export const PRECISION_TITLES:Record<PrecisionType,string>={maze_path:'Rota atölyesi',visual_sequence:'Görsel örüntü',cube_counting:'Küp laboratuvarı',symbol_coding:'Sembol şifreleme',visual_attention:'Görsel dikkat',odd_one_out:'İlişkiyi bozan kart',symmetry_completion:'Simetri tamamlama',tangram_puzzle:'Tangram inşası'};
export function generatePrecisionQuestion(type:PrecisionType,seed:number,d:DifficultyLevel,g:SchoolGrade):BaseQuestion {
  if(!precisionAllowed(type,g,d)||!Number.isSafeInteger(seed)||seed<1)throw Error('INVALID_PRECISION_INPUT');
  const rng=new SeededRNG(seed),size=g<=2?3:4;
  const token=():PrecisionToken=>({shape:rng.nextInt(0,3),rotation:rng.nextInt(0,3),dots:rng.nextInt(1,4),color:rng.nextInt(0,3)});
  let b:PrecisionBoard,prompt:string,steps:string[],pool:PrecisionValue[]=[];
  const common={displayMode:'precision_lab' as const,grade:g};
  if(type==='maze_path'){
    const passages:Array<[number,number]>=[],stack=[rng.nextInt(0,size**2-1)],visited=new Set(stack);
    while(stack.length){const i=stack.at(-1)!,neighbors=Array.from({length:size**2},(_,j)=>j).filter(j=>!visited.has(j)&&Math.abs(i%size-j%size)+Math.abs(Math.floor(i/size)-Math.floor(j/size))===1);if(!neighbors.length){stack.pop();continue;}const j=rng.pick(neighbors);passages.push([i,j]);visited.add(j);stack.push(j);}
    const minimum=g===1?3:g===2?4:5,maximum=g===1?4:g===2?6:8;
    let endpoints:{start:number;goal:number}|undefined;
    for(const start of rng.shuffle(Array.from({length:size**2},(_,i)=>i))){
      const goals=Array.from({length:size**2},(_,goal)=>({goal,moves:route({...common,kind:type,size,passages,start,goal})})).filter(v=>v.moves.length>=minimum&&v.moves.length<=maximum);
      if(goals.length){endpoints={start,goal:rng.pick(goals).goal};break;}
    }
    if(!endpoints)throw Error('MAZE_ENDPOINTS_EXHAUSTED');
    b={...common,kind:type,size,passages,...endpoints};
    prompt='Yeşil başlangıçtan bayrağa ulaş. Duvarları geçmeden, okları sırayla izleyen doğru rota hangisi?';
    steps=['Başlangıç hücresinden ilk oku uygula; duvar varsa o rota elenir.','Her oku bir komşu hücreye geçiş olarak izle. Son hücre bayrak olmalı.'];
  }else if(type==='visual_sequence'){
    const lanes=g>=3&&d>=3?2:1,starts=Array.from({length:lanes},token),rules=Array.from({length:lanes},()=>({dots:rng.pick([1,2,3]),rotation:g>=2&&d>=2?rng.pick([1,2,3]):0,color:g>=3&&d>=3?rng.pick([1,2,3]):0}));
    const cards:Array<PrecisionToken|null>=Array.from({length:lanes===1?5:7},(_,i)=>{if(i===(lanes===1?4:6))return null;const a=starts[i%lanes],rule=rules[i%lanes],n=Math.floor(i/lanes);return {...a,dots:mod4(a.dots-1+n*rule.dots)+1,rotation:mod4(a.rotation+n*rule.rotation),color:mod4(a.color+n*rule.color)};});
    b={...common,kind:type,lanes,cards};prompt=lanes===2?'Tek ve çift kartları ayrı izle. Noktalar 1–2–3–4–1 halkasında ilerler. Yön ve renk değişimini de sürdür; eksik kart hangisi?':'Noktalar 1–2–3–4–1 halkasında ilerler. Kartların aynı yön ve renk değişimini de sürdür. Eksik kart hangisi?';
    steps=[lanes===2?'1, 3 ve 5. kartlardaki ilişkiyi bul; 2, 4 ve 6. kartları ayrı izle.':'Ardışık kartlardaki yön, renk ve nokta değişimlerini karşılaştır.','Sonraki kartta bütün değişimler birlikte sağlanmalı; tek özelliğe bakma.'];
  }else if(type==='cube_counting'){
    const side=g===1?2:g===2?3:d<=2?3:4,cap=g===1?2:g===2?3:4,heights=Array<number>(side**2).fill(0);heights[rng.nextInt(0,heights.length-1)]=1;
    const total=rng.nextInt(g===1?3:side+2,Math.min(EDUCATION_PROFILES[g].maxItems,side**2*cap-1));
    for(let n=1;n<total;n++){const possible=heights.flatMap((h,i)=>h<cap&&(h||heights.some((v,j)=>v>0&&Math.abs(i%side-j%side)+Math.abs(Math.floor(i/side)-Math.floor(j/side))===1))?[i]:[]);heights[rng.pick(possible)]++;}
    const task=g>=3&&d>=3?'exposed':g>=2&&d>=2?rng.pick(['layer','complete'] as const):'total',level=task==='layer'?Math.min(2,Math.max(...heights)):Math.max(...heights);
    b={...common,kind:type,size:side,heights,task,level};
    prompt=task==='exposed'?'Yapının açıkta kalan üst ve yan birim yüzlerinin toplamı kaçtır? Zemine değen alt yüzleri ve küplerin temas yüzlerini sayma.':task==='layer'?`Yükseklik planına göre zeminden ${level}. katmanda kaç birim küp bulunur?` :task==='complete'?`Bütün tabanı ${level} kat yüksekliğinde tam bir blok yapmak için kaç birim küp eklenmeli?`:'Yükseklik planını kullan. Örtünenler dâhil yapıda toplam kaç birim küp var?';
    steps=task==='exposed'?['Her dolu sütun bir üst yüz verir; komşu sütunların yükseklik farkı açık yan yüzleri verir.','Dış kenarları da say. Temas eden iki yüzü ve zemine değen alt yüzleri ekleme.']:task==='layer'?['İstenen katmana ulaşan sütunları plandan bul.','Her uygun sütun bu katmana yalnız bir küp verir.']:task==='complete'?['Tam bloğun taban alanını kat yüksekliğiyle çarp.','Mevcut sütunlardaki küpleri topla; tam bloktan bu toplamı çıkar.']:['Plandaki her sayı o sütundaki bütün küpleri gösterir.','Sütun yüksekliklerini topla; örtünen küpleri de hesaba kat.'];
  }else if(type==='symbol_coding'){
    const n=g===1?3:g===2?4:g===3?5:6,key=rng.pickUnique([0,1,2,3,4,5],n).map(symbol=>({symbol,digit:0}));
    const digits=rng.pickUnique([0,1,2,3,4,5,6,7,8,9],n);key.forEach((k,i)=>{k.digit=digits[i];});
    const length=g===1?3:g===2?4:g===3?5:6,query=Array.from({length},()=>rng.pick(key).symbol);query[length-1]=query[0];if(query.every(v=>v===query[0]))query[1]=key.find(k=>k.symbol!==query[0])!.symbol;
    const reading=g>=3&&d>=3&&rng.nextBool()?'backward':'forward';if(reading==='backward'&&query.every((v,i)=>v===query[length-1-i]))query[1]=key.find(k=>k.symbol!==query[length-2])!.symbol;b={...common,kind:type,key,query,reading};
    prompt=`Anahtardaki her sembol bir rakamı gösteriyor. Şeridi ${reading==='forward'?'soldan sağa':'sağdan sola'} oku. Tekrarlanan sembolleri de yazarak doğru şifreyi seç.`;
    steps=['Her sembolün rakamını yalnız verilen anahtardan bul; şeklin kenar sayısını kullanma.',`Şeridi ${reading==='forward'?'soldan sağa':'sağdan sola'} sırayla oku. Tekrarları ve varsa baştaki sıfırı koru.`];
  }else if(type==='visual_attention'){
    const target=token(),matches=rng.nextInt(2,g===1?4:6),cards=Array.from({length:size**2},(_,i)=>{if(i<matches)return {...target};const t={...target},field=rng.pick(g===1?['dots','shape'] as const:['dots','shape','rotation','color'] as const);t[field]=field==='dots'?mod4(t.dots-1+rng.pick([1,2,3]))+1:mod4(t[field]+rng.pick([1,2,3]));return t;});
    b={...common,kind:type,size,target,cards:rng.shuffle(cards)};prompt='Hedef kartın şekli, yönü, rengi ve nokta sayısı birlikte aynı olmalı. Tabloda hedef kartın tam aynısı kaç kez var?';
    steps=['Tabloyu satır satır tara; aynı kartı yeniden sayma.','Bir özelliği bile farklı olan benzer kartları ele. Tam eşleşmeleri topla.'];
  }else if(type==='odd_one_out'){
    const shift={rotation:g>=2?1:0,dots:rng.pick([1,2,3]),color:g>=3&&d>=3?1:0},odd=rng.nextInt(0,3),cards:Array<[PrecisionToken,PrecisionToken]>=Array.from({length:4},(_,i)=>{const a=token(),c={...a,rotation:mod4(a.rotation+shift.rotation),dots:mod4(a.dots-1+shift.dots)+1,color:mod4(a.color+shift.color)};if(i===odd){const field=rng.pick(g===1?['dots'] as const:g>=3?['rotation','dots','color'] as const:['rotation','dots'] as const);c[field]=field==='dots'?mod4(c.dots)+1:mod4(c[field]+1);}return [a,c];});
    b={...common,kind:type,cards};prompt='Noktalar 1–2–3–4–1 halkasında ilerler. Üç kartta aynı yön, renk ve nokta değişimi uygulanıyor. İlişkiyi bozan kart hangisi?';
    steps=['Her kartta soldaki şekilden sağdakine ne değiştiğini karşılaştır.','Üç kartın ortak dönüşümünü bul. Bu dönüşüme uymayan tek kartı seç.'];pool=[1,2,3,4].map(value=>({precision:'number',value}));
  }else if(type==='symmetry_completion'){
    const axis=rng.pick(g<=2?['vertical','horizontal'] as const:['vertical','horizontal','diagonal','antidiagonal'] as const),cells=Array<number>(size**2).fill(0),indices=Array.from({length:size**2},(_,i)=>i).filter(i=>i<reflectIndex(i,size,axis));
    for(const i of rng.pickUnique(indices,g===1?2:Math.min(indices.length,2+d)))cells[i]=g===1?1:rng.nextInt(1,3);
    b={...common,kind:type,size,axis,cells};prompt='Kesikli çizgi aynadır. Verilen hücrelerin yerini ve rengini koruyarak eksik tarafı tamamla. Hangi desen çizgiye göre simetriktir?';
    steps=['Her renkli hücrenin ayna çizgisine uzaklığını bul.','Karşı tarafta eşit uzaklıktaki hücreyi aynı renkte doldur; verilenleri değiştirme.'];
  }else{
    const turns=rng.nextInt(0,3),mirror=rng.nextBool(),pieces=TANGRAM.map(p=>turnPiece(p,turns,mirror)),missing=rng.nextInt(0,6);
    b={...common,kind:'tangram_puzzle',pieces:rng.shuffle(pieces.filter((_,i)=>i!==missing))};
    const answer:PrecisionValue={precision:'piece',points:normalizePiece(pieces[missing])};pool=[answer];
    for(const p of rng.shuffle(TANGRAM))for(const t of rng.shuffle([0,1,2,3])){const candidate:PrecisionValue={precision:'piece',points:normalizePiece(turnPiece(p,t))};if(!pool.some(v=>precisionValueKey(v)===precisionValueKey(candidate)))pool.push(candidate);}
    prompt='Altı parça kareye yerleştirildi. Parçaları oynatmadan, hangi yedinci parça boşluğu tam doldurur? Seçeneği yalnız kaydır; döndürme veya çevirme.';
    steps=['Boş bölgenin kenar uzunluklarını, köşelerini ve yönünü karşılaştır.','Seçeneği yalnız kaydırarak yerleştir. Karede boşluk veya parça çakışması kalmamalı.'];
  }
  validatePrecisionBoard(b);
  const answer=solvePrecision(b,pool),choices:PrecisionValue[]=[answer];
  const add=(v:PrecisionValue)=>{if(validPrecisionValue(v)&&!choices.some(c=>precisionValueKey(c)===precisionValueKey(v)))choices.push(v);};
  if(type==='tangram_puzzle'){const board=b as Extract<PrecisionBoard,{kind:'tangram_puzzle'}>;for(const v of pool)if(v.precision==='piece'&&!tangramFits(board,v.points))add(v);}
  else if(pool.length)pool.forEach(add);
  else if(answer.precision==='route')for(const i of rng.shuffle(answer.moves.map((_,i)=>i)))for(const dir of rng.shuffle(['U','R','D','L'] as const)){const moves=[...answer.moves];moves[i]=dir;add({precision:'route',moves});}
  else if(answer.precision==='token')for(const field of rng.shuffle(['rotation','dots','color'] as const))add({...answer,[field]:field==='dots'?mod4(answer.dots)+1:mod4(answer[field]+1)});
  else if(answer.precision==='code'){const reversed={precision:'code' as const,digits:[...answer.digits].reverse()};add(reversed);for(const i of rng.shuffle(answer.digits.map((_,i)=>i))){const digits=[...answer.digits];digits[i]=(digits[i]+1)%10;add({precision:'code',digits});}}
  else if(answer.precision==='grid')for(const i of rng.shuffle(answer.cells.map((_,i)=>i).filter(i=>!(b as Extract<PrecisionBoard,{kind:'symmetry_completion'}>).cells[i]))){const cells=[...answer.cells];cells[i]=(cells[i]+1)%4;add({...answer,cells});}
  else if(answer.precision==='number')for(const offset of rng.shuffle([1,-1,2,-2,3,-3,4,-4,5,-5]))add({precision:'number',value:answer.value+offset});
  if(choices.length<4)throw Error('PRECISION_DISTRACTORS_EXHAUSTED');
  const selected=rng.shuffle(choices.slice(0,4)),options=selected.map((visualData,i)=>({id:'ABCD'[i],label:'ABCD'[i],visualData,fingerprint:precisionValueKey(visualData)})),correctOptionId=options.find(o=>precisionValueKey(o.visualData)===precisionValueKey(answer))!.id;
  return {id:`${PRECISION_ENGINE}-${type}-g${g}-d${d}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],difficulty:d,targetGrade:g,targetGrades:[g],ageGroup:g<=2?'1-2':'3-4',seed,prompt,visualConfig:b,options,correctOptionId,explanation:{ruleTitle:PRECISION_TITLES[type],summary:steps.join(' '),steps},estimatedSeconds:30+d*10,skills:[type],status:'draft',authoring:{engine:PRECISION_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==correctOptionId).map(o=>[o.id,type==='tangram_puzzle'?'Kenar, alan veya yön uyuşmazlığı boşluk ya da çakışma oluşturur.':type==='maze_path'?'Bu ok dizisi duvara çarpar, hücreyi tekrar eder veya bayrak dışında biter.':'Görünür kuralın en az bir koşulu bu seçenekte sağlanmaz.']))}};
}
