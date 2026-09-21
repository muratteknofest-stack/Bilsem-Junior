import { randomInt, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateQuestion, generateQuestionForGrade } from '../../src/features/questions/generators';
import { calculateMasteryUpdate, normalizeSkillMastery } from '../../src/features/adaptive/adaptive-engine';
import { createEmptyMasteries, STORAGE_KEYS } from '../../src/services/modules/shared';
import type { BaseQuestion, CognitiveCategory, DifficultyLevel, ExamResult, SkillMastery } from '../../src/types';
import { getExamMode } from '../exam-config';
import { toPublicQuestion } from '../public-question';
import { activityRetentionExpiresAt } from '../retention';
import { progressLimiter } from '../rate-limiters';
import {
  getAdminDb,
  requireAppCheck,
  requireFirebaseAuth,
  requireProfileRole,
  type AuthenticatedRequest,
} from '../security';

const examRoutes = Router();
const examGuards = [requireFirebaseAuth, requireAppCheck, progressLimiter, requireProfileRole('student')] as const;
const categories: CognitiveCategory[] = ['pattern', 'matrix', 'spatial', 'logic', 'attention', 'visual_perception', 'numerical', 'memory'];

const startSchema = z.object({
  modeId: z.string().min(1).max(40),
  requestId: z.string().uuid(),
}).strict();
const submitSchema = z.object({
  answers: z.record(z.string().min(1).max(160), z.string().min(1).max(24)),
}).strict();

function parseStored<T>(values: Record<string, unknown>, key: string, fallback: T): T {
  const raw = values[key];
  if (typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
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

function submissionGraceSeconds(): number {
  const configured = Number(process.env.EXAM_SUBMISSION_GRACE_SECONDS || 120);
  return Number.isInteger(configured) && configured >= 0 && configured <= 300 ? configured : 120;
}

examRoutes.post('/exams/start', ...examGuards, async (req: AuthenticatedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Sınav modu geçersiz.' });
  const mode = getExamMode(parsed.data.modeId);
  if (!mode) return res.status(400).json({ error: 'Sınav modu geçersiz.' });

  try {
    const now = Date.now();
    const db = getAdminDb();
    const attemptRef = db.collection('testAttempts').doc(`exam_${parsed.data.requestId.replace(/-/g, '')}`);
    const generated: Array<{ publicId: string; question: BaseQuestion }> = [];
    for (let index = 0; index < mode.questionCount; index += 1) {
      const difficulty = Math.min(6, Math.floor(index / (mode.questionCount / 4)) + 2) as DifficultyLevel;
      const seed = randomInt(1, 0x1_0000_0000);
      let question: BaseQuestion;
      if (mode.category) {
        question = generateQuestion({ category: mode.category, difficulty, seed });
      } else if (mode.grade) {
        question = generateQuestionForGrade(mode.grade, seed, undefined, difficulty);
      } else {
        question = generateQuestion({ category: categories[index % categories.length], difficulty, seed });
      }
      generated.push({ publicId: randomUUID(), question });
    }

    const issued = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(attemptRef);
      if (existing.exists) {
        const attempt = existing.data()!;
        if (attempt.userId !== req.authUser!.uid || attempt.modeId !== mode.id) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        const stored = await transaction.get(attemptRef.collection('questions').orderBy('index'));
        if (stored.size !== Number(attempt.questionCount || 0)) throw new Error('ATTEMPT_INTEGRITY');
        return stored.docs.map((snapshot) => ({
          publicId: String(snapshot.data().publicId || ''),
          question: snapshot.data().question as BaseQuestion,
        }));
      }

      transaction.create(attemptRef, {
        userId: req.authUser!.uid,
        startRequestId: parsed.data.requestId,
        modeId: mode.id,
        title: mode.title,
        status: 'in_progress',
        questionCount: generated.length,
        durationSeconds: mode.durationMinutes * 60,
        startedAt: now,
        submissionDeadlineAt: now + (mode.durationMinutes * 60 + submissionGraceSeconds()) * 1000,
        expiresAt: Timestamp.fromMillis(now + Math.max(4 * 60 * 60_000, mode.durationMinutes * 120_000)),
      });
      generated.forEach(({ publicId, question }, index) => {
        transaction.create(attemptRef.collection('questions').doc(String(index).padStart(3, '0')), {
          index,
          publicId,
          question,
        });
      });
      return generated;
    });

    return res.status(201).json({
      attemptId: attemptRef.id,
      title: mode.title,
      durationSeconds: mode.durationMinutes * 60,
      questions: issued.map(({ publicId, question }) => toPublicQuestion(question, publicId)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir sınav için kullanılmış.' });
    }
    if (error instanceof Error && error.message === 'ATTEMPT_INTEGRITY') {
      return res.status(503).json({ error: 'Sınav oturumu bütünlük kontrolünü geçemedi.' });
    }
    console.error('[Exams] start failed:', error);
    return res.status(500).json({ error: 'Sınav güvenli biçimde başlatılamadı.' });
  }
});

examRoutes.post('/exams/:attemptId/submit', ...examGuards, async (req: AuthenticatedRequest, res) => {
  const attemptId = String(req.params.attemptId || '');
  const parsed = submitSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(attemptId) || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Sınav teslimi geçersiz.' });
  }

  try {
    const db = getAdminDb();
    const attemptRef = db.doc(`testAttempts/${attemptId}`);
    const questionsQuery = attemptRef.collection('questions').orderBy('index');
    const userRef = db.doc(`users/${req.authUser.uid}`);
    const privateStateRef = db.doc(`users/${req.authUser.uid}/private/state`);

    const response = await db.runTransaction(async (transaction) => {
      const [attemptSnapshot, questionSnapshots, userSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(attemptRef),
        transaction.get(questionsQuery),
        transaction.get(userRef),
        transaction.get(privateStateRef),
      ]);
      const attempt = attemptSnapshot.data();
      const profile = userSnapshot.data();
      if (!attempt || attempt.userId !== req.authUser!.uid) throw new Error('ATTEMPT_NOT_FOUND');
      if (!profile || profile.role !== 'student') throw new Error('STUDENT_NOT_FOUND');
      if (attempt.status === 'completed' && attempt.result) {
        return { result: attempt.result as ExamResult, xpAwarded: Number(attempt.xpAwarded || 0), idempotent: true };
      }
      if (attempt.status !== 'in_progress') throw new Error('ATTEMPT_CLOSED');
      const completedAt = Date.now();
      const submissionDeadlineAt = Number(attempt.submissionDeadlineAt || 0)
        || Number(attempt.startedAt || 0) + (Number(attempt.durationSeconds || 0) + submissionGraceSeconds()) * 1000;
      if (!submissionDeadlineAt || completedAt > submissionDeadlineAt) throw new Error('ATTEMPT_EXPIRED');

      const storedQuestions = questionSnapshots.docs.map((snapshot) => ({
        publicId: String(snapshot.data().publicId || ''),
        question: snapshot.data().question as BaseQuestion,
      }));
      if (
        storedQuestions.length !== Number(attempt.questionCount)
        || storedQuestions.some(({ publicId }) => !/^[a-f0-9-]{36}$/i.test(publicId))
      ) throw new Error('ATTEMPT_INTEGRITY');
      const publicIds = new Set(storedQuestions.map(({ publicId }) => publicId));
      const submittedIds = Object.keys(parsed.data.answers);
      if (submittedIds.length > storedQuestions.length || submittedIds.some((id) => !publicIds.has(id))) {
        throw new Error('ATTEMPT_INTEGRITY');
      }
      const questions = storedQuestions.map(({ question }) => question);

      const breakdown = Object.fromEntries(
        ['visual_perception', 'pattern', 'matrix', 'spatial', 'logic', 'attention', 'memory', 'numerical', 'verbal', 'coding']
          .map((category) => [category, { total: 0, correct: 0 }]),
      ) as ExamResult['categoryBreakdown'];
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let blankAnswers = 0;
      const answerOutcomes: Array<{ question: BaseQuestion; correct: boolean }> = [];

      for (const { publicId, question } of storedQuestions) {
        const selected = parsed.data.answers[publicId];
        breakdown[question.category].total += 1;
        if (!selected) {
          blankAnswers += 1;
          answerOutcomes.push({ question, correct: false });
        } else if (!question.options.some((option) => option.id === selected)) {
          throw new Error('INVALID_OPTION');
        } else if (selected === question.correctOptionId) {
          correctAnswers += 1;
          breakdown[question.category].correct += 1;
          answerOutcomes.push({ question, correct: true });
        } else {
          wrongAnswers += 1;
          answerOutcomes.push({ question, correct: false });
        }
      }

      const expiresAt = typeof attempt.expiresAt?.toMillis === 'function'
        ? attempt.expiresAt.toMillis()
        : Number(attempt.expiresAt || 0);
      if (!expiresAt) throw new Error('ATTEMPT_EXPIRED');
      const elapsed = Math.max(1, Math.min(Number(attempt.durationSeconds) * 2, Math.round((completedAt - Number(attempt.startedAt)) / 1000)));
      const result: ExamResult = {
        examId: attemptId,
        title: String(attempt.title),
        date: new Date(completedAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }),
        totalQuestions: questions.length,
        correctAnswers,
        wrongAnswers,
        blankAnswers,
        scorePercentage: Math.round((correctAnswers / Math.max(1, questions.length)) * 100),
        totalTimeSeconds: elapsed,
        categoryBreakdown: breakdown,
      };

      const xpAwarded = correctAnswers * 15 + 50;
      const nextXp = Math.max(0, Number(profile.xp || 0)) + xpAwarded;
      const today = dayInIstanbul(new Date(completedAt));
      const samePracticeDay = profile.lastPracticeDay === today;
      const yesterday = dayInIstanbul(new Date(completedAt - 86_400_000));
      const twoDaysAgo = dayInIstanbul(new Date(completedAt - 2 * 86_400_000));
      let remainingStreakFreezes = Math.max(0, Number(profile.streakFreezeCount || 0));
      const nextStreak = samePracticeDay
        ? Math.max(0, Number(profile.streak || 0))
        : profile.lastPracticeDay === yesterday
          ? Math.max(0, Number(profile.streak || 0)) + 1
          : profile.lastPracticeDay === twoDaysAgo && remainingStreakFreezes > 0
            ? (remainingStreakFreezes -= 1, Math.max(0, Number(profile.streak || 0)) + 1)
            : 1;
      const weekId = weekInIstanbul(new Date(completedAt));
      const sameWeek = profile.progressWeekId === weekId;
      const weeklyStreakHistory = sameWeek && Array.isArray(profile.weeklyStreakHistory)
        ? [...profile.weeklyStreakHistory].slice(0, 7)
        : [false, false, false, false, false, false, false];
      while (weeklyStreakHistory.length < 7) weeklyStreakHistory.push(false);
      const dayIndex = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
      weeklyStreakHistory[dayIndex] = true;
      const todayCategoryQuestions = { ...(samePracticeDay ? (profile.todayCategoryQuestions || {}) : {}) };
      const weeklyCategoryQuestions = { ...(sameWeek ? (profile.weeklyCategoryQuestions || {}) : {}) };
      for (const [category, counts] of Object.entries(breakdown)) {
        if (!counts.total) continue;
        todayCategoryQuestions[category as CognitiveCategory] = Number(todayCategoryQuestions[category as CognitiveCategory] || 0) + counts.total;
        weeklyCategoryQuestions[category as CognitiveCategory] = Number(weeklyCategoryQuestions[category as CognitiveCategory] || 0) + counts.total;
      }

      const state = stateSnapshot.data() || {};
      const values = { ...((state.values || {}) as Record<string, unknown>) };
      const defaults = createEmptyMasteries();
      const masteries = parseStored<SkillMastery[]>(values, STORAGE_KEYS.MASTERY, defaults)
        .map((item, index) => normalizeSkillMastery({ ...defaults[index], ...item }));
      for (const outcome of answerOutcomes) {
        const masteryIndex = masteries.findIndex((item) => item.category === outcome.question.category);
        if (masteryIndex >= 0) {
          masteries[masteryIndex] = calculateMasteryUpdate(
            masteries[masteryIndex], outcome.correct, outcome.question.difficulty,
          );
        }
      }
      const examResults = parseStored<ExamResult[]>(values, STORAGE_KEYS.EXAM_RESULTS, []);
      values[STORAGE_KEYS.MASTERY] = JSON.stringify(masteries);
      values[STORAGE_KEYS.EXAM_RESULTS] = JSON.stringify([result, ...examResults].slice(0, 100));
      delete values[STORAGE_KEYS.ACTIVE_EXAM];

      transaction.update(userRef, {
        xp: nextXp,
        level: Math.floor(nextXp / 250) + 1,
        streak: nextStreak,
        longestStreak: Math.max(nextStreak, Number(profile.longestStreak || 0)),
        streakFreezeCount: remainingStreakFreezes,
        weeklyStreakHistory,
        lastPracticeDay: today,
        lastActiveDate: new Date(completedAt).toISOString(),
        todayPracticed: true,
        totalQuestionsSolved: Math.max(0, Number(profile.totalQuestionsSolved || 0)) + questions.length,
        todayQuestionsSolved: (samePracticeDay ? Math.max(0, Number(profile.todayQuestionsSolved || 0)) : 0) + questions.length,
        todaySessionsCompleted: (samePracticeDay ? Math.max(0, Number(profile.todaySessionsCompleted || 0)) : 0) + 1,
        todayMinutesSpent: (samePracticeDay ? Math.max(0, Number(profile.todayMinutesSpent || 0)) : 0) + Math.max(1, Math.round(elapsed / 60)),
        todayCategoryQuestions,
        progressWeekId: weekId,
        weeklyCategoryQuestions,
        hardCorrectCount: Math.max(0, Number(profile.hardCorrectCount || 0))
          + answerOutcomes.filter((item) => item.correct && item.question.difficulty >= 4).length,
        completedExamCount: Math.max(0, Number(profile.completedExamCount || 0)) + 1,
        perfectSessionCount: Math.max(0, Number(profile.perfectSessionCount || 0)) + (correctAnswers === questions.length ? 1 : 0),
        updatedAt: completedAt,
      });
      transaction.set(privateStateRef, { values, updatedAt: completedAt }, { merge: true });
      transaction.update(attemptRef, {
        status: 'completed',
        completedAt,
        result,
        xpAwarded,
        // Active-attempt expiry is only a short submission safety window.
        // Completed learning evidence follows the configured activity policy.
        expiresAt: Timestamp.fromMillis(activityRetentionExpiresAt(completedAt)),
      });
      answerOutcomes.forEach((outcome, index) => {
        transaction.create(db.doc(`progressEvents/exam_${attemptId}_${String(index).padStart(3, '0')}`), {
          userId: req.authUser!.uid,
          type: 'question_answered',
          source: 'exam',
          sourceId: attemptId,
          category: outcome.question.category,
          difficulty: outcome.question.difficulty,
          correct: outcome.correct,
          xpAwarded: 0,
          occurredAt: completedAt,
          expiresAt: activityRetentionExpiresAt(completedAt),
        });
      });
      return { result, xpAwarded, idempotent: false };
    });

    return res.json(response);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'ATTEMPT_NOT_FOUND') return res.status(404).json({ error: 'Sınav bulunamadı.' });
    if (['ATTEMPT_CLOSED', 'ATTEMPT_EXPIRED', 'INVALID_OPTION', 'ATTEMPT_INTEGRITY'].includes(code)) {
      return res.status(409).json({ error: 'Sınav teslimi doğrulanamadı.' });
    }
    console.error('[Exams] submit failed:', error);
    return res.status(500).json({ error: 'Sınav güvenli biçimde puanlanamadı.' });
  }
});

export default examRoutes;
