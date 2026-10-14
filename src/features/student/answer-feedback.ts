import type { LearningSessionView } from './learning-contract';

export type FeedbackKind = 'correct' | 'incorrect' | 'saved';
export interface AnswerFeedback { id: string; kind: FeedbackKind; streak: number; xp: number; }

/** Only acknowledged server answers may produce correctness feedback. */
export class AnswerFeedbackLedger {
  private seen = new Set<string>();
  private streak = 0;
  take(session: LearningSessionView, index: number): AnswerFeedback | null {
    const answer = session.answers[String(index)];
    if (!answer) return null;
    const id = `${session.id}:${index}:${JSON.stringify(answer.response)}`;
    if (this.seen.has(id)) return null;
    this.seen.add(id);
    if (this.seen.size > 200) this.seen.delete(this.seen.values().next().value!);
    // Exams hide correctness until the final result, even if an unexpected DTO includes it.
    const kind: FeedbackKind = session.mode === 'exam' || typeof answer.correct !== 'boolean'
      ? 'saved' : answer.correct ? 'correct' : 'incorrect';
    if (kind === 'correct') this.streak++;
    else if (kind === 'incorrect') this.streak = 0;
    return { id, kind, streak: this.streak, xp: kind === 'correct' && Number.isFinite(answer.xp) ? Math.max(0, answer.xp!) : 0 };
  }
  reset() { this.seen.clear(); this.streak = 0; }
}

export function feedbackDuration(reducedMotion: boolean | null) { return reducedMotion ? 260 : 620; }
