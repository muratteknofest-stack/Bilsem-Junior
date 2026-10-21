import {z} from 'zod';import type {BaseQuestion,DifficultyLevel} from '../../types';import {SeededRNG} from '../../lib/rng';import {generateVisualFingerprint as fingerprint} from './fingerprint';import {gradeDifficulty,type SchoolGrade} from './quality-policy';
export const symbolicBoardSchema=z.object({displayMode:z.literal('symbolic_v2'),kind:z.literal('shape_equation'),grade:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),mechanic:z.enum(['anchor-chain','eliminate-pair','pair-sums','weighted-chain','four-relations']),queryMode:z.enum(['sum','weighted','difference']),symbols:z.array(z.enum(['circle','square','triangle','diamond'])).min(2).max(4),equations:z.array(z.array(z.number().int().min(0).max(1000))).min(2).max(4),query:z.array(z.number().int().min(-1).max(3)).min(2).max(4)}).strict().superRefine((b,ctx)=>{const n=b.symbols.length;if(new Set(b.symbols).size!==n||b.equations.length!==n||b.query.length!==n||b.equations.some(row=>row.length!==n+1||row.slice(0,n).some(c=>c>3)))ctx.addIssue({code:'custom',message:'Invalid symbolic system dimensions'});});
export type SymbolicBoard=z.infer<typeof symbolicBoardSchema>;
/** Primary solution: Gaussian elimination with pivoting, no stored hidden values. */
export function solveSymbolic(board:unknown):number{
 const b=symbolicBoardSchema.parse(board),n=b.symbols.length,a=b.equations.map(row=>[...row]);
 for(let col=0;col<n;col++){
  let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
  if(Math.abs(a[pivot][col])<1e-9)throw Error('Non-unique symbolic system');[a[col],a[pivot]]=[a[pivot],a[col]];
  const divisor=a[col][col];for(let c=col;c<=n;c++)a[col][c]/=divisor;
  for(let row=0;row<n;row++){if(row===col)continue;const multiple=a[row][col];for(let c=col;c<=n;c++)a[row][c]-=multiple*a[col][c];}
 }
 const values=a.map(row=>row[n]);if(values.some(v=>v<1||Math.abs(v-Math.round(v))>1e-7))throw Error('Invalid symbol values');const answer=b.query.reduce((sum,c,i)=>sum+c*values[i],0);if(Math.abs(answer-Math.round(answer))>1e-7||answer<0)throw Error('Invalid symbolic answer');return Math.round(answer);
}
/** Independent proof: integer determinants / Cramer's rule, not Gaussian output. */
export function independentlySolveSymbolic(board:unknown):number{
 const b=symbolicBoardSchema.parse(board),n=b.symbols.length,m=b.equations.map(row=>row.slice(0,n)),totals=b.equations.map(row=>row[n]);
 const det=(matrix:number[][]):number=>matrix.length===1?matrix[0][0]:matrix[0].reduce((sum,value,col)=>sum+(col%2?-1:1)*value*det(matrix.slice(1).map(row=>row.filter((_,i)=>i!==col))),0);
 const denominator=det(m);if(!denominator)throw Error('Ambiguous symbolic system');
 const numerators=Array.from({length:n},(_,col)=>det(m.map((row,r)=>row.map((v,c)=>c===col?totals[r]:v))));
 if(numerators.some(value=>value%denominator!==0||value/denominator<1))throw Error('Non-positive or fractional symbol value');
 const answer=b.query.reduce((sum,c,i)=>sum+c*numerators[i],0)/denominator;if(!Number.isSafeInteger(answer)||answer<0)throw Error('Invalid independent answer');return answer;
}
const names:Record<SymbolicBoard['symbols'][number],string>={circle:'daire',square:'kare',triangle:'üçgen',diamond:'baklava'};
export function generateSymbolicQuestion(seed:number,requested:DifficultyLevel,grade:SchoolGrade):BaseQuestion{
 if(!Number.isSafeInteger(seed)||seed<1)throw Error('Invalid symbolic seed');const difficulty=gradeDifficulty(grade,requested),rng=new SeededRNG(seed);
 const n=grade===4&&difficulty>=5?4:grade>=3?3:2,values=rng.pickUnique(Array.from({length:grade===1?6:grade===2?9:12},(_,i)=>i+1),n),symbols=rng.shuffle(['circle','square','triangle','diamond'] as const).slice(0,n);
 let matrix:number[][],mechanic:SymbolicBoard['mechanic'];
 if(n===2){const eliminate=grade>=2&&difficulty>=2&&rng.nextBool();matrix=eliminate?[[2,1],[1,1]]:[[2,0],[1,1]];mechanic=eliminate?'eliminate-pair':'anchor-chain';}
 else if(n===3){const weighted=difficulty>=4&&rng.nextBool();matrix=weighted?[[2,1,0],[0,2,1],[1,0,1]]:[[1,1,0],[0,1,1],[1,0,1]];mechanic=weighted?'weighted-chain':'pair-sums';}
 else{matrix=rng.nextBool()?[[1,1,0,0],[0,1,1,0],[0,0,1,1],[1,0,0,2]]:[[2,1,0,0],[0,1,1,0],[0,0,1,1],[1,0,0,1]];mechanic='four-relations';}
 const query=Array<number>(n).fill(1);let queryMode:SymbolicBoard['queryMode']='sum';if(grade>=2&&difficulty>=3){query[0]=2;queryMode='weighted';}if(grade===4&&difficulty>=5){query[n-1]=-1;queryMode='difference';if(values[0]<values[n-1])[values[0],values[n-1]]=[values[n-1],values[0]];}
 const equations=rng.shuffle(matrix.map(coeff=>[...coeff,coeff.reduce((sum,c,i)=>sum+c*values[i],0)]));
 const board:SymbolicBoard={displayMode:'symbolic_v2',kind:'shape_equation',grade,mechanic,queryMode,symbols,equations,query};
 const answer=solveSymbolic(board);if(independentlySolveSymbolic(board)!==answer)throw Error('Independent symbolic proofs disagree');
 const candidates:Array<{value:number;reason:string}>=[{value:query.reduce((sum,c,i)=>sum+Math.abs(c)*values[i],0),reason:'Çıkarma işareti toplama gibi kullanılmış.'},{value:query.reduce((sum,c,i)=>sum+Math.sign(c)*values[i],0),reason:'Tekrarlanan şeklin katsayısı unutulmuş.'},{value:query.reduce((sum,c,i)=>sum+c*values[(i+1)%n],0),reason:'Şekillerin değerleri karıştırılmış.'},...values.map(value=>({value,reason:'Son işlem yerine bir şeklin değeri seçilmiş.'})),{value:answer+1,reason:'Son işlemde bir fazla sayılmış.'},{value:answer-1,reason:'Son işlemde bir eksik sayılmış.'}];
 const wrong:Array<{value:number;reason:string}>=[];for(const c of candidates)if(c.value>=0&&c.value!==answer&&!wrong.some(w=>w.value===c.value)){wrong.push(c);if(wrong.length===3)break;}
 if(wrong.length!==3)throw Error('Symbolic distractors unavailable');
 const choices=rng.shuffle([{value:answer,reason:'Bütün verilenleri ve son işlemi birlikte sağlıyor.'},...wrong]),notes:Record<string,string>={};
 const options=choices.map((choice,index)=>{const id='ABCD'[index],visualData={textNumber:choice.value};notes[id]=choice.reason;return {id,label:id,visualData,fingerprint:fingerprint(visualData)};});
 const correctOptionId=options[choices.findIndex(c=>c.value===answer)].id;
 const expression=query.flatMap((coefficient,i)=>coefficient?[`${coefficient<0?'−':i?'+':''}${Math.abs(coefficient)>1?Math.abs(coefficient)+' × ':''}${names[symbols[i]]}`]:[]).join(' ');
 return {reviewPolicy:'professional-v2',status:'review',id:`symbolic-v2-${grade}-${difficulty}-${seed}`,version:1,type:'shape_equation',category:'numerical',difficulty,ageGroup:grade<=2?'1-2':'3-4',prompt:grade<=2?'Aynı şekiller aynı sayıdır. Eşitlikleri kullanarak son işlemin sonucunu bul.':'Her şekil farklı bir pozitif tam sayıdır. Bütün eşitlikleri birlikte kullan; son işlemdeki katsayı ve işaretlere dikkat et.',options,correctOptionId,explanation:{ruleTitle:mechanic==='eliminate-pair'?'Ortak şekli eleyerek ilişkiyi bul':'Birden fazla eşitliği birlikte çöz',summary:`Son işlem ${expression}; sonucu ${answer}.`,steps:['Bir eşitlikte bulduğun ilişkiyi diğer eşitliklerde kullan. Ortak terimleri iki taraftan da aynı biçimde çıkarabilirsin.',...symbols.map((symbol,i)=>`${names[symbol]} = ${values[i]}.`),...equations.map(row=>`${row.slice(0,n).map((c,i)=>c?`${c} × ${values[i]}`:'').filter(Boolean).join(' + ')} = ${row[n]}.`),`Son işlemi verilen katsayı ve işaretlerle uygula: ${answer}.`]},estimatedSeconds:grade<=2?60:grade===3?100:150,skills:['ilişkisel akıl yürütme','çok adımlı çıkarım','çeldirici denetimi'],seed,visualConfig:board,targetGrade:grade,targetGrades:[grade],authoring:{engine:'symbolic-v2',objective:`${n} farklı sembol ve ${n} bağımsız eşitlikten çıkarım.`,distractorNotes:notes}};
}
