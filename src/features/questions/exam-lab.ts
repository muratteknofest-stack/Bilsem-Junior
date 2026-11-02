import {z} from 'zod';
import {SeededRNG} from '../../lib/rng';
import type {BaseQuestion,DifficultyLevel,QuestionType} from '../../types';
import {EDUCATION_PROFILES,type SchoolGrade} from './quality-policy';
import {TOPIC_CATEGORY} from './topic-catalog';
import {generateVisualFingerprint as fp} from './fingerprint';

export const EXAM_ENGINE='exam-lab-1';
export const EXAM_MECHANICS=['detail-mirror','context-patch','overlap-rule','transform-pairs','cyclic-matrix','composition-matrix'] as const;
export type ExamMechanic=typeof EXAM_MECHANICS[number];
const n=(min:number,max:number)=>z.number().int().min(min).max(max);
export const examTileSchema=z.object({exam:z.literal('tile'),width:n(1,6),height:n(1,6),cells:z.array(n(0,3)).min(1).max(36)}).strict().refine(v=>v.cells.length===v.width*v.height);
export type ExamTile=z.infer<typeof examTileSchema>;
const tile=examTileSchema;
export const examBoardSchema=z.discriminatedUnion('mechanic',[
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('detail-mirror'),source:tile,axis:z.enum(['vertical','horizontal'])}).strict(),
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('context-patch'),width:n(4,6),height:n(4,6),cells:z.array(n(0,3).nullable()).min(16).max(36),hole:z.object({x:n(0,5),y:n(0,5),width:n(1,2),height:n(1,2)}).strict()}).strict(),
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('overlap-rule'),cards:z.array(tile.nullable()).length(9)}).strict(),
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('transform-pairs'),cards:z.array(tile.nullable()).length(6)}).strict(),
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('cyclic-matrix'),side:n(2,3),cards:z.array(tile.nullable()).min(4).max(9)}).strict(),
 z.object({displayMode:z.literal('exam_lab'),grade:n(1,4),mechanic:z.literal('composition-matrix'),cards:z.array(tile.nullable()).length(9)}).strict(),
]);
export type ExamBoard=z.infer<typeof examBoardSchema>;
export const validExamTile=(v:unknown):v is ExamTile=>examTileSchema.safeParse(v).success;
export function examTopic(m:ExamMechanic,g:number):QuestionType{return m==='detail-mirror'?'mirror_reflection':m==='context-patch'?'figure_completion':m==='overlap-rule'?'shape_combination':m==='transform-pairs'?'visual_analogy':g===1?'matrix_2x2':'matrix_3x3';}
export function examAllowed(m:ExamMechanic,g:SchoolGrade,d:number){return EXAM_MECHANICS.includes(m)&&!!EDUCATION_PROFILES[g]&&Number.isInteger(d)&&d>=1&&d<=EDUCATION_PROFILES[g].maxDifficulty&&!(m==='composition-matrix'&&g===1);}
const same=(a:unknown,b:unknown)=>fp(a)===fp(b);
const make=(width:number,height:number,cells:number[]):ExamTile=>({exam:'tile',width,height,cells});
type Transform='mirror-x'|'mirror-y'|'quarter'|'half';
const transforms:Transform[]=['mirror-x','mirror-y','quarter','half'];
export function transformExamTile(a:ExamTile,t:Transform):ExamTile{
 if(a.width!==a.height)throw Error('SQUARE_REQUIRED');const s=a.width;
 return make(s,s,a.cells.map((_,i)=>{const x=i%s,y=Math.floor(i/s);return a.cells[t==='mirror-x'?y*s+s-1-x:t==='mirror-y'?(s-1-y)*s+x:t==='half'?(s-1-y)*s+s-1-x:(s-1-x)*s+y];}));
}
type Op='union'|'intersection'|'xor';
const ops:Op[]=['union','intersection','xor'];
export function combineExamTiles(a:ExamTile,b:ExamTile,op:Op):ExamTile{
 if(a.width!==b.width||a.height!==b.height||[...a.cells,...b.cells].some(v=>v>1))throw Error('BINARY_GEOMETRY');
 return make(a.width,a.height,a.cells.map((v,i)=>op==='union'?Number(v===1||b.cells[i]===1):op==='intersection'?Number(v===1&&b.cells[i]===1):Number(v!==b.cells[i])));
}
export function validateExamBoard(v:unknown):ExamBoard{
 const b=examBoardSchema.parse(v),g=b.grade;
 if(b.mechanic==='context-patch'){
  if(b.cells.length!==b.width*b.height||b.hole.x+b.hole.width>b.width||b.hole.y+b.hole.height>b.height)throw Error('PATCH_GEOMETRY');
  b.cells.forEach((v,i)=>{const x=i%b.width,y=Math.floor(i/b.width),hidden=x>=b.hole.x&&x<b.hole.x+b.hole.width&&y>=b.hole.y&&y<b.hole.y+b.hole.height;if((v===null)!==hidden)throw Error('PATCH_MASK');});
  if(g===1&&(b.width!==4||b.height!==4||b.hole.width*b.hole.height!==1)||g===2&&b.hole.width*b.hole.height>2)throw Error('GRADE_PATCH_LOAD');
 }else if(b.mechanic==='detail-mirror'){
  if(b.source.width!==b.source.height||b.source.width>(g===1?2:g===2?3:4)||g===1&&b.axis!=='vertical')throw Error('GRADE_MIRROR_LOAD');
 }else{
  if(b.cards.at(-1)!==null||b.cards.slice(0,-1).some(v=>v===null))throw Error('ONLY_LAST_CARD_MISSING');
  const cards=b.cards.slice(0,-1) as ExamTile[],first=cards[0];
  if(first.width!==first.height||cards.some(v=>v.width!==first.width||v.height!==first.height)||first.width>(g<=2?2:3))throw Error('CARD_GEOMETRY');
  if(b.mechanic==='cyclic-matrix'&&(b.cards.length!==b.side**2||b.side!==(g===1?2:3)))throw Error('GRADE_MATRIX_LOAD');
  if(b.mechanic==='composition-matrix'&&g===1)throw Error('GRADE_MATRIX_LOAD');
  if(['overlap-rule','composition-matrix'].includes(b.mechanic)&&cards.some(t=>t.cells.some(v=>v>1)))throw Error('BINARY_REQUIRED');
 }
 return b;
}
function inferOp(cards:Array<ExamTile|null>,matrix:boolean):Op{
 const c=cards as ExamTile[],triples=matrix?[[0,1,2],[3,4,5],[0,3,6],[1,4,7]]:[[0,1,2],[3,4,5]];
 const matches=ops.filter(op=>triples.every(([a,b,r])=>same(combineExamTiles(c[a],c[b],op),c[r])));
 if(matches.length!==1)throw Error('AMBIGUOUS_OPERATION');return matches[0];
}
function patchAnswers(b:Extract<ExamBoard,{mechanic:'context-patch'}>):ExamTile[]{
 const answers:ExamTile[]=[];
 for(const period of [2,3]){
  const groups=new Map<number,number>();let valid=true;
  b.cells.forEach((v,i)=>{if(v===null)return;const k=(Math.floor(i/b.width)%period)*period+i%b.width%period;if(groups.has(k)&&groups.get(k)!==v)valid=false;groups.set(k,v);});
  const values=Array.from({length:b.hole.width*b.hole.height},(_,i)=>groups.get(((b.hole.y+Math.floor(i/b.hole.width))%period)*period+(b.hole.x+i%b.hole.width)%period));
  if(valid&&values.every(v=>v!==undefined)){const a=make(b.hole.width,b.hole.height,values as number[]);if(!answers.some(v=>same(v,a)))answers.push(a);}
 }return answers;
}
export function solveExam(v:unknown):ExamTile{
 const b=validateExamBoard(v);
 if(b.mechanic==='detail-mirror')return transformExamTile(b.source,b.axis==='vertical'?'mirror-x':'mirror-y');
 if(b.mechanic==='context-patch'){const a=patchAnswers(b);if(a.length!==1)throw Error('AMBIGUOUS_PATCH');return a[0];}
 const c=b.cards as ExamTile[];
 if(b.mechanic==='transform-pairs'){
  const ts=transforms.filter(t=>same(transformExamTile(c[0],t),c[1])&&same(transformExamTile(c[2],t),c[3]));
  if(ts.length!==1)throw Error('AMBIGUOUS_TRANSFORM');return transformExamTile(c[4],ts[0]);
 }
 if(b.mechanic==='cyclic-matrix'){
  const s=b.side,keys=c.slice(0,s).map(fp);if(new Set(keys).size!==s)throw Error('REPEATED_MATRIX_CARD');
  for(let r=1;r<s-1;r++)if(!same(c.slice(r*s,r*s+s).map(fp).sort(),[...keys].sort()))throw Error('MATRIX_ROW');
  for(let col=0;col<s-1;col++)if(!same(Array.from({length:s},(_,r)=>fp(c[r*s+col])).sort(),[...keys].sort()))throw Error('MATRIX_COLUMN');
  const last=c.slice(s*(s-1),s*s-1).map(fp),missing=c.slice(0,s).filter(v=>!last.includes(fp(v)));
  if(missing.length!==1||!same([...Array.from({length:s-1},(_,r)=>fp(c[r*s+s-1])),fp(missing[0])].sort(),[...keys].sort()))throw Error('MATRIX_CONFLICT');return missing[0];
 }
 const op=inferOp(b.cards,b.mechanic==='composition-matrix'),answer=combineExamTiles(c[6],c[7],op);
 if(b.mechanic==='composition-matrix'&&!same(answer,combineExamTiles(c[2],c[5],op)))throw Error('MATRIX_CONFLICT');return answer;
}
/** Candidate insertion proves every cell without calling the primary solver. */
export function independentlyMatchesExam(v:unknown,candidate:unknown):candidate is ExamTile{
 try{
  if(!validExamTile(candidate))return false;const b=validateExamBoard(v),a=candidate;
  if(b.mechanic==='detail-mirror')return a.width===b.source.width&&a.height===b.source.height&&b.source.cells.every((n,i)=>{const x=i%b.source.width,y=Math.floor(i/b.source.width);return a.cells[(b.axis==='vertical'?y:b.source.height-1-y)*a.width+(b.axis==='vertical'?a.width-1-x:x)]===n;});
  if(b.mechanic==='context-patch'){
   if(a.width!==b.hole.width||a.height!==b.hole.height)return false;
   const filled=b.cells.map((v,i)=>v??a.cells[(Math.floor(i/b.width)-b.hole.y)*a.width+i%b.width-b.hole.x]);
   return [2,3].some(p=>b.cells.every((v,i)=>v!==null||b.cells.some((known,j)=>known!==null&&i%b.width%p===j%b.width%p&&Math.floor(i/b.width)%p===Math.floor(j/b.width)%p))&&filled.every((n,i)=>filled.every((m,j)=>(i%b.width%p!==j%b.width%p||Math.floor(i/b.width)%p!==Math.floor(j/b.width)%p)||n===m)));
  }
  const c=[...b.cards.slice(0,-1),a] as ExamTile[];
  if(a.width!==c[0].width||a.height!==c[0].height)return false;
  if(b.mechanic==='cyclic-matrix'){
   const s=b.side,keys=c.slice(0,s).map(fp).sort();if(new Set(keys).size!==s)return false;
   return Array.from({length:s},(_,k)=>k).every(k=>same(c.slice(k*s,k*s+s).map(fp).sort(),keys)&&same(Array.from({length:s},(_,r)=>fp(c[r*s+k])).sort(),keys));
  }
  if(b.mechanic==='transform-pairs')return transforms.some(t=>[[0,1],[2,3],[4,5]].every(([x,y])=>{const s=c[x].width;return c[x].cells.every((v,i)=>{const x0=i%s,y0=Math.floor(i/s),dest=t==='mirror-x'?y0*s+s-1-x0:t==='mirror-y'?(s-1-y0)*s+x0:t==='half'?(s-1-y0)*s+s-1-x0:x0*s+s-1-y0;return c[y].cells[dest]===v;});}));
  const triples=b.mechanic==='overlap-rule'?[[0,1,2],[3,4,5],[6,7,8]]:[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]];
  return [0,1,2].some(rule=>triples.every(([x,y,r])=>c[r].cells.every((v,i)=>{const left=c[x].cells[i]===1,right=c[y].cells[i]===1;return v===(rule===0?Number(left||right):rule===1?Number(left&&right):Number(left!==right));})));
 }catch{return false;}
}
const titles:Record<ExamMechanic,string>={'detail-mirror':'Aynadaki ayrıntılar','context-patch':'Desenin eksik parçası','overlap-rule':'Örtüşmenin kuralı','transform-pairs':'Örnekten dönüşüme','cyclic-matrix':'Satır ve sütun dengesi','composition-matrix':'İki yönde şekil işlemi'};
export function generateExamQuestion(m:ExamMechanic,seed:number,d:DifficultyLevel,g:SchoolGrade):BaseQuestion{
 if(!examAllowed(m,g,d)||!Number.isSafeInteger(seed)||seed<1)throw Error('INVALID_EXAM_INPUT');
 const rng=new SeededRNG(seed),base={displayMode:'exam_lab' as const,grade:g};
 let board:ExamBoard|undefined,answer:ExamTile|undefined;
 for(let attempt=0;attempt<300;attempt++){
  const s=g<=2?2:3;
  const random=(binary=false,size=s)=>make(size,size,Array.from({length:size**2},()=>rng.nextInt(0,binary?1:Math.min(3,g+d-1))));
  let b:ExamBoard;
  if(m==='detail-mirror')b={...base,mechanic:m,source:random(false,g===1?2:g===2?3:Math.min(4,2+Math.ceil(d/2))),axis:g===1||d===1?'vertical':rng.pick(['vertical','horizontal'] as const)};
  else if(m==='context-patch'){
   const size=g===4&&d>=4?6:4,period=size===6?3:2,motif=Array.from({length:period**2},()=>rng.nextInt(0,Math.min(3,g))),w=g===1?1:2,h=g<=2?1:2,x=rng.nextInt(0,size-w),y=rng.nextInt(0,size-h);
   b={...base,mechanic:m,width:size,height:size,hole:{x,y,width:w,height:h},cells:Array.from({length:size**2},(_,i)=>i%size>=x&&i%size<x+w&&Math.floor(i/size)>=y&&Math.floor(i/size)<y+h?null:motif[Math.floor(i/size)%period*period+i%size%period])};
  }else if(m==='transform-pairs'){
   const t=g===1?rng.pick(['mirror-x','half'] as const):rng.pick(transforms),a=random(),b1=random(),q=random();b={...base,mechanic:m,cards:[a,transformExamTile(a,t),b1,transformExamTile(b1,t),q,null]};
  }else if(m==='cyclic-matrix'){
   const side=g===1?2:3,tiles=Array.from({length:side},()=>random()),offsets=rng.shuffle(Array.from({length:side},(_,i)=>i));
   b={...base,mechanic:m,side,cards:Array.from({length:side**2},(_,i)=>i===side**2-1?null:tiles[(offsets[Math.floor(i/side)]+i%side)%side])};
  }else{
   const op=g===1?'union':d===1?rng.pick(['union','intersection'] as const):rng.pick(ops),a=random(true),b1=random(true),c=random(true),e=random(true);
   b=m==='overlap-rule'?{...base,mechanic:m,cards:[a,b1,combineExamTiles(a,b1,op),c,e,combineExamTiles(c,e,op),random(true),random(true),null]}:
    {...base,mechanic:m,cards:[a,b1,combineExamTiles(a,b1,op),c,e,combineExamTiles(c,e,op),combineExamTiles(a,c,op),combineExamTiles(b1,e,op),null]};
  }
  try{const solved=solveExam(b);if(m!=='context-patch'&&!solved.cells.some(Boolean)||!independentlyMatchesExam(b,solved))continue;if(m==='detail-mirror'&&same(solved,(b as Extract<ExamBoard,{mechanic:'detail-mirror'}>).source))continue;board=b;answer=solved;break;}catch{/* Reject ambiguous visible examples. */}
 }
 if(!board||!answer)throw Error('NO_UNIQUE_EXAM');const b=board,a=answer;
 const choices:ExamTile[]=[a],add=(v:ExamTile)=>{if(!choices.some(c=>same(c,v))&&!independentlyMatchesExam(b,v))choices.push(v);};
 const positions=rng.shuffle(Array.from({length:a.cells.length},(_,i)=>i));
 for(const pos of positions.slice(0,2))add({...a,cells:a.cells.map((v,i)=>i===pos?(v+1)%(['overlap-rule','composition-matrix'].includes(m)?2:4):v)});
 if(a.cells.length>1)add({...a,cells:a.cells.map((v,i)=>positions.slice(0,2).includes(i)?(v+1)%(['overlap-rule','composition-matrix'].includes(m)?2:4):v)});
 for(let i=0;choices.length<4&&i<40;i++)add({...a,cells:a.cells.map((v,j)=>j===i%a.cells.length?(v+1+Math.floor(i/a.cells.length))%4:v)});
 if(choices.length<4)throw Error('EXAM_CHOICES');
 const options=rng.shuffle(choices.slice(0,4)).map((visualData,i)=>({id:'ABCD'[i],label:'ABCD'[i],visualData,fingerprint:fp(visualData)})),correctOptionId=options.find(o=>same(o.visualData,a))!.id;
 const prompt=m==='detail-mirror'?'Aynanın yönüne göre şeklin yansımasını bul. Renklerin ve parçaların yerlerini birlikte kontrol et.':m==='context-patch'?'Desendeki boşluğa hangi parça uyar? Kenarlardaki renk ve şekil düzenini devam ettir.':m==='transform-pairs'?'İlk iki örnekteki aynı dönüşümü bul. Son şekle de uygulayınca hangi seçenek oluşur?':m==='overlap-rule'?'İlk iki satırda şekillerin nasıl birleştiğini bul. Aynı kuralı son satıra uygula.':'Her satır ve sütundaki düzeni incele. İki yöndeki koşulları da sağlayan eksik kartı bul.';
 const opName=(op:Op)=>op==='union'?'Boyalı bölgeler birleşir.':op==='intersection'?'Yalnız iki şekilde de boyalı olan bölgeler kalır.':'Ortak boyalı bölgeler silinir; yalnız birinde boyalı olan bölgeler kalır.';
 const steps=m==='detail-mirror'?[`Ayna ${b.mechanic==='detail-mirror'&&b.axis==='vertical'?'sağ ile solu':'üst ile altı'} yer değiştirir.`, 'Her renkli bölgeyi karşı tarafta aynı uzaklıkta kontrol et.']:m==='context-patch'?['Boşluğun çevresinde tekrar eden renk ve konum düzenini bul.','Parçayı boşluğa yerleştir; tekrar eden bütün bölgelerle eşleştiğini kontrol et.']:m==='overlap-rule'||m==='composition-matrix'?[opName(inferOp((b as Extract<ExamBoard,{cards:unknown}>).cards,m==='composition-matrix')),'Bulduğun kuralı bütün hücrelere uygula; örnek satırları ve varsa sütunları da kontrol et.']:m==='transform-pairs'?['İki örnekte de renkler ve parçalar aynı biçimde yansır veya döner.','Son şekle aynı dönüşümü uygula; bir parçanın bile farklı yerde olmamasına dikkat et.']:['Her satırda ve sütunda aynı kartlar birer kez bulunur.','Eksik kartı hem son satırdan hem son sütundan kontrol et.'];
 return {id:`${EXAM_ENGINE}-${m}-g${g}-d${d}-s${seed}`,version:1,type:examTopic(m,g),category:TOPIC_CATEGORY[examTopic(m,g)],seed,difficulty:d,targetGrade:g,targetGrades:[g],ageGroup:g<=2?'1-2':'3-4',prompt,visualConfig:b,options,correctOptionId,explanation:{ruleTitle:titles[m],summary:steps.join(' '),steps},skills:[m],estimatedSeconds:30+d*12,status:'draft',authoring:{engine:EXAM_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==correctOptionId).map(o=>[o.id,`${o.visualData.cells.map((v,i)=>v!==a.cells[i]?i+1:0).filter(Boolean).join(', ')}. bölge konum veya renk koşulunu sağlamıyor.`]))}};
}
