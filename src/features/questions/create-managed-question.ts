import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../types';
import { generateQuestionByType } from './generators';

export interface ManagedQuestionInput {
  type: QuestionType;
  seed: number;
  difficulty: DifficultyLevel;
  category: CognitiveCategory;
  targetGrade: 1 | 2 | 3 | 4;
  secondaryPrompt?: string;
  createdAt?: string;
}

export function createManagedQuestion(input: ManagedQuestionInput): BaseQuestion {
  const generated = generateQuestionByType(input.type, input.seed, input.difficulty);
  return {
    ...generated,
    id: `q_${input.type}_${input.seed}_${input.difficulty}_g${input.targetGrade}`,
    category: input.category,
    targetGrade: input.targetGrade,
    targetGrades: [input.targetGrade],
    ageGroup: input.targetGrade <= 2 ? '1-2' : '3-4',
    secondaryPrompt: input.secondaryPrompt?.trim() || generated.secondaryPrompt,
    createdAt: input.createdAt || new Date().toISOString(),
    isCustom: true,
  };
}
