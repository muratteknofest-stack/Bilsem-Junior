import {aiRoleModelsSchema} from '../../src/features/questions/ai-contracts';
import {aiCapabilities} from '../ai-prompts/role-config';
import {runDesignedQuestionPipeline} from '../ai-question-pipeline-v2';
import {claimGeneration,commitGeneration} from '../professional-generation-store';
import { logServerFailure } from '../safe-log';
import { sharedRateLimit } from '../shared-rate-limit';
import { loadQualityComparisonPool } from '../question-quality-store';
import { auditQuestion, isQuestionReadyForStudents } from '../../src/features/questions/quality';
import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminDb,
  requireSupabaseAuth,
  requireProfileRole,
  type AuthenticatedRequest,
} from '../security';
import { adminAiLimiter } from '../rate-limiters';
import { getGeminiClient } from '../gemini-client';
import type { BaseQuestion, QuestionType } from '../../src/types';
import { EditorialValidationError, prepareEditorialQuestion } from '../editorial-validation';
import { archiveQuestionRevision, assertQuestionRevision, EditorialConflictError, persistGeneratedQuestionResult, saveQuestionRevision } from '../editorial-store';

const adminAiRoutes = Router();
adminAiRoutes.get('/admin/ai-capabilities',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),(_req,res)=>res.json(aiCapabilities()));

const aiQuestionGenerateSchema = z.object({
  category: z.string().max(80).optional(),
  questionType: z.string().max(80).optional(),
  targetGrade: z.number().int().min(1).max(4),
  targetAge: z.number().int().min(6).max(11).optional(),
  maxAttempts: z.number().int().min(1).max(4).optional().default(3),
  difficulty: z.number().int().min(1).max(6),
  minQualityScore: z.number().int().min(0).max(100).optional().default(85),
  aiModel: z.string().max(100).optional(),
  generationMode:z.enum(['legacy','designed']).optional().default('legacy'),roleModels:aiRoleModelsSchema.optional(),requestId:z.uuid().optional(),
}).strict();

export const aiQuestionReviewSchema = z.object({
  questionId: z.string().min(1).max(200),
  action: z.enum(['approve', 'reject', 'regenerate']),
  expectedRevision: z.number().int().min(0),
}).strict();

adminAiRoutes.post('/admin/ai-generate-question', requireSupabaseAuth, adminAiLimiter, requireProfileRole('admin'), sharedRateLimit('admin-ai', 60, 600), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = aiQuestionGenerateSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: parsed.success ? 'Oturum doğrulanamadı.' : parsed.error.issues[0]?.message || 'Geçersiz istek.' });
    }

    const ai = getGeminiClient();
    if (!ai && parsed.data.generationMode==='legacy') {
      return res.status(503).json({ error: 'AI servisi yapılandırılmamış. GEMINI_API_KEY ayarlanmalı.' });
    }

    const { runQuestionPipeline } = await import('../ai-question-pipeline');
    const configuration={category:parsed.data.category,questionType:parsed.data.questionType,targetGrade:parsed.data.targetGrade as 1|2|3|4,difficulty:parsed.data.difficulty,targetAge:parsed.data.targetAge,maxAttempts:parsed.data.maxAttempts,minQualityScore:parsed.data.minQualityScore,aiModel:parsed.data.aiModel};
    const context={existingQuestions:await loadQualityComparisonPool(parsed.data.questionType as QuestionType|undefined)},requestId=parsed.data.requestId||crypto.randomUUID();
    const claim=parsed.data.generationMode==='designed'?await claimGeneration(requestId,req.authUser.uid,{...configuration,roleModels:parsed.data.roleModels}):null;
    if(claim&&!claim.claimed){if(claim.result)return res.json(claim.result);return res.status(409).json({error:'Üretim sürüyor veya sonucu henüz doğrulanmadı. İşlem kaydını kontrol edin.',code:'GENERATION_PENDING',requestId});}
    let result=parsed.data.generationMode==='designed'?await runDesignedQuestionPipeline({...configuration,roleModels:parsed.data.roleModels},context):await runQuestionPipeline(ai!,configuration,context);

    try {
      const adminDb = getAdminDb();
      await adminDb.collection('ai_generation_logs').add({
        adminId: req.authUser.uid,
        model: result.model,
        promptVersion: result.promptVersion,
        qualityScore: result.qualityScore,
        success: result.success,
        rejectionReasons: [...result.rejectionReasons, ...(result.attempts || []).map(a => `Deneme ${a.attempt} (${a.seed}): ${a.outcome}; ${a.reasons.join(" ")}`)],
        durationMs: result.durationMs,
        createdAt: Date.now(),
      });
    } catch (logErr) {
      logServerFailure('AI generation log failed', logErr);
    }

    if (result.question || claim) {
      try {
        result = claim?await commitGeneration(requestId,req.authUser.uid,claim.sha,result):await persistGeneratedQuestionResult(result,req.authUser.uid);
      } catch (saveErr) {
        logServerFailure('AI question save failed', saveErr);
        return res.status(503).json({ error: 'Denetim sonucu kaydedilemedi. Soru yayımlanmadı.' });
      }
    }

    return res.json({
      success: result.success,
      question: result.question,
      qualityScore: result.qualityScore,
      qualityReport: result.qualityReport,
      attempts: result.attempts,
      solverVerified: result.solverVerified,
      validationErrors: result.validationErrors,
      validationWarnings: result.validationWarnings,
      rejectionReasons: result.rejectionReasons,
      durationMs: result.durationMs,usage:result.usage,roleModels:result.roleModels,requestId,
    });
  } catch (err: unknown) {
    logServerFailure('AI question generation failed', err);
    return res.status(500).json({ error: 'AI soru üretimi başarısız.' });
  }
});

// The editor sends each generation as an awaited request to /ai-generate-question.
// Old background jobs cannot survive a Vercel Function shutdown; reject this
// legacy endpoint instead of claiming that an in-memory job will finish.
adminAiRoutes.post('/admin/ai-bulk-generate', requireSupabaseAuth, adminAiLimiter, requireProfileRole('admin'), sharedRateLimit('admin-ai', 60, 600), (_req, res) =>
  res.status(410).json({ error: 'Eski toplu iş servisi kaldırıldı. Yönetici panelindeki denetimli üretimi kullanın.' }));
adminAiRoutes.get('/admin/ai-generation-job/:jobId', requireSupabaseAuth, adminAiLimiter, requireProfileRole('admin'), sharedRateLimit('admin-ai', 60, 600), (_req, res) =>
  res.status(410).json({ error: 'Bellek içi üretim işi artık kullanılmıyor.' }));

adminAiRoutes.post('/admin/ai-question-review', requireSupabaseAuth, adminAiLimiter, requireProfileRole('admin'), sharedRateLimit('admin-ai', 60, 600), async (req: AuthenticatedRequest, res) => {
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

    const currentData = snap.data()! as BaseQuestion;
    const revision = currentData.revision || 0;
    assertQuestionRevision(currentData, parsed.data.expectedRevision);

    if (action === 'approve') {
      const comparison = await loadQualityComparisonPool(currentData.type);
      const report = auditQuestion(currentData, comparison.filter(q => q.id !== currentData.id));
      if (!isQuestionReadyForStudents(currentData) || report.errors.length) {
        return res.status(422).json({ error: 'Soru doğrulanamadı; inceleme gerekli.', details: [...report.errors, ...report.reviewRequired] });
      }
      const reviewed = prepareEditorialQuestion(currentData, 'published', revision, true, req.authUser.uid,
        comparison.filter(q => q.id !== currentData.id));
      const saved = await saveQuestionRevision(reviewed, revision);
      return res.json({ success: true, question: saved, message: 'Soru onaylandı ve yayınlandı.' });
    }

    if (action === 'reject') {
      const saved = await saveQuestionRevision(archiveQuestionRevision(currentData, req.authUser.uid), revision);
      return res.json({ success: true, question: saved, message: 'Soru reddedildi.' });
    }

    if(action==='regenerate'){
      const config={category:currentData.category,questionType:currentData.type,targetGrade:currentData.targetGrade||3,difficulty:currentData.difficulty,targetAge:currentData.targetAge};
      const context={existingQuestions:await loadQualityComparisonPool(currentData.type)};
      let result;
      if(currentData.reviewPolicy==='professional-v2'){
        const requestId=crypto.randomUUID(),configuration={...config,roleModels:currentData.aiMeta?.roleModels};
        const claim=await claimGeneration(requestId,req.authUser.uid,configuration);
        result=await commitGeneration(requestId,req.authUser.uid,claim.sha,await runDesignedQuestionPipeline(configuration,context));
      }else{
        const ai=getGeminiClient();if(!ai)return res.status(503).json({error:'AI servisi yapılandırılmamış.'});
        const {runQuestionPipeline}=await import('../ai-question-pipeline');result=await runQuestionPipeline(ai,config,context);
        if(result.question)result=await persistGeneratedQuestionResult(result,req.authUser.uid);
      }
      if(result.success)await saveQuestionRevision(archiveQuestionRevision(currentData,req.authUser.uid),revision);
      return res.json({...result,message:result.success?'Yeni taslak kaydedildi.':'Denetim tamamlanamadı; yayın yapılmadı.'});
    }

    return res.status(400).json({ error: 'Geçersiz işlem.' });
  } catch (err: unknown) {
    if (err instanceof EditorialConflictError) return res.status(409).json({ error: err.message });
    if (err instanceof EditorialValidationError) return res.status(422).json({ error: 'Soru yayın için doğrulanamadı.', details: err.details });
    logServerFailure('Question review failed', err);
    return res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

export default adminAiRoutes;



