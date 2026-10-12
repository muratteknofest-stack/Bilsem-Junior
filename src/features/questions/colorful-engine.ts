import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as fp } from './fingerprint';

export const COLORFUL_TYPES: QuestionType[] = ['mirror_reflection','figure_completion','visual_memory','shadow_matching','spatial_relationship'];
export type Mosaic = { art: 'mosaic'; size: number; cells: number[] };
export type ObjectArt = { art: 'object'; shape: number; variant: number; tilt: number };
export type CrayonArt = { art: 'crayon'; color: number };
export type ColorfulValue = Mosaic | ObjectArt | CrayonArt | { art: 'swatch'; color: number };
export interface ColorfulBoard {
  [key: string]: unknown;
  displayMode: 'colorful_board'; kind: QuestionType; source?: Mosaic | ObjectArt;
  missing?: number; layers?: number[]; angles?: number[]; targetDepth?: number;
}
export function validColorfulValue(v: unknown): v is ColorfulValue {
  if (!v || typeof v !== 'object') return false;
  const a = v as ColorfulValue;
  const integer=(n:unknown,max:number)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=max;
  if(a.art==='mosaic')return Object.keys(a).sort().join()==='art,cells,size'&&[2,3,4].includes(a.size)&&Array.isArray(a.cells)&&a.cells.length===a.size**2&&a.cells.every(n=>integer(n,5));
  if(a.art==='object')return Object.keys(a).sort().join()==='art,shape,tilt,variant'&&integer(a.shape,2)&&integer(a.variant,3)&&integer(a.tilt,3);
  if(a.art==='swatch')return Object.keys(a).sort().join()==='art,color'&&integer(a.color,5);
  return a.art==='crayon'&&Object.keys(a).sort().join()==='art,color'&&integer(a.color,3);
}
function validate(b:ColorfulBoard) {
  if(!COLORFUL_TYPES.includes(b.kind))throw Error('Renkli soru türü geçersiz.');
  if(b.kind==='spatial_relationship') {
    if(b.layers?.length!==4||new Set(b.layers).size!==4||b.layers.some(n=>!Number.isInteger(n)||n<0||n>3)||b.angles?.length!==4||b.angles.some(n=>!Number.isFinite(n))||!Number.isInteger(b.targetDepth)||b.targetDepth!<0||b.targetDepth!>2)throw Error('Katmanlar geçersiz.');
  } else {
    if(!validColorfulValue(b.source))throw Error('Kaynak çizim geçersiz.');
    if(b.kind==='shadow_matching'&&b.source!.art!=='object'||b.kind!=='shadow_matching'&&b.source!.art!=='mosaic')throw Error('Çizim türü uyuşmuyor.');
    if(b.kind==='figure_completion'&&(b.source!.art!=='mosaic'||!Number.isInteger(b.missing)||b.missing!<0||b.missing!>=b.source!.cells.length))throw Error('Eksik parça geçersiz.');
  }
}
export function solveColorful(b:ColorfulBoard):ColorfulValue {
  validate(b);
  if(b.kind==='spatial_relationship')return {art:'crayon',color:b.layers![3-b.targetDepth!]};
  const s=b.source!;
  if(s.art==='object')return {...s};
  if(b.kind==='mirror_reflection')return {...s,cells:s.cells.map((_,i)=>s.cells[Math.floor(i/s.size)*s.size+s.size-1-i%s.size])};
  if(b.kind==='figure_completion')return {art:'swatch',color:s.cells[b.missing!]};
  return {...s,cells:[...s.cells]};
}
/** Candidate proof intentionally uses coordinate pairs, not the primary transform. */
export function independentlyMatchesColorful(b:ColorfulBoard,v:ColorfulValue):boolean {
  validate(b); if(!validColorfulValue(v))return false;
  if(b.kind==='spatial_relationship')return v.art==='crayon'&&b.layers!.slice().reverse().indexOf(v.color)===b.targetDepth;
  const s=b.source!;
  if(s.art==='object')return v.art==='object'&&v.shape===s.shape&&v.variant===s.variant&&v.tilt===s.tilt;
  if(b.kind==='figure_completion')return v.art==='swatch'&&v.color===s.cells[b.missing!];
  if(v.art!=='mosaic')return false;
  if(v.size!==s.size)return false;
  for(let row=0;row<s.size;row++)for(let col=0;col<s.size;col++) {
    const destination=b.kind==='mirror_reflection'?s.size-col-1:col;
    if(s.cells[row*s.size+col]!==v.cells[row*s.size+destination])return false;
  }
  return true;
}
export function generateColorfulQuestion(type:QuestionType,seed:number,difficulty:DifficultyLevel):BaseQuestion {
  if(!COLORFUL_TYPES.includes(type)||!Number.isSafeInteger(seed)||seed<1||!Number.isInteger(difficulty)||difficulty<1||difficulty>6)throw Error('Renkli soru üretim girdisi geçersiz.');
  const rng=new SeededRNG(seed), size=difficulty<=2?2:difficulty<=3?3:4;
  const b:ColorfulBoard={displayMode:'colorful_board',kind:type};
  let prompt='',steps:string[]=[],choices:ColorfulValue[]=[];
  if(type==='spatial_relationship') {
    b.layers=rng.shuffle([0,1,2,3]);b.angles=rng.shuffle([0,45,90,135]);b.targetDepth=difficulty<=2?0:difficulty<=4?1:2;
    prompt=b.targetDepth===0?'Üst üste duran kalemlerden en üstteki hangisidir?':`Üst üste duran kalemlerden üstten ${b.targetDepth+1}. kalem hangisidir?`;
    steps=['Kesişmelerde çizgisi kesilmeyen kalem diğerinin üzerindedir.','Merkezdeki kalemden başlayarak katmanları yukarıdan aşağıya sırala.'];
    choices=[0,1,2,3].map(color=>({art:'crayon',color}));
  }else if(type==='shadow_matching') {
    b.source={art:'object',shape:rng.nextInt(0,2),variant:rng.nextInt(0,3),tilt:rng.nextInt(0,3)};
    prompt='Nesnenin dış çizgisini ve boşluklarını koruyan gölgeyi bul. Yönü değişmesin.';
    steps=['Dış kenarları, çıkıntıları ve iç boşlukları ayrı ayrı karşılaştır.','Renk ve süsler kaybolur; dış çizgi ile boşlukların yeri değişmez.'];
    choices=[0,1,2,3].map(variant=>({art:'object',shape:(b.source as ObjectArt).shape,variant,tilt:(b.source as ObjectArt).tilt}));
    if(difficulty<=2){const source=b.source as ObjectArt;choices=[source,...[0,1,2].filter(shape=>shape!==source.shape).map(shape=>({...source,shape})),{...source,variant:(source.variant+1)%4}];}
  }else {
    const colors=rng.shuffle([0,1,2,3,4,5]).slice(0,difficulty<=2?3:5);
    const cells=Array.from({length:size**2},()=>rng.pick(colors));
    cells[0]=colors[0];cells[size-1]=colors[1];
    b.source={art:'mosaic',size,cells};
    if(type==='figure_completion') {
      // Repeated or cyclic rows make the missing tile inferable; never hide random information.
      const row=rng.shuffle(colors).slice(0,size);
      b.source.cells=Array.from({length:size**2},(_,i)=>row[(i%size+(difficulty>=3?Math.floor(i/size):0))%size]);b.missing=rng.nextInt(0,size**2-1);
      prompt=difficulty>=3?'Mozaikte satırdan satıra değişen düzeni incele. Eksik kareye hangi desen gelmeli?':'Mozaikte her satır aynı sırayı izliyor. Eksik kareye hangi desen gelmeli?';
      steps=difficulty>=3?['Her yeni satırda desenler bir kare sola kayar; baştaki desen sona geçer.','Tam satırları karşılaştır ve aynı kaydırmayı eksik karenin bulunduğu satıra uygula.']:['Tam olan bir satırdaki desen sırasını incele.','Eksik karenin sütunundaki diğer desenlerle karşılaştır.'];
    }else if(type==='mirror_reflection') {
      prompt='Ayna sağda. Mozaiğin aynadaki görüntüsü hangisidir?';
      steps=['Sağdaki dikey aynada sol ile sağ yer değiştirir.','Her satırın desenlerini ters sıraya koy; üst ve alt satırlar değişmez.'];
    }else {
      prompt='Renkli deseni aklında tut. Hazır olduğunda gizle ve aynısını seç.';
      steps=['Desenleri satır satır incele; köşelerin yerini aklında tut.','Gizledikten sonra bütün kareleri aynı sırayla veren seçeneği bul.'];
    }
  }
  const answer=solveColorful(b);
  if(answer.art==='swatch')choices=[answer,...rng.shuffle([0,1,2,3,4,5].filter(n=>n!==answer.color)).slice(0,3).map(color=>({art:'swatch' as const,color}))];
  if(answer.art==='mosaic') {
    choices=[answer];
    for(const i of rng.shuffle(answer.cells.map((_,i)=>i)).slice(0,3)) {const cells=[...answer.cells];cells[i]=(cells[i]+rng.nextInt(1,5))%6;choices.push({...answer,cells});}
  }
  if(choices.filter(v=>independentlyMatchesColorful(b,v)).length!==1)throw Error('Tek cevap kanıtlanamadı.');
  let correctOptionId='';const notes:Record<string,string>={};
  const options=rng.shuffle(choices).map((visualData,i)=>{const id='ABCD'[i],correct=fp(visualData)===fp(answer);if(correct)correctOptionId=id;notes[id]=correct?'Bütün konumlar ve özellikler verilen kurala uyuyor.':type==='shadow_matching'?'Dış çizgi veya iç boşluk verilen nesneden farklı.':type==='spatial_relationship'?'Bu kalemin üstündeki katman sayısı istenen sıraya uymuyor.':'En az bir karenin deseni veya konumu verilen kuralla uyuşmuyor.';return {id,label:id,visualData,fingerprint:fp(visualData)};});
  const finalSteps=[...steps,`Kurala uyan tek seçenek ${correctOptionId}.`];
  return {id:`${type}-color1-d${difficulty}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],seed,difficulty,ageGroup:difficulty<=2?'1-2':'3-4',prompt,options,correctOptionId,explanation:{ruleTitle:QUESTION_TYPE_LABELS[type],summary:finalSteps.join(' '),steps:finalSteps},visualConfig:b,skills:[type],estimatedSeconds:30+difficulty*8,status:'draft',authoring:{engine:'colorful-1',objective:prompt,distractorNotes:notes}};
}
