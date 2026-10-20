import type { BaseQuestion } from '../../types';
import type { Board } from '../questions/professional-engine';

export const LEARNING_QUESTION_FORMAT = 'reasoning-8';
export function learningFormatPath(path: string): string {
  return `${path}${path.includes('?')?'&':'?'}questionFormat=${LEARNING_QUESTION_FORMAT}`;
}
/** Older installed apps must not receive a board whose givens they draw differently. */
export function needsReasoningFormat(q: Pick<BaseQuestion,'visualConfig'>): boolean {
  const b=q.visualConfig as Board;
  return b.displayMode==='verified_board' && !!(b.transformSteps || b.matrixMode || b.machineQuery || b.countScope || b.rule==='multiply-add' || b.rule==='interleaved-growing' || b.constraints?.some(c=>c.kind==='notAdjacent'));
}
