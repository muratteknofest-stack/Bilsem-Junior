import type { LearningSessionView } from './learning-contract';

export type LearningReviewFilter = 'all' | 'incorrect' | 'blank' | 'correct';

/** Keep original indices: solutions and saved answers are keyed by that index. */
export function learningReviewIndices(session: Pick<LearningSessionView, 'questions' | 'answers' | 'result'>, filter: LearningReviewFilter): number[] {
  if (!session.result && filter !== 'all') return [];
  return session.questions.flatMap((_question, index) => {
    const answer = session.answers[String(index)];
    const include = filter === 'all' || (filter === 'blank' ? !answer : filter === 'correct' ? answer?.correct === true : answer?.correct === false);
    return include ? [index] : [];
  });
}
