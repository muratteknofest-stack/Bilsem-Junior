import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminDb,
  requireAppCheck,
  requireSupabaseAuth,
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
  aiModel: z.string().max(100).optional(),
}).strict();

const aiBulkGenerateSchema = z.object({
  category: z.string().max(80).optional(),
  questionType: z.string().max(80).optional(),
  targetGrade: z.number().int().min(1).max(4),
  difficulty: z.union([z.number().int().min(1).max(6), z.literal('auto')]),
  count: z.number().int().min(1).max(50),
  minQualityScore: z.number().int().min(0).max(100).optional().default(85),
  aiModel: z.string().max(100).optional(),
}).strict();

const aiQuestionReviewSchema = z.object({
  questionId: z.string().min(1).max(200),
  action: z.enum(['approve', 'reject', 'regenerate']),
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

adminAiRoutes.post('/admin/ai-generate-question', requireSupabaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiQuestionGenerateSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'AI servisi yapılandırılmamış. GEMINI_API_KEY ayarlanmalı.' });
    }

    const { runQuestionPipeline } = await import('../ai-question-pipeline');
    const result = await runQuestionPipeline(ai, {
      category: parsed.data.category,
      questionType: parsed.data.questionType,
      targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
      difficulty: parsed.data.difficulty,
      minQualityScore: parsed.data.minQualityScore,
      aiModel: parsed.data.aiModel,
    });

    try {
      const adminDb = getAdminDb();
      await adminDb.collection('ai_generation_logs').add({
        adminId: req.authUser.uid,
        model: result.model,
        promptVersion: result.promptVersion,
        qualityScore: result.qualityScore,
        success: result.success,
        rejectionReasons: result.rejectionReasons,
        durationMs: result.durationMs,
        createdAt: Date.now(),
      });
    } catch (logErr) {
      console.warn('AI generation log yazılamadı:', logErr);
    }

    if (result.success && result.question) {
      try {
        const adminDb = getAdminDb();
        const qRef = adminDb.collection('questions').doc(result.question.id);
        await qRef.set({
          ...result.question,
          status: 'draft',
          revision: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: req.authUser.uid,
        });
      } catch (saveErr) {
        console.warn('AI sorusu kaydedilemedi:', saveErr);
      }
    }

    return res.json({
      success: result.success,
      question: result.question,
      qualityScore: result.qualityScore,
      solverVerified: result.solverVerified,
      validationErrors: result.validationErrors,
      validationWarnings: result.validationWarnings,
      rejectionReasons: result.rejectionReasons,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error('AI soru üretim hatası:', err);
    return res.status(500).json({ error: 'AI soru üretimi başarısız.' });
  }
});

adminAiRoutes.post('/admin/ai-bulk-generate', requireSupabaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiBulkGenerateSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
    }

    const queue = await getAiQueue();
    if (!queue) {
      return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
    }

    const jobId = queue.createJob(req.authUser.uid, {
      category: parsed.data.category,
      questionType: parsed.data.questionType,
      targetGrade: parsed.data.targetGrade as 1 | 2 | 3 | 4,
      difficulty: parsed.data.difficulty,
      count: parsed.data.count,
      minQualityScore: parsed.data.minQualityScore,
      aiModel: parsed.data.aiModel,
    });

    return res.json({ jobId, status: 'queued', message: `${parsed.data.count} soru üretim işi başlatıldı.` });
  } catch (err: any) {
    console.error('Toplu üretim başlatma hatası:', err);
    return res.status(500).json({ error: 'Toplu üretim başlatılamadı.' });
  }
});

adminAiRoutes.get('/admin/ai-generation-job/:jobId', requireSupabaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const queue = await getAiQueue();
    if (!queue) {
      return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });
    }

    const job = queue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'İş bulunamadı.' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      results: job.results.map((r: any) => ({
        success: r.success,
        qualityScore: r.qualityScore,
        solverVerified: r.solverVerified,
        rejectionReasons: r.rejectionReasons,
        question: r.question ? {
          id: r.question.id,
          type: r.question.type,
          category: r.question.category,
          difficulty: r.question.difficulty,
          prompt: r.question.prompt,
          correctOptionId: r.question.correctOptionId,
        } : null,
      })),
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'İş durumu alınamadı.' });
  }
});

adminAiRoutes.post('/admin/ai-question-review', requireSupabaseAuth, requireAppCheck, adminAiLimiter, requireProfileRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiQuestionReviewSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : 'Geçersiz istek.' });
    }

    const { questionId, action } = parsed.data;
    const adminDb = getAdminDb();
    const qRef = adminDb.collection('questions').doc(questionId);
    const snap = await qRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Soru bulunamadı.' });
    }

    const currentData = snap.data()!;

    if (action === 'approve') {
      await qRef.update({
        status: 'published',
        reviewedBy: req.authUser.uid,
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser.uid,
        revision: (currentData.revision || 0) + 1,
      });
      return res.json({ success: true, message: 'Soru onaylandı ve yayınlandı.' });
    }

    if (action === 'reject') {
      await qRef.update({
        status: 'archived',
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser.uid,
        revision: (currentData.revision || 0) + 1,
      });
      return res.json({ success: true, message: 'Soru reddedildi.' });
    }

    if (action === 'regenerate') {
      await qRef.delete();
      const ai = getGeminiClient();
      if (!ai) return res.status(503).json({ error: 'AI servisi kullanılamıyor.' });

      const { runQuestionPipeline } = await import('../ai-question-pipeline');
      const result = await runQuestionPipeline(ai, {
        category: currentData.category,
        questionType: currentData.type,
        targetGrade: currentData.targetGrade || 3,
        difficulty: currentData.difficulty || 3,
      });

      if (result.success && result.question) {
        await adminDb.collection('questions').doc(result.question.id).set({
          ...result.question,
          status: 'draft',
          revision: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: req.authUser.uid,
        });
      }

      return res.json({
        success: result.success,
        message: result.success ? 'Soru yeniden üretildi.' : 'Yeniden üretim başarısız.',
        question: result.question,
        qualityScore: result.qualityScore,
      });
    }

    return res.status(400).json({ error: 'Geçersiz işlem.' });
  } catch (err: any) {
    console.error('Soru inceleme hatası:', err);
    return res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

export default adminAiRoutes;
