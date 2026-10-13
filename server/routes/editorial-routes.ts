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


