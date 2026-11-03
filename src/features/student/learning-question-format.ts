import type { BaseQuestion } from '../../types';
import type { Board } from '../questions/professional-engine';

export const LEGACY_REASONING_QUESTION_FORMAT='reasoning-8';
export const PREVIOUS_PROFESSIONAL_QUESTION_FORMAT='professional-v2';
export const PREVIOUS_LAB_QUESTION_FORMAT = 'reasoning-lab-1';
export const PREVIOUS_CURRICULUM_QUESTION_FORMAT = 'reasoning-lab-2';
export const PREVIOUS_PERCEPTUAL_QUESTION_FORMAT='perceptual-1';
export const PREVIOUS_CUBE_QUESTION_FORMAT='cube-lab-1';
export const PREVIOUS_REFERENCE_QUESTION_FORMAT='reference-lab-1';
export const PREVIOUS_EXAM_QUESTION_FORMAT='exam-lab-1';
export const LEARNING_QUESTION_FORMAT = 'precision-lab-1';
export function supportsPrecisionFormat(format:unknown){return format===LEARNING_QUESTION_FORMAT;}
export function needsPrecisionFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='precision_lab';}
export function supportsExamFormat(format:unknown){return supportsPrecisionFormat(format)||format===PREVIOUS_EXAM_QUESTION_FORMAT;}
export function needsExamFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='exam_lab';}
export function supportsReferenceFormat(format:unknown){return supportsExamFormat(format)||format===PREVIOUS_REFERENCE_QUESTION_FORMAT;}
export function needsReferenceFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='reference_lab';}
export function supportsCubeFormat(format:unknown){return supportsReferenceFormat(format)||format===PREVIOUS_CUBE_QUESTION_FORMAT;}
export function needsCubeFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='cube_lab';}
export function supportsPerceptualFormat(format:unknown){return supportsCubeFormat(format)||format===PREVIOUS_PERCEPTUAL_QUESTION_FORMAT;}
export function needsPerceptualFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='perceptual_board';}
export function supportsCurriculumV2Format(format:unknown){return supportsPerceptualFormat(format)||format===PREVIOUS_CURRICULUM_QUESTION_FORMAT;}
export function supportsLabQuestionFormat(format:unknown){return supportsCurriculumV2Format(format)||format===PREVIOUS_LAB_QUESTION_FORMAT;}
export function needsCurriculumV2Format(q:Pick<BaseQuestion,'visualConfig'|'authoring'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='curriculum_board'&&q.authoring?.engine==='curriculum-2';}
export function supportsProfessionalV2Format(format:unknown){return supportsLabQuestionFormat(format)||format===PREVIOUS_PROFESSIONAL_QUESTION_FORMAT;}
export function needsCurrentQuestionFormat(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='reasoning_lab';}
export function supportsReasoningFormat(format:unknown){return supportsProfessionalV2Format(format)||format===LEGACY_REASONING_QUESTION_FORMAT;}
export function needsProfessionalV2Format(q:Pick<BaseQuestion,'visualConfig'>){return (q.visualConfig as Record<string,unknown>)?.displayMode==='symbolic_v2';}
export function learningFormatPath(path: string): string {
  return `${path}${path.includes('?')?'&':'?'}questionFormat=${LEARNING_QUESTION_FORMAT}`;
}
/** Older installed apps must not receive a board whose givens they draw differently. */
export function needsReasoningFormat(q: Pick<BaseQuestion,'visualConfig'|'authoring'>): boolean {
  const b=q.visualConfig as Board;
  return needsPrecisionFormat(q)||needsExamFormat(q)||needsReferenceFormat(q)||needsCubeFormat(q)||needsPerceptualFormat(q)||needsCurriculumV2Format(q)||needsCurrentQuestionFormat(q)||needsProfessionalV2Format(q)||b.displayMode==='verified_board' && !!(b.transformSteps || b.matrixMode || b.machineQuery || b.countScope || b.rule==='multiply-add' || b.rule==='interleaved-growing' || b.constraints?.some(c=>c.kind==='notAdjacent'));
}
