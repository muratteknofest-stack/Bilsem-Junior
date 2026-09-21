import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminDb,
  requireAppCheck,
  requireAdminMfa,
  requireFirebaseAuth,
  requireProfileRole,
  type AuthenticatedRequest,
} from '../security';
import { adminAiLimiter } from '../rate-limiters';
import { getGeminiClient } from '../gemini-client';

const adminAiRoutes = Router();

const aiQuestionGenerateSchema = z.object({
  category: z.string().max(80).optional(),
  questionType: z.string().max(80).optional(),
  targetGrade: z.number().int().min(1).max(4),
  difficulty: z.number().int().min(1).max(6),
  minQualityScore: z.number().int().min(0).max(100).optional().default(85),
  requestId: z.string().uuid(),
}).strict();

const aiBulkGenerateSchema = z.object({
  category: z.string().max(80).optional(),
  questionType: z.string().max(80).optional(),
  targetGrade: z.number().int().min(1).max(4),
  difficulty: z.union([z.number().int().min(1).max(6), z.literal('auto')]),
  count: z.number().int().min(1).max(50),
  minQualityScore: z.number().int().min(0).max(100).optional().default(85),
  requestId: z.string().uuid(),
}).strict();

const aiQuestionReviewSchema = z.object({
  questionId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  action: z.enum(['approve', 'reject', 'regenerate']),
  expectedRevision: z.number().int().min(0),
  requestId: z.string().uuid(),
}).strict();

let aiQueue: any = null;
async function getAiQueue() {
  if (aiQueue) return aiQueue;
  const ai = getGeminiClient();
  if (!ai) return null;
  try {
    const adminDb = getAdminDb();
    const { AiGenerationQueue } = await import('../ai-generation-queue');
    aiQueue = new AiGenerationQueue(ai, adminDb);
    return aiQueue;
  } catch (err) {
    console.warn('AI Question Engine başlatılamadı:', err);
    return null;
  }
}

adminAiRoutes.post('/admin/ai-generate-question', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), requireAdminMfa, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiQuestionGenerateSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
    }

    const queue = await getAiQueue();
    if (!queue) return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
    const jobId = await queue.createJob(req.authUser.uid, {
      category: parsed.data.category,
      questionType: parsed.data.questionType,
      targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
      difficulty: parsed.data.difficulty,
      count: 1,
      minQualityScore: parsed.data.minQualityScore,
    }, parsed.data.requestId);
    return res.status(202).json({ jobId, status: 'queued', message: 'Soru üretim işi başlatıldı.' });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir AI üretim işi için kullanılmış.' });
    }
    console.error('AI soru üretim hatası:', err);
    return res.status(500).json({ error: 'AI soru üretimi başarısız.' });
  }
});

adminAiRoutes.post('/admin/ai-bulk-generate', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), requireAdminMfa, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiBulkGenerateSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
    }

    const queue = await getAiQueue();
    if (!queue) {
      return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
    }

    const jobId = await queue.createJob(req.authUser.uid, {
      category: parsed.data.category,
      questionType: parsed.data.questionType,
      targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
      difficulty: parsed.data.difficulty,
      count: parsed.data.count,
      minQualityScore: parsed.data.minQualityScore,
    }, parsed.data.requestId);

    return res.status(202).json({ jobId, status: 'queued', message: `${parsed.data.count} soru üretim işi başlatıldı.` });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir AI üretim işi için kullanılmış.' });
    }
    console.error('Toplu üretim başlatma hatası:', err);
    return res.status(500).json({ error: 'Toplu üretim başlatılamadı.' });
  }
});

adminAiRoutes.get('/admin/ai-generation-job/:jobId', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), requireAdminMfa, async (req: AuthenticatedRequest, res) => {
  try {
    const jobId = String(req.params.jobId || '');
    if (!/^job_[a-f0-9]{32}$/.test(jobId)) {
      return res.status(400).json({ error: 'İş kimliği geçersiz.' });
    }
    const queue = await getAiQueue();
    if (!queue) {
      return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
    }

    const job = await queue.getJob(jobId);
    if (!job || job.adminId !== req.authUser?.uid) {
      return res.status(404).json({ error: 'İş bulunamadı.' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      results: job.results.flatMap((r: any) => r.question ? [{
        ...r.question,
        revision: Number(r.question.revision || 0),
        status: r.success ? 'queued' : 'rejected',
        qualityScore: r.qualityScore,
        solverVerified: r.solverVerified,
        validationWarnings: r.validationWarnings,
        rejectionReasons: r.rejectionReasons,
        distractorNotes: r.question.authoring?.distractorNotes || {},
      }] : []),
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      averageQuality: job.results.length
        ? Math.round(job.results.reduce((sum: number, result: any) => sum + Number(result.qualityScore || 0), 0) / job.results.length)
        : 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'İş durumu alınamadı.' });
  }
});

adminAiRoutes.post('/admin/ai-question-review', requireFirebaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), requireAdminMfa, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiQuestionReviewSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : 'Geçersiz istek.' });
    }

    const { questionId, action, expectedRevision, requestId } = parsed.data;
    const adminDb = getAdminDb();
    const qRef = adminDb.collection('questions').doc(questionId);
    const operationRef = adminDb.collection('adminAuditLogs').doc(`question_review_${requestId}`);
    const readPreviousResult = (operation: Record<string, any>) => {
      const matches = operation.actorId === req.authUser!.uid
        && operation.questionId === questionId
        && operation.requestedAction === action
        && operation.expectedRevision === expectedRevision;
      if (!matches) throw new Error('IDEMPOTENCY_CONFLICT');
      return operation.result || { success: true, questionId };
    };

    if (action === 'approve' || action === 'reject') {
      const result = await adminDb.runTransaction(async (transaction) => {
        const operation = await transaction.get(operationRef);
        if (operation.exists) return readPreviousResult(operation.data()!);

        const snapshot = await transaction.get(qRef);
        if (!snapshot.exists) throw new Error('QUESTION_NOT_FOUND');
        const currentData = snapshot.data()!;
        const currentRevision = Number(currentData.revision || 0);
        if (currentRevision !== expectedRevision) throw new Error('QUESTION_CHANGED');

        const nextRevision = currentRevision + 1;
        const status = action === 'approve' ? 'published' : 'archived';
        const message = action === 'approve'
          ? 'Soru onaylandı ve yayınlandı.'
          : 'Soru reddedildi ve arşivlendi.';
        const response = { success: true, message, questionId, status, revision: nextRevision };
        const now = Date.now();
        transaction.update(qRef, {
          status,
          reviewedBy: req.authUser!.uid,
          updatedAt: new Date(now).toISOString(),
          updatedBy: req.authUser!.uid,
          revision: nextRevision,
        });
        transaction.create(operationRef, {
          action: action === 'approve' ? 'question_published' : 'question_archived',
          requestedAction: action,
          requestId,
          actorId: req.authUser!.uid,
          questionId,
          expectedRevision,
          resultingRevision: nextRevision,
          result: response,
          createdAt: now,
        });
        return response;
      });
      return res.json(result);
    }

    if (action === 'regenerate') {
      const [previousOperation, snap] = await Promise.all([operationRef.get(), qRef.get()]);
      if (previousOperation.exists) {
        const previousData = previousOperation.data()!;
        const previousResult = readPreviousResult(previousData);
        const replacementId = previousData.replacementQuestionId;
        if (previousResult.success && typeof replacementId === 'string') {
          const replacementSnapshot = await adminDb.collection('questions').doc(replacementId).get();
          if (!replacementSnapshot.exists) throw new Error('QUESTION_INTEGRITY');
          return res.json({ ...previousResult, question: { ...replacementSnapshot.data(), id: replacementSnapshot.id } });
        }
        return res.json(previousResult);
      }
      if (!snap.exists) return res.status(404).json({ error: 'Soru bulunamadı.' });
      const currentData = snap.data()!;
      if (Number(currentData.revision || 0) !== expectedRevision) {
        return res.status(409).json({ error: 'Soru başka bir yönetici tarafından değiştirilmiş. Listeyi yenileyin.' });
      }

      const ai = getGeminiClient();
      if (!ai) return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });

      const { runQuestionPipeline } = await import('../ai-question-pipeline');
      const result = await runQuestionPipeline(ai, {
        category: currentData.category,
        questionType: currentData.type,
        targetGrade: currentData.targetGrade || 3,
        difficulty: currentData.difficulty || 3,
      });

      if (!result.success || !result.question) {
        const response = {
          success: false,
          message: 'Yeniden üretim kalite kapısından geçemedi; mevcut soru korunuyor.',
          questionId,
          qualityScore: result.qualityScore,
        };
        await adminDb.runTransaction(async (transaction) => {
          const operation = await transaction.get(operationRef);
          if (operation.exists) return readPreviousResult(operation.data()!);
          transaction.create(operationRef, {
            action: 'question_regeneration_failed',
            requestedAction: action,
            requestId,
            actorId: req.authUser!.uid,
            questionId,
            expectedRevision,
            qualityScore: result.qualityScore,
            rejectionReasons: result.rejectionReasons.slice(0, 20),
            result: response,
            createdAt: Date.now(),
          });
          return response;
        });
        return res.status(422).json(response);
      }

      const replacementId = `ai-regen-${requestId.replace(/-/g, '')}`;
      const now = Date.now();
      const replacement = {
        ...result.question,
        id: replacementId,
        status: 'draft',
        revision: 0,
        supersedesQuestionId: questionId,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        updatedBy: req.authUser.uid,
      };
      const replacementRef = adminDb.collection('questions').doc(replacementId);
      const response = {
        success: true,
        message: 'Yeni taslak üretildi; önceki soru veri kaybı olmadan arşivlendi.',
        questionId,
        replacementQuestionId: replacementId,
        question: replacement,
        qualityScore: result.qualityScore,
      };
      const committed = await adminDb.runTransaction(async (transaction) => {
        const operation = await transaction.get(operationRef);
        if (operation.exists) return readPreviousResult(operation.data()!);
        const current = await transaction.get(qRef);
        const replacementSnapshot = await transaction.get(replacementRef);
        if (!current.exists) throw new Error('QUESTION_NOT_FOUND');
        if (Number(current.data()!.revision || 0) !== expectedRevision) throw new Error('QUESTION_CHANGED');
        if (replacementSnapshot.exists) throw new Error('REPLACEMENT_EXISTS');

        transaction.update(qRef, {
          status: 'archived',
          replacedByQuestionId: replacementId,
          reviewedBy: req.authUser!.uid,
          updatedAt: new Date(now).toISOString(),
          updatedBy: req.authUser!.uid,
          revision: expectedRevision + 1,
        });
        transaction.create(replacementRef, replacement);
        transaction.create(operationRef, {
          action: 'question_regenerated',
          requestedAction: action,
          requestId,
          actorId: req.authUser!.uid,
          questionId,
          replacementQuestionId: replacementId,
          expectedRevision,
          resultingRevision: expectedRevision + 1,
          qualityScore: result.qualityScore,
          result: {
            success: true,
            message: response.message,
            questionId,
            replacementQuestionId: replacementId,
            qualityScore: result.qualityScore,
          },
          createdAt: now,
        });
        return response;
      });
      return res.json(committed);
    }

    return res.status(400).json({ error: 'Geçersiz işlem.' });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'QUESTION_NOT_FOUND') {
      return res.status(404).json({ error: 'Soru bulunamadı.' });
    }
    if (err instanceof Error && ['QUESTION_CHANGED', 'REPLACEMENT_EXISTS'].includes(err.message)) {
      return res.status(409).json({ error: 'Soru başka bir işlem tarafından değiştirilmiş. Listeyi yenileyin.' });
    }
    if (err instanceof Error && err.message === 'IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'İstek kimliği farklı bir yönetim işlemi için kullanılmış.' });
    }
    if (err instanceof Error && err.message === 'QUESTION_INTEGRITY') {
      return res.status(503).json({ error: 'Soru işlem kaydı bütünlük kontrolünü geçemedi.' });
    }
    console.error('Soru inceleme hatası:', err);
    return res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

export default adminAiRoutes;
