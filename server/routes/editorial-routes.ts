import {getServiceClient} from '../supabase-admin';
import { logServerFailure } from '../safe-log';
import { Router } from 'express';
import { z } from 'zod';
import type { BaseQuestion } from '../../src/types';
import { EditorialConflictError, saveQuestionRevision } from '../editorial-store';
import { requireSupabaseAuth, requireProfileRole, requireVerifiedEmail, type AuthenticatedRequest } from '../security';
import { adminAiLimiter } from '../rate-limiters';
import { sharedRateLimit } from '../shared-rate-limit';
import { loadQualityComparisonPool } from '../question-quality-store';
import { EditorialValidationError, prepareEditorialQuestion } from '../editorial-validation';

const editorialRoutes = Router();
const saveSchema = z.object({
  question: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'review', 'published', 'archived']),
  expectedRevision: z.number().int().min(0),
  confirmedReview: z.boolean(),
}).strict();

const draftBatchSchema=z.object({questions:z.array(z.record(z.string(),z.unknown())).min(1).max(20)}).strict();
editorialRoutes.post('/admin/questions/draft-batch',requireSupabaseAuth,adminAiLimiter,requireVerifiedEmail,requireProfileRole('admin'),sharedRateLimit('admin-editorial-save',60,600),async(req:AuthenticatedRequest,res)=>{
 const parsed=draftBatchSchema.safeParse(req.body);if(!parsed.success||!req.authUser)return res.status(400).json({error:'Geçersiz taslak paketi.'});
 try{
  const actor=req.authUser.uid,questions=parsed.data.questions.map(q=>prepareEditorialQuestion(q as unknown as BaseQuestion,q.status==='review'?'review':'draft',0,false,actor));
  const {data,error}=await getServiceClient().rpc('save_question_draft_batch',{p_questions:questions});if(error)throw error;
  if(!data||!Array.isArray(data.questions)||data.questions.length!==questions.length)throw Error('Invalid save acknowledgement');return res.json(data);
 }catch(error){if(error instanceof EditorialValidationError)return res.status(422).json({error:'Taslak doğrulanamadı.',details:error.details});if(error&&typeof error==='object'&&'code' in error&&['40001','23505'].includes(String(error.code)))return res.status(409).json({error:'Soru değişmiş veya aynı kök kaydedilmiş.'});logServerFailure('Draft batch save failed',error);return res.status(503).json({error:'Kayıt tamamlanamadı. Aynı taslakları yeniden deneyebilirsiniz.'});}
});

editorialRoutes.post('/admin/questions/save', requireSupabaseAuth, adminAiLimiter, requireVerifiedEmail, requireProfileRole('admin'), sharedRateLimit('admin-editorial-save', 60, 600), async (req: AuthenticatedRequest, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Soru kayıt isteği geçersiz.' });
  try {
    const existing = parsed.data.status === 'published' ? await loadQualityComparisonPool((parsed.data.question as unknown as BaseQuestion).type) : [];
    const stored = prepareEditorialQuestion(
      parsed.data.question as unknown as BaseQuestion, parsed.data.status, parsed.data.expectedRevision,
      parsed.data.confirmedReview, req.authUser.uid, existing.filter(q => q.id !== parsed.data.question.id),
    );
    const data = await saveQuestionRevision(stored, parsed.data.expectedRevision);
    return res.json({ question: data });
  } catch (error) {
    if (error instanceof EditorialConflictError) return res.status(409).json({ error: error.message });
    if (error instanceof EditorialValidationError) {
      return res.status(422).json({ error: 'Soru yayıma veya kayda uygun değil.', details: error.details });
    }
    logServerFailure('Editorial save failed', error);
    return res.status(503).json({ error: 'Soru kaydedilemedi. Tekrar deneyin.' });
  }
});

export default editorialRoutes;


