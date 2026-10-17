import { englishPuzzle } from '../src/features/international/english-puzzles';
import { randomUUID } from 'node:crypto';
import type { BaseQuestion } from '../src/types';
import { evaluateResponse, type QuestionResponse } from '../src/features/questions/answer-interactions';
import { isQuestionReadyForStudents } from '../src/features/questions/quality';
import { answerXp } from '../src/features/student/gamification-model';
import type { LearningMode, LearningResult, LearningSessionView, LearningSessionUpdate, PublicLearningQuestion } from '../src/features/student/learning-contract';
import type { LearningSelection } from '../src/features/student/learning-selection';
import { publicVisualConfig } from '../src/features/questions/public-visual';

export interface LearningSession {
  id: string; student_id: string; mode: LearningMode; title: string; questions: BaseQuestion[];
  review_mistake_id?: string | null;
  selection?: LearningSelection;
  answers: Record<string, { response: QuestionResponse; correct: boolean; xp: number }>;
  created_at: string; expires_at: string; finished_at: string | null; revision: number; rewarded_xp: number; result: LearningResult | null;
}
export class LearningError extends Error { constructor(message: string, public status = 422) { super(message); } }
export function prepareLearningQuestions(questions: BaseQuestion[]): BaseQuestion[] {
  if (!questions.length || questions.length > 50 || questions.some(q => !isQuestionReadyForStudents(q))) throw new LearningError('Doğrulanmış soru havuzu hazır değil.');
  // IDs in the browser never reveal a deterministic generator seed or bank ID.
  return questions.map(q => ({ ...structuredClone(q), id: randomUUID() }));
}
export function publicLearningQuestion(q: BaseQuestion): PublicLearningQuestion {
  return { id: q.id, type: q.type, category: q.category, difficulty: q.difficulty, prompt: q.prompt,
    ...(q.secondaryPrompt ? { secondaryPrompt: q.secondaryPrompt } : {}), visualConfig: publicVisualConfig(q), targetGrade: q.targetGrade,
    options: q.options.map(({ id, label, visualData }) => ({ id, label, visualData })) };
}
function translatedQuestion(q: BaseQuestion, session: LearningSession) {
  if (session.selection?.locale !== 'en') return q;
  const en = englishPuzzle(q, session.selection.grade);
  return { ...q, prompt: en.prompt, secondaryPrompt: undefined, explanation: {ruleTitle: en.explanation.title, summary: en.explanation.steps.join(' '), steps: en.explanation.steps} };
}
export function learningView(session: LearningSession): LearningSessionView {
  return { ...learningUpdateView(session), questions: session.questions.map(q => publicLearningQuestion(translatedQuestion(q, session))) };
}
export function learningUpdateView(session: LearningSession): LearningSessionUpdate {
  return { id: session.id, mode: session.mode, title: session.selection?.locale === 'en' ? (session.mode === 'exam' ? 'Thinking challenge' : session.mode === 'adaptive' ? 'Guided practice' : 'Thinking practice') : session.title, expiresAt: session.expires_at,
    result: session.result,
    ...(session.finished_at ? { solutions: Object.fromEntries(session.questions.map((q, index) => [index, { correctOptionId: q.correctOptionId, explanation: translatedQuestion(q, session).explanation }])) } : {}),
    answers: Object.fromEntries(Object.entries(session.answers).map(([index, answer]) => {
      const reveal = session.mode !== 'exam' || !!session.finished_at;
      const q = translatedQuestion(session.questions[Number(index)], session);
      return [index, reveal ? { ...answer, correctOptionId: q.correctOptionId, explanation: q.explanation } : { response: answer.response }];
    })) };
}
export function answerLearningSession(session: LearningSession, index: number, response: QuestionResponse | null, now = Date.now()) {
  const q = session.questions[index];
  if (!Number.isInteger(index) || !q) throw new LearningError('Soru bulunamadı.', 404);
  if (session.finished_at) return session; // Retry after finish cannot change the result.
  if (now >= Date.parse(session.expires_at)) throw new LearningError('Çalışmanın süresi doldu. Sonuç ekranına geçebilirsin.', 409);
  if (session.mode !== 'exam' && session.answers[String(index)]) return session;
  if (session.mode === 'exam' && response === null) { const answers = { ...session.answers }; delete answers[String(index)]; return { ...session, answers }; }
  if (session.mode !== 'exam' && index > 0 && !session.answers[String(index - 1)]) throw new LearningError('Önce sıradaki soruyu yanıtla.');
  if (!response) throw new LearningError('Cevabını tamamla ve yeniden gönder.');
  const checked = evaluateResponse(q, response);
  if (!checked.complete) throw new LearningError('Cevabını tamamla ve yeniden gönder.');
  let streak = 1;
  for (let i = index - 1; i >= 0 && session.answers[String(i)]?.correct; i--) streak++;
  const xp = session.mode === 'exam' ? 0 : checked.correct ? answerXp(session.mode, q.difficulty, streak).total + (session.review_mistake_id ? 25 : 0) : 0;
  return { ...session, answers: { ...session.answers, [index]: { response, correct: checked.correct, xp } } };
}
export function finishLearningSession(session: LearningSession, now = Date.now()): LearningSession {
  if (session.finished_at) return session;
  // Questions and correctness always come from the stored server snapshot.
  const answers = Object.values(session.answers), correct = answers.filter(a => a.correct).length;
  const total = session.questions.length, seconds = Math.max(0, Math.floor((Math.min(now, Date.parse(session.expires_at)) - Date.parse(session.created_at)) / 1000));
  const xp = session.mode === 'exam' ? correct * 15 + (answers.length > 0 ? 50 : 0) : answers.reduce((sum, a) => sum + a.xp, 0);
  return { ...session, finished_at: new Date(now).toISOString(), result: { totalQuestions: total, correctAnswers: correct,
    wrongAnswers: answers.length - correct, blankAnswers: total - answers.length, scorePercentage: Math.round(correct / total * 100), xp, totalTimeSeconds: seconds } };
}
export function learningTotals(session: LearningSession) {
  return { xp: session.result?.xp ?? Object.values(session.answers).reduce((sum, a) => sum + a.xp, 0),
    answered: session.mode === 'exam' && !session.finished_at ? 0 : Object.keys(session.answers).length };
}

