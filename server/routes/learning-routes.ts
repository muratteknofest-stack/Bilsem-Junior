import {recommendDifficulty,adaptDifficultyPlan} from '../../src/features/questions/adaptive-difficulty';
import { scaffoldDifficultyPlan } from '../../src/features/questions/test-assembly';
import { englishBankForGrade, ENGLISH_BANK_VERSION } from '../english-learning-bank';
import { ENGLISH_AREAS } from '../../src/features/international/english-content';
import { requireLearningAccess } from '../membership-access';
import { GooglePlayError } from '../google-play-model';
import { sharedRateLimit } from '../shared-rate-limit';
import { Router } from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { authenticatedRateLimitKey } from '../rate-limiters';
import { EDUCATION_PROFILES, isSchoolGrade } from '../../src/features/questions/quality-policy';
import { DEFAULT_ADAPTIVE_COUNT, fitsLearningSelection, learningStartSchema, sameLearningSelection, selectSessionCategory, type LearningDifficulty, type LearningSelection } from '../../src/features/student/learning-selection';
import { topicCategory, topicQuestionCount } from '../../src/features/student/learning-topics';
import { questionStimulusKey } from '../../src/features/questions/quality';
import { loadPublishedLearningBank } from '../learning-bank';
import { isQuestionReadyForStudents } from '../../src/features/questions/quality';
import { loadRecentLearningContext, selectLearningQuestions, generateVariedLearningQuestion, gradeChallengeFloor, pickGradeChallenge, currentReasoningCandidate, assertLearningQuestionFormat } from '../learning-question-selection';
import { reasoningDifficultyPlan } from '../../src/features/questions/reasoning-profile';
import { LEARNING_QUESTION_FORMAT, supportsReasoningFormat, needsProfessionalV2Format, needsReasoningFormat } from '../../src/features/student/learning-question-format';
import { AVAILABLE_CATEGORIES } from '../../src/features/student/available-categories';
import { QUESTION_TYPE_LABELS, COGNITIVE_CATEGORY_LABELS, type BaseQuestion, type SkillMastery } from '../../src/types';
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
  if (error instanceof LearningError || error instanceof GooglePlayError) return res.status(error.status).json({ error: error.message });
  throw error;
}
function requireQuestionFormat(req:AuthenticatedRequest, questions:BaseQuestion[]) {
  assertLearningQuestionFormat(questions,req.query.questionFormat);
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
    const { mode, exam, locale, topic } = parsed.data, student = req.authUser!.uid, client = getServiceClient();
    const profile = await client.from('profiles').select('grade').eq('id', student).single();
    if (profile.error) throw profile.error;
    if (!isSchoolGrade(profile.data.grade)) throw new LearningError('Çalışma için 1–4. sınıf bilgisi gerekli.');
    const grade = profile.data.grade;
    if (parsed.data.expectedGrade !== undefined && parsed.data.expectedGrade !== profile.data.grade) throw new LearningError('Sınıfın başka bir ekranda değişti. Ana sayfaya dönüp yeniden başla.', 409);
    const difficulty = parsed.data.difficulty as LearningDifficulty;
    if (difficulty !== 'mixed' && difficulty > EDUCATION_PROFILES[profile.data.grade].maxDifficulty) throw new LearningError('Bu zorluk seçtiğin sınıf için uygun değil.', 400);
    if (locale === 'en' && topic !== 'mixed') throw new LearningError('Topic selection is available in the Turkish curriculum.', 400);
    let category = topicCategory(topic, mode === 'exam' ? 'mixed' : parsed.data.category);
    if (mode === 'adaptive' && locale !== 'en' && topic === 'mixed') {
      const progress = await client.from('user_private_state').select('values').eq('user_id', student).maybeSingle();
      if (progress.error) throw progress.error;
      let masteries: SkillMastery[] = [];
      try { masteries = JSON.parse(progress.data?.values?.yapyap_mastery || '[]'); } catch { /* Empty history. */ }
      category = selectSessionCategory(category, masteries, parsed.data.mixCategories);
    }
    const configuration = await readPlatformSettings();
    const settings = configuredExams(configuration.settings).find(e => e.id === exam)!;
    const requestedCount = mode === 'exam' ? settings.count : mode === 'adaptive' ? parsed.data.questionCount ?? DEFAULT_ADAPTIVE_COUNT : 5;
    const bank = locale === 'en' ? {questions:englishBankForGrade(grade),bankVersion:ENGLISH_BANK_VERSION} : await loadPublishedLearningBank({ grade: profile.data.grade, difficulty, category, topic });
    const seen = new Set<string>();
    const topicCandidates = topic === 'mixed' ? bank.questions : bank.questions.filter(q => {
      if (q.type !== topic || q.targetGrade !== grade || q.category !== category || q.difficulty > EDUCATION_PROFILES[grade].maxDifficulty || (difficulty !== 'mixed' && q.difficulty !== difficulty) || !isQuestionReadyForStudents(q)) return false;
      const key = questionStimulusKey(q);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const count = topicQuestionCount(topicCandidates, requestedCount, topic);
    if (!count) throw new LearningError('Seçilen sınıf, konu ve zorlukta yayımlanmış soru yok. Zorluk filtresini değiştirip yeniden dene.', 422);
    const modern = supportsReasoningFormat(req.query.questionFormat);
    const selection: LearningSelection = { ...(modern?{questionFormat:req.query.questionFormat as 'reasoning-8'|'professional-v2'}:{}), ...(parsed.data.mixCategories ? {mixCategories:true} : {}), topic, grade: profile.data.grade, difficulty, category, exam: mode === 'exam' ? exam : '', count, bankVersion: bank.bankVersion, ...(locale === 'en' ? { locale } : {}) };
    const active = await client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', mode).is('finished_at', null).maybeSingle();
    if (active.error) throw active.error;
    // Starting a test always draws a fresh shuffled set. Explicit GET/resume keeps its snapshot.
    const englishReady = (q: BaseQuestion) => (q.visualConfig as Record<string,unknown>)?.displayMode === 'colorful_board' && ENGLISH_AREAS.some(a => a.id === q.type);
    // Respect deliberate easy-level choices and specific-topic filters. For the
    // Turkish mixed-level pool, remove below-grade filler before selection.
    const challengeMode = locale !== 'en' && topic === 'mixed' && difficulty === 'mixed';
    const recent=await loadRecentLearningContext(student);
    const recommendation=mode==='adaptive'?recommendDifficulty(grade,recent.answers):{adjustment:0 as const,sampleSize:0,accuracy:null,reason:'steady' as const};
    const challengeFloor = Math.max(1,gradeChallengeFloor(grade)+Math.min(0,recommendation.adjustment));
    const gradeAppropriate = (q: BaseQuestion) => !challengeMode || q.difficulty >= challengeFloor;
    const formatReady=(q:BaseQuestion)=>needsProfessionalV2Format(q)?req.query.questionFormat===LEARNING_QUESTION_FORMAT:modern||!needsReasoningFormat(q);
    const reasoningReady=(q:BaseQuestion)=>locale==='en'||topic!=='mixed'||currentReasoningCandidate(q,grade,modern);
    const candidates = topicCandidates.filter(q => fitsLearningSelection(q, selection) && gradeAppropriate(q) && formatReady(q)&&reasoningReady(q) && (locale !== 'en' || englishReady(q)));
    if (locale === 'en' && candidates.length < count) throw new LearningError('This activity is not available in English at this level. Try mixed practice.', 422);
    const exposure = recent.exposure;
    const questions = selectLearningQuestions({ count, preferDiverseTypes:topic === 'mixed' && locale !== 'en', allowGeneration: topic === 'mixed', category: category as 'mixed' | typeof AVAILABLE_CATEGORIES[number],
      redistributeRepeatedCategories: locale !== 'en' && topic === 'mixed' && category === 'mixed',
      ...(challengeMode?{difficultyPlan:scaffoldDifficultyPlan(adaptDifficultyPlan(grade,reasoningDifficultyPlan(grade,count,randomInt),recommendation))}:{}),
      // Finite, deliberately chosen topic exercises keep their approved review pool.
      // Mixed Turkish tests and adventures always require unseen content.
      repeatPolicy: locale === 'en' || topic !== 'mixed' ? 'oldest-first' : 'unseen',
      ...(locale === 'en' ? {categories:[...new Set(candidates.map(q=>q.category))]} : {}),
      candidates, exposure, canUse: q => fitsLearningSelection(q, selection) && gradeAppropriate(q) && formatReady(q)&&reasoningReady(q)&&isQuestionReadyForStudents(q) && (locale !== 'en' || englishReady(q)),
      generate: (nextCategory,typeCounts,plannedDifficulty,reasoningCounts) => {
        if (topic !== 'mixed') throw new LearningError('Seçilen konunun yayımlanmış soruları kullanılmalı.');
        if (locale === 'en') throw new LearningError('English practice is temporarily unavailable. Please try again.', 503);
        const nextDifficulty = plannedDifficulty ?? (difficulty === 'mixed' ? pickGradeChallenge(grade) : difficulty);
        const seed=randomInt(1,2147483647);
        return generateVariedLearningQuestion({grade,category:nextCategory,difficulty:nextDifficulty,seed,typeCounts,reasoningCounts,exposure,legacy:!modern});
      },
    });
    const latestProfile = await client.from('profiles').select('grade').eq('id', student).single();
    if (latestProfile.error) throw latestProfile.error;
    if (latestProfile.data.grade !== selection.grade) throw new LearningError('Sınıfın değişti. Yeni sınıfınla tekrar başla.', 409);
    if (active.data) await commit(student, active.data.id, finishLearningSession);
    const now = new Date(), seconds = mode === 'exam' ? settings.seconds : 3600;
    const session = { id: randomUUID(), student_id: student, mode, title: topic !== 'mixed' ? `${QUESTION_TYPE_LABELS[topic]} · ${mode === 'exam' ? 'Konu denemesi' : 'Konu testi'}` : mode === 'exam' ? settings.title : mode === 'adaptive' ? 'Adaptif çalışma' : category === 'mixed' ? 'Karışık pratik' : COGNITIVE_CATEGORY_LABELS[category as keyof typeof COGNITIVE_CATEGORY_LABELS], questions: prepareLearningQuestions(questions), answers: {}, created_at: now.toISOString(), expires_at: new Date(now.getTime() + seconds * 1000).toISOString(), finished_at: null, result: null };
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
      try { eligibleReward('badge', b.id, user, facts.data as RewardFacts, progress); return { ...b, unlocked: true, progress: b.maxProgress }; } catch (error) { if (!(error instanceof LearningError || error instanceof GooglePlayError)) throw error; return b; }
    });
    badges.push(...saved.filter(b => b.category === 'weekly'));
    return res.json({ badges, reviewToday: facts.data.reviewToday });
  } catch (error) { return handleError(error, res); }
});
routes.get('/learning/history', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await getServiceClient().from('learning_sessions').select('id,mode,created_at,expires_at,finished_at,result,selection').eq('student_id', req.authUser!.uid).order('created_at', {ascending:false}).limit(50);
  if (error) throw error;
  return res.json({sessions:data});
});
routes.get('/learning/:id' , async (req: AuthenticatedRequest, res) => {
  try { const session=await readSession(req.authUser!.uid, String(req.params.id)); requireQuestionFormat(req,session.questions); return res.json(learningView(session)); } catch (error) { return handleError(error, res); }
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
    requireQuestionFormat(req,[mistake.cachedQuestion]);
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
    const saved = await commit(req.authUser!.uid, String(req.params.id), session => {requireQuestionFormat(req,session.questions);return answerLearningSession(session, parsed.data.index, parsed.data.response);});
    return res.json(req.query.view === 'update' ? learningUpdateView(saved) : learningView(saved));
  } catch (error) { return handleError(error, res); }
});
routes.post('/learning/:id/finish', async (req: AuthenticatedRequest, res) => {
  try {
    if (!z.object({}).strict().safeParse(req.body || {}).success) throw new LearningError('Sonuçlar sunucu tarafından hesaplanır.', 400);
    const saved = await commit(req.authUser!.uid, String(req.params.id), session=>{requireQuestionFormat(req,session.questions);return finishLearningSession(session);});
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

