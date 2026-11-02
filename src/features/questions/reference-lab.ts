import {z} from 'zod';
import {SeededRNG} from '../../lib/rng';
import type{BaseQuestion,DifficultyLevel,QuestionType}from'../../types';
import{EDUCATION_PROFILES,type SchoolGrade}from'./quality-policy';
import{TOPIC_CATEGORY}from'./topic-catalog';
import{generateVisualFingerprint as fp}from'./fingerprint';
export const REFERENCE_ENGINE='reference-lab-1';
export const OBJECT_NAMES={key:'anahtar',lock:'kilit',brush:'fırça',palette:'boya paleti',scissors:'makas',paper:'kâğıt',hammer:'çekiç',nail:'çivi',watering:'sulama kabı',plant:'bitki',spoon:'kaşık',bowl:'kâse'} as const;
export type ObjectId=keyof typeof OBJECT_NAMES;
export const OBJECT_IDS=Object.keys(OBJECT_NAMES) as ObjectId[];
export const TOOL_PAIRS:Array<[ObjectId,ObjectId]>=[['key','lock'],['brush','palette'],['scissors','paper'],['hammer','nail'],['watering','plant'],['spoon','bowl']];
export const REFERENCE_MECHANICS=['semantic-analogy','broken-pattern','paired-memory','number-memory','symbol-code','word-code','texture-patch','parts-union','layered-top'] as const;
export type ReferenceMechanic=typeof REFERENCE_MECHANICS[number];
export const REFERENCE_TOPICS:Record<ReferenceMechanic,QuestionType>={'semantic-analogy':'visual_analogy','broken-pattern':'visual_sequence','paired-memory':'visual_memory','number-memory':'visual_memory','symbol-code':'symbol_coding','word-code':'cryptogram','texture-patch':'figure_completion','parts-union':'shape_combination','layered-top':'top_view'};
export const REFERENCE_TITLES:Record<ReferenceMechanic,string>={'semantic-analogy':'Aynı ilişkiyi kur','broken-pattern':'Örüntü dedektifi','paired-memory':'Eşlerini aklında tut','number-memory':'Sırayı aklında tut','symbol-code':'Görsel şifre','word-code':'Harflerden şifreye','texture-patch':'Eksik desen parçası','parts-union':'Parçalardan bütüne','layered-top':'Tepeden bak'};
const int=(a:number,b:number)=>z.number().int().min(a).max(b),obj=z.enum(OBJECT_IDS as [ObjectId,...ObjectId[]]);
const tile=z.object({size:int(2,4),cells:z.array(int(0,1)).min(4).max(16)}).strict();
const layer=z.object({shape:z.enum(['circle','square','triangle']),color:int(0,5)}).strict();
const common={displayMode:z.literal('reference_lab'),grade:int(1,4)};
export const referenceBoardSchema=z.discriminatedUnion('mechanic',[
 z.object({...common,mechanic:z.literal('semantic-analogy'),examples:z.array(z.tuple([obj,obj])).min(1).max(2),query:obj,reverse:z.boolean()}).strict(),
 z.object({...common,mechanic:z.literal('broken-pattern'),unit:z.array(obj).min(2).max(4),sequence:z.array(obj).min(6).max(12)}).strict(),
 z.object({...common,mechanic:z.literal('paired-memory'),pairs:z.array(z.tuple([obj,obj])).min(3).max(6),query:obj}).strict(),
 z.object({...common,mechanic:z.literal('number-memory'),digits:z.array(int(1,9)).min(3).max(6),position:int(1,6)}).strict(),
 z.object({...common,mechanic:z.literal('symbol-code'),key:z.array(z.tuple([obj,int(1,9)])).min(3).max(6),query:z.array(obj).min(2).max(6)}).strict(),
 z.object({...common,mechanic:z.literal('word-code'),examples:z.array(z.tuple([z.string().regex(/^[A-Zİ]{2,6}$/),z.string().regex(/^[1-9]{2,6}$/)])).min(2).max(4),query:z.string().regex(/^[A-Zİ]{2,6}$/)}).strict(),
 z.object({...common,mechanic:z.literal('texture-patch'),size:int(3,4),motifSize:int(2,3),motif:z.array(int(0,3)).min(4).max(9),cells:z.array(int(0,3).nullable()).min(9).max(16),hole:z.object({x:int(0,3),y:int(0,3),width:int(1,2),height:int(1,2)}).strict()}).strict(),
 z.object({...common,mechanic:z.literal('parts-union'),size:int(2,4),pieces:z.array(tile).min(4).max(6),target:z.array(int(0,1)).min(4).max(16),use:int(2,3)}).strict(),
 z.object({...common,mechanic:z.literal('layered-top'),layers:z.array(layer).min(2).max(4)}).strict(),
]);
export type ReferenceBoard=z.infer<typeof referenceBoardSchema>;
export const referenceValueSchema=z.union([
 z.object({textNumber:z.union([int(0,999999),z.string().regex(/^[1-9]{2,6}$/)])}).strict(),
 z.object({reference:z.literal('object'),id:obj}).strict(),
 z.object({reference:z.literal('patch'),width:int(1,2),height:int(1,2),cells:z.array(int(0,3)).min(1).max(4)}).strict(),
 z.object({reference:z.literal('parts'),pieces:z.array(tile.extend({index:int(1,6)}).strict()).min(2).max(3)}).strict(),
 z.object({reference:z.literal('layers'),layers:z.array(layer).min(2).max(4)}).strict(),
]);
export type ReferenceValue=z.infer<typeof referenceValueSchema>;
export function validReferenceValue(value:unknown):value is ReferenceValue{
 const p=referenceValueSchema.safeParse(value);if(!p.success)return false;const v=p.data;
 if(!('reference'in v))return true;
 if(v.reference==='patch')return v.cells.length===v.width*v.height;
 if(v.reference==='parts')return new Set(v.pieces.map(p=>p.index)).size===v.pieces.length&&v.pieces.every(p=>p.cells.length===p.size*p.size);
 return true;
}
export function referenceAllowed(m:ReferenceMechanic,g:SchoolGrade,d:number){return REFERENCE_MECHANICS.includes(m)&&!!EDUCATION_PROFILES[g]&&Number.isInteger(d)&&d>=1&&d<=Math.min(4,EDUCATION_PROFILES[g].maxDifficulty)&&!(m==='semantic-analogy'&&d>2)&&!(m==='word-code'&&(g===1||d<2));}
export function subsets(n:number,k:number):number[][]{const out:number[][]=[];const visit=(next:number,a:number[])=>{if(a.length===k){out.push(a);return;}for(let i=next;i<n;i++)visit(i+1,[...a,i]);};visit(0,[]);return out;}
function wordMap(b:Extract<ReferenceBoard,{mechanic:'word-code'}>){const map=new Map<string,string>();for(const [word,code]of b.examples){if(word.length!==code.length)throw Error('CODE_LENGTH');for(let i=0;i<word.length;i++){if(map.has(word[i])&&map.get(word[i])!==code[i])throw Error('CONFLICTING_CODE');map.set(word[i],code[i]);}}if(new Set(map.values()).size!==map.size||[...b.query].some(c=>!map.has(c)))throw Error('INCOMPLETE_CODE');return map;}
export function validateReferenceBoard(value:unknown):ReferenceBoard{
 const b=referenceBoardSchema.parse(value);
 if(b.mechanic==='semantic-analogy'){const pairs=b.reverse?TOOL_PAIRS.map(([a,c])=>[c,a]):TOOL_PAIRS;if(b.examples.some(p=>!pairs.some(row=>fp(row)===fp(p)))||!pairs.some(p=>p[0]===b.query)||b.examples.some(p=>p[0]===b.query))throw Error('SEMANTIC_RELATION');}
 if(b.mechanic==='broken-pattern'&&(new Set(b.unit).size!==b.unit.length||b.sequence.length%b.unit.length!==0||b.sequence.some(v=>!b.unit.includes(v))||b.sequence.filter((v,i)=>v!==b.unit[i%b.unit.length]).length!==1))throw Error('PATTERN_AMBIGUITY');
 if(b.mechanic==='paired-memory'&&(new Set(b.pairs.flat()).size!==b.pairs.length*2||!b.pairs.some(p=>p[0]===b.query)))throw Error('MEMORY_PAIR_AMBIGUITY');
 if(b.mechanic==='number-memory'&&(b.position>b.digits.length||new Set(b.digits).size!==b.digits.length))throw Error('MEMORY_POSITION');
 if(b.mechanic==='symbol-code'&&(new Set(b.key.map(p=>p[0])).size!==b.key.length||new Set(b.key.map(p=>p[1])).size!==b.key.length||b.query.some(q=>!b.key.some(k=>k[0]===q))))throw Error('SYMBOL_KEY');
 if(b.mechanic==='word-code')wordMap(b);
 if(b.mechanic==='texture-patch'){
  if(b.motif.length!==b.motifSize**2||b.cells.length!==b.size**2||b.hole.x+b.hole.width>b.size||b.hole.y+b.hole.height>b.size)throw Error('PATCH_GEOMETRY');
  b.cells.forEach((v,i)=>{const x=i%b.size,y=Math.floor(i/b.size),hole=x>=b.hole.x&&x<b.hole.x+b.hole.width&&y>=b.hole.y&&y<b.hole.y+b.hole.height;if(hole?v!==null:v!==b.motif[y%b.motifSize*b.motifSize+x%b.motifSize])throw Error('PATCH_GIVENS');});
 }
 if(b.mechanic==='parts-union'&&(b.target.length!==b.size**2||!b.target.some(Boolean)||new Set(b.pieces.map(p=>fp(p))).size!==b.pieces.length||b.pieces.some(p=>p.size!==b.size||p.cells.length!==b.size**2||!p.cells.some(Boolean))))throw Error('PARTS_GEOMETRY');
 if(b.grade===1&&((b.mechanic==='paired-memory'&&b.pairs.length>3)||(b.mechanic==='number-memory'&&b.digits.length>3)||(b.mechanic==='layered-top'&&b.layers.length>2)))throw Error('GRADE_MEMORY_LOAD');
 return b;
}
export function solveReference(value:unknown):ReferenceValue{
 const b=validateReferenceBoard(value);
 switch(b.mechanic){
  case'semantic-analogy':{const pair=TOOL_PAIRS.find(p=>p[b.reverse?1:0]===b.query)!;return{reference:'object',id:pair[b.reverse?0:1]};}
  case'broken-pattern':return{textNumber:b.sequence.findIndex((v,i)=>v!==b.unit[i%b.unit.length])+1};
  case'paired-memory':return{reference:'object',id:b.pairs.find(p=>p[0]===b.query)![1]};
  case'number-memory':return{textNumber:b.digits[b.position-1]};
  case'symbol-code':return{textNumber:b.query.map(v=>b.key.find(p=>p[0]===v)![1]).join('')};
  case'word-code':{const map=wordMap(b);return{textNumber:[...b.query].map(c=>map.get(c)).join('')};}
  case'texture-patch':return{reference:'patch',width:b.hole.width,height:b.hole.height,cells:Array.from({length:b.hole.width*b.hole.height},(_,i)=>b.motif[(b.hole.y+Math.floor(i/b.hole.width))%b.motifSize*b.motifSize+(b.hole.x+i%b.hole.width)%b.motifSize])};
  case'parts-union':{const matches=subsets(b.pieces.length,b.use).filter(set=>b.target.every((v,i)=>v===Number(set.some(j=>b.pieces[j].cells[i]))));if(matches.length!==1)throw Error('PARTS_NOT_UNIQUE');return{reference:'parts',pieces:matches[0].map(i=>({...b.pieces[i],index:i+1}))};}
  case'layered-top':return{reference:'layers',layers:b.layers.map(l=>({...l}))};
 }
}
/** Sample only the actual topmost visible material, never hidden layer metadata. */
export function layerSignature(layers:Extract<ReferenceValue,{reference:'layers'}>['layers']):string{
 const result:number[]=[];for(let y=-48;y<=48;y+=4)for(let x=-48;x<=48;x+=4){let color=-1;for(let i=0;i<layers.length;i++){const r=48*.45**i,l=layers[i],inside=l.shape==='circle'?x*x+y*y<=r*r:l.shape==='square'?Math.max(Math.abs(x),Math.abs(y))<=r/Math.sqrt(2):y>=-r&&y<=r/2&&Math.abs(x)<=(y+r)/Math.sqrt(3);if(inside)color=l.color;}result.push(color);}return result.join(',');
}
export function independentlyMatchesReference(value:unknown,candidate:unknown):candidate is ReferenceValue{
 try{
  if(!validReferenceValue(candidate))return false;const b=validateReferenceBoard(value);
  if(b.mechanic==='broken-pattern')return'textNumber'in candidate&&typeof candidate.textNumber==='number'&&candidate.textNumber>=1&&candidate.textNumber<=b.sequence.length&&b.sequence.every((v,i)=>(i===Number(candidate.textNumber)-1)!==(v===b.unit[i%b.unit.length]));
  if(b.mechanic==='parts-union')return'reference'in candidate&&candidate.reference==='parts'&&candidate.pieces.length===b.use&&candidate.pieces.every(p=>fp({size:p.size,cells:p.cells})===fp(b.pieces[p.index-1]))&&b.target.every((v,i)=>Number(candidate.pieces.some(p=>p.cells[i]===1))===v);
  if(b.mechanic==='texture-patch'){if(!('reference'in candidate)||candidate.reference!=='patch'||candidate.width!==b.hole.width||candidate.height!==b.hole.height)return false;const filled=[...b.cells];let j=0;for(let y=b.hole.y;y<b.hole.y+b.hole.height;y++)for(let x=b.hole.x;x<b.hole.x+b.hole.width;x++)filled[y*b.size+x]=candidate.cells[j++];return filled.every((n,i)=>n===b.motif[Math.floor(i/b.size)%b.motifSize*b.motifSize+i%b.size%b.motifSize]);}
  if(b.mechanic==='layered-top')return'reference'in candidate&&candidate.reference==='layers'&&layerSignature(candidate.layers)===layerSignature(b.layers);
  if(b.mechanic==='number-memory'){let n=0;for(const digit of b.digits)if(++n===b.position)return'textNumber'in candidate&&candidate.textNumber===digit;return false;}
  if(b.mechanic==='word-code'){if(!('textNumber'in candidate)||typeof candidate.textNumber!=='string'||candidate.textNumber.length!==b.query.length)return false;return [...b.query].every((char,i)=>b.examples.every(([word,code])=>[...word].every((c,j)=>c!==char||String(candidate.textNumber)[i]===code[j])));}
  if(b.mechanic==='symbol-code')return'textNumber'in candidate&&typeof candidate.textNumber==='string'&&candidate.textNumber.length===b.query.length&&b.query.every((symbol,i)=>b.key.some(([s,n])=>s===symbol&&String(n)===String(candidate.textNumber)[i]));
  if(!('reference'in candidate)||candidate.reference!=='object')return false;
  return b.mechanic==='paired-memory'?b.pairs.some(([a,c])=>a===b.query&&c===candidate.id):TOOL_PAIRS.some(([a,c])=>b.reverse?c===b.query&&a===candidate.id:a===b.query&&c===candidate.id);
 }catch{return false;}
}
const WORD_SETS=[['KAR','KARA','ARKA','KARAR'],['ELMA','KALEM','KALE','LALE'],['KİLİT','İLK','İKİ','TİLKİ']];
export function generateReferenceQuestion(m:ReferenceMechanic,seed:number,d:DifficultyLevel,g:SchoolGrade):BaseQuestion{
 if(!referenceAllowed(m,g,d)||!Number.isSafeInteger(seed)||seed<1)throw Error('INVALID_REFERENCE_INPUT');
 const rng=new SeededRNG(seed),base={displayMode:'reference_lab' as const,grade:g},n=g===1?3:Math.min(EDUCATION_PROFILES[g].maxSymbols,2+d);let b:ReferenceBoard;
 if(m==='semantic-analogy'){const pairs=rng.pickUnique(TOOL_PAIRS,g===1?2:3),reverse=g>=2&&d===2&&rng.nextBool(),rows=reverse?pairs.map(([a,c])=>[c,a] as [ObjectId,ObjectId]):pairs;b={...base,mechanic:m,examples:rows.slice(0,-1),query:rows.at(-1)![0],reverse};}
 else if(m==='broken-pattern'){const length=g===1?2:Math.min(g===2?3:4,d+1),unit=rng.pickUnique(OBJECT_IDS,length),sequence=Array.from({length:length*3},(_,i)=>unit[i%length]),bad=rng.nextInt(length,sequence.length-1);sequence[bad]=rng.pick(unit.filter(v=>v!==sequence[bad]));b={...base,mechanic:m,unit,sequence};}
 else if(m==='paired-memory'){const ids=rng.pickUnique(OBJECT_IDS,n*2);b={...base,mechanic:m,pairs:Array.from({length:n},(_,i)=>[ids[i],ids[n+i]]),query:rng.pick(ids.slice(0,n))};}
 else if(m==='number-memory'){const digits=rng.pickUnique([1,2,3,4,5,6,7,8,9],n);b={...base,mechanic:m,digits,position:rng.nextInt(1,n)};}
 else if(m==='symbol-code'){const ids=rng.pickUnique(OBJECT_IDS,n),digits=rng.pickUnique([1,2,3,4,5,6,7,8,9],n);b={...base,mechanic:m,key:ids.map((id,i)=>[id,digits[i]]),query:Array.from({length:g===1?2:Math.min(6,g+d)},()=>rng.pick(ids))};}
 else if(m==='word-code'){const words=WORD_SETS[g===2?0:rng.nextInt(1,2)],query=rng.pick(words.filter(w=>g>=3&&d>=3?w.length>=5:g===2&&d===3?w.length>=4:true)),letters=[...new Set(words.join(''))],digits=rng.pickUnique([1,2,3,4,5,6,7,8,9],letters.length),encode=(s:string)=>[...s].map(c=>digits[letters.indexOf(c)]).join('');b={...base,mechanic:m,query,examples:words.filter(w=>w!==query).map(w=>[w,encode(w)])};}
 else if(m==='texture-patch'){const size=g<=2?3:4,motifSize=g>=3&&d>=3?3:2,symbols=g===1?3:4,motif=Array.from({length:motifSize**2},()=>rng.nextInt(0,symbols-1)),hole={x:rng.nextInt(0,size-2),y:rng.nextInt(0,size-(g===1?1:2)),width:2,height:g===1?1:2};if(new Set(motif).size<2)motif[motif.length-1]=(motif[0]+1)%symbols;b={...base,mechanic:m,size,motifSize,motif,hole,cells:Array.from({length:size**2},(_,i)=>{const x=i%size,y=Math.floor(i/size);return x>=hole.x&&x<hole.x+hole.width&&y>=hole.y&&y<hole.y+hole.height?null:motif[y%motifSize*motifSize+x%motifSize];})};}
 else if(m==='parts-union'){
  const size=g===1?2:g===2?3:4,count=g===1?4:Math.min(6,g+2),use=g>=3&&d>=3?3:2;let found:ReferenceBoard|undefined;
  for(let attempt=0;attempt<400;attempt++){const singles=rng.shuffle([0,1,2,3]),pieces=Array.from({length:count},(_,j)=>{const active=g===1?[singles[j]]:rng.pickUnique(Array.from({length:size**2},(_,i)=>i),rng.nextInt(1,g===4?4:3));return{size,cells:Array.from({length:size**2},(_,i)=>Number(active.includes(i)))};}),chosen=rng.pick(subsets(count,use)),target=Array.from({length:size**2},(_,i)=>Number(chosen.some(j=>pieces[j].cells[i])));const candidate={...base,mechanic:m,size,pieces,target,use} as ReferenceBoard;try{solveReference(candidate);found=candidate;break;}catch{}}
  if(!found)throw Error('PARTS_GENERATION_EXHAUSTED');b=found;
 }else{const colors=rng.pickUnique([0,1,2,3,4,5],g===1||d===1?2:g>=3&&d===4?4:3);b={...base,mechanic:'layered-top',layers:colors.map(color=>({shape:rng.pick(['circle','square','triangle'] as const),color}))};}
 validateReferenceBoard(b);const answer=solveReference(b),choices:ReferenceValue[]=[answer],seen=new Set([visibleReferenceKey(answer)]);
 const add=(v:ReferenceValue)=>{if(!validReferenceValue(v)||seen.has(visibleReferenceKey(v))||independentlyMatchesReference(b,v))return;seen.add(visibleReferenceKey(v));choices.push(v);};
 if('textNumber'in answer){if(typeof answer.textNumber==='number')for(const v of rng.shuffle(Array.from({length:b.mechanic==='broken-pattern'?b.sequence.length:10},(_,i)=>i+1)))add({textNumber:v});else{for(let i=0;i<answer.textNumber.length;i++){for(const delta of[1,2,3]){const c=[...answer.textNumber];c[i]=String((Number(c[i])-1+delta)%9+1);add({textNumber:c.join('')});}}add({textNumber:[...answer.textNumber].reverse().join('')});}}
 else if(answer.reference==='object')for(const id of rng.shuffle(OBJECT_IDS))add({reference:'object',id});
 else if(answer.reference==='patch')for(let i=0;i<answer.cells.length;i++)for(const shift of[1,2,3])add({...answer,cells:answer.cells.map((c,j)=>i===j?(c+shift)%4:c)});
 else if(answer.reference==='parts'&&b.mechanic==='parts-union')for(const set of rng.shuffle(subsets(b.pieces.length,b.use)))add({reference:'parts',pieces:set.map(i=>({...b.pieces[i],index:i+1}))});
 else if(answer.reference==='layers'){add({...answer,layers:[...answer.layers].reverse()});add({...answer,layers:answer.layers.map((l,i)=>i===answer.layers.length-1?{...l,shape:l.shape==='circle'?'square':'circle'}:l)});for(let i=0;i<answer.layers.length;i++)for(const delta of[1,2,3])add({...answer,layers:answer.layers.map((l,j)=>i===j?{...l,color:(l.color+delta)%6}:l)});}
 if(choices.length<4)throw Error('REFERENCE_DISTRACTORS');
 const options=rng.shuffle(choices.slice(0,4)).map((visualData,i)=>({id:'ABCD'[i],label:'ABCD'[i],visualData,fingerprint:fp(visualData)})),correct=options.filter(o=>independentlyMatchesReference(b,o.visualData));if(correct.length!==1)throw Error('REFERENCE_PROOF');
 const prompts:Record<ReferenceMechanic,string>={'semantic-analogy':'Örneklerde araç ile kullanıldığı nesne eşleştirilmiş. Aynı ilişkiyi yeni çiftte tamamla.','broken-pattern':'Örnek tekrar birimine göre dizide yalnız bir kart yanlış. Hangi numaralı kart değişmeli?','paired-memory':'Eşleri aklında tut. Deseni gizlediğinde sorulan nesnenin eşini seç.','number-memory':'Sayıların sırasını aklında tut. Diziyi gizledikten sonra sorulan sıradaki sayıyı bul.','symbol-code':'Her nesnenin bir rakamı var. Nesnelerin sırasını koruyarak şifreyi bul.','word-code':'Aynı harf her örnekte aynı rakamdır. Verilen örneklerden istenen sözcüğün şifresini bul.','texture-patch':'Örnek desen yatayda ve dikeyde tekrar ediyor. Boşluğa tam uyan desen parçasını seç.','parts-union':`Verilen parçaları döndürmeden ve yerlerini değiştirmeden üst üste koy. Hedefi oluşturan ${b.mechanic==='parts-union'?b.use:2} parçayı seç.`,'layered-top':'Renkli katmanlar aynı merkezde üst üste duruyor. Tam tepeden bakıldığında hangi görünüş oluşur?'};
 const steps:Record<ReferenceMechanic,string[]>={'semantic-analogy':['Örnekteki araç–nesne ilişkisini ve ok yönünü izle.','Yeni nesnenin aynı ilişkideki eşini seç.'],'broken-pattern':['Tekrar birimini soldan sağa sırayla uygula.','Beklenen nesneden farklı olan tek kartın numarasını bul.'],'paired-memory':['Önce her nesnenin yanındaki eşini birlikte belleğine al.','Gizledikten sonra sorulan nesnenin önceki eşini hatırla.'],'number-memory':['Sayıları soldan sağa konumlarıyla birlikte belleğine al.','Gizledikten sonra sorulan konumdaki sayıyı hatırla.'],'symbol-code':['Anahtarda her nesnenin karşısındaki rakamı bul.','Rakamları sorudaki nesne sırası bozulmadan yan yana yaz.'],'word-code':['Örneklerde harfleri aynı sıradaki rakamlarla eşleştir.','İstenen sözcüğün her harfini bu tek anlamlı anahtarla kodla.'],'texture-patch':['Boşluğun satır ve sütun konumunu örnek desene göre izle.','Parçadaki bütün işaretler aynı tekrar düzenini sürdürmeli.'],'parts-union':['Her aday grubun dolu hücrelerini üst üste birleştir.','Hedefteki bütün hücreler dolmalı ve dışarıda ek hücre oluşmamalı.'],'layered-top':['Katmanları alttan üste sırayla düşün.','Üstteki malzeme ortayı örter; dışta kalan renkli sınırları koru.']};
 const prompt=prompts[m],type=REFERENCE_TOPICS[m];return{id:`ref-${m}-g${g}-d${d}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],seed,difficulty:d,targetGrade:g,targetGrades:[g],ageGroup:g<=2?'1-2':'3-4',prompt,visualConfig:b,options,correctOptionId:correct[0].id,explanation:{ruleTitle:REFERENCE_TITLES[m],summary:steps[m].join(' '),steps:steps[m]},skills:[m],estimatedSeconds:30+d*10,status:'draft',authoring:{engine:REFERENCE_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==correct[0].id).map(o=>[o.id,'Görünür eşleme, konum, sıra veya bütünlük koşullarından en az biri sağlanmıyor.']))}};
}
export function visibleReferenceKey(v:ReferenceValue):string{return'reference'in v&&v.reference==='layers'?layerSignature(v.layers):'reference'in v&&v.reference==='parts'?fp({...v,pieces:[...v.pieces].sort((a,b)=>a.index-b.index)}):fp(v);}
