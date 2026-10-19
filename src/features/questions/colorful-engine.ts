import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as fp } from './fingerprint';
import { generateColorfulQuestion as generateLegacyColorful } from './colorful-engine-v1';

export const COLORFUL_ENGINE = 'colorful-3';
export const MOSAIC_MARKS = ['daire', 'üçgen', 'baklava', 'artı', 'iki daire', 'çerçeve'] as const;
export type MosaicRule = 'repeat-row' | 'repeat-column' | 'shift-row' | 'shift-column';

export const COLORFUL_TYPES: QuestionType[] = ['mirror_reflection','figure_completion','visual_memory','shadow_matching','spatial_relationship'];
export type Mosaic = { art: 'mosaic'; size: number; cells: number[] };
export type ObjectArt = { art: 'object'; shape: number; variant: number; tilt: number };
export type CrayonArt = { art: 'crayon'; color: number };
export type ColorfulValue = Mosaic | ObjectArt | CrayonArt | { art: 'swatch'; color: number };
export interface ColorfulBoard {
  [key: string]: unknown;
  displayMode: 'colorful_board'; kind: QuestionType; source?: Mosaic | ObjectArt;
  missing?: number; layers?: number[]; angles?: number[]; targetDepth?: number;
  mosaicRule?: MosaicRule;
}
const MOSAIC_RULES: MosaicRule[] = ['repeat-row', 'repeat-column', 'shift-row', 'shift-column'];
/** A hidden cell is never evidence. Every visible member of a group must agree. */
export function inferMissingMosaic(b: ColorfulBoard): number {
  if (b.source?.art !== 'mosaic' || !Number.isInteger(b.missing)) throw Error('Eksik mozaik verisi geçersiz.');
  if (b.mosaicRule !== undefined && !MOSAIC_RULES.includes(b.mosaicRule)) throw Error('Mozaik düzeni tanımsız.');
  const { cells, size } = b.source, answers = new Set<number>();
  for (const rule of b.mosaicRule ? [b.mosaicRule] : MOSAIC_RULES) {
    const group = (i: number) => {
      const row = Math.floor(i / size), col = i % size;
      return rule === 'repeat-row' ? col : rule === 'repeat-column' ? row :
        rule === 'shift-row' ? (col + row) % size : (row - col + size) % size;
    };
    const known = new Map<number, number>(); let consistent = true;
    cells.forEach((color, i) => {
      if (i === b.missing) return;
      const g = group(i);
      if (known.has(g) && known.get(g) !== color) consistent = false;
      known.set(g, color);
    });
    const color = known.get(group(b.missing!));
    if (consistent && color !== undefined) answers.add(color);
  }
  if (answers.size !== 1) throw Error('Görünen kareler eksik deseni tek başına belirlemiyor.');
  return [...answers][0];
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
  if(b.kind==='figure_completion')return {art:'swatch',color:inferMissingMosaic(b)};
  return {...s,cells:[...s.cells]};
}
/** Candidate proof intentionally uses coordinate pairs, not the primary transform. */
export function independentlyMatchesColorful(b:ColorfulBoard,v:ColorfulValue):boolean {
  validate(b); if(!validColorfulValue(v))return false;
  if(b.kind==='spatial_relationship')return v.art==='crayon'&&b.layers!.slice().reverse().indexOf(v.color)===b.targetDepth;
  const s=b.source!;
  if(s.art==='object')return v.art==='object'&&v.shape===s.shape&&v.variant===s.variant&&v.tilt===s.tilt;
  if(b.kind==='figure_completion') {
    if(v.art!=='swatch')return false;
    // Independent candidate substitution compares pairs of visible coordinates.
    return (b.mosaicRule ? [b.mosaicRule] : MOSAIC_RULES).some(rule => {
      const filled=s.cells.map((color,i)=>i===b.missing?v.color:color), n=s.size;
      for(let row=0;row<n;row++)for(let col=0;col<n;col++) {
        const nextRow=rule==='repeat-row'||rule==='shift-row'?(row+1)%n:row;
        const nextCol=rule==='repeat-column'||rule==='shift-column'?(col+1)%n:col;
        const referenceRow=rule==='shift-column'?(row+1)%n:nextRow;
        const referenceCol=rule==='shift-row'?(col+n-1)%n:nextCol;
        if(filled[row*n+col]!==filled[referenceRow*n+referenceCol])return false;
      }
      return true;
    });
  }
  if(v.art!=='mosaic')return false;
  if(v.size!==s.size)return false;
  for(let row=0;row<s.size;row++)for(let col=0;col<s.size;col++) {
    const destination=b.kind==='mirror_reflection'?s.size-col-1:col;
    if(s.cells[row*s.size+col]!==v.cells[row*s.size+destination])return false;
  }
  return true;
}
export function generateColorfulQuestion(type:QuestionType,seed:number,difficulty:DifficultyLevel,legacy=false):BaseQuestion {
  if(legacy)return generateLegacyColorful(type,seed,difficulty);
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
      // Four deliberately composed layouts; the prompt states the visible rule family.
      const row=rng.shuffle(colors).slice(0,size);
      b.mosaicRule=rng.pick(difficulty<=2?MOSAIC_RULES.slice(0,2):MOSAIC_RULES);
      b.source.cells=Array.from({length:size**2},(_,i)=>{
        const r=Math.floor(i/size),c=i%size;
        return row[b.mosaicRule==='repeat-row'?c:b.mosaicRule==='repeat-column'?r:b.mosaicRule==='shift-row'?(r+c)%size:(r-c+size)%size];
      });b.missing=rng.nextInt(0,size**2-1);
      const instructions:Record<MosaicRule,[string,string]>={
        'repeat-row':['Her satırda aynı desen sırası tekrarlanıyor.','Tam bir satırdaki sırayı eksik karenin satırına taşı.'],
        'repeat-column':['Her sütunda aynı desen sırası tekrarlanıyor.','Tam bir sütundaki sırayı eksik karenin sütununa taşı.'],
        'shift-row':['Her yeni satırda desenler bir kare sola kayıyor.','Bir önceki satırın ilk deseni sona geçer; diğerleri bir kare sola taşınır.'],
        'shift-column':['Her yeni sütunda desenler bir kare aşağı kayıyor.','Bir önceki sütunun son deseni başa geçer; diğerleri bir kare aşağı taşınır.'],
      };
      prompt=instructions[b.mosaicRule][0]+' Eksik kareye hangi desen gelmeli?';
      steps=[instructions[b.mosaicRule][1],'Eksik karenin yerini hem satır hem sütun üzerinden kontrol et.'];
    }else if(type==='mirror_reflection') {
      prompt='Ayna sağda. Mozaiğin aynadaki görüntüsü hangisidir?';
      steps=['Sağdaki dikey aynada sol ile sağ yer değiştirir.','Her satırın desenlerini ters sıraya koy; üst ve alt satırlar değişmez.'];
    }else {
      prompt='Renkli deseni aklında tut. Hazır olduğunda gizle ve aynısını seç.';
      steps=['Desenleri satır satır incele; köşelerin yerini aklında tut.','Gizledikten sonra bütün kareleri aynı sırayla veren seçeneği bul.'];
    }
  }
  const answer=solveColorful(b);
  if(answer.art==='swatch') {
    const source=b.source as Mosaic, n=source.size, at=b.missing!;
    const group=(i:number)=>b.mosaicRule==='repeat-column'?Math.floor(i/n):b.mosaicRule==='shift-column'?(Math.floor(i/n)-i%n+n)%n:b.mosaicRule==='shift-row'?(Math.floor(i/n)+i%n)%n:i%n;
    const reference=source.cells.findIndex((_,i)=>i!==at&&group(i)===group(at));
    if(reference<0)throw Error('Eksik parçanın görünür referansı yok.');
    steps.push(`Eksik yer ${Math.floor(at/n)+1}. satır, ${at%n+1}. sütundur.`,
      `${Math.floor(reference/n)+1}. satır, ${reference%n+1}. sütundaki ${MOSAIC_MARKS[answer.color]} deseni aynı düzen konumundadır.`);
    const wrong=[...new Set([...rng.shuffle(source.cells.filter((_,i)=>i!==at)),...rng.shuffle([0,1,2,3,4,5])])].filter(color=>color!==answer.color);
    choices=[answer,...wrong.slice(0,3).map(color=>({art:'swatch' as const,color}))];
  }
  if(answer.art==='mosaic') {
    choices=[answer];
    const source=b.source as Mosaic,n=source.size;
    const add=(cells:number[])=>{const value={...answer,cells};if(!choices.some(c=>fp(c)===fp(value)))choices.push(value);};
    // A local transposition makes at least one plausible near miss. It preserves
    // every colour count, so colour inventory alone cannot reveal the answer.
    const from=rng.pick(answer.cells.map((_,i)=>i)), to=rng.pick(answer.cells.flatMap((color,i)=>color!==answer.cells[from]?[i]:[]));
    const swapped=[...answer.cells];[swapped[from],swapped[to]]=[swapped[to],swapped[from]];add(swapped);
    // Common reasoning errors retain the same palette and visual density.
    for(const cells of [source.cells,source.cells.map((_,i)=>source.cells[(n-1-Math.floor(i/n))*n+i%n]),source.cells.map((_,i)=>source.cells[(i%n)*n+Math.floor(i/n)]),source.cells.map((_,i)=>source.cells[n*n-1-i])]) {
      if(choices.length<4)add([...cells]);
    }
    for(const i of rng.shuffle(answer.cells.map((_,i)=>i))) {
      if(choices.length===4)break;
      const j=answer.cells.findIndex((c,k)=>k!==i&&c!==answer.cells[i]);
      if(j>=0){const cells=[...answer.cells];[cells[i],cells[j]]=[cells[j],cells[i]];add(cells);}
    }
    if(choices.length!==4)throw Error('Ayırt edilebilir dört desen üretilemedi.');
  }
  if(choices.filter(v=>independentlyMatchesColorful(b,v)).length!==1)throw Error('Tek cevap kanıtlanamadı.');
  let correctOptionId='';const notes:Record<string,string>={};
  const options=rng.shuffle(choices).map((visualData,i)=>{
    const id='ABCD'[i],correct=fp(visualData)===fp(answer);if(correct)correctOptionId=id;
    let note=correct?'Bütün konumlar ve özellikler verilen kurala uyuyor.':type==='shadow_matching'?'Dış çizgi veya iç boşluk verilen nesneden farklı.':type==='spatial_relationship'?'Bu kalemin üstündeki katman sayısı istenen sıraya uymuyor.':'Bu desen eksik karenin satır ve sütun düzenine uymuyor.';
    if(!correct&&answer.art==='mosaic'&&visualData.art==='mosaic') {
      const at=answer.cells.findIndex((color,j)=>color!==visualData.cells[j]);
      note=`${Math.floor(at/answer.size)+1}. satır, ${at%answer.size+1}. sütunda ${MOSAIC_MARKS[answer.cells[at]]} yerine ${MOSAIC_MARKS[visualData.cells[at]]} deseni var. Bu konum verilen kurala uymuyor.`;
    }
    notes[id]=note;return {id,label:id,visualData,fingerprint:fp(visualData)};
  });
  const finalSteps=[...steps,`Kurala uyan tek seçenek ${correctOptionId}.`];
  return {id:`${type}-color3-d${difficulty}-s${seed}`,version:3,type,category:TOPIC_CATEGORY[type],seed,difficulty,ageGroup:difficulty<=2?'1-2':'3-4',prompt,options,correctOptionId,explanation:{ruleTitle:QUESTION_TYPE_LABELS[type],summary:finalSteps.join(' '),steps:finalSteps},visualConfig:b,skills:[type],estimatedSeconds:30+difficulty*8,status:'draft',authoring:{engine:COLORFUL_ENGINE,objective:prompt,distractorNotes:notes}};
}
