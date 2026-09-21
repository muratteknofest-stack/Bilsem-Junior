import { createHash } from 'node:crypto';
import { Router } from 'express';
import { FieldPath } from 'firebase-admin/firestore';
import { z } from 'zod';
import { auditQuestion } from '../../src/features/questions/quality';
import type { BaseQuestion } from '../../src/types';
import {
  getAdminDb,
  requireAppCheck,
  requireAdminMfa,
  requireFirebaseAuth,
  requireProfileRole,
  type AuthenticatedRequest,
} from '../security';
import { adminDataLimiter } from '../rate-limiters';

const adminDataRoutes = Router();
const adminGuards = [
  requireFirebaseAuth,
  requireAppCheck,
  adminDataLimiter,
  requireProfileRole('admin'),
  requireAdminMfa,
] as const;

const parseStored = <T>(values: Record<string, unknown>, key: string, fallback: T): T => {
  const raw = values[key];
  if (typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

const questionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const editorialQuestionSchema = z.object({
  question: z.unknown(),
  status: z.enum(['draft', 'review', 'published', 'archived']),
  expectedRevision: z.number().int().min(0),
  confirmedReview: z.boolean(),
  requestId: z.string().uuid(),
}).strict();

adminDataRoutes.get('/admin/questions', ...adminGuards, async (req, res) => {
  const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(200),
    cursor: questionIdSchema.optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Soru listeleme parametreleri geçersiz.' });
  try {
    const db = getAdminDb();
    let query = db.collection('questions').orderBy(FieldPath.documentId()).limit(parsed.data.limit);
    if (parsed.data.cursor) {
      const cursor = await db.doc(`questions/${parsed.data.cursor}`).get();
      if (!cursor.exists) return res.status(400).json({ error: 'Sayfalama imleci geçersiz.' });
      query = query.startAfter(cursor);
    }
    const snapshot = await query.get();
    return res.json({
      questions: snapshot.docs.map((document) => ({ ...document.data(), id: document.id })),
      nextCursor: snapshot.size === parsed.data.limit ? snapshot.docs.at(-1)?.id || null : null,
    });
  } catch (error) {
    console.error('[AdminData] question list error:', error);
    return res.status(500).json({ error: 'Soru kütüphanesi alınamadı.' });
  }
});

adminDataRoutes.post('/admin/questions/:questionId', ...adminGuards, async (req: AuthenticatedRequest, res) => {
  const questionId = String(req.params.questionId || '');
  const parsed = editorialQuestionSchema.safeParse(req.body);
  if (!questionIdSchema.safeParse(questionId).success || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Soru kaydetme isteği geçersiz.' });
  }
  if (!parsed.data.question || typeof parsed.data.question !== 'object' || Array.isArray(parsed.data.question)) {
    return res.status(400).json({ error: 'Soru gövdesi geçersiz.' });
  }
  const question = parsed.data.question as BaseQuestion;
  if (question.id !== questionId) return res.status(400).json({ error: 'Soru kimliği gövdeyle eşleşmiyor.' });
  const report = auditQuestion(question);
  if (report.errors.length) return res.status(422).json({ error: report.errors.join(' ') });
  if (parsed.data.status === 'published' && !parsed.data.confirmedReview) {
    return res.status(422).json({ error: 'Yayımlamadan önce yönerge, cevap ve görseller onaylanmalıdır.' });
  }

  try {
    const db = getAdminDb();
    const questionRef = db.doc(`questions/${questionId}`);
    const operationRef = db.doc(`adminAuditLogs/question_save_${parsed.data.requestId}`);
    const questionHash = createHash('sha256').update(JSON.stringify(question)).digest('hex');
    const stored = await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(operationRef);
      const current = await transaction.get(questionRef);
      if (operation.exists) {
        const prior = operation.data()!;
        const sameRequest = prior.actorId === req.authUser!.uid
          && prior.questionId === questionId
          && prior.questionHash === questionHash
          && prior.requestedStatus === parsed.data.status
          && prior.expectedRevision === parsed.data.expectedRevision;
        if (!sameRequest) throw new Error('IDEMPOTENCY_CONFLICT');
        if (!current.exists) throw new Error('QUESTION_INTEGRITY');
        return { ...current.data(), id: current.id };
      }

      const liveRevision = current.exists ? Number(current.data()!.revision || 0) : 0;
      if (liveRevision !== parsed.data.expectedRevision) throw new Error('EDIT_CONFLICT');
      const now = Date.now();
      const nextRevision = liveRevision + 1;
      const nextQuestion: BaseQuestion = {
        ...question,
        id: questionId,
        status: parsed.data.status,
        revision: nextRevision,
        isCustom: true,
        createdAt: String(current.data()?.createdAt || question.createdAt || new Date(now).toISOString()),
        updatedAt: new Date(now).toISOString(),
        updatedBy: req.authUser!.uid,
        ...(parsed.data.status === 'published' ? { reviewedBy: req.authUser!.uid } : {}),
      };
      if (parsed.data.status !== 'published') delete nextQuestion.reviewedBy;
      transaction.set(questionRef, nextQuestion);
      transaction.create(operationRef, {
        action: parsed.data.status === 'published' ? 'question_published' : current.exists ? 'question_updated' : 'question_created',
        actorId: req.authUser!.uid,
        requestId: parsed.data.requestId,
        questionId,
        questionHash,
        requestedStatus: parsed.data.status,
        expectedRevision: parsed.data.expectedRevision,
        resultingRevision: nextRevision,
        createdAt: now,
      });
      return nextQuestion;
    });
    return res.json({ question: stored });
  } catch (error) {
    if (error instanceof Error && error.message === 'EDIT_CONFLICT') {
      return res.status(409).json({ error: 'Soru başka bir yönetici tarafından değiştirilmiş. Listeyi yenileyin.' });
    }
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir soru işlemi için kullanılmış.' });
    }
    if (error instanceof Error && error.message === 'QUESTION_INTEGRITY') {
      return res.status(503).json({ error: 'Soru işlem kaydı bütünlük kontrolünü geçemedi.' });
    }
    console.error('[AdminData] question save error:', error);
    return res.status(500).json({ error: 'Soru güvenli biçimde kaydedilemedi.' });
  }
});

adminDataRoutes.get('/admin/overview', ...adminGuards, async (_req, res) => {
  try {
    const db = getAdminDb();
    const [questions, studentCount, reports, activities] = await Promise.all([
      db.collection('questions').select('status', 'category').get(),
      db.collection('users').where('role', '==', 'student').count().get(),
      db.collection('questionReports').where('status', '==', 'open').count().get(),
      db.collection('adminAuditLogs').orderBy('createdAt', 'desc').limit(8).get().catch(() => null),
    ]);

    const categoryCounts: Record<string, number> = {};
    const statusCounts = { published: 0, draft: 0, review: 0, archived: 0 };
    questions.docs.forEach((snapshot) => {
      const question = snapshot.data();
      const status = String(question.status || 'draft') as keyof typeof statusCounts;
      if (status in statusCounts) statusCounts[status] += 1;
      const category = String(question.category || 'unknown');
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return res.json({
      totalQuestions: questions.size,
      statusCounts,
      registeredStudents: studentCount.data().count,
      openReports: reports.data().count,
      targetQuestions: Math.max(1, Number(process.env.QUESTION_LIBRARY_TARGET || 500)),
      categoryCounts,
      recentActivities: activities?.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })) || [],
    });
  } catch (error) {
    console.error('[AdminData] overview error:', error);
    return res.status(500).json({ error: 'Yönetim özeti alınamadı.' });
  }
});

adminDataRoutes.get('/admin/students', ...adminGuards, async (req, res) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().min(1).max(128).optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Öğrenci listeleme parametreleri geçersiz.' });

    const db = getAdminDb();
    let query = db.collection('users')
      .where('role', '==', 'student')
      .orderBy(FieldPath.documentId())
      .limit(parsed.data.limit);
    if (parsed.data.cursor) {
      const cursor = await db.doc(`users/${parsed.data.cursor}`).get();
      if (!cursor.exists) return res.status(400).json({ error: 'Sayfalama imleci geçersiz.' });
      query = query.startAfter(cursor);
    }

    const profiles = await query.get();
    const stateRefs = profiles.docs.map((profile) => db.doc(`users/${profile.id}/private/state`));
    const states = stateRefs.length ? await db.getAll(...stateRefs) : [];

    const students = profiles.docs.map((profile, index) => {
      const data = profile.data();
      const values = (states[index]?.data()?.values || {}) as Record<string, unknown>;
      const masteries = parseStored<Array<{ attemptCount?: number; accuracy?: number }>>(values, 'yapyap_mastery', []);
      const mistakes = parseStored<Array<{ resolved?: boolean }>>(values, 'yapyap_mistakes', []);
      const attempts = masteries.reduce((sum, item) => sum + Number(item.attemptCount || 0), 0);
      const weightedAccuracy = attempts
        ? Math.round(masteries.reduce((sum, item) => sum + Number(item.accuracy || 0) * Number(item.attemptCount || 0), 0) / attempts)
        : 0;
      return {
        id: profile.id,
        name: String(data.name || 'Öğrenci'),
        avatar: String(data.avatar || '🦊'),
        grade: Number(data.grade || 1),
        level: Number(data.level || 1),
        xp: Number(data.xp || 0),
        streak: Number(data.streak || 0),
        solvedQuestions: Number(data.totalQuestionsSolved || 0),
        accuracy: weightedAccuracy,
        mistakesCount: mistakes.filter((item) => !item.resolved).length,
        streakFreeze: Number(data.streakFreezeCount || 0),
        lastActiveAt: data.lastActiveDate || null,
        masteries: masteries.slice(0, 20).map((item: any) => ({
          category: String(item.category || 'unknown'),
          categoryName: String(item.categoryName || item.category || 'Beceri'),
          mastery: Math.max(0, Math.min(100, Number(item.mastery || 0))),
          attemptCount: Math.max(0, Number(item.attemptCount || 0)),
          accuracy: Math.max(0, Math.min(100, Number(item.accuracy || 0))),
          recentTrend: ['up', 'down', 'neutral'].includes(item.recentTrend) ? item.recentTrend : 'neutral',
        })),
      };
    });

    return res.json({
      students,
      nextCursor: profiles.size === parsed.data.limit ? profiles.docs.at(-1)?.id || null : null,
    });
  } catch (error) {
    console.error('[AdminData] students error:', error);
    return res.status(500).json({ error: 'Öğrenci listesi alınamadı.' });
  }
});

const rewardSchema = z.object({
  type: z.enum(['xp', 'streak_freeze']),
  amount: z.number().int().min(1).max(500),
  requestId: z.string().uuid(),
}).strict();

adminDataRoutes.post('/admin/students/:studentId/reward', ...adminGuards, async (req: AuthenticatedRequest, res) => {
  const studentId = String(req.params.studentId || '');
  const parsed = rewardSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(studentId) || !parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Ödül isteği geçersiz.' });
  }
  if (parsed.data.type === 'streak_freeze' && parsed.data.amount > 3) {
    return res.status(400).json({ error: 'Tek işlemde en fazla 3 seri koruması verilebilir.' });
  }

  try {
    const db = getAdminDb();
    const ref = db.doc(`users/${studentId}`);
    const operationRef = db.doc(`adminAuditLogs/student_reward_${parsed.data.requestId}`);
    const updated = await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(operationRef);
      const snapshot = await transaction.get(ref);
      const student = snapshot.data();
      if (!student || student.role !== 'student') throw new Error('STUDENT_NOT_FOUND');

      if (operation.exists) {
        const previous = operation.data()!;
        const sameRequest = previous.actorId === req.authUser!.uid
          && previous.studentId === studentId
          && previous.rewardType === parsed.data.type
          && previous.amount === parsed.data.amount;
        if (!sameRequest) throw new Error('IDEMPOTENCY_CONFLICT');
        return { ...student, id: studentId };
      }

      const field = parsed.data.type === 'xp' ? 'xp' : 'streakFreezeCount';
      const value = Number(student[field] || 0) + parsed.data.amount;
      const changes: Record<string, number> = { [field]: value, updatedAt: Date.now() };
      if (field === 'xp') changes.level = Math.floor(value / 250) + 1;
      transaction.update(ref, changes);
      transaction.create(operationRef, {
        action: 'student_reward_granted',
        requestId: parsed.data.requestId,
        actorId: req.authUser!.uid,
        studentId,
        rewardType: parsed.data.type,
        amount: parsed.data.amount,
        resultingValue: value,
        createdAt: Date.now(),
      });
      return { ...student, ...changes, id: studentId };
    });
    return res.json({ success: true, student: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir yönetim işlemi için kullanılmış.' });
    }
    console.error('[AdminData] reward error:', error);
    return res.status(500).json({ error: 'Ödül işlemi tamamlanamadı.' });
  }
});

export default adminDataRoutes;
