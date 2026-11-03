import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { TOPIC_CATEGORY, topicAllowedForGrade } from './topic-catalog';
import { generateVisualFingerprint as fp } from './fingerprint';
import { cubeBoardSchema, cubeValueSchema, CUBE_MECHANICS, cubeAllowed, generateCubeQuestion, solveCube, type CubeBoard } from './cube-lab';

export const VISUAL_LAB_ENGINE = 'visual-lab-1';
export const VISUAL_MECHANICS = ['object-shadow','scene-difference','object-mirror','fold-punch','seven-piece','missing-symbol','raven-relation','cube-evidence'] as const;
export type VisualMechanic = typeof VISUAL_MECHANICS[number];
const n = (a:number,b:number) => z.number().int().min(a).max(b);
export const OBJECT_KINDS = ['bird','watering-can','rocket','sailboat','house','fish'] as const;
export const objectSchema = z.object({kind:z.enum(OBJECT_KINDS),x:n(20,80),y:n(20,80),turn:n(0,3),flipped:z.boolean(),detail:n(0,2),color:n(0,4)}).strict();
export type SceneObject = z.infer<typeof objectSchema>;
const scene = z.array(objectSchema).min(2).max(4);
const point = z.tuple([n(0,4),n(0,4)]);
const polygon = z.array(point).min(3).max(4);
const common = {displayMode:z.literal('visual_lab'),grade:n(1,4)};
export const visualBoardSchema = z.discriminatedUnion('mechanic',[
 z.object({...common,mechanic:z.literal('object-shadow'),objects:scene}).strict(),
 z.object({...common,mechanic:z.literal('scene-difference'),left:scene,right:scene}).strict(),
 z.object({...common,mechanic:z.literal('object-mirror'),objects:scene,axis:z.enum(['vertical','horizontal'])}).strict(),
 z.object({...common,mechanic:z.literal('fold-punch'),size:z.union([z.literal(4),z.literal(6),z.literal(8)]),folds:z.array(z.enum(['x','y'])).min(1).max(2),holes:z.array(z.tuple([n(0,7),n(0,7)])).min(1).max(3)}).strict(),
 z.object({...common,mechanic:z.literal('seven-piece'),pieces:z.array(polygon).min(5).max(6)}).strict(),
 z.object({...common,mechanic:z.literal('missing-symbol'),side:z.union([z.literal(3),z.literal(4)]),cells:z.array(n(0,3).nullable()).min(9).max(16),query:n(0,15),symbols:z.array(n(0,5)).min(3).max(4)}).strict(),
 z.object({...common,mechanic:z.literal('raven-relation'),side:z.union([z.literal(2),z.literal(3)]),cards:z.array(z.object({mask:n(1,255),turn:n(0,3)}).strict().nullable()).min(4).max(9)}).strict(),
 z.object({...common,mechanic:z.literal('cube-evidence'),cube:cubeBoardSchema}).strict(),
]);
export type VisualBoard = z.infer<typeof visualBoardSchema>;
export const visualValueSchema = z.union([
 z.object({lab:z.literal('scene'),objects:scene,silhouette:z.boolean()}).strict(),
 z.object({lab:z.literal('holes'),size:z.union([z.literal(4),z.literal(6),z.literal(8)]),holes:z.array(z.tuple([n(0,7),n(0,7)])).min(1).max(12)}).strict(),
 z.object({lab:z.literal('pieces'),polygons:z.array(polygon).min(1).max(2)}).strict(),
 z.object({lab:z.literal('symbol'),symbol:n(0,5)}).strict(),
 z.object({lab:z.literal('marks'),mask:n(1,255),turn:n(0,3)}).strict(),
 cubeValueSchema,
]);
export type VisualValue = z.infer<typeof visualValueSchema>;
export type Point = [number,number];
const same = (a:unknown,b:unknown) => fp(a)===fp(b);
export function visualTopic(m:VisualMechanic,g:number,cube?:CubeBoard):QuestionType {
 return m==='object-shadow'?'shadow_matching':m==='scene-difference'?'detail_detection':m==='object-mirror'?'mirror_reflection':m==='fold-punch'?'paper_folding':m==='seven-piece'?'tangram_puzzle':m==='missing-symbol'?'latin_square':m==='raven-relation'?(g===1?'matrix_2x2':'raven_matrix'):cube?.mechanic==='net-opposite'?'dice_unfold':cube?.mechanic==='top-view'||cube?.mechanic==='rotated-top'?'top_view':cube?.mechanic==='front-view'||cube?.mechanic==='right-view'?'multiview_perspective':'cube_counting';
}
export function visualAllowed(m:VisualMechanic,g:SchoolGrade,d:number) {
 return VISUAL_MECHANICS.includes(m)&&!!EDUCATION_PROFILES[g]&&Number.isInteger(d)&&d>=1&&d<=EDUCATION_PROFILES[g].maxDifficulty&&(m!=='cube-evidence'||d<=4);
}
export function validVisualValue(v:unknown):v is VisualValue {
 const r=visualValueSchema.safeParse(v);if(!r.success)return false;
 const a=r.data;
 if('lab'in a&&a.lab==='holes')return a.holes.every(([x,y])=>x<a.size&&y<a.size)&&new Set(a.holes.map(p=>p.join(','))).size===a.holes.length;
 if('lab'in a&&a.lab==='pieces')return a.polygons.every(p=>standardPolygon(p))&&pieceMask(a.polygons).every(n=>n<=1);
 return !('cubeView'in a)||a.cells.length===a.width*a.height;
}
export function visualValueKey(v:VisualValue):string {
 if('lab'in v&&v.lab==='scene')return fp({...v,objects:v.objects.map(o=>({...o,...(v.silhouette?{color:0}:{})})).sort((a,b)=>a.y-b.y||a.x-b.x)});
 if('lab'in v&&v.lab==='holes')return fp({...v,holes:[...v.holes].sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
 if('lab'in v&&v.lab==='pieces')return fp({lab:'pieces',mask:pieceMask(v.polygons)});
 return fp(v);
}
export const TANGRAM_SEVEN:Point[][] = [
 [[0,0],[4,0],[2,2]],[[0,0],[2,2],[0,4]],[[4,2],[4,4],[2,4]],
 [[2,2],[3,1],[3,3]],[[0,4],[2,4],[1,3]],[[1,3],[2,2],[3,3],[2,4]],[[4,0],[4,2],[3,3],[3,1]],
];
function standardPolygon(p:Point[]):boolean {
 if(!validPolygon(p))return false;
 const key=(a:Point[])=>a.map(v=>v.join(',')).sort().join(';');
 for(const source of TANGRAM_SEVEN)for(let turn=0;turn<4;turn++)for(const flip of [false,true]){
  const transformed=source.map(([a,b]):Point=>{let x=a,y=b;for(let t=0;t<turn;t++)[x,y]=[4-y,x];return [flip?4-x:x,y];});
  if(key(p)===key(transformed))return true;
 }
 return false;
}
export function polygonArea(p:Point[]) {return Math.abs(p.reduce((a,v,i)=>a+v[0]*p[(i+1)%p.length][1]-v[1]*p[(i+1)%p.length][0],0))/2;}
function validPolygon(p:Point[]) {
 if(new Set(p.map(v=>v.join(','))).size!==p.length||polygonArea(p)===0)return false;
 const signs=p.map((v,i)=>{const a=p[(i+1)%p.length],b=p[(i+2)%p.length];return Math.sign((a[0]-v[0])*(b[1]-a[1])-(a[1]-v[1])*(b[0]-a[0]));});
 return signs.every(s=>s===signs[0]&&s!==0);
}
export function insidePolygon(p:Point[],x:number,y:number) {let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c;return c;}
/** Four interior triangle samples per unit square; all tangram edges lie on this exact lattice. */
export function pieceMask(polygons:Point[][]):number[] {
 const out:number[]=[];
 for(let y=0;y<4;y++)for(let x=0;x<4;x++)for(const [dx,dy] of [[.5,1/6],[5/6,.5],[.5,5/6],[1/6,.5]])out.push(polygons.filter(p=>insidePolygon(p,x+dx,y+dy)).length);
 return out;
}
export function reflectObjects(objects:SceneObject[],axis:'vertical'|'horizontal'):SceneObject[] {
 return objects.map(o=>({...o,x:axis==='vertical'?100-o.x:o.x,y:axis==='horizontal'?100-o.y:o.y,turn:((axis==='vertical'?-o.turn:2-o.turn)+4)%4,flipped:!o.flipped}));
}
export function unfoldHoles(size:number,folds:('x'|'y')[],holes:Point[]):Point[] {
 let result=holes.map(p=>[...p] as Point);
 for(const axis of [...folds].reverse())result=[...result,...result.map(([x,y])=>[axis==='x'?size-1-x:x,axis==='y'?size-1-y:y] as Point)];
 return result.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}
const ops = ['union','intersection','xor'] as const;
type Op = typeof ops[number];
const operate = (a:number,b:number,op:Op) => op==='union'?a|b:op==='intersection'?a&b:a^b;
export function inferRaven(b:Extract<VisualBoard,{mechanic:'raven-relation'}>):Op|number {
 const c=b.cards as {mask:number;turn:number}[];
 if(b.side===2){if(c.slice(0,3).some(v=>v.mask!==c[0].mask)||!(c[0].mask&64))throw Error('RAVEN_ROTATION_EVIDENCE');return (c[1].turn-c[0].turn+4)%4;}
 if(c.slice(0,8).some(v=>v.turn!==0))throw Error('RAVEN_FLAT_MARKS');
 const candidates=ops.filter(op=>[[0,1,2],[3,4,5],[0,3,6],[1,4,7]].every(([a,b,r])=>operate(c[a].mask,c[b].mask,op)===c[r].mask));
 if(candidates.length!==1)throw Error('RAVEN_AMBIGUOUS_RULE');return candidates[0];
}
export function latinCompletions(side:number,cells:(number|null)[]):number[][] {
 const out:number[][]=[];let a=[...cells];
 const visit=()=>{const i=a.indexOf(null);if(i<0){out.push(a as number[]);return;}const row=Math.floor(i/side),col=i%side;
 for(let v=0;v<side;v++){if(a.some((x,j)=>x===v&&(Math.floor(j/side)===row||j%side===col)))continue;const previous=a;a=[...a];a[i]=v;visit();a=previous;}
 };
 // Check every given, even when no blanks remain.
 for(let i=0;i<a.length;i++)if(a[i]!==null&&a.some((v,j)=>j!==i&&v===a[i]&&(Math.floor(j/side)===Math.floor(i/side)||j%side===i%side)))return [];
 visit();return out;
}
export function validateVisualBoard(v:unknown):VisualBoard {
 const b=visualBoardSchema.parse(v);
 const scenes=b.mechanic==='scene-difference'?[b.left,b.right]:'objects'in b?[b.objects]:[];
 if(scenes.some(objects=>new Set(objects.map(o=>`${o.x}:${o.y}`)).size!==objects.length))throw Error('OVERLAPPING_SCENE_POSITIONS');
 if(b.mechanic==='fold-punch'){
  if(new Set(b.folds).size!==b.folds.length||new Set(b.holes.map(p=>p.join(','))).size!==b.holes.length||b.holes.some(([x,y])=>x>=(b.folds.includes('x')?b.size/2:b.size)||y>=(b.folds.includes('y')?b.size/2:b.size)))throw Error('FOLDED_PACKET_GEOMETRY');
  if(b.grade===1&&(b.size!==4||b.folds.length!==1||b.holes.length!==1)||b.grade===2&&b.holes.length>2)throw Error('GRADE_FOLD_LOAD');
 }else if(b.mechanic==='seven-piece'){
  if(b.pieces.some(p=>!standardPolygon(p))||pieceMask(b.pieces).some(n=>n>1)||b.grade===1&&b.pieces.length!==6)throw Error('TANGRAM_GEOMETRY');
  // Every given piece is one of the seven standard sizes/shapes, up to square symmetry.
  const area=b.pieces.reduce((a,p)=>a+polygonArea(p),0);if(area<8||area>=16)throw Error('TANGRAM_AREA');
 }else if(b.mechanic==='missing-symbol'){
  if(b.cells.length!==b.side*b.side||b.cells[b.query]!==null||b.symbols.length!==b.side||new Set(b.symbols).size!==b.side||b.cells.some(c=>c!==null&&c>=b.side)||b.grade<=2&&b.side!==3||b.cells.filter(c=>c===null).length>(b.grade<=2?1:4)||latinCompletions(b.side,b.cells).length!==1)throw Error('LATIN_UNIQUE_GIVENS');
 }else if(b.mechanic==='raven-relation'){
  if(b.cards.length!==b.side*b.side||b.cards.at(-1)!==null||b.cards.slice(0,-1).some(c=>c===null)||b.grade===1&&b.side!==2)throw Error('RAVEN_GIVENS');inferRaven(b);
 }else if(b.mechanic==='scene-difference'){
  if(b.left.length!==b.right.length||b.left.some((o,i)=>o.x!==b.right[i].x||o.y!==b.right[i].y)||!b.left.some((o,i)=>!same(o,b.right[i])))throw Error('DIFFERENCE_PAIR');
 }else if(b.mechanic==='object-mirror'&&b.grade===1&&b.axis!=='vertical')throw Error('GRADE_MIRROR');
 return b;
}
export function solveVisualBoard(value:unknown,choices:VisualValue[]=[]):VisualValue {
 const b=validateVisualBoard(value);
 switch(b.mechanic){
 case 'object-shadow':return {lab:'scene',objects:b.objects.map(o=>({...o,color:0})),silhouette:true};
 case 'object-mirror':return {lab:'scene',objects:reflectObjects(b.objects,b.axis),silhouette:false};
 case 'scene-difference':return {textNumber:b.left.filter((o,i)=>!same(o,b.right[i])).length};
 case 'fold-punch':return {lab:'holes',size:b.size,holes:unfoldHoles(b.size,b.folds,b.holes)};
 case 'seven-piece':{const given=pieceMask(b.pieces),matches=choices.filter(v=>'lab'in v&&v.lab==='pieces'&&pieceMask(v.polygons).every((n,i)=>n+given[i]===1));if(matches.length!==1)throw Error('TANGRAM_UNIQUE_COMPLEMENT');return matches[0];}
 case 'missing-symbol':return {lab:'symbol',symbol:b.symbols[latinCompletions(b.side,b.cells)[0][b.query]]};
 case 'raven-relation':{const c=b.cards as {mask:number;turn:number}[],r=inferRaven(b);if(typeof r==='number')return {lab:'marks',mask:c[2].mask,turn:(c[2].turn+r)%4};const a=operate(c[6].mask,c[7].mask,r),vertical=operate(c[2].mask,c[5].mask,r);if(a!==vertical||a===0)throw Error('RAVEN_TWO_WAY_PROOF');return {lab:'marks',mask:a,turn:0};}
 case 'cube-evidence':return solveCube(b.cube);
 }
}
const TITLES:Record<VisualMechanic,string>={'object-shadow':'Gerçek nesnelerin gölgeleri','scene-difference':'Resimdeki ayrıntıları karşılaştır','object-mirror':'Nesnelerin ayna görüntüsü','fold-punch':'Katla, del ve aç','seven-piece':'Yedi parçalı tangram','missing-symbol':'Eksik sembolü bul','raven-relation':'İki yönden matris ilişkisi','cube-evidence':'Küp yapısında görünür kanıt'};
const PROMPTS:Record<Exclude<VisualMechanic,'cube-evidence'>,string>={
 'object-shadow':'Nesnelerin yönünü ve yerini değiştirme. Renkleri yok saydığında hangi gölge oluşur?',
 'scene-difference':'İki resimde aynı yerde duran nesneleri karşılaştır. Kaç nesnenin bir ayrıntısı değişmiş?',
 'object-mirror':'İşaretli ayna çizgisine göre bütün resmin yansıması hangisidir? Nesnelerin yerini ve yönünü birlikte izle.',
 'fold-punch':'Sağ yarı sola, alt yarı üste katlanır. Gösterilen sırada katlanan kâğıt işaretli hücrelerden deliniyor. Tam açılmış hâli hangisi?',
 'seven-piece':'Standart yedi parçalı tangramın boş kısmını tamamla. Seçenekteki parçaların yönünü ve yerini değiştirme; boşluk ve örtüşme bırakma.',
 'missing-symbol':'Her satırda ve sütunda her sembol yalnız bir kez bulunur. Soru işaretinin yerine hangi sembol gelir?',
 'raven-relation':'Tamamlanmış örneklerdeki aynı ilişkiyi izle. Eksik şekli hem satır hem sütun düzenine göre seç.',
};
export function generateVisualQuestion(m:VisualMechanic,seed:number,d:DifficultyLevel,g:SchoolGrade):BaseQuestion {
 if(!visualAllowed(m,g,d)||!Number.isSafeInteger(seed)||seed<1)throw Error('INVALID_VISUAL_LAB_INPUT');
 const rng=new SeededRNG(seed),base={displayMode:'visual_lab' as const,grade:g};
 const positions:Point[]=[[25,25],[75,25],[25,75],[75,75]];
 const objects=(count:number)=>rng.pickUnique(positions,count).map(([x,y],i):SceneObject=>({x,y,kind:rng.pick(OBJECT_KINDS),detail:rng.nextInt(0,2),turn:g===1?0:rng.nextInt(0,3),flipped:rng.nextBool(),color:i%5}));
 let board:VisualBoard,answer:VisualValue|undefined,cubePrior:BaseQuestion|undefined;
 if(m==='object-shadow'||m==='object-mirror'){
  const o=objects(g===1?2:g===2?3:4);board=m==='object-shadow'?{...base,mechanic:m,objects:o}:{...base,mechanic:m,objects:o,axis:g===1?'vertical':rng.pick(['vertical','horizontal'] as const)};
 }else if(m==='scene-difference'){
  const left=objects(g===1?3:4),changed=rng.pickUnique(left.map((_,i)=>i),Math.min(g===1?2:3,d)),right=left.map((o,i)=>({...o,...(changed.includes(i)?{detail:(o.detail+1)%3}:{})}));board={...base,mechanic:m,left,right};
 }else if(m==='fold-punch'){
  const size=g===1?4:g===2?6:8,folds:('x'|'y')[]=g===1||d===1?[rng.pick(['x','y'] as const)]:rng.shuffle(['x','y'] as ('x'|'y')[]);
  const cells:Point[]=[];for(let y=0;y<(folds.includes('y')?size/2:size);y++)for(let x=0;x<(folds.includes('x')?size/2:size);x++)cells.push([x,y]);
  board={...base,mechanic:m,size,folds,holes:rng.pickUnique(cells,g===1?1:Math.min(g===2?2:3,Math.ceil(d/2)))};
 }else if(m==='seven-piece'){
  const turns=rng.nextInt(0,3),flip=rng.nextBool(),transform=(p:Point[]):Point[]=>p.map(([a,b])=>{let x=a,y=b;for(let i=0;i<turns;i++)[x,y]=[4-y,x];return [flip?4-x:x,y];});
  const pieces=TANGRAM_SEVEN.map(transform),missing=rng.pickUnique(pieces.map((_,i)=>i),g>=3&&d>=3?2:1);board={...base,mechanic:m,pieces:pieces.filter((_,i)=>!missing.includes(i))};answer={lab:'pieces',polygons:missing.map(i=>pieces[i])};
 }else if(m==='missing-symbol'){
  const side=g<=2?3:4,rows=rng.shuffle(Array.from({length:side},(_,i)=>i)),cols=rng.shuffle([...rows]),symbols=rng.pickUnique([0,1,2,3,4,5],side),cells:(number|null)[]=rows.flatMap(r=>cols.map(c=>(r+c)%side)),query=rng.nextInt(0,cells.length-1);cells[query]=null;
  for(const i of rng.shuffle(cells.map((_,i)=>i))){if(cells.filter(c=>c===null).length>=Math.min(g<=2?1:d,4))break;const old=cells[i];cells[i]=null;if(latinCompletions(side,cells).length!==1)cells[i]=old;}
  board={...base,mechanic:m,side,cells,query,symbols};
 }else if(m==='raven-relation'){
  if(g===1){const mask=rng.pickUnique([1,2,4,8,16,32],d===1?1:2).reduce((a,v)=>a|v,64),step=rng.pick([1,2,3]),a=rng.nextInt(0,3),c=rng.nextInt(0,3);board={...base,mechanic:m,side:2,cards:[{mask,turn:a},{mask,turn:(a+step)%4},{mask,turn:c},null]};}
  else {let found:VisualBoard|undefined;for(let attempt=0;attempt<300;attempt++){const active=rng.pickUnique([1,2,4,8,16,32,64,128],g===2?3:g===3?4:5),makeMask=()=>rng.pickUnique(active,rng.nextInt(1,active.length)).reduce((a,v)=>a|v,0),op=d===1?'union':rng.pick(ops),a=makeMask(),b=makeMask(),c=makeMask(),e=makeMask(),raw=[a,b,operate(a,b,op),c,e,operate(c,e,op),operate(a,c,op),operate(b,e,op)],last=operate(raw[6],raw[7],op);if(raw.includes(0)||last===0)continue;const candidate={...base,mechanic:m,side:3 as const,cards:[...raw.map(mask=>({mask,turn:0})),null]};try{validateVisualBoard(candidate);found=candidate;break;}catch{}}
   if(!found)throw Error('RAVEN_GENERATION_LIMIT');board=found;
  }
 }else{
  const eligible=CUBE_MECHANICS.filter(m=>['total','layer-count','complete-block'].includes(m)&&cubeAllowed(m,g,d)),mechanic=rng.pick(eligible);cubePrior=generateCubeQuestion(mechanic,seed,d,g);board={...base,mechanic:'cube-evidence',cube:cubePrior.visualConfig as CubeBoard};
 }
 validateVisualBoard(board);if(!answer)answer=solveVisualBoard(board);
 const choices:VisualValue[]=[answer];
 const add=(v:VisualValue)=>{if(validVisualValue(v)&&!choices.some(c=>visualValueKey(c)===visualValueKey(v)))choices.push(v);};
 if(cubePrior&&board.mechanic==='cube-evidence'){
  const c=board.cube;
  if(c.mechanic!=='net-opposite'){
   const total=c.heights.reduce((a,h)=>a+h,0),columns=c.heights.filter(Boolean).length;
   const misconceptions=c.mechanic==='total'?[columns,Math.max(...c.heights),total-columns]:c.mechanic==='layer-count'?[columns,total,c.heights.filter(h=>h>c.layer).length]:c.mechanic==='complete-block'?[c.targetHeight*columns-total,total,c.size*c.size*c.targetHeight]:[];
   for(const textNumber of misconceptions)if(textNumber>=0)add({textNumber});
  }
  for(const o of cubePrior.options)add(o.visualData as VisualValue);
 }
 else if('textNumber'in answer)for(const value of rng.shuffle([0,1,2,3,4]))add({textNumber:value});
 else if('lab'in answer&&answer.lab==='scene'){
  // Preserve the object count, colours and identities; change visible geometry only.
  for(const i of rng.shuffle(answer.objects.map((_,i)=>i))){add({...answer,objects:answer.objects.map((o,j)=>i===j?{...o,detail:(o.detail+1)%3}:o)});add({...answer,objects:answer.objects.map((o,j)=>i===j?{...o,flipped:!o.flipped}:o)});}
  add({...answer,objects:reflectObjects(answer.objects,'vertical')});add({...answer,objects:reflectObjects(answer.objects,'horizontal')});
 }else if('lab'in answer&&answer.lab==='holes'){
  const transforms:Point[][]=[answer.holes.map(([x,y])=>[answer.size-1-y,x]),answer.holes.map(([x,y])=>[(x+1)%answer.size,y]),answer.holes.map(([x,y])=>[x,(y+1)%answer.size])];for(const holes of transforms)add({...answer,holes});
  for(let i=0;i<answer.holes.length;i++)for(const delta of [1,2])add({...answer,holes:answer.holes.map(([x,y],j)=>i===j?[(x+delta)%answer.size,y]:[x,y])});
 }else if('lab'in answer&&answer.lab==='pieces'){
  for(let t=1;t<4;t++)add({...answer,polygons:answer.polygons.map(p=>p.map(([a,b])=>{let x=a,y=b;for(let i=0;i<t;i++)[x,y]=[4-y,x];return [x,y];}))});
  for(const axis of [0,1])add({...answer,polygons:answer.polygons.map(p=>p.map(([x,y])=>[axis===0?4-x:x,axis===1?4-y:y]))});
 }else if('lab'in answer&&answer.lab==='symbol')for(const symbol of rng.shuffle([0,1,2,3,4,5]))add({lab:'symbol',symbol});
 else if('lab'in answer&&answer.lab==='marks'){
  if(board.mechanic==='raven-relation'&&board.side===2)for(let turn=0;turn<4;turn++)add({...answer,turn});
  else {const bits=rng.shuffle(Array.from({length:8},(_,i)=>i));for(const a of bits)for(const b of bits)if(a!==b&&Boolean(answer.mask&(1<<a))!==Boolean(answer.mask&(1<<b)))add({...answer,mask:answer.mask^(1<<a)^(1<<b)});for(const bit of bits)if((answer.mask^(1<<bit))>0)add({...answer,mask:answer.mask^(1<<bit)});}
 }
 if(choices.length<4)throw Error('VISUAL_DISTRACTOR_LIMIT');
 const selected=choices.slice(0,4),proved=solveVisualBoard(board,selected);if(visualValueKey(proved)!==visualValueKey(answer))throw Error('VISUAL_ANSWER_PROOF');
 const options=rng.shuffle(selected).map((visualData,i)=>({id:'ABCD'[i],label:'ABCD'[i],visualData,fingerprint:fp(visualData)}));
 const correct=options.filter(o=>visualValueKey(o.visualData)===visualValueKey(answer));if(correct.length!==1)throw Error('VISUAL_SINGLE_ANSWER');
 const type=visualTopic(m,g,board.mechanic==='cube-evidence'?board.cube:undefined);if(!topicAllowedForGrade(type,g))throw Error('VISUAL_GRADE_TOPIC');
 let prompt=cubePrior?.prompt??PROMPTS[m as Exclude<VisualMechanic,'cube-evidence'>];
 if(board.mechanic==='raven-relation'&&board.side===2)prompt='Üst sıradaki dönüşü alt sıraya da uygula. Saat yönünde döndürülünce eksik şekil hangisi olur?';
 if(board.mechanic==='fold-punch')prompt=`${board.folds.map(a=>a==='x'?'Sağ yarıyı sola katla.':'Alt yarıyı üste katla.').join(' ')} Katlı kâğıttaki işaretli hücreler deliniyor. Tam açılmış kâğıt hangisi?`;
 const steps=cubePrior?.explanation.steps??(m==='seven-piece'?['Dış çerçeve ve görünen parçalar boşluğun bütün sınırlarını belirler.','Seçilen parçaların toplamı boşluğu tam kapatmalı; üst üste binen veya dışarı taşan parça olamaz.']:m==='fold-punch'?['Son katlamadan başlayarak her deliği kat çizgisinin karşısına yansıt.','Deliklerin sayısını, satırlarını ve sütunlarını birlikte kontrol et.']:m==='raven-relation'?['Tamamlanmış örneklerde her çizgi ve işaretin değişimini ayrı izle.','Aynı ilişkiyi eksik yere uygula; üçlü matriste satır ve sütun sonuçları aynı olmalı.']:m==='scene-difference'?['Aynı konumdaki nesneleri birer birer karşılaştır.','Bir nesnedeki değişimi yalnız bir kez say; rengi, yönü ve dış sınırı kontrol et.']:m==='missing-symbol'?['Satırda ve sütunda kullanılan sembolleri ayrı listele.','Her iki yöndeki eksik sembol aynı olmalı; diğer boşlukları da tutarlı tamamla.']:['Nesnelerin dış sınırını, yerini ve yönünü birlikte takip et.','Aynalamada bütün resim yansır; gölgede renkler değişse de dış sınır aynı kalır.']);
 return {id:`visual-${m}-g${g}-d${d}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],seed,difficulty:d,targetGrade:g,targetGrades:[g],ageGroup:g<=2?'1-2':'3-4',prompt,visualConfig:board,options,correctOptionId:correct[0].id,explanation:{ruleTitle:TITLES[m],summary:steps.join(' '),steps},skills:[m],estimatedSeconds:30+d*10,status:'draft',authoring:{engine:VISUAL_LAB_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==correct[0].id).map(o=>[o.id,'Konum, yön, ayrıntı veya tamamlama koşulundan en az biri sağlanmıyor.']))}};
}
