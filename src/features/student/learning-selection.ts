import { z } from 'zod';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, SkillMastery } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from '../questions/quality-policy';
import { LEARNING_TOPICS, type LearningTopic } from './learning-topics';
import { AVAILABLE_CATEGORIES } from './available-categories';

// This is a selection policy version; the server fingerprints the actual published bank.
export const LEARNING_BANK_POLICY = 'published-selection-3';
export type LearningDifficulty = 'mixed' | DifficultyLevel;
export const DEFAULT_ADAPTIVE_COUNT = 10;
export const MAX_LEARNING_QUESTIONS = 50;
/** An explicit story/skill area is a constraint. Only mixed practice chooses a weak area. */
export function selectAdaptiveCategory(requested: CognitiveCategory | 'mixed', masteries: readonly Pick<SkillMastery, 'category' | 'mastery'>[]): CognitiveCategory {
  if (requested !== 'mixed') return requested;
  return [...AVAILABLE_CATEGORIES].sort((a, b) =>
    (masteries.find(m => m.category === a)?.mastery || 0) - (masteries.find(m => m.category === b)?.mastery || 0))[0];
}
export const learningStartSchema = z.object({
  topic: z.enum(['mixed', ...LEARNING_TOPICS]).default('mixed'),
  mode: z.enum(['practice', 'adaptive', 'exam']),
  category: z.enum(['mixed', ...AVAILABLE_CATEGORIES]).default('mixed'),
  exam: z.enum(['mini', 'standard', 'marathon']).default('mini'),
  difficulty: z.union([z.literal('mixed'), z.number().int().min(1).max(6)]).default('mixed'),
  locale: z.enum(['tr', 'en']).optional(),
  expectedGrade: z.number().int().min(1).max(4).optional(),
  questionCount: z.number().int().min(1).max(MAX_LEARNING_QUESTIONS).optional(),
}).strict();
export interface LearningSelection { topic?: LearningTopic; locale?: 'tr'|'en'; grade: SchoolGrade; difficulty: LearningDifficulty; category: string; exam: string; count: number; bankVersion: string; }
export function difficultyChoices(grade: SchoolGrade) {
  const max = EDUCATION_PROFILES[grade].maxDifficulty;
  return Array.from({ length: max }, (_, i) => ({ value: (i + 1) as DifficultyLevel, label: `${i + 1}. seviye · ${i === 0 ? 'Kolay' : i === max - 1 ? 'Zor' : 'Orta'}` }));
}
export function fitsLearningSelection(q: BaseQuestion, selection: LearningSelection) {
  return q.targetGrade === selection.grade && q.difficulty <= EDUCATION_PROFILES[selection.grade].maxDifficulty &&
    (selection.difficulty === 'mixed' || q.difficulty === selection.difficulty) &&
    (selection.category === 'mixed' || q.category === selection.category) &&
    (!selection.topic || selection.topic === 'mixed' || q.type === selection.topic);
}
export function sameLearningSelection(saved: Partial<LearningSelection> | undefined, next: LearningSelection) {
  return !!saved && (Object.keys(next) as Array<keyof LearningSelection>).every(key => key === 'topic' ? (saved.topic || 'mixed') === (next.topic || 'mixed') : saved[key] === next[key]);
}

