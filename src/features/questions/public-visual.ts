import type { BaseQuestion } from '../../types';
import type { ColorfulBoard, Mosaic } from './colorful-engine';

export type DisplayMosaic = Omit<Mosaic, 'cells'> & { cells: Array<number | null> };
export type DisplayColorfulBoard = Pick<ColorfulBoard, 'displayMode' | 'kind' | 'missing' | 'layers' | 'angles' | 'targetDepth'> & {
  source?: DisplayMosaic | Exclude<ColorfulBoard['source'], Mosaic>;
};

/** Hidden givens belong to the server snapshot, never to the student DTO. */
export function publicVisualConfig(question: Pick<BaseQuestion, 'visualConfig'>): BaseQuestion['visualConfig'] {
  const visual = structuredClone(question.visualConfig);
  const board = visual as unknown as DisplayColorfulBoard | null;
  if (board?.displayMode === 'colorful_board' && board.kind === 'figure_completion') {
    if (board.source?.art === 'mosaic' && Number.isInteger(board.missing)) {
      board.source.cells[board.missing as number] = null;
    }
  }
  return visual;
}
