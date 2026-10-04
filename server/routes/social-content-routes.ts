import { Router } from 'express';
import { z } from 'zod';
import sharp from 'sharp';
import { OAuth2Client } from 'google-auth-library';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit } from 'express-rate-limit';
import type { BaseQuestion } from '../../src/types';
import { generateProfessionalQuestion } from '../../src/features/questions/professional-engine';
import { getAdminDb, requireAppCheck, requireFirebaseAuth, requireProfileRole, type AuthenticatedRequest } from '../security';
import { istanbulDate, socialQuestionRejection, socialSlotId } from '../social-draft-core';
import { renderSocialCard } from '../social-card';
import { platformReady, publishApproved } from '../social-publish';
import { createQwenSocialCandidate, qwenSocialStatus } from '../social-qwen';

const router = Router();
const draftInput = z.object({ slot: z.enum(['morning', 'evening']) }).strict();
const reviewInput = z.object({ action: z.enum(['approve', 'reject']), caption: z.string().trim().max(1800).optional() }).strict();
const guard = [requireFirebaseAuth, requireAppCheck, requireProfileRole('admin')] as const;
const idPattern = /^\d{4}-\d{2}-\d{2}_(morning|evening)$/;
const oidc = new OAuth2Client();
const challengeLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/admin/social-content', ...guard, async (_req, res) => {
  try {
    const date = istanbulDate(new Date());
    const db = getAdminDb();
    const refs = ['morning', 'evening'].map(slot => db.collection('social_content').doc(socialSlotId(date, slot as 'morning' | 'evening')));
    const snapshots = await db.getAll(...refs);
    const publicationRefs = refs.flatMap(ref => ['instagram', 'facebook'].map(platform => db.collection('social_publications').doc(`${ref.id}_${platform}`)));
    const publications = await db.getAll(...publicationRefs);
    const metrics = await db.getAll(...refs.map(ref => db.collection('social_metrics').doc(ref.id)));
    const settings = await db.collection('social_settings').doc('main').get();
    return res.json({ date, slots: snapshots.map(snapshot => snapshot.exists ? snapshot.data() : null),
      platforms: { instagram: platformReady('instagram'), facebook: platformReady('facebook') },
      qwen: { status: qwenSocialStatus(), model: qwenSocialStatus() === 'configured' ? process.env.QWEN_MODEL : null },
      publications: publications.filter(s => s.exists).map(s => s.data()),
      metrics: metrics.map(s => s.exists ? s.data() : null),
      settings: { autoApprove: settings.data()?.autoApprove === true } });
  } catch {
    return res.status(503).json({ error: 'Sosyal içerik taslakları alınamadı.' });
  }
});

router.post('/admin/social-content/settings', ...guard, async (req: AuthenticatedRequest, res) => {
  const input = z.object({ autoApprove: z.boolean() }).strict().safeParse(req.body);
  if (!input.success || !req.authUser) return res.sendStatus(400);
  try {
    await getAdminDb().collection('social_settings').doc('main').set({ autoApprove: input.data.autoApprove,
      updatedBy: req.authUser.uid, updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ autoApprove: input.data.autoApprove });
  } catch { return res.status(503).json({ error: 'Ayar kaydedilemedi.' }); }
});

async function createDraft(slot: 'morning' | 'evening', actor: string) {
  const db = getAdminDb();
  const settings = await db.collection('social_settings').doc('main').get();
  const autoApprove = actor === 'scheduler' && settings.data()?.autoApprove === true;
  const date = istanbulDate(new Date());
  const key = socialSlotId(date, slot);
  const draftRef = db.collection('social_content').doc(key);
  if ((await draftRef.get()).exists) return { code: 409, message: 'Bu dilim için taslak zaten oluşturulmuş.' };
  const qwenStatus = qwenSocialStatus();
  if (qwenStatus === 'incomplete') return { code: 503, message: 'Qwen için API anahtarı, model ve bölgeye uygun temel URL ayarlanmalı.' };
  const eligible: { id: string; question: BaseQuestion; source: string; caption?: string }[] = [];
  if (qwenStatus === 'configured') {
    try {
      const generated = await createQwenSocialCandidate(key);
      eligible.push({ id: generated.question.id, question: generated.question, source: 'qwen_verified', caption: generated.caption });
    } catch { return { code: 503, message: 'Qwen sorusu üretilemedi veya doğrulanamadı; taslak ve paylaşım oluşturulmadı.' }; }
  } else {
    const questions = await db.collection('questions').where('status', '==', 'published').limit(100).get();
    eligible.push(...questions.docs.filter(doc => !socialQuestionRejection(doc.data() as BaseQuestion))
      .map(doc => ({ id: doc.id, question: doc.data() as BaseQuestion, source: 'question_bank' })));
    const seed = [...key].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 1);
    for (let i = 0; i < 16; i++) {
      try {
        const type = i % 3 === 0 ? 'matrix_2x2' : i % 3 === 1 ? 'visual_sequence' : 'number_pattern';
        const question = generateProfessionalQuestion(type, seed + i + 1, 2);
        if (!socialQuestionRejection(question, 90, true)) eligible.push({ id: question.id, question, source: 'procedural' });
      } catch { /* Invalid seeds are skipped. */ }
    }
  }
  for (const candidate of eligible) {
    const question = candidate.question;
    const usageRef = db.collection('social_question_usage').doc(candidate.id);
    const draft = {
      id: key, date, slot, timezone: 'Europe/Istanbul', questionId: candidate.id, source: candidate.source,
      question: JSON.parse(JSON.stringify(question)) as BaseQuestion,
      qualityScore: question.aiMeta?.qualityScore ?? 100, solverVerified: true,
      caption: candidate.caption ?? 'Günün Zekapark sorusunu çözebilir misiniz? Cevap ve açıklama ikinci görselde. #BİLSEM #Zekapark',
      state: autoApprove ? 'approved' : 'awaiting_approval', createdBy: actor, createdAt: new Date().toISOString(),
    };
    const created = await db.runTransaction(async transaction => {
      const [current, used] = await Promise.all([transaction.get(draftRef), transaction.get(usageRef)]);
      if (current.exists || used.exists) return false;
      transaction.create(draftRef, draft);
      transaction.create(usageRef, { questionId: candidate.id, contentId: key, createdAt: draft.createdAt });
      return true;
    });
    if (created) return { code: 201, draft };
    if ((await draftRef.get()).exists) return { code: 409, message: 'Bu dilim için taslak zaten oluşturulmuş.' };
  }
  return { code: 422, message: qwenStatus === 'configured' ? 'Qwen sorusu önceden kullanılmış; daha sonra tekrar deneyin.' : 'Kullanılmamış ve doğrulanmış soru bulunamadı.' };
}

router.post('/admin/social-content/draft', ...guard, async (req: AuthenticatedRequest, res) => {
  const parsed = draftInput.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Geçersiz paylaşım dilimi.' });
  try {
    const result = await createDraft(parsed.data.slot, req.authUser.uid);
    return res.status(result.code).json(result.code === 201 ? { draft: result.draft } : { error: result.message });
  } catch { return res.status(503).json({ error: 'Sosyal içerik taslağı oluşturulamadı.' }); }
});

router.post('/admin/social-content/:id/review', ...guard, async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string, input = reviewInput.safeParse(req.body);
  if (!idPattern.test(id) || !input.success || !req.authUser) return res.sendStatus(400);
  try {
    const db = getAdminDb(), ref = db.collection('social_content').doc(id);
    const state = await db.runTransaction(async transaction => {
      const doc = await transaction.get(ref);
      if (!doc.exists || doc.data()?.state !== 'awaiting_approval') return null;
      const data = doc.data()!;
      if (input.data.action === 'approve' && socialQuestionRejection(data.question as BaseQuestion, 90, ['procedural', 'qwen_verified'].includes(data.source))) return null;
      const next = input.data.action === 'approve' ? 'approved' : 'rejected';
      transaction.update(ref, { state: next, caption: input.data.caption ?? data.caption,
        reviewedBy: req.authUser!.uid, reviewedAt: new Date().toISOString() });
      return next;
    });
    return state ? res.json({ state }) : res.status(409).json({ error: 'Taslak bulunamadı veya durumu değişti.' });
  } catch { return res.status(503).json({ error: 'İnceleme kaydedilemedi.' }); }
});

async function sendCard(id: string, kind: string, res: import('express').Response, isPublic: boolean) {
  if (!idPattern.test(id) || !['question', 'answer'].includes(kind)) return res.sendStatus(400);
  try {
    const doc = await getAdminDb().collection('social_content').doc(id).get();
    if (!doc.exists || (isPublic && !['approved', 'publishing', 'published', 'needs_attention'].includes(doc.data()?.state))) return res.sendStatus(404);
    const svg = renderSocialCard(doc.data()!.question as BaseQuestion, kind as 'question' | 'answer');
    const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
    return res.type('jpeg').set('Cache-Control', isPublic ? 'public, max-age=300' : 'private, no-store').send(jpg);
  } catch { return res.sendStatus(422); }
}

router.get('/admin/social-content/:id/:kind.jpg', ...guard, (req, res) =>
  sendCard(req.params.id as string, req.params.kind as string, res, false));
router.get('/social/media/:id/:kind.jpg', (req, res) =>
  sendCard(req.params.id as string, req.params.kind as string, res, true));

router.get('/social/challenge/:id', challengeLimiter, async (req, res) => {
  const id = req.params.id as string;
  if (!idPattern.test(id)) return res.sendStatus(400);
  try {
    const db = getAdminDb(), doc = await db.collection('social_content').doc(id).get();
    if (!doc.exists || !['approved', 'publishing', 'published', 'needs_attention'].includes(doc.data()?.state)) return res.sendStatus(404);
    const q = doc.data()!.question as BaseQuestion;
    await db.collection('social_metrics').doc(id).set({ views: FieldValue.increment(1) }, { merge: true });
    return res.json({ id, prompt: q.prompt, options: q.options.map(o => o.id),
      correctOptionId: q.correctOptionId, explanation: q.explanation.summary });
  } catch { return res.status(503).json({ error: 'Soru şu anda açılamıyor.' }); }
});

router.post('/social/challenge/:id/solve', challengeLimiter, async (req, res) => {
  const id = req.params.id as string;
  const answer = z.object({ option: z.enum(['A', 'B', 'C', 'D']) }).strict().safeParse(req.body);
  if (!idPattern.test(id) || !answer.success) return res.sendStatus(400);
  try {
    const db = getAdminDb(), doc = await db.collection('social_content').doc(id).get();
    if (!doc.exists || !['approved', 'publishing', 'published', 'needs_attention'].includes(doc.data()?.state)) return res.sendStatus(404);
    await db.collection('social_metrics').doc(id).set({ solves: FieldValue.increment(1) }, { merge: true });
    return res.json({ correct: answer.data.option === doc.data()!.question.correctOptionId });
  } catch { return res.status(503).json({ error: 'Yanıt şu anda kaydedilemiyor.' }); }
});

async function requireScheduler(req: AuthenticatedRequest, res: import('express').Response, next: import('express').NextFunction) {
  const audience = process.env.SOCIAL_SCHEDULER_AUDIENCE, email = process.env.SOCIAL_SCHEDULER_SERVICE_EMAIL;
  const match = (req.header('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!audience || !email || !match) return res.sendStatus(401);
  try {
    const ticket = await oidc.verifyIdToken({ idToken: match[1], audience });
    const payload = ticket.getPayload();
    if (!payload || payload.email !== email || !payload.email_verified) return res.sendStatus(403);
    return next();
  } catch { return res.sendStatus(401); }
}

router.post('/internal/social/draft', requireScheduler, async (_req, res) => {
  try {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    const slot = hour < 15 ? 'morning' : 'evening';
    const result = await createDraft(slot, 'scheduler');
    return res.status(result.code === 409 ? 200 : result.code).json(result);
  } catch { return res.status(503).json({ error: 'Zamanlanmış üretim başarısız.' }); }
});

router.post('/internal/social/run', requireScheduler, async (_req, res) => {
  try {
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23' }).format(now));
    const slot = hour >= 19 ? 'evening' : hour >= 9 && hour < 15 ? 'morning' : null;
    const created = slot ? await createDraft(slot, 'scheduler') : null;
    const date = istanbulDate(now), db = getAdminDb();
    const publishing: Array<{ slot: string; platform: string; result: unknown }> = [];
    for (const selected of ['morning', 'evening'] as const) {
      if (hour < (selected === 'morning' ? 10 : 20)) continue;
      const id = socialSlotId(date, selected);
      for (const platform of ['instagram', 'facebook'] as const) {
        if (!platformReady(platform)) continue;
        const result = await publishApproved(db, id, platform);
        publishing.push({ slot: selected, platform, result });
      }
    }
    return res.json({ created, publishing });
  } catch { return res.status(503).json({ error: 'Zamanlanmış sosyal görev başarısız.' }); }
});

export { requireScheduler };
export default router;
