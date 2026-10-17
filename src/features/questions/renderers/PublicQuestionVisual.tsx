import React from 'react';
import type { BaseQuestion } from '../../../types';
import type { Board } from '../professional-engine';
import type { ColorfulBoard as ColorfulBoardData } from '../colorful-engine';
import type { WorkshopBoard as WorkshopBoardData } from '../workshop-mechanics';
import type { CompleteBoard as CompleteBoardData } from '../complete-curriculum';
import { ProfessionalBoard } from './ProfessionalBoard';
import { ColorfulBoard } from './ColorfulBoard';
import { WorkshopBoard } from './WorkshopBoard';
import { CompleteBoard } from './CompleteBoard';

/** Daily questions render only their public diagram; no answer or seed is needed. */
export function PublicQuestionVisual({ visualConfig }: Pick<BaseQuestion, 'visualConfig'>) {
  const mode = (visualConfig as Record<string, unknown> | null)?.displayMode;
  if (mode === 'colorful_board') return <ColorfulBoard board={visualConfig as ColorfulBoardData}/>;
  if (mode === 'workshop_board') return <WorkshopBoard board={visualConfig as WorkshopBoardData}/>;
  if (mode === 'curriculum_board') return <CompleteBoard board={visualConfig as CompleteBoardData}/>;
  return <ProfessionalBoard board={visualConfig as Board}/>;
}
