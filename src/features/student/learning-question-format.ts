import type { BaseQuestion } from '../../types';
import type { Board } from '../questions/professional-engine';

export const LEGACY_REASONING_QUESTION_FORMAT='reasoning-8';
export const PREVIOUS_PROFESSIONAL_QUESTION_FORMAT='professional-v2';
export const LEARNING_QUESTION_FORMAT = 'reasoning-lab-1';
export function supportsProfessionalV2Format(format:unknown){return format===LEARNING_QUESTION_FORMAT||format===PREVIOUS_PROFESSIONAL_QUESTION_FORMAT;}
export function needsCurrentQuestionFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='reasoning_lab';}
export function supportsReasoningFormat(format:unknown){return supportsProfessionalV2Format(format)||format===LEGACY_REASONING_QUESTION_FORMAT;}
export function needsProfessionalV2Format(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='symbolic_v2';}
export function learningFormatPath(path: string): string {
  return `${path}${path.includes('?')?'&':'?'}questionFormat=${LEARNING_QUESTION_FORMAT}`;
}
/** Older installed apps must not receive a board whose givens they draw differently. */
export function needsReasoningFormat(q: Pick<BaseQuestion,'visualConfig'>): boolean {
  const b=q.visualConfig as Board;
  return needsCurrentQuestionFormat(q)||needsProfessionalV2Format(q)||b.displayMode==='verified_board' && !!(b.transformSteps || b.matrixMode || b.machineQuery || b.countScope || b.rule==='multiply-add' || b.rule==='interleaved-growing' || b.constraints?.some(c=>c.kind==='notAdjacent'));
}
