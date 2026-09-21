import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
if (!projectId || !databaseId) throw new Error('FIREBASE_PROJECT_ID ve FIREBASE_DATABASE_ID zorunludur.');
if (process.env.CONFIRM_RETENTION_ENFORCEMENT !== projectId) {
  throw new Error('CONFIRM_RETENTION_ENFORCEMENT proje kimliğiyle aynı olmalıdır.');
}

const activityDays = Number(process.env.ACTIVITY_RETENTION_DAYS || 180);
const auditDays = Number(process.env.AUDIT_RETENTION_DAYS || 365);
const aiLogDays = Number(process.env.AI_LOG_RETENTION_DAYS || 365);
const privacyRequestDays = Number(process.env.PRIVACY_REQUEST_RETENTION_DAYS || 1095);
if (![activityDays, auditDays, aiLogDays, privacyRequestDays].every((days) => Number.isInteger(days) && days >= 30 && days <= 3650)) {
  throw new Error('Saklama süreleri 30–3650 gün arasında tam sayı olmalıdır.');
}

const app = getApps()[0] || initializeApp({ projectId });
const db = getFirestore(app, databaseId);

async function deleteQuery(collection: string, field: string, cutoff: number, timestampValue = false): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collection)
      .where(field, '<', timestampValue ? Timestamp.fromMillis(cutoff) : cutoff)
      .limit(200)
      .get();
    if (snapshot.empty) return deleted;
    await Promise.all(snapshot.docs.map(async (document) => {
      await db.recursiveDelete(document.ref);
      deleted += 1;
    }));
  }
}

async function deleteCollectionGroup(group: string, field: string, cutoff: number): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collectionGroup(group).where(field, '<', cutoff).limit(200).get();
    if (snapshot.empty) return deleted;
    await Promise.all(snapshot.docs.map(async (document) => {
      await document.ref.delete();
      deleted += 1;
    }));
  }
}

const now = Date.now();
const results = {
  // Session/attempt writers already calculate expiresAt from the configured
  // retention period. Subtracting the period again would retain data twice.
  testAttempts: await deleteQuery('testAttempts', 'expiresAt', now, true),
  practiceSessions: await deleteQuery('practiceSessions', 'expiresAt', now),
  adminAuditLogs: await deleteQuery('adminAuditLogs', 'createdAt', now - auditDays * 86_400_000),
  billingCheckouts: await deleteQuery('billingCheckouts', 'createdAt', now - auditDays * 86_400_000),
  billingEvents: await deleteQuery('billingEvents', 'receivedAt', now - auditDays * 86_400_000),
  registrationOperations: await deleteQuery('registrationOperations', 'expiresAt', now),
  aiGenerationLogs: await deleteQuery('ai_generation_logs', 'createdAt', now - aiLogDays * 86_400_000),
  legacyAiGenerationLogs: await deleteQuery('ai_generation_logs', 'timestamp', now - aiLogDays * 86_400_000),
  aiGenerationJobs: await deleteQuery('ai_generation_jobs', 'completedAt', now - aiLogDays * 86_400_000),
  privacyDeletionProofs: await deleteQuery('privacyDeletionRequests', 'completedAt', now - privacyRequestDays * 86_400_000),
  progressEvents: await deleteQuery('progressEvents', 'expiresAt', now),
  expiredMistakeVaultEntries: await deleteCollectionGroup('questions', 'expiresAt', now),
};

console.log(JSON.stringify({
  success: true,
  retention: { activityDays, auditDays, aiLogDays, privacyRequestDays },
  deleted: results,
}));
