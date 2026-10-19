import type {BaseQuestion} from '../src/types';
import type {ColorfulBoard,ColorfulValue} from '../src/features/questions/colorful-engine';

/** Only displayed cells participate; the stored hidden colour is deliberately ignored. */
export function matchesVisibleMosaic(q:BaseQuestion,value:ColorfulValue):boolean{
 const b=q.visualConfig as ColorfulBoard;
 if(b.kind!=='figure_completion'||b.source?.art!=='mosaic'||value.art!=='swatch'||!Number.isInteger(b.missing))return false;
 const {size,cells}=b.source,groups=new Map<number,number>();
 for(let i=0;i<cells.length;i++){
  const colour=i===b.missing?value.color:cells[i],row=Math.floor(i/size),col=i%size;
  const group=b.mosaicRule==='repeat-column'?row:b.mosaicRule==='shift-column'?(row-col+size)%size:b.mosaicRule==='shift-row'||(!b.mosaicRule&&q.difficulty>=3)?(row+col)%size:col;
  if(groups.has(group)&&groups.get(group)!==colour)return false;
  groups.set(group,colour);
 }
 return groups.size===size;
}

export {checkArithmeticExplanations} from '../src/features/questions/explanation-arithmetic';
