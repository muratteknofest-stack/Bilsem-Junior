import type { QuestionResponse } from '../questions/answer-interactions';
import type { LearningSessionView } from './learning-contract';

/** One transaction at a time, including the save → finish → next-session chain. */
export class AnswerRequestGate {
  private pending = false;
  async run<T>(action: () => Promise<T>): Promise<T | null> {
    if (this.pending) return null;
    this.pending = true;
    try { return await action(); }
    finally { this.pending = false; }
  }
}

/** Expiry retries are independent of unrelated UI errors and bounded during an outage. */
export class DeadlineFinishGate {
  private sessionId = '';
  private attempts = 0;
  private nextAttemptAt = 0;
  take(sessionId: string, deadline: number, now: number, busy: boolean) {
    if (sessionId !== this.sessionId) { this.sessionId = sessionId; this.attempts = 0; this.nextAttemptAt = 0; }
    if (!Number.isFinite(deadline) || busy || now < deadline || now < this.nextAttemptAt || this.attempts >= 3) return false;
    this.nextAttemptAt = now + 1000 * 2 ** this.attempts++;
    return true;
  }
}

export function nextUnansweredIndex(session: LearningSessionView, after = -1): number {
  for (let offset = 1; offset <= session.questions.length; offset++) {
    const index = (after + offset) % session.questions.length;
    if (!session.answers[String(index)]) return index;
  }
  return -1;
}

type AnswerApi = {
  answer: (id: string, index: number, response: QuestionResponse) => Promise<LearningSessionView>;
  finish: (id: string) => Promise<LearningSessionView>;
};

/** Advance only after the server acknowledges the answer; reviewing never scores it again. */
export async function saveAndAdvance(
  session: LearningSessionView, index: number, response: QuestionResponse, api: AnswerApi,
  onSaved: (saved: LearningSessionView) => void,
) {
  if (session.result || (session.mode !== 'exam' && session.answers[String(index)])) {
    return { session, index };
  }
  const saved = await api.answer(session.id, index, response);
  onSaved(saved); // Preserve the acknowledged answer even if finishing later fails.
  if (saved.result) return { session: saved, index };
  const next = nextUnansweredIndex(saved, index);
  if (next >= 0) return { session: saved, index: next };
  return { session: await api.finish(saved.id), index };
}
