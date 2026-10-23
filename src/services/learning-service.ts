import { refreshServerRewards } from './reward-service';
import { authenticatedFetch } from '../lib/api-client';
import { auth, db } from '../lib/platform';
import { doc, getDoc } from '../lib/supabase-data';
import { dataService } from './data-service';
import type { LearningCategory, LearningMode, LearningSessionView, LearningSessionUpdate } from '../features/student/learning-contract';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import type { UserProfile } from '../types';
import type { LearningTopic } from '../features/student/learning-topics';
import type { LearningDifficulty } from '../features/student/learning-selection';
import { isSchoolGrade, type SchoolGrade } from '../features/questions/quality-policy';
import { LearningRefreshQueue } from '../features/student/learning-refresh';
import { LearningSessionCache } from '../features/student/learning-session-cache';
import { withRequestDeadline } from '../lib/request-deadline';
import { learningFormatPath } from '../features/student/learning-question-format';
import { readQuestionDiversityError } from '../features/questions/test-diversity';

const sessions = new LearningSessionCache();
export const learningRefresh = new LearningRefreshQueue(() => auth.currentUser?.uid, (userId, isCurrent) => withRequestDeadline(async signal => {
  const profile = await getDoc(doc(db, 'users', userId));
  if (signal.aborted || !isCurrent()) return;
  if (profile.exists()) dataService.syncUserFromSupabase(profile.data() as UserProfile);
  await dataService.hydrateUserStateFromSupabase({ signal });
  if (signal.aborted || !isCurrent()) return;
  await refreshServerRewards(signal);
}));

async function learningApi(path: string, init: RequestInit, milliseconds = 20_000) {
  return withRequestDeadline(async signal => {
    const response = await authenticatedFetch(`/api/learning/${learningFormatPath(path)}`, { ...init, signal });
    const payload = await response.json();
    if (!response.ok) throw readQuestionDiversityError(payload) || new Error(payload.error || 'Çalışma kaydedilemedi. Yeniden dene.');
    return payload;
  }, milliseconds);
}

async function request(path: string, body: unknown): Promise<LearningSessionView> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Bu işlem için giriş yapmalısınız.');
  const update = path.match(/^([^/]+)\/(?:answer|finish)$/);
  const compact = update && sessions.get(userId, update[1]);
  const payload = await learningApi(`${path}${compact ? '?view=update' : ''}`,
    { method: 'POST', body: JSON.stringify(body) }, path === 'start' || path === 'review' ? 45_000 : 20_000);
  if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti. Çalışmayı yeniden aç.');
  if (update && payload.id !== update[1]) throw new Error('Çalışma bilgileri doğrulanamadı.');
  const session = sessions.save(userId, payload as LearningSessionView | LearningSessionUpdate);
  if (session.mode === 'exam') {
    if (session.result) dataService.clearActiveExam();
    else dataService.saveActiveExam({ status: 'in_progress', sessionId: session.id, questions: session.questions.map(q => ({ id: q.id })), answers: Object.fromEntries(Object.keys(session.answers).map(index => [session.questions[Number(index)].id, 'saved'])) });
  }
  // Acknowledged answers must advance even if secondary profile/reward reads fail.
  learningRefresh.schedule(userId);
  return session;
}
export const learningService = {
  async resume(id: string) {
    const userId = auth.currentUser?.uid;
    if (!userId || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Sign in to resume this practice.');
    const payload = await learningApi(id, {method:'GET'});
    if (auth.currentUser?.uid !== userId || payload.id !== id) throw new Error('Account changed. Open the practice again.');
    return sessions.save(userId, payload as LearningSessionView);
  },
  review: (mistakeId: string) => request('review', { mistakeId }),
  start: (mode: LearningMode, category: LearningCategory = 'mixed', exam = 'mini', difficulty: LearningDifficulty = 'mixed', locale?: 'tr'|'en', topic: LearningTopic = 'mixed', questionCount?: number, mixCategories = false) => request('start', { mode, category, exam, difficulty, ...(mixCategories ? {mixCategories:true} : {}), ...(topic !== 'mixed' ? {topic} : {}), ...(locale ? {locale} : {}), ...(mode === 'adaptive' && questionCount !== undefined ? {questionCount} : {}), expectedGrade: dataService.getCurrentUser().grade }),
  async changeGrade(grade: SchoolGrade): Promise<UserProfile> {
    const userId = auth.currentUser?.uid;
    const payload = await learningApi('grade', { method: 'PATCH', body: JSON.stringify({ grade }) });
    if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti. Profilini yeniden aç.');
    if (payload.profile?.id !== userId || payload.profile?.role !== 'student' || !isSchoolGrade(payload.profile?.grade)) throw new Error('Sınıf bilgisi doğrulanamadı.');
    dataService.syncUserFromSupabase(payload.profile);
    dataService.clearActiveExam();
    window.dispatchEvent(new CustomEvent('zekapark-grade-changed', { detail: payload.profile }));
    return payload.profile;
  },
  answer: (id: string, index: number, response: QuestionResponse | null) => request(`${id}/answer`, { index, response }),
  finish: (id: string) => request(`${id}/finish`, {}),
  async report(id: string, index: number, reason: string) {
    await learningApi(`${id}/report`, { method: 'POST', body: JSON.stringify({ index, reason }) });
  },
};
