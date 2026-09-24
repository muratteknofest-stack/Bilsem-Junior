import { Router } from 'express';
import { z } from 'zod';
import type { BaseQuestion } from '../../src/types';
import { getAdminDb, requireAppCheck, requireFirebaseAuth, requireProfileRole, type AuthenticatedRequest } from '../security';
import { istanbulDate, socialQuestionRejection, socialSlotId } from '../social-draft-core';

const router = Router();
const draftInput = z.object({ slot: z.enum(['morning', 'evening']) }).strict();
const guard = [requireFirebaseAuth, requireAppCheck, requireProfileRole('admin')] as const;

router.get('/admin/social-content', ...guard, async (_req, res) => {
  try {
    const date = istanbulDate(new Date());
    const db = getAdminDb();
    const refs = ['morning', 'evening'].map(slot => db.collection('social_content').doc(socialSlotId(date, slot as 'morning' | 'evening')));
    const snapshots = await db.getAll(...refs);
    return res.json({ date, slots: snapshots.map(snapshot => snapshot.exists ? snapshot.data() : null) });
  } catch {
    return res.status(503).json({ error: 'Sosyal içerik taslakları alınamadı.' });
  }
});

router.post('/admin/social-content/draft', ...guard, async (req: AuthenticatedRequest, res) => {
  const parsed = draftInput.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Geçersiz paylaşım dilimi.' });

  try {
    const db = getAdminDb();
    const date = istanbulDate(new Date());
    const key = socialSlotId(date, parsed.data.slot);
    const draftRef = db.collection('social_content').doc(key);
    const existing = await draftRef.get();
    if (existing.exists) return res.status(409).json({ error: 'Bu dilim için taslak zaten oluşturulmuş.', draft: existing.data() });

    // The server selects only published, independently checked questions.
    // A client-side question cache must never supply publication content.
    const questions = await db.collection('questions').where('status', '==', 'published').limit(100).get();
    const eligible = questions.docs.filter(snapshot => !socialQuestionRejection(snapshot.data() as BaseQuestion));
    if (!eligible.length) return res.status(422).json({ error: 'Yayıma uygun, bağımsız doğrulanmış soru bulunamadı.' });

    for (const snapshot of eligible) {
      const question = snapshot.data() as BaseQuestion;
      const usageRef = db.collection('social_question_usage').doc(snapshot.id);
      const draft = {
        id: key, date, slot: parsed.data.slot, timezone: 'Europe/Istanbul',
        questionId: snapshot.id, question: {
          prompt: question.prompt, secondaryPrompt: question.secondaryPrompt || '',
          options: question.options, correctOptionId: question.correctOptionId,
          explanation: question.explanation, type: question.type, visualConfig: question.visualConfig || null,
        },
        qualityScore: question.aiMeta!.qualityScore, solverVerified: true,
        state: 'awaiting_approval', createdBy: req.authUser.uid,
        createdAt: new Date().toISOString(),
      };

      const created = await db.runTransaction(async transaction => {
        const [current, used] = await Promise.all([transaction.get(draftRef), transaction.get(usageRef)]);
        if (current.exists || used.exists) return false;
        transaction.create(draftRef, draft);
        transaction.create(usageRef, { questionId: snapshot.id, contentId: key, createdAt: draft.createdAt });
        return true;
      });
      if (created) return res.status(201).json({ draft });
      if ((await draftRef.get()).exists) return res.status(409).json({ error: 'Bu dilim için taslak zaten oluşturulmuş.' });
    }
    return res.status(422).json({ error: 'Uygun sorular daha önce sosyal içerikte kullanılmış.' });
  } catch {
    return res.status(503).json({ error: 'Sosyal içerik taslağı oluşturulamadı.' });
  }
});

export default router;
