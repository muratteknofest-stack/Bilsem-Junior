import { SeededRNG } from '../../lib/rng';
import type { VisualSymbol } from './visual-vocabulary';
export interface SymbolDeduction { cipherRows: VisualSymbol[][]; numberCodes: string[]; querySymbols: VisualSymbol[]; }
export function codePermutations<T>(xs:T[]):T[][] {return xs.length?xs.flatMap((x,i)=>codePermutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];}
export function solveSymbolDeduction(b:SymbolDeduction):string {
  const symbols=[...new Set(b.cipherRows.flat())],digits=[...new Set(b.numberCodes.join(''))];
  if(symbols.length!==3||digits.length!==3||digits.includes('0')||b.cipherRows.length!==4||b.numberCodes.length!==4||b.querySymbols.length!==3||b.cipherRows.some(row=>row.length!==3||new Set(row).size!==3)||b.numberCodes.some(code=>!/^[1-9]{3}$/.test(code)||new Set(code).size!==3)||new Set(b.numberCodes).size!==4||new Set(b.cipherRows.map(r=>r.join(''))).size!==4||b.querySymbols.some(s=>!symbols.includes(s)))throw Error('Şekil kodu verilenleri geçersiz.');
  const mappings=codePermutations(digits).filter(values=>{
    const encoded=b.cipherRows.map(row=>row.map(s=>values[symbols.indexOf(s)]).join('')).sort();
    return encoded.join(',')===[...b.numberCodes].sort().join(',');
  });
  if(mappings.length!==1)throw Error('Şekil kodu tek bir anahtar vermiyor.');
  return b.querySymbols.map(s=>mappings[0][symbols.indexOf(s)]).join('');
}
export function makeSymbolDeduction(seed:number) {
  const rng=new SeededRNG(seed),symbols:VisualSymbol[]=['▲','●','■'],digits=rng.pickUnique(['1','2','3','4','5','6','7','8','9'],3);
  const permutations=codePermutations(symbols);
  for(let attempt=0;attempt<60;attempt++){
    const cipherRows=rng.shuffle(permutations).slice(0,4),querySymbols=rng.pick(permutations.filter(row=>!cipherRows.some(r=>r.join('')===row.join(''))));
    const b={cipherRows,querySymbols,numberCodes:rng.shuffle(cipherRows.map(row=>row.map(s=>digits[symbols.indexOf(s)]).join('')))};
    try {const result=solveSymbolDeduction(b);return {...b,extra:codePermutations(digits).map(row=>({textNumber:row.join('')})).filter(v=>v.textNumber!==result)};}catch{}
  }
  throw Error('Tek anahtarlı şekil kodu üretilemedi.');
}
