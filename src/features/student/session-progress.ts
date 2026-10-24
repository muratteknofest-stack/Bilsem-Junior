import type { LearningSessionView } from './learning-contract';

export interface SessionProgress { answered: number; streak: number; xp: number; }

/** Count acknowledged answers, independently of the question being visited. */
export function sessionProgress(session: Pick<LearningSessionView, 'questions' | 'answers' | 'mode'>): SessionProgress {
  let answered = 0, streak = 0, xp = 0;
  for (let index = 0; index < session.questions.length; index++) {
    const answer = session.answers[String(index)];
    if (!answer) continue;
    answered++;
    // Exams hide correctness and rewards until their final result.
    if (session.mode === 'exam') continue;
    streak = answer.correct === true ? streak + 1 : 0;
    if (answer.correct === true && Number.isFinite(answer.xp)) xp += Math.max(0, answer.xp!);
  }
  return { answered, streak, xp };
}
