import type { BaseQuestion } from '../../types';
import { generateVisualFingerprint } from './fingerprint';
import { transformTile, type Board, type Tile } from './professional-engine';

/** Numbers, colours and names do not turn the same reasoning task into a new rule. */
export function questionReasoningKey(q: Pick<BaseQuestion,'type'|'visualConfig'>): string {
  const b=q.visualConfig as Record<string,unknown>;
  let rule: unknown;
  if(b.displayMode==='symbolic_v2')rule={kind:'symbolic-relations',mechanic:b.mechanic,variables:(b.symbols as string[]).length,queryMode:b.queryMode};
  else if(b.displayMode==='verified_board') {
    const v=q.visualConfig as Board;
    if(v.kind==='matrix') {
      const t=v.tiles!;
      const matching: string[]=[];
      for(const op of ['union','xor','intersection'])for(const turn of v.matrixMode?[1,2,3]:[0]) {
        const combine=(a:Tile,z:Tile):Tile=>({size:a.size,cells:a.cells.map((x,i)=>op==='union'?Number(Boolean(x||z.cells[i])):op==='xor'?x^z.cells[i]:x&z.cells[i])});
        if([0,3].every(i=>{
          const tile=turn?transformTile(combine(t[i]!,t[i+1]!),'rotate',turn):combine(t[i]!,t[i+1]!);
          return tile.cells.every((n,j)=>n===t[i+2]!.cells[j]);
        }))matching.push(`${op}:${turn}`);
      }
      rule={kind:v.kind,mode:v.matrixMode||'combine',matching};
    } else if(v.kind==='transform')rule={kind:v.kind,sequence:!!v.sequence,steps:v.transformSteps||[{operation:v.operation,turns:v.operation==='rotate'?v.turns:1}]};
    else if(v.kind==='numbers')rule={kind:v.kind,rule:v.rule,descending:v.values![1]<v.values![0]};
    else if(v.kind==='machine')rule={kind:v.kind,query:v.machineQuery||'output',subtract:v.examples![0][1]*v.examples![1][0]-v.examples![1][1]*v.examples![0][0]<0};
    else if(v.kind==='order')rule={kind:v.kind,people:v.names!.length,clues:v.constraints?.map(c=>c.kind).sort()||['chain'],query:v.position===1||v.position===v.names!.length?'end':'middle'};
    else rule={kind:v.kind,scope:v.countScope,items:v.items?.length,symbols:v.symbols?.length,moves:v.moves?.length,rows:v.base?.length};
  } else if(b.displayMode==='colorful_board')rule={kind:b.kind,mosaicRule:b.mosaicRule,size:(b.source as {size?:number})?.size,layers:(b.layers as unknown[])?.length};
  else rule={mode:b.displayMode,kind:b.kind,size:b.size,folds:b.folds,equations:(b.equations as number[][])?.map(row=>row.slice(0,-1)),cipher:!!b.cipherRows};
  return 'reasoning:'+generateVisualFingerprint({type:q.type==='raven_matrix'?'matrix_3x3':q.type,rule});
}
