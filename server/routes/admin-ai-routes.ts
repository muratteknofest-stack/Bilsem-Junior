import {getServiceClient} from '../supabase-admin';
import {assessCandidate} from '../../src/features/questions/multi-stage-quality';
import {reviewDesignedQuestion} from '../ai-question-pipeline-v2';
import type {AiUsageCall} from '../../src/features/questions/ai-contracts';
import {generateQuestionDecoration} from '../question-decoration';
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
  reviewMode:z.enum(['individual','bulk']).optional().default('individual'),
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
      const reviewed = prepareEditorialQuestion({...currentData,editorialReviewMode:parsed.data.reviewMode}, 'published', revision, true, req.authUser.uid,
        comparison.filter(q => q.id !== currentData.id));
      if(parsed.data.reviewMode==='bulk'&&reviewed.releaseAuthorization){reviewed.releaseAuthorization.individualHumanReview=false;delete reviewed.releaseAuthorization.humanReviewedAt;}
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

const existingReviewSchema=z.object({questionId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),roleModels:aiRoleModelsSchema}).strict();
adminAiRoutes.get('/admin/professional-generation-runs',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),async(_req,res)=>{
 try{const {data,error}=await getServiceClient().from('professional_generation_runs').select('id,status,created_at,question_id,result').order('created_at',{ascending:false}).limit(30);if(error)throw error;return res.json({runs:data});}catch(error){logServerFailure('Generation history load failed',error);return res.status(503).json({error:'Üretim kayıtları yüklenemedi.'});}
});
adminAiRoutes.get('/admin/question-review-queue',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),async(_req,res)=>{
 try{const {data,error}=await getServiceClient().from('questions').select('data').in('status',['draft','review']).order('updated_at',{ascending:false}).limit(100);if(error)throw error;return res.json({questions:data.map(row=>row.data)});}catch(error){logServerFailure('Question queue load failed',error);return res.status(503).json({error:'İnceleme kuyruğu yüklenemedi.'});}
});
adminAiRoutes.post('/admin/ai-validate-question',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),sharedRateLimit('admin-ai',60,600),async(req:AuthenticatedRequest,res)=>{
 const parsed=existingReviewSchema.safeParse(req.body);if(!parsed.success||!req.authUser)return res.status(400).json({error:'Geçersiz denetim isteği.'});
 try{
  const {data,error}=await getServiceClient().from('questions').select('data').eq('id',parsed.data.questionId).single();if(error||!data)return res.status(404).json({error:'Soru bulunamadı.'});
  const q=data.data as BaseQuestion;assertQuestionRevision(q,parsed.data.expectedRevision);if(q.reviewPolicy!=='professional-v2'||!['draft','review'].includes(q.status||'')||!q.targetGrade)return res.status(422).json({error:'Yalnız yeni inceleme taslakları denetlenebilir.'});
  const existing=(await loadQualityComparisonPool(q.type)).filter(other=>other.id!==q.id),usage:AiUsageCall[]=[],start=Date.now();
  let report=assessCandidate(q,{grade:q.targetGrade,age:q.targetAge,difficulty:q.difficulty},existing),failure:string[]=[];
  try{report=await reviewDesignedQuestion(q,parsed.data.roleModels,existing,undefined,usage);}catch{failure=['AI_REVIEW_UNAVAILABLE: Bağımsız denetim tamamlanmadı.'];}
  q.qualityReport=report;q.status='review';q.aiMeta={generationId:q.id,model:parsed.data.roleModels.designer.model,promptVersion:'v2-constrained-roles-1',qualityScore:report.eligible?report.score:0,solverVerified:report.eligible,solverAnswer:report.eligible?q.correctOptionId:undefined,generatedAt:new Date().toISOString(),durationMs:Date.now()-start,roleModels:parsed.data.roleModels,usage};
  const saved=await saveQuestionRevision(prepareEditorialQuestion(q,'review',parsed.data.expectedRevision,false,req.authUser.uid),parsed.data.expectedRevision);
  return res.json({success:report.eligible,question:saved,qualityReport:report,qualityScore:report.eligible?report.score:0,solverVerified:report.eligible,usage,roleModels:parsed.data.roleModels,validationErrors:failure,rejectionReasons:report.stages.filter(s=>s.status!=='passed').flatMap(s=>s.reasons.length?s.reasons:[s.label+': bekliyor.'])});
 }catch(error){if(error instanceof EditorialConflictError)return res.status(409).json({error:error.message});logServerFailure('Question validation failed',error);return res.status(503).json({error:'Denetim kaydedilemedi; yayın yapılmadı.'});}
});
const decorationSchema=z.object({questionId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative()}).strict();
adminAiRoutes.post('/admin/question-decoration',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),sharedRateLimit('admin-image',10,600),async(req:AuthenticatedRequest,res)=>{
 const parsed=decorationSchema.safeParse(req.body);if(!parsed.success||!req.authUser)return res.status(400).json({error:'Geçersiz görsel isteği.'});
 if(!aiCapabilities().imageGenerationConfigured)return res.status(503).json({error:'Görsel sağlayıcısının sunucu ayarları eksik.'});
 try{const {data,error}=await getServiceClient().from('questions').select('data').eq('id',parsed.data.questionId).single();if(error||!data)return res.status(404).json({error:'Soru bulunamadı.'});const q=data.data as BaseQuestion;assertQuestionRevision(q,parsed.data.expectedRevision);return res.json(await generateQuestionDecoration(q,req.authUser.uid));}catch(error){if(error instanceof EditorialConflictError)return res.status(409).json({error:error.message});logServerFailure('Decoration generation failed',error);return res.status(503).json({error:'Görsel üretimi veya kaydı tamamlanamadı. Yayın yapılmadı.'});}
});
adminAiRoutes.get('/admin/question-visual-assets/:id/content',requireSupabaseAuth,adminAiLimiter,requireProfileRole('admin'),async(req,res)=>{
 if(!z.uuid().safeParse(req.params.id).success)return res.status(400).end();
 try{const db=getServiceClient(),{data,error}=await db.from('question_visual_assets').select('bucket,object_path,content_type').eq('id',req.params.id).single();if(error||!data)return res.status(404).end();const file=await db.storage.from(data.bucket).download(data.object_path);if(file.error)throw file.error;res.setHeader('Cache-Control','private, no-store');return res.type(data.content_type).send(Buffer.from(await file.data.arrayBuffer()));}catch(error){logServerFailure('Private asset load failed',error);return res.status(503).end();}
});

export default adminAiRoutes;



