import type { BaseQuestion } from '../../types';
function calculate(expression:string):number{
 const tokens=expression.replaceAll('−','-').replaceAll('×','*').match(/\d+|[+*-]/g)||[];
 let i=0;
 const factor=()=>{let sign=1;if(tokens[i]==='-'){sign=-1;i++;}const token=tokens[i++];if(!/^\d+$/.test(token||''))throw Error('Invalid arithmetic');return sign*Number(token);};
 const term=()=>{let value=factor();while(tokens[i]==='*'){i++;value*=factor();}return value;};
 let result=term();while(i<tokens.length){const op=tokens[i++];if(op!=='+'&&op!=='-')throw Error('Invalid arithmetic');const value=term();result+=op==='+'?value:-value;}return result;
}
/** Independently evaluate explicit integer equalities, including multiplication precedence. */
export function checkArithmeticExplanations(q:Pick<BaseQuestion,'explanation'>){
 const text=[q.explanation.summary,...q.explanation.steps].join('\n'),checked:{expression:string;actual:number;stated:number}[]=[],errors:string[]=[];
 const pattern=/(?<![\d.,])(-?\d+(?:\s*[+−×-]\s*-?\d+)+)\s*=\s*(-?\d+)(?!\d)/gu;
 for(const match of text.matchAll(pattern)){
  const actual=calculate(match[1]),stated=Number(match[2]);checked.push({expression:match[0],actual,stated});
  if(!Number.isSafeInteger(actual)||actual!==stated)errors.push(`${match[0]} (hesaplanan: ${actual})`);
 }
 return {checked,errors};
}
