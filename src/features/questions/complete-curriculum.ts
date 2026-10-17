import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as key } from './fingerprint';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';

export const COMPLETE_ENGINE = 'curriculum-1';
export const COMPLETE_TYPES: QuestionType[] = ['odd_one_out','classification','logical_sequence','balance_scale','gear_rotation','paper_folding','punch_folding','verbal_analogy','tangram_puzzle','detail_detection','symmetry_completion','shadow_matching','maze_path','word_scramble_logic','number_pattern','number_pyramid','shape_equation','matrix_3x3','raven_matrix','operation_machine','figure_completion','visual_sequence','figure_rotation'];
export type Token = { shape: number; color: number };
export type CompleteValue = { textNumber: string | number } | { curriculum: 'grid'; size: number; cells: number[] } | { curriculum: 'token'; shape: number; color: number } | { curriculum: 'piece'; points: number[][] };
export type CompleteBoard = {
  displayMode: 'curriculum_board'; kind: QuestionType; grade: SchoolGrade; size: number;
  grids?: number[][]; source?: number[]; copy?: number[]; axis?: 'x'|'y'|'xy';
  matrix?: (Token|null)[]; sequence?: (Token|null)[]; turns?: number; period?: number; values?: number[]; base?: number[]; examples?: number[][]; input?: number;
  equations?: number[][]; expression?: number[]; names?: string[]; clues?: [string,string][]; position?: number;
  words?: string[]; relation?: number; letters?: string[]; order?: number[];
  walls?: number[]; start?: number; goals?: number[]; gears?: number[]; direction?: number; target?: number;
  pieces?: number[][][]; missing?: number;
};
const labels=['A','B','C','D'];
export const ANALOGY_FAMILIES: [string,string][][] = [
  [['kitap','okumak'],['kalem','yazmak'],['makas','kesmek'],['fırça','boyamak'],['tarak','taramak'],['silgi','silmek'],['anahtar','açmak'],['süpürge','süpürmek'],['sabun','yıkamak'],['telefon','konuşmak'],['kaşık','yemek'],['bardak','içmek'],['yastık','uyumak'],['cetvel','ölçmek'],['top','oynamak'],['bisiklet','sürmek']],
  [['el','parmak'],['ayak','parmak'],['ağaç','dal'],['çiçek','yaprak'],['kitap','sayfa'],['araba','tekerlek'],['ev','kapı'],['gömlek','düğme'],['bisiklet','pedal'],['kuş','kanat'],['balık','yüzgeç'],['masa','ayak']],
  [['büyük','küçük'],['uzun','kısa'],['sıcak','soğuk'],['açık','kapalı'],['gece','gündüz'],['hızlı','yavaş'],['yukarı','aşağı'],['ileri','geri'],['ağır','hafif'],['dolu','boş'],['eski','yeni'],['ıslak','kuru'],['geniş','dar'],['yakın','uzak'],['ince','kalın'],['çok','az']],
];
const RELATION_NAMES=['nesne ve kullanımı','bütün ve parçası','zıt anlam'];
const same=(a:unknown,b:unknown)=>key(a)===key(b);
const grid=(b:CompleteBoard,cells:number[]):CompleteValue=>({curriculum:'grid',size:b.size,cells});
const token=(v:Token):CompleteValue=>({curriculum:'token',...v});
const piece=(points:number[][]):CompleteValue=>({curriculum:'piece',points});
const count=(cells:number[])=>cells.filter(Boolean).length;
export function validCompleteValue(v:unknown):v is CompleteValue {
  if(!v||typeof v!=='object'||Array.isArray(v))return false;
  const a=v as Record<string,any>,fields=Object.keys(a).sort().join(',');
  if(fields==='textNumber')return typeof a.textNumber==='string'&&a.textNumber.length>0&&a.textNumber.length<=60||Number.isSafeInteger(a.textNumber)&&a.textNumber>=0&&a.textNumber<=1000;
  if(fields==='cells,curriculum,size')return a.curriculum==='grid'&&[3,4].includes(a.size)&&Array.isArray(a.cells)&&a.cells.length===a.size**2&&a.cells.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=6);
  if(fields==='color,curriculum,shape')return a.curriculum==='token'&&[a.color,a.shape].every(n=>Number.isInteger(n)&&n>=0&&n<6);
  return fields==='curriculum,points'&&a.curriculum==='piece'&&Array.isArray(a.points)&&a.points.length>=3&&a.points.length<=4&&a.points.every((p:any)=>Array.isArray(p)&&p.length===2&&p.every((n:any)=>Number.isFinite(n)&&n>=0&&n<=4));
}
function reachable(b:CompleteBoard):Set<number>{
  const visited=new Set([b.start!]),todo=[b.start!];
  while(todo.length){const i=todo.shift()!;for(const j of [i-b.size,i+b.size,...(i%b.size?[i-1]:[]),...(i%b.size<b.size-1?[i+1]:[])])if(j>=0&&j<b.size**2&&!b.walls![j]&&!visited.has(j)){visited.add(j);todo.push(j);}}
  return visited;
}
function ordering(b:CompleteBoard):string[]{
  const results:string[][]=[];
  const visit=(a:string[])=>{if(a.length===b.names!.length){if(b.clues!.every(([x,y])=>a.indexOf(y)===a.indexOf(x)+1))results.push(a);return;}for(const n of b.names!)if(!a.includes(n))visit([...a,n]);};visit([]);
  if(results.length!==1)throw Error('Sıralama tek çözümlü değil.');return results[0];
}
function linear(b:CompleteBoard):number[]{
  const valid:number[][]=[];
  for(let x=1;x<=12;x++)for(let y=1;y<=12;y++)if(b.equations!.every(([a,c,t])=>a*x+c*y===t))valid.push([x,y]);
  if(valid.length!==1)throw Error('Şekil değerleri tek çözümlü değil.');return valid[0];
}
export function solveComplete(b:CompleteBoard,choices:CompleteValue[]=[]):CompleteValue{
  if(b.displayMode!=='curriculum_board'||!COMPLETE_TYPES.includes(b.kind)||![1,2,3,4].includes(b.grade)||![3,4].includes(b.size))throw Error('Müfredat çizimi geçersiz.');
  switch(b.kind){
    case 'symmetry_completion': case 'paper_folding': case 'punch_folding': {
      const a=[...b.source!];
      for(let r=0;r<b.size;r++)for(let c=0;c<b.size;c++)if(b.source![r*b.size+c]){
        const rows=b.axis==='y'||b.axis==='xy'?[r,b.size-1-r]:[r],cols=b.axis==='x'||b.axis==='xy'?[c,b.size-1-c]:[c];
        for(const rr of rows)for(const cc of cols)a[rr*b.size+cc]=b.source![r*b.size+c];
      }return grid(b,a);
    }
    case 'visual_sequence':{const v=b.sequence!,group=(v.length-1)%b.period!;const samples=v.flatMap((t,i)=>t&&i % (b.period!) === group?[t]:[]);if(!samples.length||!samples.every(t=>same(t,samples[0])))throw Error('Örüntü kuralı belirsiz.');return token(samples[0]);}
    case 'figure_rotation':{let cells=[...b.source!];for(let t=0;t<b.turns!;t++){const next=Array(cells.length).fill(0);for(let r=0;r<b.size;r++)for(let c=0;c<b.size;c++)next[c*b.size+b.size-1-r]=cells[r*b.size+c];cells=next;}return grid(b,cells);}
    case 'shadow_matching':return grid(b,b.source!.map(n=>Number(n>0)));
    case 'detail_detection':{const changed=b.source!.flatMap((v,i)=>v!==b.copy![i]?[i]:[]);if(changed.length!==1)throw Error('Tek değişiklik gerekli.');const i=changed[0];return {textNumber:`${Math.floor(i/b.size)+1}. satır, ${i%b.size+1}. sütun`};}
    case 'odd_one_out':{const counts=b.grids!.map(count);const i=counts.findIndex(n=>counts.filter(v=>v===n).length===1);if(i<0||counts.filter(v=>v!==counts[i]).length!==3)throw Error('Tek farklı kart gerekli.');return {textNumber:labels[i]};}
    case 'classification':{if(count(b.grids![0])!==count(b.grids![1]))throw Error('Örnekler aynı grupta değil.');const n=b.grids![0].reduce((sum,v)=>sum+Number(v>0),0);const valid=choices.filter(v=>'curriculum' in v&&v.curriculum==='grid'&&v.cells.reduce((sum,x)=>sum+Number(x>0),0)===n);if(valid.length!==1)throw Error('Sınıflandırma tek aday vermiyor.');return valid[0];}
    case 'number_pattern':{const d=b.values![1]-b.values![0];if(!b.values!.slice(1).every((v,i)=>v-b.values![i]===d)||!d)throw Error('Ortak fark geçersiz.');return {textNumber:b.values!.at(-1)!+d};}
    case 'number_pyramid':{let row=[...b.base!];while(row.length>1)row=row.slice(1).map((v,i)=>v+row[i]);return {textNumber:row[0]};}
    case 'shape_equation': case 'balance_scale':{const v=linear(b);return {textNumber:b.expression!.reduce((n,c,i)=>n+c*v[i],0)};}
    case 'operation_machine':{const [[x,y],[xx,yy]]=b.examples!;const a=(yy-y)/(xx-x),c=y-a*x;if(!Number.isFinite(a)||!b.examples!.every(([i,o])=>a*i+c===o))throw Error('Makine kuralı belirsiz.');return {textNumber:a*b.input!+c};}
    case 'gear_rotation':return {textNumber:(b.direction!*(b.target!%2?-1:1))>0?'Saat yönü':'Saat yönünün tersi'};
    case 'logical_sequence':return {textNumber:ordering(b)[b.position!]};
    case 'word_scramble_logic':return {textNumber:b.order!.map(i=>b.letters![i]).join('')};
    case 'verbal_analogy':{const family=ANALOGY_FAMILIES[b.relation!];if(!family?.some(([a,c])=>a===b.words![0]&&c===b.words![1]))throw Error('Analoji örneği geçersiz.');const pair=family.find(([a])=>a===b.words![2]);if(!pair)throw Error('Sözel ilişki tanımsız.');return {textNumber:pair[1]};}
    case 'maze_path':{const possible=b.goals!.flatMap((v,i)=>reachable(b).has(v)?[i]:[]);if(possible.length!==1)throw Error('Tek ulaşılabilir hedef gerekli.');return {textNumber:labels[possible[0]]};}
    case 'figure_completion':{const m=b.matrix!,missing=b.missing!,group=(Math.floor(missing/3)+missing%3)%3;const seen=m.flatMap((v,i)=>v&&(Math.floor(i/3)+i%3)%3===group?[v]:[]);if(!seen.length||!seen.every(v=>same(v,seen[0])))throw Error('Eksik desen tekil değil.');return token(seen[0]);}
    case 'matrix_3x3':{const m=b.matrix!;if(m.length!==9||m[8]!==null)throw Error('Matris eksik hücresi geçersiz.');if(![3,4,5,6,7].every(i=>same(m[i],m[(Math.floor(i/3)+i%3)%3])))throw Error('Matris satırları tutarsız.');return token(m[1]!);}
    case 'raven_matrix':{const m=b.matrix!;if(m.length!==9||m[8]!==null||!m.slice(0,8).every((v,i)=>v?.shape===m[Math.floor(i/3)*3]!.shape&&v.color===m[i%3]!.color))throw Error('İki özellikli matris tutarsız.');return token({shape:m[6]!.shape,color:m[2]!.color});}
    case 'tangram_puzzle':return piece(b.pieces![b.missing!]);
    default:throw Error('Desteklenmeyen müfredat kuralı.');
  }
}
/** Candidate checks use visible constraints, not correctOptionId or the primary answer. */
export function independentlyMatchesComplete(b:CompleteBoard,v:CompleteValue):boolean{
  if(!validCompleteValue(v))return false;
  if('curriculum' in v&&v.curriculum==='grid'){
    if(v.size!==b.size)return false;
    if(b.kind==='classification')return count(v.cells)===count(b.grids![0])&&count(v.cells)===count(b.grids![1]);
    if(b.kind==='figure_rotation')return v.cells.every((n,i)=>{let r=Math.floor(i/b.size),c=i%b.size;for(let t=0;t<b.turns!;t++)[r,c]=[b.size-1-c,r];return n===b.source![r*b.size+c];});
    if(b.kind==='shadow_matching')return v.cells.every((n,i)=>n===(b.source![i]?1:0));
    if(['symmetry_completion','paper_folding','punch_folding'].includes(b.kind))return v.cells.every((n,i)=>{
      let r=Math.floor(i/b.size),c=i%b.size;
      if(b.axis==='y'||b.axis==='xy')r=Math.min(r,b.size-1-r);
      if(b.axis==='x'||b.axis==='xy')c=Math.min(c,b.size-1-c);
      return n===b.source![r*b.size+c];
    });return false;
  }
  if('curriculum' in v&&v.curriculum==='token'){
    if(b.kind==='visual_sequence'){const sequence=[...b.sequence!];sequence[sequence.length-1]={shape:v.shape,color:v.color};return sequence.every((t,i)=>same(t,sequence[i%b.period!]));}
    if(!['matrix_3x3','raven_matrix','figure_completion'].includes(b.kind))return false;
    const m=[...b.matrix!];m[b.kind==='figure_completion'?b.missing!:8]={shape:v.shape,color:v.color};
    if(b.kind==='matrix_3x3'||b.kind==='figure_completion'){const groups=new Map<number,Token>();for(let i=0;i<9;i++){const g=(Math.floor(i/3)+i%3)%3;if(groups.has(g)&&!same(groups.get(g),m[i]))return false;groups.set(g,m[i]!);}return groups.size===3;}
    return [0,1,2].every(r=>[0,1,2].every(c=>m[r*3+c]!.shape===m[r*3]!.shape&&m[r*3+c]!.color===m[c]!.color));
  }
  if('curriculum' in v&&v.curriculum==='piece')return b.kind==='tangram_puzzle'&&same(v.points,b.pieces![b.missing!]);
  if(!('textNumber' in v))return false;
  const answer=v.textNumber;
  switch(b.kind){
    case 'number_pattern':return typeof answer==='number'&&[...b.values!,answer].slice(1).every((n,i)=>n-[...b.values!,answer][i]===b.values![1]-b.values![0]);
    case 'number_pyramid':{const n=b.base!.length-1;const binomial=(k:number)=>{let x=1;for(let j=1;j<=k;j++)x=x*(n-j+1)/j;return x;};return answer===b.base!.reduce((s,x,i)=>s+x*binomial(i),0);}
    case 'shape_equation':case 'balance_scale':{const [[a,c,t],[d,e,u]]=b.equations!;const det=a*e-c*d;if(!det)return false;const x=(t*e-c*u)/det,y=(a*u-t*d)/det;return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&answer===b.expression![0]*x+b.expression![1]*y;}
    case 'operation_machine':{const [[x,y],[xx,yy]]=b.examples!;return typeof answer==='number'&&(answer-y)*(xx-x)===(yy-y)*(b.input!-x);}
    case 'gear_rotation':{let dir=b.direction!;for(let i=0;i<b.target!;i++)dir=-dir;return answer===(dir>0?'Saat yönü':'Saat yönünün tersi');}
    case 'detail_detection':{const positions=b.source!.flatMap((n,i)=>n!==b.copy![i]?[`${Math.floor(i/b.size)+1}. satır, ${i%b.size+1}. sütun`]:[]);return positions.length===1&&answer===positions[0];}
    case 'odd_one_out':{const i=labels.indexOf(String(answer));return i>=0&&b.grids!.filter((_,j)=>j!==i).every(g=>count(g)===count(b.grids![(i+1)%4]))&&count(b.grids![i])!==count(b.grids![(i+1)%4]);}
    case 'logical_sequence':{const next=new Map(b.clues!),hasPrev=new Set(b.clues!.map(c=>c[1]));let current=b.names!.find(n=>!hasPrev.has(n));const order:string[]=[];while(current&&!order.includes(current)){order.push(current);current=next.get(current);}return order.length===b.names!.length&&answer===order[b.position!];}
    case 'word_scramble_logic':{if(typeof answer!=='string'||answer.length!==b.letters!.length)return false;return Array.from(answer).every((c,i)=>c===b.letters![b.order![i]]);}
    case 'verbal_analogy':return ANALOGY_FAMILIES[b.relation!].some(([a,c])=>a===b.words![2]&&c===answer);
    case 'maze_path':{const connected=Array.from({length:b.size**2},(_,i)=>!b.walls![i]?new Set([i]):new Set<number>());for(let k=0;k<b.size**2;k++)for(let i=0;i<b.size**2;i++)if(!b.walls![i])for(const j of [i+b.size,...(i%b.size<b.size-1?[i+1]:[])])if(j<b.size**2&&!b.walls![j]){const union=new Set([...connected[i],...connected[j]]);for(const p of union)connected[p]=union;}const matches=b.goals!.flatMap((g,i)=>connected[b.start!].has(g)?[labels[i]]:[]);return matches.length===1&&matches[0]===answer;}
    default:return false;
  }
}
function binaryGrid(rng:SeededRNG,size:number,n:number):number[]{const a=Array(size**2).fill(0);for(const i of rng.pickUnique(Array.from({length:a.length},(_,i)=>i),n))a[i]=rng.nextInt(1,6);return a;}
const TANGRAM=[[[0,0],[4,0],[2,2]],[[0,0],[2,2],[0,4]],[[2,4],[4,2],[4,4]],[[4,0],[4,2],[3,1]],[[2,2],[3,3],[1,3]],[[2,2],[3,1],[4,2],[3,3]],[[0,4],[1,3],[3,3],[2,4]]];
export function generateCompleteCurriculum(type:QuestionType,seed:number,difficulty:DifficultyLevel,grade:SchoolGrade):BaseQuestion{
  if(!COMPLETE_TYPES.includes(type)||!Number.isSafeInteger(seed)||seed<1||!EDUCATION_PROFILES[grade]||!Number.isInteger(difficulty)||difficulty<1||difficulty>EDUCATION_PROFILES[grade].maxDifficulty)throw Error('INVALID_CURRICULUM_INPUT');
  const rng=new SeededRNG(seed),size:3|4=grade<=2||difficulty<=3?3:4;
  const b:CompleteBoard={displayMode:'curriculum_board',kind:type,grade,size};
  let prompt='',steps:string[]=[],candidates:CompleteValue[]=[];
  switch(type){
    case 'symmetry_completion':case 'paper_folding':case 'punch_folding':{
      b.axis=type==='symmetry_completion'||difficulty<=2?rng.pick(['x','y'] as const):'xy';b.source=Array(size**2).fill(0);
      for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!(b.axis!=='x'&&r>=Math.ceil(size/2))&&!(b.axis!=='y'&&c>=Math.ceil(size/2)))b.source[r*size+c]=rng.nextInt(0,6);
      if(!b.source.some(Boolean))b.source[0]=1;
      prompt=type==='symmetry_completion'?'Deseni kesikli çizgiye göre yansıt. Tamamlanmış desen hangisidir?':type==='paper_folding'?'Kâğıt kesikli çizgiden katlanıyor. Renkli kesimler açılınca hangi desen oluşur?':'Kâğıt kesikli çizgiden katlanıyor. Renkli delikler açılınca nerede görünür?';
      steps=['Her renkli işareti katlama çizgisinin karşı tarafına aynı uzaklıkta taşı.','Başlangıç işaretlerini koru; bütün yansımaları birlikte kontrol et.'];break;
    }
    case 'visual_sequence':{b.period=difficulty<=2?3:4;const base=rng.pickUnique(Array.from({length:36},(_,i)=>({shape:Math.floor(i/6),color:i%6})),b.period);b.sequence=Array.from({length:b.period*2+1},(_,i)=>i===b.period!*2?null:base[i%b.period!]);prompt=`Şekiller ${b.period} kutuluk gruplarla aynı sırada tekrarlanıyor. Sonraki şekli seç.`;steps=['Tekrarlanan grubun biçim ve renk sırasını incele.','Yeni grupta sıradaki kutuya aynı biçim ve renk gelmelidir.'];break;}
    case 'figure_rotation':b.source=Array.from({length:size**2},()=>rng.nextInt(0,6));b.turns=rng.nextInt(1,difficulty<=2?1:3);prompt=`Deseni saat yönünde ${b.turns*90} derece döndür. Hangi desen oluşur?`;steps=['Desenin tamamını verilen yönde ve açıda döndür.','Hücrelerin renklerini koru; yeni satır ve sütun konumlarını karşılaştır.'];break;
    case 'shadow_matching':b.source=binaryGrid(rng,size,rng.nextInt(3,Math.min(size**2-1,6)));prompt='Renkleri kaldır. Dolu ve boş hücrelerin yerini koruyan gölgeyi seç.';steps=['Renkler gölgede kaybolur; dolu hücreler siyah görünür.','Hücrelerin konumu değişmez; boşlukları da karşılaştır.'];break;
    case 'detail_detection':b.source=binaryGrid(rng,size,rng.nextInt(3,6));b.copy=[...b.source];{const i=rng.nextInt(0,size**2-1);b.copy[i]=(b.copy[i]+rng.nextInt(1,5))%7;}prompt='İki desende yalnızca bir hücre değişti. Hangi satır ve sütundadır?';steps=['İki deseni aynı satır ve sütunlarda karşılaştır.','Rengi veya doluluğu değişen tek hücrenin konumunu bul.'];break;
    case 'odd_one_out':{const n=rng.nextInt(2,3),odd=rng.nextInt(0,3);b.grids=labels.map((_,i)=>binaryGrid(rng,size,n+Number(i===odd)));prompt='Üç kartta aynı sayıda işaret var. Farklı sayıdaki kartı seç.';steps=['Kartlardaki renkli hücreleri tek tek say.','Üç kartın sayısı eşittir; diğer kart farklıdır.'];candidates=labels.map(textNumber=>({textNumber}));break;}
    case 'classification':{const n=rng.nextInt(2,Math.min(5,grade+2));b.grids=[binaryGrid(rng,size,n),binaryGrid(rng,size,n)];prompt='Örneklerle aynı sayıda işaret taşıyan kartı bu gruba ekle.';steps=['İki örnekteki renkli hücre sayısını bul.','Aynı sayıda işaret taşıyan tek seçeneği gruba ekle.'];candidates=[n,n-1,n+1,n+2].map(n=>grid(b,binaryGrid(rng,size,n)));break;}
    case 'number_pattern':{const length=rng.nextInt(3,5),step=rng.nextInt(1,grade<=1?3:grade+3),start=rng.nextInt(1,grade<=1?Math.max(1,24-length*step):grade*8);b.values=Array.from({length},(_,i)=>start+i*step);prompt='Her adımda aynı sayı ekleniyor. Dizinin sonraki sayısı nedir?';steps=[`Ardışık sayılar arasındaki fark ${step}.`,`Son sayıya ${step} ekle: ${b.values.at(-1)} + ${step} = ${b.values.at(-1)!+step}.`];break;}
    case 'number_pyramid':b.base=Array.from({length:grade===1?2+rng.nextInt(0,1):Math.min(4,grade+1)},()=>rng.nextInt(1,grade<=2?5:10));prompt='Her üst kutu, altındaki iki komşu kutunun toplamıdır. En üstte ne olmalı?';steps=['Komşu alt kutuları toplayarak bir üst sırayı doldur.','Aynı toplama kuralını en üst kutuya kadar uygula.'];break;
    case 'shape_equation':case 'balance_scale':{const x=rng.nextInt(1,grade<=1?4:8),y=rng.nextInt(1,grade<=1?4:8),a=rng.nextInt(1,grade<=1?3:4);b.equations=[[a,0,a*x],[1,1,x+y]];b.expression=grade<=2?[0,1]:rng.pick([[1,1],[1,2],[2,1]]);prompt=type==='balance_scale'?'Dengeli terazilerde aynı şekil aynı ağırlıktadır. Sorulan ağırlığı bul.':'Aynı şekil aynı sayıdır. Eşitlikleri kullanarak son işlemi bul.';steps=[`${a} kare ${a*x} eder; bir kare ${x} olur.`,`Kare ve daire toplamı ${x+y}; daire ${x+y} − ${x} = ${y}.`,`Son işlem: ${b.expression[0]*x} + ${b.expression[1]*y} = ${b.expression[0]*x+b.expression[1]*y}.`];break;}
    case 'operation_machine':{const m=grade<=1?1:rng.nextInt(1,grade),c=rng.nextInt(1,grade<=1?8:10),inputs=rng.pickUnique(Array.from({length:8},(_,i)=>i+1),3);b.examples=inputs.slice(0,2).map(x=>[x,m*x+c]);b.input=inputs[2];prompt='Makine bütün örneklere aynı işlemi uyguluyor. Son girişin çıkışı nedir?';steps=[`Her giriş ${m} ile çarpılıp ${c} ekleniyor.`,`Son çıkış: ${b.input} × ${m} + ${c} = ${b.input*m+c}.`];break;}
    case 'gear_rotation':b.gears=Array.from({length:grade<=1?3:Math.min(6,grade+2)},()=>rng.nextInt(6,12));b.direction=rng.pick([-1,1]);b.target=rng.nextInt(1,b.gears.length-1);prompt=`Birinci çark ok yönünde dönüyor. ${b.target+1}. çark hangi yönde döner?`;steps=['Birbirine değen iki çark zıt yönlerde döner.','Her temas noktasında yönü ters çevirerek hedef çarka ulaş.'];break;
    case 'logical_sequence':{const names=rng.pickUnique(['Ada','Ece','Ali','Can','Efe','İpek','Oya','Mert','Lale','Arda','Ela','Bora'],grade<=2?3:4),ordered=rng.shuffle(names);b.names=names;b.clues=rng.shuffle(ordered.slice(1).map((name,i)=>[ordered[i],name] as [string,string]));b.position=rng.nextInt(0,names.length-1);prompt=`İpuçlarındaki sırayı kur. ${b.position+1}. sırada kim bulunur?`;steps=['Her ipucunda ikinci kişi, birinci kişinin hemen ardından gelir.','Bütün ipuçlarını tek sırada birleştir; istenen konumu seç.'];candidates=[...names,...['Deniz','Umut']].slice(0,4).map(textNumber=>({textNumber}));break;}
    case 'word_scramble_logic':{const length=rng.nextInt(3,grade<=1?3:grade<=2?4:6),vocabulary=['ARI','AYI','KUM','TOP','KAR','BAL','DAL','YOL','GÖL','TAŞ','GÜL','CAN','EVİ','SES','GÖZ','DİŞ','SÜT','MUZ','NAR','YÜZ','GÜN','YAZ','KIŞ','TAÇ','ÇAY','YÜN','KOL','DİZ','KEK','TUZ','SAÇ','MASA','ELMA','OKUL','KAPI','ORMAN','BALIK','KALEM','KİTAP','BULUT','ÇİÇEK','YILDIZ'];const word=rng.pick(vocabulary.filter(w=>w.length===length)),shuffle=rng.shuffle(Array.from(word,(_,i)=>i));b.letters=shuffle.map(i=>word[i]);b.order=Array.from(word,(_,i)=>shuffle.indexOf(i));prompt='Harf kartlarını verilen numara sırasıyla oku. Hangi sözcük oluşur?';steps=['Kodun her numarası bir harf kartını gösterir.','Harfleri kod sırasıyla birleştir; harf ekleme veya çıkarma.'];candidates=[word,...rng.shuffle(vocabulary.filter(w=>w!==word)).slice(0,3)].map(textNumber=>({textNumber}));break;}
    case 'verbal_analogy':b.relation=rng.nextInt(0,2);{const family=ANALOGY_FAMILIES[b.relation],pairs=rng.pickUnique(family,2);b.words=[...pairs[0],pairs[1][0]];prompt=`İlk çiftte ${RELATION_NAMES[b.relation]} ilişkisi var. İkinci çifti tamamla.`;steps=[`${pairs[0][0]} ile ${pairs[0][1]} arasındaki ilişkiyi incele.`,`${pairs[1][0]} için aynı ilişkideki sözcük ${pairs[1][1]}.`];candidates=[pairs[1][1],...rng.shuffle([...new Set(family.map(p=>p[1]))].filter(w=>w!==pairs[1][1])).slice(0,3)].map(textNumber=>({textNumber}));break;}
    case 'maze_path':{for(let attempt=0;attempt<1000;attempt++){b.walls=Array.from({length:size**2},()=>Number(rng.nextBool(.4)));const free=b.walls.flatMap((v,i)=>!v?[i]:[]);if(free.length<5)continue;b.start=rng.pick(free);const r=reachable(b),near=free.filter(i=>i!==b.start&&r.has(i)),far=free.filter(i=>!r.has(i));if(!near.length||far.length<3)continue;b.goals=rng.shuffle([rng.pick(near),...rng.pickUnique(far,3)]);break;}if(!b.goals)throw Error('Tek hedefli labirent üretilemedi.');prompt='Boş hücrelerden yatay veya dikey ilerle. Duvarı aşmadan hangi hedefe ulaşabilirsin?';steps=['Başlangıca bağlı boş hücreleri takip et; çapraz geçiş yoktur.','Duvarla ayrılan hedefleri ele; ulaşılabilen tek hedefi seç.'];candidates=labels.map(textNumber=>({textNumber}));break;}
    case 'figure_completion':{b.size=3;const base=rng.pickUnique(Array.from({length:36},(_,i)=>({shape:Math.floor(i/6),color:i%6})),3);b.missing=rng.nextInt(0,8);b.matrix=Array.from({length:9},(_,i)=>i===b.missing?null:base[(Math.floor(i/3)+i%3)%3]);prompt='Mozaikte her satır bir kutu sola kayıyor. Eksik parçayı tamamla.';steps=['Görünen kutuları satırdan satıra aynı kaydırma kuralıyla karşılaştır.','Eksik kutuya gelen şeklin rengini ve biçimini birlikte bul.'];break;}
    case 'matrix_3x3':{const base=rng.pickUnique(Array.from({length:36},(_,i)=>({shape:Math.floor(i/6),color:i%6})),3);b.matrix=Array.from({length:9},(_,i)=>i===8?null:base[(Math.floor(i/3)+i%3)%3]);prompt='Her satırda şekiller bir kutu sola kayıyor. Eksik kutuyu tamamla.';steps=['Birinci satırın son şekli, sonraki satırın ikinci kutusundadır.','Aynı kaydırma kuralını üçüncü satıra uygulayıp eksik şekli seç.'];break;}
    case 'raven_matrix':{const shapes=rng.pickUnique([0,1,2,3,4,5],3),colors=rng.pickUnique([0,1,2,3,4,5],3);b.matrix=Array.from({length:9},(_,i)=>i===8?null:{shape:shapes[Math.floor(i/3)],color:colors[i%3]});prompt='Her satırda şekil, her sütunda renk aynı kalıyor. Eksik kutuda ne olmalı?';steps=['Eksik kutunun satırından şekli bul.','Aynı kutunun sütunundan rengi bul; iki özelliği birlikte kullan.'];break;}
    case 'tangram_puzzle':{
      // Seven genuine tangram pieces; rotations change the constructed silhouette.
      // Display positions are part of the puzzle, never hidden novelty metadata.
      b.pieces=TANGRAM.map(p=>{const turns=rng.nextInt(0,3);return p.map(([x,y])=>{for(let t=0;t<turns;t++)[x,y]=[4-y,x];return [x,y];});});b.missing=rng.nextInt(0,6);
      prompt='Yedi tangram parçasını incele. Kesikli sınırla gösterilen parçayı aynı yönde seç.';steps=['Boş bölgenin kenarlarını ve köşelerini karşılaştır.','Seçtiğin parça aynı yönde olmalı; kenarlar boşluk bırakmadan örtüşmeli.'];break;
    }
  }
  let answer:CompleteValue;
  answer=solveComplete(b,candidates);
  const choices:CompleteValue[]=[answer];const add=(v:CompleteValue)=>{if(validCompleteValue(v)&&!choices.some(c=>same(c,v))&&!independentlyMatchesComplete(b,v))choices.push(v);};
  for(const v of candidates)add(v);
  if('textNumber' in answer){
    if(typeof answer.textNumber==='number')for(const n of rng.shuffle([1,2,3,4,5,-1,-2,-3]))add({textNumber:answer.textNumber+n});
    else if(type==='gear_rotation'){for(const textNumber of ['Saat yönü','Saat yönünün tersi','Dönmez','İki yönde dönüşümlü'])add({textNumber});}
    else if(type==='detail_detection')for(let i=0;i<size**2;i++)add({textNumber:`${Math.floor(i/size)+1}. satır, ${i%size+1}. sütun`});
  }else if(answer.curriculum==='grid'){
    for(let i=0;i<size**2&&choices.length<4;i++){const cells=[...answer.cells];cells[i]=(cells[i]+1)%7;add(grid(b,cells));}
  }else if(answer.curriculum==='token')for(const shape of rng.shuffle([0,1,2,3,4,5]))for(const color of rng.shuffle([0,1,2,3,4,5]))add({curriculum:'token',shape,color});
  else {for(const points of TANGRAM)add(piece(points));for(let turn=1;turn<=3;turn++){let points=answer.points.map(p=>[...p]);for(let t=0;t<turn;t++)points=points.map(([x,y])=>[4-y,x]);add(piece(points));}}
  if(choices.length<4)throw Error('Dört ayırt edilebilir seçenek üretilemedi.');
  const options=rng.shuffle(choices.slice(0,4)).map((visualData,i)=>({id:labels[i],label:labels[i],visualData,fingerprint:key(visualData)}));
  const matches=options.filter(o=>independentlyMatchesComplete(b,o.visualData));
  if(matches.length!==1||!same(matches[0].visualData,answer))throw Error('Bağımsız aday denetimi tek doğru şık vermedi.');
  return {id:`${type}-curr1-g${grade}-d${difficulty}-s${seed}`,version:1,type,category:TOPIC_CATEGORY[type],seed,difficulty,targetGrade:grade,targetGrades:[grade],ageGroup:grade<=2?'1-2':'3-4',prompt,options,correctOptionId:matches[0].id,explanation:{ruleTitle:QUESTION_TYPE_LABELS[type],summary:steps.join(' '),steps},visualConfig:b,skills:[type],estimatedSeconds:30+difficulty*8,status:'draft',authoring:{engine:COMPLETE_ENGINE,objective:prompt,distractorNotes:Object.fromEntries(options.filter(o=>o.id!==matches[0].id).map(o=>[o.id,'Görünür kuralın bir koşulunu ihlal eder.']))}};
}
