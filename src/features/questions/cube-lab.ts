import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export const CUBE_ENGINE = 'cube-lab-1';
export const CUBE_MECHANICS = ['total','layer-count','complete-block','front-view','right-view','top-view','rotated-top','net-opposite'] as const;
export type CubeMechanic = typeof CUBE_MECHANICS[number];
export const CUBE_TOPICS: Record<CubeMechanic, QuestionType> = { total:'cube_counting','layer-count':'cube_counting','complete-block':'cube_counting','front-view':'multiview_perspective','right-view':'multiview_perspective','top-view':'top_view','rotated-top':'top_view','net-opposite':'dice_unfold' };
export const CUBE_TITLES: Record<CubeMechanic,string> = {total:'Bütün küpleri say','layer-count':'Katmanı incele','complete-block':'Yapıyı tamamla','front-view':'Önden görünüş','right-view':'Sağdan görünüş','top-view':'Üstten görünüş','rotated-top':'Yapıyı döndür','net-opposite':'Küpü zihninde katla'};
const integer = (a:number,b:number)=>z.number().int().min(a).max(b);
const common={displayMode:z.literal('cube_lab'),grade:integer(1,4)};
const stack={...common,size:integer(2,4),heights:z.array(integer(0,4)).min(4).max(16)};
export const cubeBoardSchema=z.discriminatedUnion('mechanic',[
 z.object({...stack,mechanic:z.literal('total')}).strict(),
 z.object({...stack,mechanic:z.literal('layer-count'),layer:integer(2,4)}).strict(),
 z.object({...stack,mechanic:z.literal('complete-block'),targetHeight:integer(2,4)}).strict(),
 z.object({...stack,mechanic:z.literal('front-view')}).strict(),
 z.object({...stack,mechanic:z.literal('right-view')}).strict(),
 z.object({...stack,mechanic:z.literal('top-view')}).strict(),
 z.object({...stack,mechanic:z.literal('rotated-top'),turns:integer(1,3)}).strict(),
 z.object({...common,mechanic:z.literal('net-opposite'),faces:z.array(z.object({x:integer(0,4),y:integer(0,4),label:integer(1,6)}).strict()).length(6),target:integer(1,6)}).strict(),
]);
export type CubeBoard=z.infer<typeof cubeBoardSchema>;
export type StackBoard=Exclude<CubeBoard,{mechanic:'net-opposite'}>;
export const cubeValueSchema=z.union([z.object({textNumber:integer(0,100)}).strict(),z.object({cubeView:z.literal(true),width:integer(2,4),height:integer(1,4),cells:z.array(integer(0,1)).min(2).max(16)}).strict()]);
export type CubeValue=z.infer<typeof cubeValueSchema>;
export function validCubeValue(v:unknown):v is CubeValue {const p=cubeValueSchema.safeParse(v);return p.success&&('textNumber'in p.data||p.data.cells.length===p.data.width*p.data.height);}
type Vec=[number,number,number];type Frame={u:Vec;v:Vec;n:Vec};
const neg=(v:Vec)=>v.map(n=>-n) as Vec;
/** Fold each shared edge by exactly 90 degrees; overlapping/cyclic nets fail. */
export function foldCubeNet(faces:Extract<CubeBoard,{mechanic:'net-opposite'}>['faces']):Map<number,Vec>{
 if(faces.length!==6||new Set(faces.map(f=>`${f.x}:${f.y}`)).size!==6||new Set(faces.map(f=>f.label)).size!==6)throw Error('INVALID_CUBE_NET');
 const frames=new Map<number,Frame>([[0,{u:[1,0,0],v:[0,1,0],n:[0,0,1]}]]),queue=[0];
 for(const i of queue){const f=faces[i],{u,v,n}=frames.get(i)!;
  for(const [dx,dy,frame] of [[1,0,{u:neg(n),v,n:u}],[-1,0,{u:n,v,n:neg(u)}],[0,1,{u,v:neg(n),n:v}],[0,-1,{u,v:n,n:neg(v)}]] as Array<[number,number,Frame]>){
   const j=faces.findIndex(c=>c.x===f.x+dx&&c.y===f.y+dy);if(j<0)continue;
   if(frames.has(j)){if(fingerprint(frames.get(j))!==fingerprint(frame))throw Error('CYCLIC_CUBE_NET');}else{frames.set(j,frame);queue.push(j);}
  }
 }
 if(frames.size!==6||new Set([...frames.values()].map(f=>f.n.join(','))).size!==6)throw Error('OVERLAPPING_CUBE_NET');
 return new Map([...frames].map(([i,f])=>[faces[i].label,f.n]));
}
/** All eleven free cube nets, up to plane rotation/reflection. */
export const CUBE_NETS:number[][][]=[[[0,0],[0,1],[0,2],[1,1],[2,1],[3,1]],[[0,0],[0,1],[0,2],[1,2],[1,3],[1,4]],[[0,0],[0,1],[1,1],[1,2],[1,3],[2,1]],[[0,0],[0,1],[1,1],[1,2],[1,3],[2,2]],[[0,0],[0,1],[1,1],[1,2],[1,3],[2,3]],[[0,0],[0,1],[1,1],[1,2],[2,1],[3,1]],[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],[[0,0],[0,1],[1,1],[2,1],[2,2],[3,1]],[[0,0],[0,1],[1,1],[2,1],[3,1],[3,2]],[[0,1],[1,0],[1,1],[1,2],[1,3],[2,1]],[[0,1],[1,0],[1,1],[1,2],[1,3],[2,2]]];
export function cubeAllowed(m:CubeMechanic,g:SchoolGrade,d:number):boolean {
 if(d>4)return false;
 if(!CUBE_MECHANICS.includes(m)||!EDUCATION_PROFILES[g]||!Number.isInteger(d)||d<1||d>EDUCATION_PROFILES[g].maxDifficulty)return false;
 if(g===1)return d<=2&&['total','front-view','top-view',...(d===2?['layer-count']:[])].includes(m);
 if(['complete-block','rotated-top','net-opposite'].includes(m))return d>=2;
 return m!=='layer-count'||d>=2;
}
export function validateCubeBoard(value:unknown):CubeBoard {
 const b=cubeBoardSchema.parse(value);
 if(b.mechanic==='net-opposite'){if(b.grade===1)throw Error('GRADE_CUBE_NET');foldCubeNet(b.faces);return b;}
 const maxHeight=b.grade===1?2:b.grade===2?3:4;
 if(b.heights.length!==b.size*b.size||b.heights.every(h=>!h)||b.heights.some(h=>h>maxHeight)||b.heights.reduce((a,h)=>a+h,0)>EDUCATION_PROFILES[b.grade as SchoolGrade].maxItems||b.size>(b.grade<=2?3:4)||b.grade===1&&b.size!==2)throw Error('CUBE_LOAD');
 const occupied=b.heights.map((h,i)=>h?i:-1).filter(i=>i>=0),seen=new Set([occupied[0]]),q=[occupied[0]];
 for(const i of q)for(const j of occupied)if(!seen.has(j)&&Math.abs(i%b.size-j%b.size)+Math.abs(Math.floor(i/b.size)-Math.floor(j/b.size))===1){seen.add(j);q.push(j);}
 if(seen.size!==occupied.length)throw Error('DISCONNECTED_CUBES');
 if(b.mechanic==='layer-count'&&(b.layer>Math.max(...b.heights)||b.heights.every(h=>h>=b.layer)))throw Error('TRIVIAL_CUBE_LAYER');
 if(b.mechanic==='complete-block'&&(b.targetHeight<Math.max(...b.heights)||b.heights.every(h=>h===b.targetHeight)))throw Error('INVALID_COMPLETION');
 return b;
}
export function solveCube(value:unknown):CubeValue {
 const b=validateCubeBoard(value);
 if(b.mechanic==='net-opposite'){const normals=foldCubeNet(b.faces),n=normals.get(b.target)!;return {textNumber:[...normals].find(([,v])=>v.every((k,i)=>k===-n[i]))![0]};}
 if(b.mechanic==='total')return {textNumber:b.heights.reduce((a,h)=>a+h,0)};
 if(b.mechanic==='layer-count')return {textNumber:b.heights.filter(h=>h>=b.layer).length};
 if(b.mechanic==='complete-block')return {textNumber:b.size*b.size*b.targetHeight-b.heights.reduce((a,h)=>a+h,0)};
 const height=b.mechanic==='front-view'||b.mechanic==='right-view'?Math.max(...b.heights):b.size;
 const cells=Array.from({length:b.size*height},()=>0);
 if(b.mechanic==='front-view'||b.mechanic==='right-view'){
  for(let x=0;x<b.size;x++){const h=Math.max(...b.heights.filter((_,i)=>b.mechanic==='front-view'?i%b.size===x:Math.floor(i/b.size)===b.size-1-x));for(let z=0;z<h;z++)cells[(height-1-z)*b.size+x]=1;}
 }else for(let i=0;i<b.heights.length;i++)if(b.heights[i]){let x=i%b.size,y=Math.floor(i/b.size);for(let t=0;t<(b.mechanic==='rotated-top'?b.turns:0);t++)[x,y]=[b.size-1-y,x];cells[y*b.size+x]=1;}
 return {cubeView:true,width:b.size,height,cells};
}
function instructions(b:CubeBoard):{prompt:string;steps:string[]}{
 const title='Küpler zeminden başlayarak boşluksuz dizilidir. Plan her sütunun yüksekliğini gösterir.';
 if(b.mechanic==='net-opposite')return {prompt:`Açılım kesilmeden katlanıp küp oluyor. ${b.target} numaralı yüzün karşısında hangi numaralı yüz bulunur?`,steps:['Ortak kenarlar boyunca yüzleri 90 derece katla.','Karşılıklı yüzlerin dış yönleri birbirine terstir; komşu yüzleri ele.']};
 const prompts:Record<StackBoard['mechanic'],string>={total:'Örtünenler dâhil yapıda toplam kaç birim küp var?','layer-count':`Zeminden ${b.mechanic==='layer-count'?b.layer:2}. katmanda kaç küp var?`,'complete-block':`Tabanın tamamını ${b.mechanic==='complete-block'?b.targetHeight:2} kat yüksekliğinde doldurmak için kaç küp eklenmeli?`,'front-view':'ÖN okunun gösterdiği yönden tam karşıdan bakıldığında hangi görünüş oluşur?','right-view':'SAĞ okunun gösterdiği yönden tam karşıdan bakıldığında hangi görünüş oluşur?','top-view':'Yapıya tam tepeden bakıldığında hangi taban hücreleri dolu görünür?','rotated-top':`Yapı tepeden bakıldığında saat yönünde ${b.mechanic==='rotated-top'?b.turns:1} çeyrek tur döndürülüyor. Yeni üst görünüş hangisi?`};
 const steps:Record<StackBoard['mechanic'],string[]>={total:['Sütun yüksekliklerini topla.','Aynı toplamı her katmandaki küpleri ayrı sayıp toplayarak kontrol et.'],'layer-count':['İstenen katmana ulaşan her sütun bir küp verir.','Daha kısa sütunları sayma; daha uzun bir sütun da bu katmanda yalnız bir küp verir.'],'complete-block':['Dolu bloğun hacmi: taban hücre sayısı × hedef yükseklik.','Mevcut küp sayısını bu hacimden çıkar; boş sütunları da tamamla.'],'front-view':['Her plan sütunundaki en yüksek kuleyi bul.','Alt sıradan bu yüksekliğe kadar doldur; arkadaki aynı hizalı küpleri yeniden sayma.'],'right-view':['Sağdan bakarken planın alt satırı solda, üst satırı sağda görünür.','Her satırdaki en yüksek kuleyi bu sırayla çiz.'],'top-view':['Yüksekliği sıfır olmayan her taban hücresini doldur.','Üst görünüşte yüksekliği değil, sütunun yerini göster.'],'rotated-top':['Her dolu taban hücresini kare merkezinin çevresinde döndür.','Adet ve dolu hücre sayısı değişmez; ayna görüntüsünü ele.']};
 return {prompt:`${title} ${prompts[b.mechanic]}`,steps:steps[b.mechanic]};
}
export function generateCubeQuestion(m:CubeMechanic,seed:number,d:DifficultyLevel,g:SchoolGrade):BaseQuestion {
 if(!cubeAllowed(m,g,d)||!Number.isSafeInteger(seed)||seed<1)throw Error('INVALID_CUBE_INPUT');
 const rng=new SeededRNG(seed);let b:CubeBoard|undefined;
 if(m==='net-opposite'){
  const shape=rng.pick(CUBE_NETS),labels=rng.shuffle([1,2,3,4,5,6]),turns=rng.nextInt(0,3),mirror=rng.nextBool();
  const coords=shape.map(([a,c])=>{let x=a,y=c;for(let t=0;t<turns;t++)[x,y]=[-y,x];return [mirror?-x:x,y];});
  const minX=Math.min(...coords.map(c=>c[0])),minY=Math.min(...coords.map(c=>c[1]));
  b={displayMode:'cube_lab',mechanic:m,grade:g,faces:coords.map(([x,y],i)=>({x:x-minX,y:y-minY,label:labels[i]})),target:rng.pick(labels)};
 }else{
  const size=g===1?2:g===2?3:g===3?d<=2?3:4:d<=2?3:4;
  const cap=Math.max(2,g===1?2:g===2?Math.min(3,d):Math.min(4,d+1)),maxTotal=g===1&&d===1?4:g===2&&d===1?10:EDUCATION_PROFILES[g].maxItems;
  for(let attempt=0;attempt<300;attempt++){
   const heights=Array.from({length:size*size},()=>0);let cell=rng.nextInt(0,heights.length-1);heights[cell]=1;
   const cubes=rng.nextInt(g===1?1:Math.max(3,size+1),Math.min(maxTotal,size*size*cap-1));
   for(let n=1;n<cubes;n++){
    const possible=heights.map((h,i)=>({h,i})).filter(({h,i})=>h<cap&&(h>0||heights.some((v,j)=>v>0&&Math.abs(i%size-j%size)+Math.abs(Math.floor(i/size)-Math.floor(j/size))===1)));
    if(!possible.length)break;cell=rng.pick(possible).i;heights[cell]++;
   }
   const base={displayMode:'cube_lab' as const,grade:g,size,heights};
   const candidate:CubeBoard=m==='layer-count'?{...base,mechanic:m,layer:rng.nextInt(2,Math.max(2,...heights))}:m==='complete-block'?{...base,mechanic:m,targetHeight:Math.max(2,...heights)}:m==='rotated-top'?{...base,mechanic:m,turns:g===2?1:rng.pick([1,2,3])}:{...base,mechanic:m};
   try{validateCubeBoard(candidate);const answer=solveCube(candidate);if('cells'in answer&&((m==='top-view'||m==='rotated-top')&&answer.cells.every(Boolean)||answer.cells.every(v=>!v)))continue;
    if(m==='rotated-top'&&fingerprint(solveCube({...base,mechanic:'top-view'}))===fingerprint(answer))continue;
    b=candidate;break;
   }catch{/* Unsupported visual loads and uninformative silhouettes are regenerated. */}
  }
 }
 if(!b)throw Error('CUBE_GENERATION_EXHAUSTED');validateCubeBoard(b);
 const answer=solveCube(b),choices:CubeValue[]=[answer],notes=new Map<string,string>();
 const add=(v:CubeValue,note:string)=>{if(validCubeValue(v)&&!choices.some(c=>fingerprint(c)===fingerprint(v))){choices.push(v);notes.set(fingerprint(v),note);}};
 if('textNumber'in answer){
  if(b.mechanic!=='net-opposite'){
   add({textNumber:b.heights.filter(Boolean).length},'Bu seçenek yalnız dolu taban hücrelerini sayar; sütun yüksekliği veya istenen işlem eksik kalır.');
   add({textNumber:b.heights.reduce((a,h)=>a+h,0)},'Bu seçenek bütün yapıyı sayar; sorulan katman veya eksik küp işlemini denetle.');
  }else for(const f of rng.shuffle(b.faces.filter(f=>f.label!==b.target)))add({textNumber:f.label},'Bu yüz hedef yüzün komşusudur; karşı yüz ortak kenar paylaşmaz.');
  for(const delta of rng.shuffle([-1,1,-2,2,3,4]))add({textNumber:answer.textNumber+delta},'Bir katmanı, örtünen küpü veya boş hücreyi atlamış olabilirsin.');
 }else{
  const reversed={...answer,cells:Array.from({length:answer.height},(_,r)=>answer.cells.slice(r*answer.width,(r+1)*answer.width).reverse()).flat()};add(reversed,'Bu seçenek bakış yönünü ters çevirir veya ayna görüntüsü oluşturur.');
  if(b.mechanic!=='net-opposite'&&b.mechanic==='rotated-top')add(solveCube({displayMode:b.displayMode,grade:b.grade,size:b.size,heights:b.heights,mechanic:'top-view'}),'Bu seçenek döndürmeden önceki yerleşimdir.');
  for(const i of rng.shuffle(answer.cells.map((_,i)=>i)))add({...answer,cells:answer.cells.map((v,j)=>j===i?1-v:v)},'Bu seçenek bir dolu hücreyi eksiltir veya görünmeyen bir hücre ekler.');
  if(choices.length<4)add({...answer,cells:answer.cells.map(v=>1-v)},'Dolu ve boş hücreler yer değiştirmiş; görünüşün kapladığı hücreleri denetle.');
 }
 if(choices.length<4)throw Error('CUBE_DISTRACTORS');
 const options=rng.shuffle(choices.slice(0,4)).map((visualData,i)=>({id:'ABCD'[i],label:'ABCD'[i],visualData,fingerprint:fingerprint(visualData)}));
 const {prompt,steps}=instructions(b),type=CUBE_TOPICS[m],correctOptionId=options.find(o=>fingerprint(o.visualData)===fingerprint(answer))!.id;
 return {id:`cube-lab-${m}-g${g}-d${d}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],seed,difficulty:d,targetGrade:g,targetGrades:[g],ageGroup:g<=2?'1-2':'3-4',prompt,visualConfig:b,options,correctOptionId,explanation:{ruleTitle:CUBE_TITLES[m],summary:steps.join(' '),steps},skills:[m],estimatedSeconds:30+d*12,status:'draft',authoring:{engine:CUBE_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==correctOptionId).map(o=>[o.id,notes.get(fingerprint(o.visualData))!]))}};
}
