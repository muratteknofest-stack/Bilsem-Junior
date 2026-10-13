import type { BaseQuestion } from '../src/types';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { publicVisualConfig } from '../src/features/questions/public-visual';

export function publicChallenge(row: { id: string; slot: number; day: string; question: BaseQuestion }) {
  const q = row.question;
  if (!isQuestionReadyForStudents(q)) throw new Error('CHALLENGE_REVIEW_REQUIRED');
  // Allowlist: no generation seed, original ID, answer, explanation, authoring or audit metadata.
  return { id: row.id, slot: row.slot, day: row.day, question: {
    prompt: q.prompt, type: q.type, difficulty: q.difficulty, visualConfig: publicVisualConfig(q),
    options: q.options.map(({ id, label, visualData }) => ({ id, label, visualData })),
  } };
}
export function answeredChallenge(row: { selected_option: string; correct: boolean; points: number; question: BaseQuestion }) {
  return { selectedOptionId: row.selected_option, correct: row.correct, points: row.points,
    correctOptionId: row.question.correctOptionId, explanation: row.question.explanation };
}

