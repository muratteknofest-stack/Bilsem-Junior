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
import { DEFAULT_ADAPTIVE_COUNT, fitsLearningSelection, learningStartSchema, sameLearningSelection, type LearningDifficulty, type LearningSelection } from '../../src/features/student/learning-selection';
import { topicCategory } from '../../src/features/student/learning-topics';
import { questionStimulusKey } from '../../src/features/questions/quality';
import { loadPublishedLearningBank } from '../learning-bank';
import { isQuestionReadyForStudents } from '../../src/features/questions/quality';
import { loadRecentLearningContext, selectLearningQuestions, generateVariedLearningQuestion, gradeChallengeFloor, pickGradeChallenge, currentReasoningCandidate, assertLearningQuestionFormat } from '../learning-question-selection';
import { reasoningDifficultyPlan, professionalGradeTypes } from '../../src/features/questions/reasoning-profile';
import { CURRENT_REASONING_ENGINES } from '../learning-question-selection';
import type { DifficultyLevel } from '../../src/types';
import { ALL_TOPIC_TYPES, topicAllowedForGrade } from '../../src/features/questions/topic-catalog';
import { LEARNING_QUESTION_FORMAT, supportsLabQuestionFormat, needsCurriculumV2Format, supportsReasoningFormat, supportsProfessionalV2Format, needsCurrentQuestionFormat, needsProfessionalV2Format, needsReasoningFormat } from '../../src/features/student/learning-question-format';
import { AVAILABLE_CATEGORIES } from '../../src/features/student/available-categories';
import { QUESTION_TYPE_LABELS, COGNITIVE_CATEGORY_LABELS, type BaseQuestion } from '../../src/types';
import { prepareQuestionReport } from '../support-validation';
import { LearningError, answerLearningSession, finishLearningSession, learningTotals, learningView, learningUpdateView, prepareLearningQuestions, type LearningSession } from '../learning-model';
import { eligibleReward, rewardClaimSchema, rewardDates, type RewardFacts } from '../learning-rewards';
import { weeklyGrandRewardPrefix } from '../../src/lib/weekly-grand-reward';
import { fromSupabaseRow } from '../../src/lib/supabase-shape';
import type { UserProfile } from '../../src/types';
import { createLockedAchievements } from '../../src/services/modules/shared';
import { readPlatformSettings } from '../platform-settings';
import { configuredExams } from '../../src/lib/platform-settings';
import { QuestionDiversityError } from '../../src/features/questions/test-diversity';

const routes = Router();
// Start timing before authentication so slow network/authorization reads are
// visible as well as generation. Never log account IDs, tokens or question data.
routes.post('/learning/start', (_req, res, next) => {
  const started = performance.now();
  let previous = started;
  const stages: Record<string, number> = {};
  res.locals.startTiming = (stage: string) => {
    const now = performance.now();
    stages[stage] = Math.round((now - previous) * 10) / 10;
    previous = now;
    res.setHeader('Server-Timing', [...Object.entries(stages).map(([name, ms]) => `${name};dur=${ms}`), `total;dur=${Math.round(now - started)}`].join(', '));
  };
  res.once('finish', () => console.info('[learning-start]', JSON.stringify({ status: res.statusCode, milliseconds: Math.round(performance.now() - started), stages })));
  next();
});
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
  if(error instanceof QuestionDiversityError)return res.status(422).json({error:error.message,code:error.code,
    requestedCount:error.requestedCount,preparedCount:error.preparedCount});
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
    const timing = res.locals.startTiming as (stage: string) => void;
    timing('auth');
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) throw new LearningError('Çalışma seçenekleri geçersiz.', 400);
    await requireLearningAccess(req.authUser!.uid);
    timing('access');
    const { mode, exam, locale, topic } = parsed.data, student = req.authUser!.uid, client = getServiceClient();
    // These reads are independent, account-scoped, and run only after access is checked.
    const [profile, configuration, active, recent] = await Promise.all([
      client.from('profiles').select('grade').eq('id', student).single(),
      readPlatformSettings(),
      client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', mode).is('finished_at', null).maybeSingle(),
      loadRecentLearningContext(student),
    ]);
    timing('context');
    if (profile.error) throw profile.error;
    if (active.error) throw active.error;
    if (!isSchoolGrade(profile.data.grade)) throw new LearningError('Çalışma için 1–4. sınıf bilgisi gerekli.');
    const grade = profile.data.grade;
    if (parsed.data.expectedGrade !== undefined && parsed.data.expectedGrade !== profile.data.grade) throw new LearningError('Sınıfın başka bir ekranda değişti. Ana sayfaya dönüp yeniden başla.', 409);
    const difficulty = parsed.data.difficulty as LearningDifficulty;
    if (difficulty !== 'mixed' && difficulty > EDUCATION_PROFILES[profile.data.grade].maxDifficulty) throw new LearningError('Bu zorluk seçtiğin sınıf için uygun değil.', 400);
    if (locale === 'en' && topic !== 'mixed') throw new LearningError('Topic selection is available in the Turkish curriculum.', 400);
    // A mixed route stays mixed, including older clients which omit mixCategories.
    // Adaptation adjusts difficulty below; it must not replace the child's area choice.
    const category = topicCategory(topic, mode === 'exam' ? 'mixed' : parsed.data.category);
    const settings = configuredExams(configuration.settings).find(e => e.id === exam)!;
    const requestedCount = mode === 'exam' ? settings.count : mode === 'adaptive' ? parsed.data.questionCount ?? DEFAULT_ADAPTIVE_COUNT : parsed.data.questionCount ?? 5;
    const modern = supportsReasoningFormat(req.query.questionFormat);
    const curriculumV2 = req.query.questionFormat===LEARNING_QUESTION_FORMAT;
    const challengeMode = locale !== 'en' && topic === 'mixed' && difficulty === 'mixed';
    const recommendation=mode==='adaptive'?recommendDifficulty(grade,recent.answers):{adjustment:0 as const,sampleSize:0,accuracy:null,reason:'steady' as const};
    const challengeFloor = Math.max(1,gradeChallengeFloor(grade)+Math.min(0,recommendation.adjustment)) as DifficultyLevel;
    // Fetch only candidates that this client can use; all delivered questions still pass proofs.
    const bank = locale === 'en' ? {questions:englishBankForGrade(grade),bankVersion:ENGLISH_BANK_VERSION} : await loadPublishedLearningBank({ grade, difficulty, category, topic }, {
      ...(modern && topic === 'mixed' ? {types:curriculumV2?ALL_TOPIC_TYPES.filter(type=>topicAllowedForGrade(type,grade)):professionalGradeTypes(grade),engines:CURRENT_REASONING_ENGINES.filter(engine=>curriculumV2||engine!=='curriculum-2')} : {}),
      ...(challengeMode ? {minDifficulty:challengeFloor} : {}),
    });
    timing('bank');
    const seen = new Set<string>();
    const topicCandidates = topic === 'mixed' ? bank.questions : bank.questions.filter(q => {
      if (q.type !== topic || q.targetGrade !== grade || q.category !== category || q.difficulty > EDUCATION_PROFILES[grade].maxDifficulty || (difficulty !== 'mixed' && q.difficulty !== difficulty) || !isQuestionReadyForStudents(q)) return false;
      const key = questionStimulusKey(q);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const count = requestedCount;
    if (topic!=='mixed'&&!topicCandidates.length) throw new LearningError('Seçilen sınıf, konu ve zorlukta yayımlanmış soru yok. Zorluk filtresini değiştirip yeniden dene.', 422);
    const selection: LearningSelection = { ...(modern?{questionFormat:req.query.questionFormat as 'reasoning-8'|'professional-v2'|'reasoning-lab-1'|'reasoning-lab-2'}:{}), ...(parsed.data.mixCategories ? {mixCategories:true} : {}), topic, grade: profile.data.grade, difficulty, category, exam: mode === 'exam' ? exam : '', count, bankVersion: bank.bankVersion, ...(locale === 'en' ? { locale } : {}) };
    // Starting a test always draws a fresh shuffled set. Explicit GET/resume keeps its snapshot.
    const englishReady = (q: BaseQuestion) => (q.visualConfig as Record<string,unknown>)?.displayMode === 'colorful_board' && ENGLISH_AREAS.some(a => a.id === q.type);
    // Respect deliberate easy-level choices and specific-topic filters. For the
    // Turkish mixed-level pool, remove below-grade filler before selection.
    const gradeAppropriate = (q: BaseQuestion) => !challengeMode || q.difficulty >= challengeFloor;
    const formatReady=(q:BaseQuestion)=>needsCurriculumV2Format(q)?curriculumV2:needsCurrentQuestionFormat(q)?supportsLabQuestionFormat(req.query.questionFormat):needsProfessionalV2Format(q)?supportsProfessionalV2Format(req.query.questionFormat):modern||!needsReasoningFormat(q);
    const reasoningReady=(q:BaseQuestion)=>locale==='en'||topic!=='mixed'||currentReasoningCandidate(q,grade,modern,curriculumV2);
    let candidates = topicCandidates.filter(q => fitsLearningSelection(q, selection) && gradeAppropriate(q) && formatReady(q)&&reasoningReady(q) && (locale !== 'en' || englishReady(q)));
    // Prefer the refreshed bank for focused practice when it can fill the whole
    // request. Keep the complete legacy pool for installed clients and long tests.
    if (curriculumV2 && topic !== 'mixed') {
      const refreshed = candidates.filter(q=>q.authoring?.engine==='curriculum-2');
      if (refreshed.length >= count) candidates = refreshed;
    }
    if (locale === 'en' && candidates.length < count) throw new LearningError('This activity is not available in English at this level. Try mixed practice.', 422);
    const exposure = recent.exposure;
    // A candidate may be inspected more than once, but its immutable snapshot needs one audit here.
    // prepareLearningQuestions independently checks the final delivery boundary again.
    const checked = new WeakMap<BaseQuestion, boolean>();
    const canUse = (q: BaseQuestion) => {
      const previous = checked.get(q);
      if (previous !== undefined) return previous;
      const valid = fitsLearningSelection(q, selection) && gradeAppropriate(q) && formatReady(q) && reasoningReady(q) &&
        isQuestionReadyForStudents(q) && (locale !== 'en' || englishReady(q));
      checked.set(q, valid); return valid;
    };
    const questions = selectLearningQuestions({ count, preferDiverseTypes:topic === 'mixed' && locale !== 'en', allowGeneration: topic === 'mixed'&&locale!=='en', category: category as 'mixed' | typeof AVAILABLE_CATEGORIES[number],
      // Prefer diverse mechanics, then reinforce them with different verified puzzles.
      // One style per test makes long tests and single-topic practice impossible.
      requireDistinctStyles: false,
      redistributeRepeatedCategories: topic === 'mixed' && category === 'mixed',
      ...(challengeMode?{difficultyPlan:scaffoldDifficultyPlan(adaptDifficultyPlan(grade,reasoningDifficultyPlan(grade,count,randomInt),recommendation))}:{}),
      // Finite, deliberately chosen topic exercises keep their approved review pool.
      // Mixed Turkish tests and adventures always require unseen content.
      repeatPolicy: locale === 'en' || topic !== 'mixed' ? 'oldest-first' : 'unseen',
      ...(locale === 'en' ? {categories:[...new Set(candidates.map(q=>q.category))]} : {}),
      candidates, exposure, canUse,
      generate: (nextCategory,typeCounts,plannedDifficulty,reasoningCounts,acceptCandidate) => {
        if (topic !== 'mixed') throw new LearningError('Seçilen konunun yayımlanmış soruları kullanılmalı.');
        if (locale === 'en') throw new LearningError('English practice is temporarily unavailable. Please try again.', 503);
        const nextDifficulty = plannedDifficulty ?? (difficulty === 'mixed' ? pickGradeChallenge(grade) : difficulty);
        const seed=randomInt(1,2147483647);
        return generateVariedLearningQuestion({grade,category:nextCategory,difficulty:nextDifficulty,seed,typeCounts,reasoningCounts,exposure,acceptCandidate,legacy:!modern,lab:supportsLabQuestionFormat(req.query.questionFormat),curriculumV2});
      },
    });
    timing('assembly');
    const latestProfile = await client.from('profiles').select('grade').eq('id', student).single();
    if (latestProfile.error) throw latestProfile.error;
    if (latestProfile.data.grade !== selection.grade) throw new LearningError('Sınıfın değişti. Yeni sınıfınla tekrar başla.', 409);
    if (active.data) await commit(student, active.data.id, finishLearningSession);
    const now = new Date(), seconds = mode === 'exam' ? settings.seconds : 3600;
    const session = { id: randomUUID(), student_id: student, mode, title: topic !== 'mixed' ? `${QUESTION_TYPE_LABELS[topic]} · ${mode === 'exam' ? 'Konu denemesi' : 'Konu testi'}` : mode === 'exam' ? settings.title : mode === 'adaptive' ? 'Adaptif çalışma' : category === 'mixed' ? 'Karışık pratik' : COGNITIVE_CATEGORY_LABELS[category as keyof typeof COGNITIVE_CATEGORY_LABELS], questions: prepareLearningQuestions(questions), answers: {}, created_at: now.toISOString(), expires_at: new Date(now.getTime() + seconds * 1000).toISOString(), finished_at: null, result: null };
    const inserted = await client.from('learning_sessions').insert({ ...session, selection }).select('*').single();
    if (inserted.error?.code === '23505') { const concurrent = await client.from('learning_sessions').select('*').eq('student_id', student).eq('mode', mode).is('finished_at', null).single(); if (concurrent.error) throw concurrent.error; if (!sameLearningSelection(concurrent.data.selection, selection)) throw new LearningError('Başka bir ekranda farklı bir çalışma başlatıldı. Yeniden dene.', 409); return res.json(learningView(concurrent.data as LearningSession)); }
    if (inserted.error) throw inserted.error;
    timing('save');
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
    const parsed = rewardClaimSchema.safeParse(req.body);
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
      const now = new Date();
      const reward = eligibleReward(parsed.data.kind, parsed.data.id, fromSupabaseRow('profiles', profile.data) as UserProfile, facts.data as RewardFacts, { masteries: JSON.parse(values.yapyap_mastery || '[]'), mistakes: JSON.parse(values.yapyap_mistakes || '[]'), categories: JSON.parse(values.zekapark_verified_categories_v1 || '{}') }, now);
      if (parsed.data.kind === 'grand') {
        // Existing noncanonical records count too. New concurrent requests share
        // one canonical key, protected atomically by the database's unique key.
        const previous = await client.from('learning_reward_claims').select('reward_key')
          .eq('student_id', student).like('reward_key', `${weeklyGrandRewardPrefix(rewardDates(now).week)}%`).limit(1);
        if (previous.error) throw previous.error;
        if (!Array.isArray(previous.data)) throw new LearningError('Ödül kaydı doğrulanamadı.', 503);
        if (previous.data.length) return res.json({ xpAwarded: 0 });
      }
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


