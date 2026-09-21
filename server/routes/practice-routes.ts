import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { generateQuestion } from '../../src/features/questions/generators';
import { calculateMasteryUpdate, normalizeSkillMastery, selectAdaptiveTarget } from '../../src/features/adaptive/adaptive-engine';
import { createEmptyMasteries, STORAGE_KEYS } from '../../src/services/modules/shared';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, MistakeItem, SkillMastery, UserProfile } from '../../src/types';
import { progressLimiter } from '../rate-limiters';
import { toPublicQuestion } from '../public-question';
import { activityRetentionExpiresAt } from '../retention';
import { getAdminDb, requireAppCheck, requireFirebaseAuth, requireProfileRole, type AuthenticatedRequest } from '../security';

const practiceRoutes = Router();
const guards = [requireFirebaseAuth, requireAppCheck, progressLimiter, requireProfileRole('student')] as const;
const categories = ['pattern', 'matrix', 'spatial', 'logic', 'attention', 'visual_perception', 'numerical', 'memory'] as const;
const categorySchema = z.enum(categories);
const startSchema = z.object({
  context: z.enum(['practice', 'adaptive', 'daily']),
  category: z.union([categorySchema, z.literal('mixed')]),
  difficulty: z.union([z.number().int().min(1).max(6), z.literal('adaptive')]),
  count: z.number().int().min(1).max(20),
  requestId: z.string().uuid(),
}).strict();
const answerSchema = z.object({
  challengeId: z.string().min(1).max(128),
  selectedOptionId: z.string().min(1).max(24),
  requestId: z.string().uuid(),
}).strict();
const nextSchema = z.object({ requestId: z.string().uuid() }).strict();
const mistakeStartSchema = z.object({ requestId: z.string().uuid() }).strict();

function parseStored<T>(values: Record<string, unknown>, key: string, fallback: T): T {
  const raw = values[key];
  if (typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function withoutAnswerSecrets(items: MistakeItem[]): MistakeItem[] {
  return items.map((item) => {
    const { questionSeed: _seed, cachedQuestion: _cached, ...safe } = item;
    return safe;
  });
}

function dayInIstanbul(value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
}

function weekInIstanbul(value = new Date()): string {
  const day = dayInIstanbul(value);
  const date = new Date(`${day}T00:00:00Z`);
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function comboMultiplier(streak: number): number {
  if (streak >= 10) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.25;
  if (streak >= 2) return 1.1;
  return 1;
}

function calculateXp(context: 'practice' | 'adaptive' | 'daily' | 'mistake', difficulty: number, streak: number, correct: boolean): number {
  if (!correct) return 0;
  if (context === 'daily') return 35;
  if (context === 'mistake') return 25;
  const base = (context === 'adaptive' ? 15 : 10) + difficulty * 2;
  const milestones = context === 'adaptive' ? [2, 3, 5, 7, 10] : [2, 3, 5, 7, 10, 15, 20];
  const bonus = milestones.includes(streak)
    ? (context === 'adaptive' ? 25 : 30) + streak * 5
    : 0;
  return Math.round(base * comboMultiplier(streak)) + bonus;
}

practiceRoutes.post('/practice/start', ...guards, async (req: AuthenticatedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Pratik yapılandırması geçersiz.' });
  try {
    const db = getAdminDb();
    const sessionRef = db.collection('practiceSessions').doc(`practice_${parsed.data.requestId.replace(/-/g, '')}`);
    const startFingerprint = JSON.stringify({
      context: parsed.data.context,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      count: parsed.data.count,
    });
    const questions: Array<{ challengeId: string; question: BaseQuestion }> = [];
    for (let index = 0; index < parsed.data.count; index += 1) {
      const difficulty = (parsed.data.difficulty === 'adaptive'
        ? (index < 3 ? 2 : index < 7 ? 3 : 4)
        : parsed.data.difficulty) as DifficultyLevel;
      const category = (parsed.data.category === 'mixed'
        ? categories[index % categories.length]
        : parsed.data.category) as CognitiveCategory;
      const challengeId = sessionRef.collection('questions').doc().id;
      questions.push({
        challengeId,
        question: generateQuestion({ category, difficulty, seed: randomInt(1, 0x1_0000_0000) }),
      });
    }

    const now = Date.now();
    const issued = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(sessionRef);
      if (existing.exists) {
        const session = existing.data()!;
        if (session.userId !== req.authUser!.uid || session.startFingerprint !== startFingerprint) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        const stored = await transaction.get(sessionRef.collection('questions').orderBy('index'));
        if (stored.size !== Number(session.questionCount || 0)) throw new Error('SESSION_INTEGRITY');
        return stored.docs.map((snapshot) => ({
          challengeId: snapshot.id,
          question: snapshot.data().question as BaseQuestion,
        }));
      }

      transaction.create(sessionRef, {
        userId: req.authUser!.uid,
        startRequestId: parsed.data.requestId,
        startFingerprint,
        context: parsed.data.context,
        status: 'active',
        questionCount: questions.length,
        answeredCount: 0,
        consecutiveCorrect: 0,
        correctCount: 0,
        createdAt: now,
        expiresAt: now + 4 * 60 * 60_000,
      });
      questions.forEach(({ challengeId, question }, index) => {
        transaction.create(sessionRef.collection('questions').doc(challengeId), { index, question, answeredAt: null });
      });
      return questions;
    });
    return res.status(201).json({
      sessionId: sessionRef.id,
      questions: issued.map(({ challengeId, question }) => ({
        challengeId,
        ...toPublicQuestion(question, challengeId),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir pratik oturumu için kullanılmış.' });
    }
    if (error instanceof Error && error.message === 'SESSION_INTEGRITY') {
      return res.status(503).json({ error: 'Pratik oturumu bütünlük kontrolünü geçemedi.' });
    }
    console.error('[Practice] start failed:', error);
    return res.status(500).json({ error: 'Güvenli pratik oturumu başlatılamadı.' });
  }
});

practiceRoutes.post('/practice/mistakes/:mistakeId/start', ...guards, async (req: AuthenticatedRequest, res) => {
  const mistakeId = String(req.params.mistakeId || '');
  const parsed = mistakeStartSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{1,400}$/.test(mistakeId) || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Hata tekrar isteği geçersiz.' });
  }
  try {
    const db = getAdminDb();
    const stateRef = db.doc(`users/${req.authUser.uid}/private/state`);
    const vaultRef = db.doc(`mistakeQuestionVault/${req.authUser.uid}/questions/${mistakeId}`);
    const now = Date.now();
    const sessionRef = db.collection('practiceSessions').doc(`mistake_${parsed.data.requestId.replace(/-/g, '')}`);
    const challengeRef = sessionRef.collection('questions').doc('000');
    const question = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(sessionRef);
      if (existing.exists) {
        const session = existing.data()!;
        if (session.userId !== req.authUser!.uid || session.mistakeId !== mistakeId) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        const stored = await transaction.get(challengeRef);
        if (!stored.exists || !stored.data()?.question) throw new Error('SESSION_INTEGRITY');
        return stored.data()!.question as BaseQuestion;
      }

      const [stateSnapshot, vaultSnapshot] = await Promise.all([
        transaction.get(stateRef), transaction.get(vaultRef),
      ]);
      const values = (stateSnapshot.data()?.values || {}) as Record<string, unknown>;
      const mistakes = parseStored<MistakeItem[]>(values, STORAGE_KEYS.MISTAKES, []);
      const mistake = mistakes.find((item) => item.id === mistakeId && !item.resolved);
      const storedQuestion = vaultSnapshot.data()?.question as BaseQuestion | undefined;
      if (!mistake || !storedQuestion || vaultSnapshot.data()?.userId !== req.authUser!.uid) {
        throw new Error('MISTAKE_NOT_FOUND');
      }

      transaction.create(sessionRef, {
        userId: req.authUser!.uid,
        startRequestId: parsed.data.requestId,
        context: 'mistake',
        mistakeId,
        status: 'active',
        questionCount: 1,
        answeredCount: 0,
        consecutiveCorrect: 0,
        correctCount: 0,
        createdAt: now,
        expiresAt: now + 60 * 60_000,
      });
      transaction.create(challengeRef, { index: 0, question: storedQuestion, answeredAt: null });
      return storedQuestion;
    });
    return res.status(201).json({
      sessionId: sessionRef.id,
      questions: [{ challengeId: challengeRef.id, ...toPublicQuestion(question, challengeRef.id) }],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'MISTAKE_NOT_FOUND') {
      return res.status(404).json({ error: 'Tekrar edilebilir hata sorusu bulunamadı.' });
    }
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir hata sorusu için kullanılmış.' });
    }
    if (error instanceof Error && error.message === 'SESSION_INTEGRITY') {
      return res.status(503).json({ error: 'Hata tekrar oturumu bütünlük kontrolünü geçemedi.' });
    }
    console.error('[Practice] mistake retry start failed:', error);
    return res.status(500).json({ error: 'Hata sorusu güvenli biçimde hazırlanamadı.' });
  }
});

practiceRoutes.post('/practice/:sessionId/answer', ...guards, async (req: AuthenticatedRequest, res) => {
  const sessionId = String(req.params.sessionId || '');
  const parsed = answerSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Cevap isteği geçersiz.' });
  }

  try {
    const db = getAdminDb();
    const sessionRef = db.doc(`practiceSessions/${sessionId}`);
    const challengeRef = sessionRef.collection('questions').doc(parsed.data.challengeId);
    const userRef = db.doc(`users/${req.authUser.uid}`);
    const stateRef = db.doc(`users/${req.authUser.uid}/private/state`);
    const outcome = await db.runTransaction(async (transaction) => {
      const [sessionSnapshot, challengeSnapshot, userSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(sessionRef), transaction.get(challengeRef), transaction.get(userRef), transaction.get(stateRef),
      ]);
      const session = sessionSnapshot.data();
      const challenge = challengeSnapshot.data();
      const profile = userSnapshot.data() as UserProfile | undefined;
      if (!session || session.userId !== req.authUser!.uid || session.status !== 'active') throw new Error('SESSION_NOT_FOUND');
      if (Number(session.expiresAt || 0) < Date.now()) throw new Error('SESSION_EXPIRED');
      if (!challenge?.question) throw new Error('CHALLENGE_NOT_FOUND');
      const question = challenge.question as BaseQuestion;
      if (!question.options.some((option) => option.id === parsed.data.selectedOptionId)) throw new Error('INVALID_OPTION');
      if (!profile || profile.role !== 'student') throw new Error('STUDENT_NOT_FOUND');

      const rawState = stateSnapshot.data() || {};
      const values = { ...((rawState.values || {}) as Record<string, unknown>) };
      const defaults = createEmptyMasteries();
      const masteries = parseStored<SkillMastery[]>(values, STORAGE_KEYS.MASTERY, defaults)
        .map((item, index) => normalizeSkillMastery({ ...defaults[index], ...item }));
      const mistakes = withoutAnswerSecrets(parseStored<MistakeItem[]>(values, STORAGE_KEYS.MISTAKES, []));
      if (challenge.answeredAt) {
        const sameRequest = challenge.answerRequestId === parsed.data.requestId
          && challenge.selectedOptionId === parsed.data.selectedOptionId;
        if (!sameRequest) throw new Error('ALREADY_ANSWERED');
        return {
          correct: Boolean(challenge.correct),
          correctOptionId: question.correctOptionId,
          explanation: question.explanation,
          xpAwarded: Number(challenge.xpAwarded || 0),
          consecutiveCorrect: Number(challenge.consecutiveCorrect || 0),
          profile,
          masteries,
          mistakes: mistakes.slice(0, 250),
          idempotent: true,
        };
      }

      const correct = parsed.data.selectedOptionId === question.correctOptionId;
      const consecutiveCorrect = correct ? Number(session.consecutiveCorrect || 0) + 1 : 0;
      const xpAwarded = calculateXp(session.context, question.difficulty, consecutiveCorrect, correct);
      const now = Date.now();
      const today = dayInIstanbul(new Date(now));
      const sameDay = profile.lastPracticeDay === today;
      const yesterday = dayInIstanbul(new Date(now - 86_400_000));
      const twoDaysAgo = dayInIstanbul(new Date(now - 2 * 86_400_000));
      let remainingStreakFreezes = Math.max(0, Number(profile.streakFreezeCount || 0));
      const streak = sameDay ? Number(profile.streak || 0)
        : profile.lastPracticeDay === yesterday
          ? Number(profile.streak || 0) + 1
          : profile.lastPracticeDay === twoDaysAgo && remainingStreakFreezes > 0
            ? (remainingStreakFreezes -= 1, Number(profile.streak || 0) + 1)
            : 1;
      const xp = Math.max(0, Number(profile.xp || 0)) + xpAwarded;
      const nextAnsweredCount = Number(session.answeredCount || 0) + 1;
      const nextCorrectCount = Number(session.correctCount || 0) + (correct ? 1 : 0);
      const completed = session.context !== 'adaptive' && nextAnsweredCount >= Number(session.questionCount || 0);
      const sessionMinutes = completed ? Math.max(1, Math.round((now - Number(session.createdAt || now)) / 60_000)) : 0;

      const masteryIndex = masteries.findIndex((item) => item.category === question.category);
      if (masteryIndex >= 0) {
        masteries[masteryIndex] = calculateMasteryUpdate(masteries[masteryIndex], correct, question.difficulty);
      }
      const newMistakeId = `mistake-${sessionId}-${parsed.data.challengeId}`;
      if (!correct && session.context !== 'mistake' && !mistakes.some((item) => item.questionId === question.id && !item.resolved)) {
        mistakes.unshift({
          id: newMistakeId,
          questionId: question.id,
          questionType: question.type,
          difficulty: question.difficulty,
          category: question.category,
          prompt: question.prompt,
          createdAt: new Date(now).toISOString(),
          reviewed: false,
          resolved: false,
        });
        transaction.set(db.doc(`mistakeQuestionVault/${req.authUser!.uid}/questions/${newMistakeId}`), {
          userId: req.authUser!.uid,
          mistakeId: newMistakeId,
          question,
          createdAt: now,
          expiresAt: activityRetentionExpiresAt(now),
        });
      }

      let resolvedMistake = false;
      if (correct && session.context === 'mistake' && typeof session.mistakeId === 'string') {
        const mistakeIndex = mistakes.findIndex((item) => item.id === session.mistakeId && !item.resolved);
        if (mistakeIndex >= 0) {
          mistakes[mistakeIndex] = {
            ...mistakes[mistakeIndex],
            reviewed: true,
            resolved: true,
            resolvedAt: new Date(now).toISOString(),
          };
          resolvedMistake = true;
          transaction.delete(db.doc(`mistakeQuestionVault/${req.authUser!.uid}/questions/${session.mistakeId}`));
        }
      }
      values[STORAGE_KEYS.MASTERY] = JSON.stringify(masteries);
      values[STORAGE_KEYS.MISTAKES] = JSON.stringify(mistakes.slice(0, 250));

      const weekId = weekInIstanbul(new Date(now));
      const sameWeek = profile.progressWeekId === weekId;
      const weeklyStreakHistory = sameWeek && Array.isArray(profile.weeklyStreakHistory)
        ? [...profile.weeklyStreakHistory].slice(0, 7)
        : [false, false, false, false, false, false, false];
      while (weeklyStreakHistory.length < 7) weeklyStreakHistory.push(false);
      const dayIndex = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
      weeklyStreakHistory[dayIndex] = true;
      const todayCategoryQuestions = {
        ...(sameDay ? (profile.todayCategoryQuestions || {}) : {}),
        [question.category]: Number((sameDay ? profile.todayCategoryQuestions?.[question.category] : 0) || 0) + 1,
      };
      const weeklyCategoryQuestions = {
        ...(sameWeek ? (profile.weeklyCategoryQuestions || {}) : {}),
        [question.category]: Number((sameWeek ? profile.weeklyCategoryQuestions?.[question.category] : 0) || 0) + 1,
      };
      const perfectCompletion = completed && nextCorrectCount === Number(session.questionCount || 0);
      const profileUpdate = {
        xp,
        level: Math.floor(xp / 250) + 1,
        streak,
        longestStreak: Math.max(streak, Number(profile.longestStreak || 0)),
        streakFreezeCount: remainingStreakFreezes,
        weeklyStreakHistory,
        lastPracticeDay: today,
        lastActiveDate: new Date(now).toISOString(),
        todayPracticed: true,
        totalQuestionsSolved: Math.max(0, Number(profile.totalQuestionsSolved || 0)) + 1,
        todayQuestionsSolved: (sameDay ? Math.max(0, Number(profile.todayQuestionsSolved || 0)) : 0) + 1,
        todaySessionsCompleted: (sameDay ? Math.max(0, Number(profile.todaySessionsCompleted || 0)) : 0) + (completed ? 1 : 0),
        todayMinutesSpent: (sameDay ? Math.max(0, Number(profile.todayMinutesSpent || 0)) : 0) + sessionMinutes,
        resolvedMistakesCount: Math.max(0, Number(profile.resolvedMistakesCount || 0)) + (resolvedMistake ? 1 : 0),
        todayMistakesResolved: (sameDay ? Math.max(0, Number(profile.todayMistakesResolved || 0)) : 0) + (resolvedMistake ? 1 : 0),
        todayCategoryQuestions,
        progressWeekId: weekId,
        weeklyCategoryQuestions,
        hardCorrectCount: Math.max(0, Number(profile.hardCorrectCount || 0)) + (correct && question.difficulty >= 4 ? 1 : 0),
        perfectSessionCount: Math.max(0, Number(profile.perfectSessionCount || 0)) + (perfectCompletion ? 1 : 0),
        updatedAt: now,
      };
      transaction.update(userRef, profileUpdate);
      transaction.set(stateRef, { values, updatedAt: now }, { merge: true });
      transaction.update(challengeRef, {
        answeredAt: now,
        answerRequestId: parsed.data.requestId,
        selectedOptionId: parsed.data.selectedOptionId,
        correct,
        xpAwarded,
        consecutiveCorrect,
      });
      transaction.update(sessionRef, {
        answeredCount: nextAnsweredCount,
        consecutiveCorrect,
        correctCount: nextCorrectCount,
        status: completed ? 'completed' : 'active',
        completedAt: completed ? now : null,
        ...(completed ? { expiresAt: activityRetentionExpiresAt(now) } : {}),
        updatedAt: now,
      });
      transaction.create(db.doc(`progressEvents/practice_${sessionId}_${parsed.data.challengeId}`), {
        userId: req.authUser!.uid,
        type: 'question_answered',
        source: session.context,
        sourceId: sessionId,
        challengeId: parsed.data.challengeId,
        category: question.category,
        difficulty: question.difficulty,
        correct,
        xpAwarded,
        occurredAt: now,
        expiresAt: activityRetentionExpiresAt(now),
      });
      return {
        correct,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        xpAwarded,
        consecutiveCorrect,
        profile: { ...profile, ...profileUpdate },
        masteries,
        mistakes: mistakes.slice(0, 250),
        idempotent: false,
      };
    });
    return res.json(outcome);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (['SESSION_NOT_FOUND', 'CHALLENGE_NOT_FOUND'].includes(code)) return res.status(404).json({ error: 'Pratik sorusu bulunamadı.' });
    if (['SESSION_EXPIRED', 'ALREADY_ANSWERED', 'INVALID_OPTION'].includes(code)) return res.status(409).json({ error: 'Bu cevap kabul edilemedi.' });
    console.error('[Practice] answer failed:', error);
    return res.status(500).json({ error: 'Cevap güvenli biçimde puanlanamadı.' });
  }
});

practiceRoutes.post('/practice/:sessionId/next', ...guards, async (req: AuthenticatedRequest, res) => {
  const sessionId = String(req.params.sessionId || '');
  const parsed = nextSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Pratik oturumu geçersiz.' });
  }
  try {
    const db = getAdminDb();
    const sessionRef = db.doc(`practiceSessions/${sessionId}`);
    const stateRef = db.doc(`users/${req.authUser.uid}/private/state`);
    const challengeRef = sessionRef.collection('questions').doc();
    const issued = await db.runTransaction(async (transaction) => {
      const [sessionSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(sessionRef), transaction.get(stateRef),
      ]);
      const session = sessionSnapshot.data();
      if (!session || session.userId !== req.authUser!.uid || session.context !== 'adaptive' || session.status !== 'active') {
        throw new Error('SESSION_NOT_FOUND');
      }
      if (Number(session.expiresAt || 0) < Date.now()) throw new Error('SESSION_EXPIRED');
      if (session.lastNextRequestId === parsed.data.requestId && typeof session.lastIssuedChallengeId === 'string') {
        const previousChallenge = await transaction.get(sessionRef.collection('questions').doc(session.lastIssuedChallengeId));
        if (!previousChallenge.data()?.question) throw new Error('CHALLENGE_NOT_FOUND');
        return {
          challengeId: previousChallenge.id,
          question: previousChallenge.data()!.question as BaseQuestion,
          target: session.lastIssuedTarget,
        };
      }
      if (Number(session.answeredCount || 0) < Number(session.questionCount || 0)) {
        throw new Error('CURRENT_QUESTION_PENDING');
      }
      const values = (stateSnapshot.data()?.values || {}) as Record<string, unknown>;
      const defaults = createEmptyMasteries();
      const masteries = parseStored<SkillMastery[]>(values, STORAGE_KEYS.MASTERY, defaults)
        .map((item, index) => normalizeSkillMastery({ ...defaults[index], ...item }));
      const target = selectAdaptiveTarget(masteries);
      const question = generateQuestion({
        category: target.category,
        difficulty: target.difficulty,
        seed: randomInt(1, 0x1_0000_0000),
      });
      const index = Number(session.questionCount || 0);
      transaction.create(challengeRef, { index, question, answeredAt: null });
      transaction.update(sessionRef, {
        questionCount: index + 1,
        lastNextRequestId: parsed.data.requestId,
        lastIssuedChallengeId: challengeRef.id,
        lastIssuedTarget: target,
        updatedAt: Date.now(),
      });
      return { challengeId: challengeRef.id, question, target };
    });
    return res.status(201).json({
      question: {
        challengeId: issued.challengeId,
        ...toPublicQuestion(issued.question, issued.challengeId),
      },
      target: issued.target,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (['SESSION_NOT_FOUND', 'CHALLENGE_NOT_FOUND'].includes(code)) return res.status(404).json({ error: 'Adaptif oturum bulunamadı.' });
    if (['SESSION_EXPIRED', 'CURRENT_QUESTION_PENDING'].includes(code)) return res.status(409).json({ error: 'Önce mevcut soruyu yanıtlayın.' });
    console.error('[Practice] next adaptive question failed:', error);
    return res.status(500).json({ error: 'Yeni adaptif soru hazırlanamadı.' });
  }
});

export default practiceRoutes;
