import type { LearningSessionView, LearningSessionUpdate } from './learning-contract';

export class LearningSessionCache {
  private owner: string | undefined;
  private sessions = new Map<string, LearningSessionView>();
  get(userId: string, sessionId: string) {
    if (this.owner !== userId) return undefined;
    return this.sessions.get(sessionId);
  }
  save(userId: string, payload: LearningSessionView | LearningSessionUpdate): LearningSessionView {
    if (this.owner !== userId) { this.sessions.clear(); this.owner = userId; }
    const previous = this.sessions.get(payload.id);
    const questions = 'questions' in payload ? payload.questions : previous?.questions;
    if (!Array.isArray(questions) || !questions.length || previous &&
      (previous.mode !== payload.mode || previous.expiresAt !== payload.expiresAt)) {
      throw new Error('Çalışma bilgileri doğrulanamadı. Çalışmayı yeniden aç.');
    }
    const session: LearningSessionView = { ...payload, questions };
    this.sessions.delete(session.id);
    this.sessions.set(session.id, session);
    if (this.sessions.size > 8) this.sessions.delete(this.sessions.keys().next().value!);
    return session;
  }
}
