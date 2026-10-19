import type { BaseQuestion } from '../../types';
import type { Board } from './professional-engine';
import { orderSatisfies } from './professional-engine';
import { independentlySolveBoard } from './independent-board-solver';
import { isQuestionReadyForStudents } from './quality';

export type AnswerMode = 'choice' | 'place' | 'order' | 'match' | 'number';
export type QuestionResponse =
  | { mode: 'choice' | 'place'; optionId: string | null }
  | { mode: 'order'; slots: (string | null)[] }
  | { mode: 'match'; pairs: Record<string, string | null>; total: string }
  | { mode: 'number'; value: string };

export function interactionModes(q: BaseQuestion): AnswerMode[] {
  const b = q.visualConfig as Board;
  const extra: AnswerMode[] = b?.displayMode !== 'verified_board' ? [] :
    b.kind === 'order' ? ['order'] : b.kind === 'symbols' ? ['match'] :
    ['numbers', 'machine', 'count', 'pyramid'].includes(b.kind) ? ['number'] : [];
  return [...extra, 'place', 'choice'];
}

export function emptyResponse(mode: AnswerMode, q: BaseQuestion): QuestionResponse {
  if (mode === 'order') return { mode, slots: (q.visualConfig as Board).names!.map(() => null) };
  if (mode === 'match') return { mode, pairs: {}, total: '' };
  if (mode === 'number') return { mode, value: '' };
  return { mode, optionId: null };
}

export function placeInOrder(slots: (string | null)[], name: string, index: number): (string | null)[] {
  if (!Number.isInteger(index) || index < 0 || index >= slots.length) return slots;
  return slots.map((item, i) => i === index ? name : item === name ? null : item);
}

function integer(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[+-]?\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return Number.isSafeInteger(n) ? n : null;
}

/** Public question UI checks completeness only. Correctness is evaluated on the server. */
export function isResponseComplete(q: Pick<BaseQuestion, 'visualConfig' | 'options'>, response: QuestionResponse | null): boolean {
  if (!response || !interactionModes(q as BaseQuestion).includes(response.mode)) return false;
  const b = q.visualConfig as Board;
  if (response.mode === 'choice' || response.mode === 'place') return q.options.some(o => o.id === response.optionId);
  if (response.mode === 'order') return Array.isArray(response.slots) && response.slots.length === b.names?.length && response.slots.every(n => typeof n === 'string' && b.names!.includes(n)) && new Set(response.slots).size === response.slots.length;
  if (response.mode === 'number') return integer(response.value) !== null;
  if (response.mode === 'match') return integer(response.total) !== null && !!response.pairs && [...new Set(b.symbols!)].every(s => integer(response.pairs[s]) !== null);
  return false;
}

/** Incomplete or unsupported submissions never earn credit. No caller-supplied correctness flags. */
export function evaluateResponse(q: BaseQuestion, response: QuestionResponse | null) {
  const invalid = { complete: false, correct: false };
  if (!response || !interactionModes(q).includes(response.mode) || !isQuestionReadyForStudents(q)) return invalid;
  const b = q.visualConfig as Board;
  if (response.mode === 'choice' || response.mode === 'place') {
    const complete = q.options.some(o => o.id === response.optionId);
    return { complete, correct: complete && response.optionId === q.correctOptionId };
  }
  const expected = independentlySolveBoard(b);
  if (response.mode === 'order') {
    const slots = response.slots;
    const complete = Array.isArray(slots) && slots.length === b.names!.length &&
      slots.every(n => typeof n === 'string' && b.names!.includes(n)) && new Set(slots).size === slots.length;
    return { complete, correct: complete && orderSatisfies(b, slots as string[]) };
  }
  if (!('textNumber' in expected)) return invalid;
  if (response.mode === 'number') {
    const value = integer(response.value);
    return { complete: value !== null, correct: value !== null && value === expected.textNumber };
  }
  if (response.mode === 'match') {
    const symbols = [...new Set(b.symbols!)];
    const total = integer(response.total);
    const complete = total !== null && !!response.pairs && symbols.every(s => integer(response.pairs[s]) !== null);
    return { complete, correct: complete && total === expected.textNumber &&
      symbols.every(s => integer(response.pairs[s]) === b.key!.find(k => k.symbol === s)!.value) };
  }
  return invalid;
}


export function isResponseEmpty(response: QuestionResponse | null): boolean {
  if (!response) return true;
  if (response.mode === 'choice' || response.mode === 'place') return !response.optionId;
  if (response.mode === 'number') return !response.value.trim();
  if (response.mode === 'order') return response.slots.every(value => !value);
  if (response.mode === 'match') return !response.total.trim() && Object.values(response.pairs).every(value => !value);
  return false;
}
