import { refreshServerRewards } from './reward-service';
import { authenticatedFetch } from '../lib/api-client';
import { auth, db } from '../lib/platform';
import { doc, getDoc } from '../lib/supabase-data';
import { dataService } from './data-service';
import type { LearningCategory, LearningMode, LearningSessionView } from '../features/student/learning-contract';
import type { QuestionResponse } from '../features/questions/answer-interactions';
import type { UserProfile } from '../types';

async function request(path: string, body: unknown): Promise<LearningSessionView> {
  const userId = auth.currentUser?.uid;
  const response = await authenticatedFetch(`/api/learning/${path}`, { method: 'POST', body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Çalışma kaydedilemedi. Yeniden dene.');
  if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti. Çalışmayı yeniden aç.');
  const session = payload as LearningSessionView;
  if (session.mode === 'exam') {
    if (session.result) dataService.clearActiveExam();
    else dataService.saveActiveExam({ status: 'in_progress', sessionId: session.id, questions: session.questions.map(q => ({ id: q.id })), answers: Object.fromEntries(Object.keys(session.answers).map(index => [session.questions[Number(index)].id, 'saved'])) });
  }
  const profile = await getDoc(doc(db, 'users', userId!));
  if (auth.currentUser?.uid !== userId) throw new Error('Hesap değişti.');
  if (profile.exists()) dataService.syncUserFromSupabase(profile.data() as UserProfile);
  await dataService.hydrateUserStateFromSupabase();
  await refreshServerRewards().catch(() => undefined);
  return session;
}
export const learningService = {
  review: (mistakeId: string) => request('review', { mistakeId }),
  start: (mode: LearningMode, category: LearningCategory = 'mixed', exam = 'mini') => request('start', { mode, category, exam }),
  answer: (id: string, index: number, response: QuestionResponse | null) => request(`${id}/answer`, { index, response }),
  finish: (id: string) => request(`${id}/finish`, {}),
  async report(id: string, index: number, reason: string) {
    const response = await authenticatedFetch(`/api/learning/${id}/report`, { method: 'POST', body: JSON.stringify({ index, reason }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Bildirim gönderilemedi.');
  },
};
