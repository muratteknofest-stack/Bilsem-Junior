import type { BaseQuestion, CognitiveCategory, VisualExplanation } from '../../types';
export type LearningMode = 'practice' | 'adaptive' | 'exam';
export type PublicLearningQuestion = Pick<BaseQuestion, 'id' | 'type' | 'category' | 'difficulty' | 'prompt' | 'secondaryPrompt' | 'visualConfig' | 'targetGrade'> & {
  options: Array<Pick<BaseQuestion['options'][number], 'id' | 'label' | 'visualData'>>;
};
export const LEARNING_EXAMS = [
  { id: 'mini', title: 'Kısa deneme', count: 15, seconds: 15 * 60 },
  { id: 'standard', title: 'Tam deneme', count: 30, seconds: 40 * 60 },
  { id: 'marathon', title: 'Uzun deneme', count: 45, seconds: 60 * 60 },
] as const;
export interface LearningResult { totalQuestions: number; correctAnswers: number; wrongAnswers: number; blankAnswers: number; scorePercentage: number; xp: number; totalTimeSeconds: number; }
export interface LearningSessionView {
  id: string; mode: LearningMode; title: string; expiresAt: string; questions: PublicLearningQuestion[];
  answers: Record<string, { response: unknown; correct?: boolean; xp?: number; correctOptionId?: string; explanation?: VisualExplanation }>;
  solutions?: Record<string, { correctOptionId: string; explanation: VisualExplanation }>;
  result: LearningResult | null;
}
/** Answer/finish acknowledgement; immutable puzzle snapshots stay in the client cache. */
export type LearningSessionUpdate = Omit<LearningSessionView, 'questions'>;
export type LearningCategory = CognitiveCategory | 'mixed';
