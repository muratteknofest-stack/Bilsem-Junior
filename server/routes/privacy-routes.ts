import { Router } from 'express';
import { z } from 'zod';
import { privacyLimiter } from '../rate-limiters';
import { getAdminDb, requireAppCheck, requireFirebaseAuth, type AuthenticatedRequest } from '../security';

const privacyRoutes = Router();
const guards = [requireFirebaseAuth, requireAppCheck, privacyLimiter] as const;
const deleteRequestSchema = z.object({
  confirmation: z.literal('HESABIMI VE BAĞLI ÇOCUK VERİLERİNİ SİL'),
  reason: z.string().trim().max(500).optional(),
}).strict();

function requireRecentAuthentication(req: AuthenticatedRequest): boolean {
  const authTimeSeconds = Number(req.authUser?.auth_time || 0);
  return authTimeSeconds > 0 && (Date.now() / 1000 - authTimeSeconds) <= 10 * 60;
}

const answerSecretKey = /^(?:answer|correct|isCorrect|solution|solverAnswer|missingPiece|distractorNotes|explanation|rationale|cachedQuestion|questionSeed|seed)$/i;

function redactAnswerSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAnswerSecrets);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !answerSecretKey.test(key))
      .map(([key, nested]) => [key, redactAnswerSecrets(nested)]),
  );
}

privacyRoutes.get('/privacy/export', ...guards, async (req: AuthenticatedRequest, res) => {
  if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  try {
    const db = getAdminDb();
    const ownerSnapshot = await db.doc(`users/${req.authUser.uid}`).get();
    const owner = ownerSnapshot.data();
    if (!owner) return res.status(404).json({ error: 'Kullanıcı profili bulunamadı.' });
    const subjectIds = owner.role === 'parent'
      ? [req.authUser.uid, ...((owner.linkedStudentIds || []) as string[])]
      : [req.authUser.uid];
    const uniqueSubjectIds = [...new Set(subjectIds.filter((id) => /^[A-Za-z0-9_-]{1,128}$/.test(id)))];
    const profiles = await db.getAll(...uniqueSubjectIds.map((id) => db.doc(`users/${id}`)));
    const states = await db.getAll(...uniqueSubjectIds.map((id) => db.doc(`users/${id}/private/state`)));
    const attempts = await Promise.all(uniqueSubjectIds.map(async (id) => ({
      userId: id,
      exams: (await db.collection('testAttempts').where('userId', '==', id).limit(500).get()).docs
        .map((item) => ({ id: item.id, ...item.data() })),
      practice: (await db.collection('practiceSessions').where('userId', '==', id).limit(500).get()).docs
        .map((item) => ({ id: item.id, ...item.data() })),
      progressEvents: (await db.collection('progressEvents').where('userId', '==', id).orderBy('occurredAt', 'desc').limit(1000).get()).docs
        .map((item) => ({ id: item.id, ...item.data() })),
    })));
    const entitlements = await db.getAll(...uniqueSubjectIds.map((id) => db.doc(`entitlements/${id}`)));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zekapark-veri-aktarimi-${Date.now()}.json"`);
    return res.json({
      exportedAt: new Date().toISOString(),
      controller: process.env.LEGAL_ENTITY_NAME || 'YAPILANDIRILMADI',
      subjects: profiles.map((snapshot, index) => ({
        id: snapshot.id,
        profile: snapshot.exists ? snapshot.data() : null,
        // Subject-access exports contain the learner's activity, but never
        // unreleased answer keys or legacy generator seeds.
        privateState: states[index]?.exists ? redactAnswerSecrets(states[index].data()) : null,
      })),
      activity: attempts,
      subscriptions: entitlements.map((snapshot) => ({
        userId: snapshot.id,
        plan: snapshot.data()?.plan || 'free',
        status: snapshot.data()?.status || 'inactive',
        currentPeriodEnd: snapshot.data()?.currentPeriodEnd || null,
      })),
    });
  } catch (error) {
    console.error('[Privacy] export failed:', error);
    return res.status(500).json({ error: 'Veri aktarımı hazırlanamadı.' });
  }
});

privacyRoutes.post('/privacy/deletion-requests', ...guards, async (req: AuthenticatedRequest, res) => {
  const parsed = deleteRequestSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Silme talebi doğrulanamadı.' });
  if (!requireRecentAuthentication(req)) {
    return res.status(401).json({ error: 'Bu işlem için son 10 dakika içinde yeniden giriş yapmalısınız.', code: 'RECENT_LOGIN_REQUIRED' });
  }
  try {
    const db = getAdminDb();
    const profileSnapshot = await db.doc(`users/${req.authUser.uid}`).get();
    const profile = profileSnapshot.data();
    if (!profile) return res.status(404).json({ error: 'Kullanıcı profili bulunamadı.' });
    if (profile.role === 'student' && profile.linkedParentId) {
      return res.status(403).json({ error: 'Bağlı çocuk hesabı için silme talebini veli hesabı oluşturmalıdır.' });
    }
    const subjectIds = profile.role === 'parent'
      ? [req.authUser.uid, ...((profile.linkedStudentIds || []) as string[])]
      : [req.authUser.uid];
    const existing = await db.collection('privacyDeletionRequests')
      .where('requesterId', '==', req.authUser.uid)
      .where('status', 'in', ['pending', 'approved', 'processing'])
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Bu hesap için zaten açık bir silme talebi var.' });
    }
    // The request ID is deliberately unrelated to the Auth UID. Completed
    // compliance proofs can therefore be pseudonymised without retaining a
    // personal identifier in the Firestore document path.
    const requestRef = db.collection('privacyDeletionRequests').doc();
    const now = Date.now();
    await requestRef.set({
      requesterId: req.authUser.uid,
      requesterEmail: req.authUser.email || null,
      subjectIds: [...new Set(subjectIds)],
      status: 'pending',
      reason: parsed.data.reason || null,
      requestedAt: now,
      dueAt: now + 30 * 24 * 60 * 60_000,
      audit: [{ action: 'requested', actorId: req.authUser.uid, at: now }],
    });
    return res.status(202).json({
      success: true,
      requestId: requestRef.id,
      status: 'pending',
      dueAt: now + 30 * 24 * 60 * 60_000,
    });
  } catch (error) {
    console.error('[Privacy] deletion request failed:', error);
    return res.status(500).json({ error: 'Silme talebi kaydedilemedi.' });
  }
});

export default privacyRoutes;
