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
    else rule={kind:v.kind,scope:v.countScope};
  } else if(b.displayMode==='colorful_board')rule={kind:b.kind,mosaicRule:b.mosaicRule};
  else if(b.displayMode==='curriculum_board')rule={kind:b.kind,axis:b.axis,relation:b.relation,period:b.period};
  else rule={mode:b.displayMode,kind:b.kind,figureTask:b.figureTask,folds:(b.folds as string[]|undefined)?.slice().sort(),equations:(b.equations as number[][])?.length,cipher:!!b.cipherRows};
  // Aliases, grid sizes, names and coefficients must not manufacture novelty.
  let type = ['dice_unfold','spatial_origami'].includes(q.type) ? 'cube-opposite-face' :
    ['paper_folding','punch_folding'].includes(q.type) ? 'fold-and-open' :
    ['matrix_3x3','raven_matrix'].includes(q.type) ? 'matrix-combine' :
    b.kind==='transform' ? 'tile-transform' : q.type;
  if (b.kind==='transform' && b.displayMode==='verified_board') {
    const v=q.visualConfig as Board;
    rule={kind:'transform',sequence:!!v.sequence,steps:v.transformSteps||[{operation:v.operation,turns:v.operation==='rotate'?v.turns:1}]};
  }
  if (b.displayMode==='colorful_board'&&q.type==='mirror_reflection') {
    type='tile-transform';rule={kind:'transform',sequence:false,steps:[{operation:'mirrorX',turns:1}]};
  }
  if (type==='cube-opposite-face')rule={kind:type};
  if (type==='fold-and-open')rule={kind:type,axes:b.axis||(b.folds as string[]|undefined)?.slice().sort()};
  return 'reasoning:'+generateVisualFingerprint({type,rule});
}

/** Broad task style: changing an angle, grid density or clue count is still
 * the same exercise format, even when its precise reasoning rule differs. */
export function questionStyleKey(q: Pick<BaseQuestion,'type'|'visualConfig'>): string {
  const b=q.visualConfig as Record<string,unknown>;
  let style: unknown = q.type;
  if (b.displayMode==='symbolic_v2') style={kind:'symbolic',mechanic:b.mechanic,query:b.queryMode};
  else if (b.displayMode==='verified_board') {
    const v=q.visualConfig as Board;
    style=v.kind==='transform' ? {kind:v.kind,sequence:!!v.sequence,operations:(v.transformSteps||[{operation:v.operation}]).map(s=>s.operation)} :
      v.kind==='numbers' ? {kind:v.kind,rule:v.rule} :
      v.kind==='matrix' ? {kind:v.kind,combined:!!v.matrixMode} :
      v.kind==='machine' ? {kind:v.kind,query:v.machineQuery||'output'} :
      v.kind==='order' ? {kind:v.kind,deduction:!!v.constraints} : {kind:v.kind,scope:v.countScope};
  } else if (b.displayMode==='colorful_board') {
    style=q.type==='mirror_reflection' ? {kind:'transform',sequence:false,operations:['mirrorX']} : {kind:q.type,rule:b.mosaicRule};
  } else if (b.displayMode==='curriculum_board')style={kind:q.type,relation:b.relation,period:b.period,axis:b.axis};
  else if (q.type==='visual_analogy') style={kind:q.type,task:b.figureTask||'legacy'};
  else if (['dice_unfold','spatial_origami'].includes(q.type)) style='cube-opposite-face';
  else if (['paper_folding','punch_folding'].includes(q.type)) style='fold-and-open';
  else if (q.type==='cryptogram') style={kind:q.type,deduction:!!b.cipherRows};
  else if (q.type==='story_logic'||q.type==='weight_comparison') style={kind:'order',deduction:false};
  return 'style:'+generateVisualFingerprint(style);
}
