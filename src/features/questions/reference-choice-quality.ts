import { SeededRNG } from '../../lib/rng';
import type { ObjectId, ReferenceBoard, ReferenceValue } from './reference-lab';

interface Context {
  objects: readonly ObjectId[];
  names: Record<ObjectId,string>;
  toolPairs: ReadonlyArray<readonly [ObjectId,ObjectId]>;
  key: (value:ReferenceValue)=>string;
  matches: (board:ReferenceBoard,value:ReferenceValue)=>boolean;
}
type Choice={value:ReferenceValue;note:string};
/** Wrong answers express actual mistakes; a changed choice never creates a new given. */
export function referenceChoiceSet(b:ReferenceBoard,answer:ReferenceValue,seed:number,c:Context):Choice[]{
  const rng=new SeededRNG(seed+104729),out:Choice[]=[],seen=new Set([c.key(answer)]);
  const add=(value:ReferenceValue,note:string)=>{
    const key=c.key(value);
    if(out.length===3||seen.has(key)||c.matches(b,value))return;
    seen.add(key);out.push({value,note});
  };
  if('textNumber' in answer&&typeof answer.textNumber==='string'){
    const text=answer.textNumber,positions=rng.shuffle(Array.from({length:text.length},(_,i)=>i));
    // Two errors in different positions prevent any single character from
    // uniquely identifying the right answer, including repeated-symbol codes.
    for(const i of positions.slice(0,2)){
      const chars=[...text];chars[i]=String(Number(chars[i])%9+1);
      const source=b.mechanic==='symbol-code'?c.names[b.query[i]]:b.mechanic==='word-code'?b.query[i]:'';
      add({textNumber:chars.join('')},`${i+1}. konumdaki ${source} için ${text[i]} yazılmalı; burada ${chars[i]} kullanılmış.`);
    }
    add({textNumber:[...text].reverse().join('')},'Rakamlar ters sırada yazılmış. Sorgunun soldan sağa sırası korunmalı.');
    add({textNumber:[...text].map(n=>String(Number(n)%9+1)).join('')},'Anahtarın rakamları bir artırılmış. Kodlama sırasında rakamların değeri değiştirilmez.');
  }else if(b.mechanic==='number-memory'){
    const positions=rng.shuffle(b.digits.map((_,i)=>i)).sort((a,d)=>Math.abs(a+1-b.position)-Math.abs(d+1-b.position));
    for(const i of positions)if(i+1!==b.position)add({textNumber:b.digits[i]},`Bu sayı ${i+1}. sıradaydı; soruda ${b.position}. sıra isteniyor.`);
    for(let n=1;n<=9;n++)if(!b.digits.includes(n))add({textNumber:n},'Bu sayı gösterilen dizide bulunmuyordu. Önce sorulan konumdaki sayıyı hatırla.');
  }else if(b.mechanic==='broken-pattern'){
    const bad=b.sequence.findIndex((v,i)=>v!==b.unit[i%b.unit.length]);
    const positions=rng.shuffle(b.sequence.map((_,i)=>i)).sort((a,d)=>Math.abs(a-bad)-Math.abs(d-bad));
    for(const i of positions)add({textNumber:i+1},`${i+1}. karttaki ${c.names[b.sequence[i]]}, tekrar biriminde bu konuma uyar. Değişmesi gereken kart bu değildir.`);
  }else if(b.mechanic==='paired-memory'){
    // Every option was studied. Seeing an unfamiliar object cannot reveal the answer.
    for(const [a,id]of rng.shuffle(b.pairs))if(a!==b.query)add({reference:'object',id},`${c.names[id]}, gösterimde ${c.names[a]} ile eşleşmişti; sorulan ${c.names[b.query]} ile değil.`);
    for(const [id]of rng.shuffle(b.pairs))if(id!==b.query)add({reference:'object',id},`${c.names[id]} gösterimde bir eşleştirmenin sol tarafındaydı. Sorulan nesnenin yanındaki eşi hatırla.`);
  }else if(b.mechanic==='semantic-analogy'){
    // Keep distractors on the same side of the relationship (all tools or all objects).
    for(const [tool,object]of rng.shuffle(c.toolPairs)){
      const id=b.reverse?tool:object;
      add({reference:'object',id},`${c.names[tool]} ile ${c.names[object]} eşleşir. Bu çift, sorulan ${c.names[b.query]} için doğru ilişkiyi kurmaz.`);
    }
  }else if(answer&&'reference'in answer&&answer.reference==='patch'){
    const positions=rng.shuffle(answer.cells.map((_,i)=>i));
    for(const i of positions.slice(0,2))add({...answer,cells:answer.cells.map((v,j)=>i===j?(v+1)%4:v)},`Parçanın ${Math.floor(i/answer.width)+1}. satır, ${i%answer.width+1}. sütunundaki işaret tekrar düzenini bozar.`);
    add({...answer,cells:[...answer.cells].reverse()},'Parçanın işaret sırası ters çevrilmiş. Boşluğun satır ve sütun konumu korunmalı.');
    add({...answer,cells:answer.cells.map(v=>(v+1)%4)},'Parçadaki işaretler örnek desenle aynı konum eşleşmesini sürdürmüyor.');
  }else if(b.mechanic==='parts-union'){
    const sets:number[][]=[];
    const visit=(next:number,set:number[])=>{if(set.length===b.use){sets.push(set);return;}for(let i=next;i<b.pieces.length;i++)visit(i+1,[...set,i]);};visit(0,[]);
    const ranked=rng.shuffle(sets).map(set=>{
      const cells=b.target.map((_,i)=>Number(set.some(j=>b.pieces[j].cells[i])));
      return {set,missing:cells.filter((v,i)=>b.target[i]===1&&v===0).length,extra:cells.filter((v,i)=>b.target[i]===0&&v===1).length};
    }).sort((a,d)=>(a.missing+a.extra)-(d.missing+d.extra));
    for(const {set,missing,extra}of ranked)add({reference:'parts',pieces:set.map(i=>({...b.pieces[i],index:i+1}))},`Bu parçalar birleştiğinde ${missing} hedef hücresi eksik, ${extra} fazladan hücre oluşur. Tam hedefi veren parçaları seç.`);
  }else if('reference'in answer&&answer.reference==='layers'){
    const last=answer.layers.length-1;
    add({...answer,layers:answer.layers.map((l,i)=>i===last-1?answer.layers[last]:i===last?answer.layers[last-1]:l)},'En üstteki iki katmanın sırası değiştirilmiş. Ortada kalan malzeme ve çevresindeki sınırı birlikte izle.');
    add({...answer,layers:answer.layers.map((l,i)=>i===last?{...l,shape:l.shape==='circle'?'square':'circle'}:l)},'Üst katmanın şekli değiştirilmiş. Renk aynı olsa bile dış sınırı verilen yapıyla uyuşmalı.');
    for(let i=last;i>=0;i--)add({...answer,layers:answer.layers.map((l,j)=>i===j?{...l,color:(l.color+1)%6}:l)},`${i+1}. katmanın rengi verilene uymuyor. Alttan üste bütün görünür katmanları karşılaştır.`);
  }
  if(out.length!==3)throw Error('REFERENCE_CHOICE_QUALITY_EXHAUSTED');
  return out;
}
