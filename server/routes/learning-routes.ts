import { requireLearningAccess } from '../shopier-access';
import { ShopierError } from '../shopier-model';
import { sharedRateLimit } from '../shared-rate-limit';
import { Router } from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { authenticatedRateLimitKey } from '../rate-limiters';
import { generateQuestion } from '../../src/features/questions/generators';
import { EDUCATION_PROFILES, isSchoolGrade } from '../../src/features/questions/quality-policy';
import { fitsLearningSelection, learningStartSchema, sameLearningSelection, type LearningDifficulty, type LearningSelection } from '../../src/features/student/learning-selection';
import { loadPublishedLearningBank } from '../learning-bank';
import { isQuestionReadyForStudents } from '../../src/features/questions/quality';
import { loadRecentQuestionExposure, selectLearningQuestions } from '../learning-question-selection';
import { AVAILABLE_CATEGORIES } from '../../src/features/student/available-categories';
import { COGNITIVE_CATEGORY_LABELS, type BaseQuestion, type SkillMastery } from '../../src/types';
import { prepareQuestionReport } from '../support-validation';
import { LearningError, answerLearningSession, finishLearningSession, learningTotals, learningView, learningUpdateView, prepareLearningQuestions, type LearningSession } from '../learning-model';
import { eligibleReward, type RewardFacts } from '../learning-rewards';
import { fromSupabaseRow } from '../../src/lib/supabase-shape';
import type { UserProfile } from '../../src/types';
import { createLockedAchievements } from '../../src/services/modules/shared';
import { readPlatformSettings } from '../platform-settings';
import { configuredExams } from '../../src/lib/platform-settings';

const routes = Router();
routes.use('/learning', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('student'), sharedRateLimit('student-learning', 600, 600), rateLimit({ windowMs: 10 * 60_000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: authenticatedRateLimitKey, message: { error: 'Çalışma istek sınırına ulaşıldı. Biraz sonra yeniden dene.' } }));
const startSchema = learningStartSchema;
const responseSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.enum(['choice', 'place']), optionId: z.string().min(1).max(20) }).strict(),
  z.object({ mode: z.literal('number'), value: z.string().max(16) }).strict(),
  z.object({ mode: z.literal('order'), slots: z.array(z.string().max(80)).min(1).max(12) }).strict(),
  z.object({ mode: z.literal('match'), pairs: z.record(z.string().max(80), z.string().max(16)), total: z.string().max(16) }).strict(),
]);
const answerSchema = z.object({ index: z.number().int().min(0).max(49), response: responseSchema.nullable() }).strict();
async function readSession(student: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw new LearningError('Çalışma bulunamadı.', 404);
  const { data, error } = await getServiceClient().from('learning_sessions').select('*').eq('student_id', student).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new LearningError('Çalışma bulunamadı.', 404);
  return data as LearningSession;
}
async function commit(student: string, id: string, change: (s: LearningSession) => LearningSession) {
  for (let retry = 0; retry < 5; retry++) {
    const current = await readSession(student, id), next = change(current);
    if (current === next) return current;
    const totals = learningTotals(next);
    const { data, error } = await getServiceClient().rpc('commit_learning_session', { p_student: student, p_session: id, p_revision: current.revision, p_answers: next.answers, p_result: next.result, p_xp: totals.xp, p_finished: !!next.finished_at });
    if (error?.code === '22023') throw new LearningError('Çalışma tamamlanmış veya süresi dolmuş. Sonuç ekranını açabilirsin.', 409);
    if (error) throw error;
    if (data) return data as LearningSession;
  }
  throw new LearningError('Başka cihazdaki değişiklik kaydediliyor. Yeniden dene.', 409);
}
function handleError(error: unknown, res: import('express').Response) {
  if (error instanceof LearningError || error instanceof ShopierError) return res.status(error.status).json({ error: error.message });
  throw error;
}
routes.patch('/learning/grade', async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ grade: z.number().int().min(1).max(4) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '1–4 arasında bir sınıf seçmelisin.' });
  const { data, error } = await getServiceClient().rpc('change_student_grade', { p_student: req.authUser!.uid, p_grade: parsed.data.grade });
  if (error) throw error;
  return res.json({ profile: fromSupabaseRow('profiles', data) });
});
routes.post('/learning/start', rateLimit({ windowMs: 60 * 60_000, limit: 120, keyGenerator: authenticatedRateLimitKey, message: { error: 'Biraz dinlenip yeniden çalışmaya başlayabilirsin.' } }), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) throw new LearningError('Çalışma seçenekleri geçersiz.', 400);
    await requireLearningAccess(req.authUser!.uid);
    const { mode, exam } = parsed.data, student = req.authUser!.uid, client = getServiceClient();
    const profile = await client.from('profiles').select('grade').eq('id', student).single();
    if (profile.error) throw profile.error;
    if (!isSchoolGrade(profile.data.grade)) throw new LearningError('Çalışma için 1–4. sınıf bilgisi gerekli.');
    const grade = profile.data.grade;
    if (parsed.data.expectedGrade !== undefined && parsed.data.expectedGrade !== profile.data.grade) throw new LearningError('Sınıfın başka bir ekranda değişti. Ana sayfaya dönüp yeniden başla.', 409);
    const difficulty = parsed.data.difficulty as LearningDifficulty;
    if (difficulty !== 'mixed' && difficulty > EDUCATION_PROFILES[profile.data.grade].maxDifficulty) throw new LearningError('Bu zorluk seçtiğin sınıf için uygun değil.', 400);
    let category = mode === 'exam' ? 'mixed' : parsed.data.category;
    if (mode === 'adaptive') {
      const progress = await client.from('user_private_state').select('values').eq('user_id', student).maybeSingle();
      if (progress.error) throw progress.error;
      let masteries: SkillMastery[] = [];
      try { masteries = JSON.parse(progress.data?.values?.yapyap_mastery || '[]'); } catch { /* Empty history. */ }
      category = [...AVAILABLE_CATEGORIES].sort((a, b) => (masteries.find(m => m.category === a)?.mastery || 0) - (masteries.find(m => m.category === b)?.mastery || 0))[0];
    }
    const configuration = await readPlatformSettings();
    const settings = configuredExams(configuration.settings).find(e => e.id === exam)!;
    const count = mode === 'exam' ? settings.count : mode === 'adaptive' ? 1 : 5;
    const bank = await loadPublishedLearningBank({ grade: profile.data.grade, difficulty, category });
    const selection: LearningSelection = { grade: profile.data.grade, difficulty, category, exam: mode === 'exam' ? exam : '', count, bankVersion: bank.bankVersion };
    const active = await client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', mode).is('finished_at', null).maybeSingle();
    if (active.error) throw active.error;
    if (active.data && Date.parse(active.data.expires_at) > Date.now() && sameLearningSelection(active.data.selection, selection)) return res.json(learningView(active.data as LearningSession));
    if (active.data) await commit(student, active.data.id, finishLearningSession);
    const candidates = bank.questions.filter(q => fitsLearningSelection(q, selection));
    const exposure = await loadRecentQuestionExposure(student);
    const questions = selectLearningQuestions({ count, category: category as 'mixed' | typeof AVAILABLE_CATEGORIES[number],
      candidates, exposure, canUse: q => fitsLearningSelection(q, selection) && isQuestionReadyForStudents(q),
      generate: nextCategory => generateQuestion({ profile: 'professional', targetGrade: grade,
        difficulty: difficulty === 'mixed' ? randomInt(1, EDUCATION_PROFILES[grade].maxDifficulty + 1) as import('../../src/types').DifficultyLevel : difficulty,
        category: nextCategory, seed: randomInt(1, 2147483647) }),
    });
    const latestProfile = await client.from('profiles').select('grade').eq('id', student).single();
    if (latestProfile.error) throw latestProfile.error;
    if (latestProfile.data.grade !== selection.grade) throw new LearningError('Sınıfın değişti. Yeni sınıfınla tekrar başla.', 409);
    const now = new Date(), seconds = mode === 'exam' ? settings.seconds : 3600;
    const session = { id: randomUUID(), student_id: student, mode, title: mode === 'exam' ? settings.title : mode === 'adaptive' ? 'Adaptif çalışma' : category === 'mixed' ? 'Karışık pratik' : COGNITIVE_CATEGORY_LABELS[category as keyof typeof COGNITIVE_CATEGORY_LABELS], questions: prepareLearningQuestions(questions), answers: {}, created_at: now.toISOString(), expires_at: new Date(now.getTime() + seconds * 1000).toISOString(), finished_at: null, result: null };
    const inserted = await client.from('learning_sessions').insert({ ...session, selection }).select('*').single();
    if (inserted.error?.code === '23505') { const concurrent = await client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', mode).is('finished_at', null).single(); if (concurrent.error) throw concurrent.error; if (!sameLearningSelection(concurrent.data.selection, selection)) throw new LearningError('Başka bir ekranda farklı bir çalışma başlatıldı. Yeniden dene.', 409); return res.json(learningView(concurrent.data as LearningSession)); }
    if (inserted.error) throw inserted.error;
    return res.status(201).json(learningView(inserted.data as LearningSession));
  } catch (error) { return handleError(error, res); }
});
routes.get('/learning/rewards', async (req: AuthenticatedRequest, res) => {
  try {
    const client = getServiceClient(), student = req.authUser!.uid;
    const [profile, privateState, facts] = await Promise.all([client.from('profiles').select('*').eq('id', student).single(), client.from('user_private_state').select('values').eq('user_id', student).maybeSingle(), client.rpc('learning_reward_facts', { p_student: student })]);
    if (profile.error || privateState.error || facts.error) throw profile.error || privateState.error || facts.error;
    const values = privateState.data?.values || {}, user = fromSupabaseRow('profiles', profile.data) as UserProfile;
    const progress = { masteries: JSON.parse(values.yapyap_mastery || '[]'), mistakes: JSON.parse(values.yapyap_mistakes || '[]'), categories: JSON.parse(values.zekapark_verified_categories_v1 || '{}') };
    const saved = JSON.parse(values.yapyap_achievements || '[]') as import('../../src/types').Achievement[];
    const badges = createLockedAchievements().map(b => {
      const claimed = saved.find(item => item.id === b.id && item.rewardClaimed);
      if (claimed) return { ...b, ...claimed };
      try { eligibleReward('badge', b.id, user, facts.data as RewardFacts, progress); return { ...b, unlocked: true, progress: b.maxProgress }; } catch (error) { if (!(error instanceof LearningError || error instanceof ShopierError)) throw error; return b; }
    });
    badges.push(...saved.filter(b => b.category === 'weekly'));
    return res.json({ badges, reviewToday: facts.data.reviewToday });
  } catch (error) { return handleError(error, res); }
});
routes.get('/learning/:id', async (req: AuthenticatedRequest, res) => {
  try { return res.json(learningView(await readSession(req.authUser!.uid, String(req.params.id)))); } catch (error) { return handleError(error, res); }
});
routes.post('/learning/review', async (req: AuthenticatedRequest, res) => {
  try {
    await requireLearningAccess(req.authUser!.uid);
    const parsed = z.object({ mistakeId: z.string().min(1).max(150) }).strict().safeParse(req.body);
    if (!parsed.success) throw new LearningError('Tekrar sorusu geçersiz.', 400);
    const client = getServiceClient(), student = req.authUser!.uid;
    const progress = await client.from('user_private_state').select('values').eq('user_id', student).maybeSingle();
    if (progress.error) throw progress.error;
    const mistakes = JSON.parse(progress.data?.values?.yapyap_mistakes || '[]') as Array<{ id: string; resolved: boolean; cachedQuestion: BaseQuestion }>;
    const mistake = mistakes.find(m => m.id === parsed.data.mistakeId);
    if (!mistake || mistake.resolved || !isQuestionReadyForStudents(mistake.cachedQuestion)) throw new LearningError('Bu soru tamamlanmış veya yeniden inceleme bekliyor.');
    const profile = await client.from('profiles').select('grade').eq('id', student).single();
    if (profile.error) throw profile.error;
    if (mistake.cachedQuestion.targetGrade !== profile.data.grade) throw new LearningError('Bu tekrar farklı bir sınıfa ait. İncelemek için profilinden o sınıfı seçebilirsin.', 409);
    const active = await client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', 'practice').is('finished_at', null).maybeSingle();
    if (active.error) throw active.error;
    if (active.data?.review_mistake_id === mistake.id && Date.parse(active.data.expires_at) > Date.now()) return res.json(learningView(active.data as LearningSession));
    if (active.data) await commit(student, active.data.id, finishLearningSession);
    const now = new Date();
    const inserted = await client.from('learning_sessions').insert({ id: randomUUID(), student_id: student, mode: 'practice', title: 'Hata defteri tekrarı', review_mistake_id: mistake.id, questions: prepareLearningQuestions([mistake.cachedQuestion]), expires_at: new Date(now.getTime() + 3600_000).toISOString() }).select('*').single();
    if (inserted.error) throw inserted.error;
    return res.status(201).json(learningView(inserted.data as LearningSession));
  } catch (error) { return handleError(error, res); }
});
routes.post('/learning/rewards/claim', async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = z.object({ kind: z.enum(['badge', 'streak', 'mission', 'weekly', 'grand']), id: z.string().min(1).max(80) }).strict().safeParse(req.body);
    if (!parsed.success) throw new LearningError('Ödül isteği geçersiz.', 400);
    const client = getServiceClient(), student = req.authUser!.uid;
    for (let retry = 0; retry < 5; retry++) {
      const [profile, privateState, facts] = await Promise.all([
        client.from('profiles').select('*').eq('id', student).single(),
        client.from('user_private_state').select('values').eq('user_id', student).maybeSingle(),
        client.rpc('learning_reward_facts', { p_student: student }),
      ]);
      if (profile.error || privateState.error || facts.error) throw profile.error || privateState.error || facts.error;
      const values = privateState.data?.values || {};
      const reward = eligibleReward(parsed.data.kind, parsed.data.id, fromSupabaseRow('profiles', profile.data) as UserProfile, facts.data as RewardFacts, { masteries: JSON.parse(values.yapyap_mastery || '[]'), mistakes: JSON.parse(values.yapyap_mistakes || '[]'), categories: JSON.parse(values.zekapark_verified_categories_v1 || '{}') });
      const oldBadges = JSON.parse(values.yapyap_achievements || '[]') as Array<{ id: string; rewardClaimed?: boolean }>;
      if (reward.badge && oldBadges.some(b => b.id === reward.badge!.id && b.rewardClaimed)) return res.json({ xpAwarded: 0 });
      if (reward.streakDay && profile.data.claimed_streak_days?.includes(reward.streakDay)) return res.json({ xpAwarded: 0 });
      const saved = await client.rpc('claim_learning_reward', { p_student: student, p_key: reward.key, p_xp: reward.xp, p_badge: reward.badge, p_streak_day: reward.streakDay, p_expected_updated_at: profile.data.updated_at });
      if (saved.error) throw saved.error;
      if (saved.data) return res.json(saved.data);
    }
    throw new LearningError('Başka cihazdaki ödül kaydediliyor. Yeniden dene.', 409);
  } catch (error) { return handleError(error, res); }
});
routes.post('/learning/:id/answer', async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) throw new LearningError('Yanıt geçersiz.', 400);
    const saved = await commit(req.authUser!.uid, String(req.params.id), session => answerLearningSession(session, parsed.data.index, parsed.data.response));
    return res.json(req.query.view === 'update' ? learningUpdateView(saved) : learningView(saved));
  } catch (error) { return handleError(error, res); }
});
routes.post('/learning/:id/finish', async (req: AuthenticatedRequest, res) => {
  try {
    if (!z.object({}).strict().safeParse(req.body || {}).success) throw new LearningError('Sonuçlar sunucu tarafından hesaplanır.', 400);
    const saved = await commit(req.authUser!.uid, String(req.params.id), finishLearningSession);
    return res.json(req.query.view === 'update' ? learningUpdateView(saved) : learningView(saved));
  } catch (error) { return handleError(error, res); }
});
routes.post('/learning/:id/report', async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = z.object({ index: z.number().int().min(0).max(49), reason: z.enum(['answer', 'unclear', 'visual', 'level']) }).strict().safeParse(req.body);
    if (!parsed.success) throw new LearningError('Bildirim geçersiz.', 400);
    const session = await readSession(req.authUser!.uid, String(req.params.id)), q = session.questions[parsed.data.index];
    if (!q) throw new LearningError('Soru bulunamadı.', 404);
    const report = prepareQuestionReport({ reason: parsed.data.reason, question: q });
    const { data, error } = await getServiceClient().rpc('submit_support_request', { p_actor: req.authUser!.uid, p_kind: 'question', p_key: report.key, p_payload: { ...report.payload, learningSessionId: session.id } });
    if (error?.code === 'P0001') throw new LearningError('Günlük bildirim sınırına ulaşıldı.', 429);
    if (error) throw error;
    return res.status(201).json({ id: data });
  } catch (error) { return handleError(error, res); }
});
export default routes;

