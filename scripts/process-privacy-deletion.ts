import { createHmac } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { stripeDelete } from '../server/billing/stripe-client';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
const requestId = process.env.PRIVACY_REQUEST_ID?.trim();
const auditHmacKey = process.env.PRIVACY_AUDIT_HMAC_KEY?.trim();
if (!projectId || !databaseId || !requestId || !auditHmacKey) {
  throw new Error('FIREBASE_PROJECT_ID, FIREBASE_DATABASE_ID, PRIVACY_REQUEST_ID ve PRIVACY_AUDIT_HMAC_KEY zorunludur.');
}
if (auditHmacKey.length < 32) throw new Error('PRIVACY_AUDIT_HMAC_KEY en az 32 karakter olmalıdır.');
if (process.env.CONFIRM_PRIVACY_DELETION !== `${projectId}:${requestId}`) {
  throw new Error('CONFIRM_PRIVACY_DELETION değeri PROJECT_ID:REQUEST_ID biçiminde eşleşmelidir.');
}

const app = getApps()[0] || initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, databaseId);
const requestRef = db.doc(`privacyDeletionRequests/${requestId}`);
const requestSnapshot = await requestRef.get();
const request = requestSnapshot.data();
if (!request || !['approved', 'processing'].includes(String(request.status))) {
  throw new Error('Yalnızca açıkça onaylanmış veya devam eden bir silme talebi işlenebilir.');
}
if (request.legalHold === true) throw new Error('Talep yasal saklama nedeniyle işlenemez.');
const subjectIds = [...new Set((request.subjectIds || []).filter((id: unknown) => typeof id === 'string'))] as string[];
if (!subjectIds.length || !subjectIds.includes(request.requesterId)) throw new Error('Silme talebi bütünlük kontrolünü geçemedi.');

let audit = Array.isArray(request.audit) ? request.audit : [];
let processingStartedAt = Number(request.processingStartedAt || 0);
if (request.status === 'approved') {
  processingStartedAt = Date.now();
  audit = [...audit, {
    action: 'processing_started',
    actorId: 'privacy-deletion-worker',
    at: processingStartedAt,
  }];
  await requestRef.update({ status: 'processing', processingStartedAt, audit });
}
const processedSubjectIds = new Set(
  (Array.isArray(request.processedSubjectIds) ? request.processedSubjectIds : [])
    .filter((id: unknown): id is string => typeof id === 'string'),
);
for (const uid of subjectIds) {
  if (processedSubjectIds.has(uid)) continue;
  const entitlementRef = db.doc(`entitlements/${uid}`);
  const [
    attempts,
    practice,
    progressEvents,
    billingCheckouts,
    billingEvents,
    securityAsActor,
    securityAsStudent,
    adminAuditAsActor,
    adminAuditAsStudent,
    registrationsAsParent,
    registrationsAsStudent,
    entitlementSnapshot,
  ] = await Promise.all([
    db.collection('testAttempts').where('userId', '==', uid).get(),
    db.collection('practiceSessions').where('userId', '==', uid).get(),
    db.collection('progressEvents').where('userId', '==', uid).get(),
    db.collection('billingCheckouts').where('userId', '==', uid).get(),
    db.collection('billingEvents').where('userId', '==', uid).get(),
    db.collection('securityEvents').where('actorId', '==', uid).get(),
    db.collection('securityEvents').where('studentId', '==', uid).get(),
    db.collection('adminAuditLogs').where('actorId', '==', uid).get(),
    db.collection('adminAuditLogs').where('studentId', '==', uid).get(),
    db.collection('registrationOperations').where('parentId', '==', uid).get(),
    db.collection('registrationOperations').where('studentId', '==', uid).get(),
    entitlementRef.get(),
  ]);
  const entitlement = entitlementSnapshot.data();
  if (entitlement?.provider === 'stripe' && entitlement.customerId) {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      throw new Error(`Stripe müşteri kaydı silinemedi: STRIPE_SECRET_KEY eksik (${uid}).`);
    }
    await stripeDelete(`customers/${encodeURIComponent(String(entitlement.customerId))}`, { ignoreNotFound: true });
  }
  const relatedDocuments = new Map([
    ...attempts.docs,
    ...practice.docs,
    ...progressEvents.docs,
    ...billingCheckouts.docs,
    ...billingEvents.docs,
    ...securityAsActor.docs,
    ...securityAsStudent.docs,
    ...adminAuditAsActor.docs,
    ...adminAuditAsStudent.docs,
    ...registrationsAsParent.docs,
    ...registrationsAsStudent.docs,
  ].map((snapshot) => [snapshot.ref.path, snapshot] as const));
  await Promise.all([...relatedDocuments.values()].map((snapshot) => db.recursiveDelete(snapshot.ref)));
  await db.recursiveDelete(db.doc(`mistakeQuestionVault/${uid}`));
  await entitlementRef.delete();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await auth.deleteUser(uid).catch((error: { code?: string }) => {
    if (error?.code !== 'auth/user-not-found') throw error;
  });
  await requestRef.update({
    processedSubjectIds: FieldValue.arrayUnion(uid),
    lastProcessedAt: Date.now(),
  });
}

const completedAt = Date.now();
const pseudonymise = (value: string) => createHmac('sha256', auditHmacKey).update(value).digest('hex');
const proof = {
  requesterHash: pseudonymise(String(request.requesterId)),
  subjectHashes: subjectIds.map(pseudonymise),
  subjectCount: subjectIds.length,
  status: 'completed',
  ...(typeof request.requestedAt === 'number' ? { requestedAt: request.requestedAt } : {}),
  ...(typeof request.dueAt === 'number' ? { dueAt: request.dueAt } : {}),
  ...(typeof request.approvedAt === 'number' ? { approvedAt: request.approvedAt } : {}),
  ...(processingStartedAt > 0 ? { processingStartedAt } : {}),
  completedAt,
  audit: [...audit, {
    action: 'completed',
    actorId: 'privacy-deletion-worker',
    at: completedAt,
  }].map((entry: Record<string, unknown>) => ({
    action: String(entry.action || 'unknown'),
    actorHash: typeof entry.actorId === 'string' ? pseudonymise(entry.actorId) : null,
    at: Number(entry.at || 0),
  })),
  proof: 'Firebase Auth and Firestore subject roots recursively deleted',
  proofVersion: 1,
};

// Legacy requests used the raw Auth UID as the document ID. Move those proofs
// to an opaque ID so erasure does not leave the identifier in a document path.
const proofRef = requestId === request.requesterId
  ? db.collection('privacyDeletionRequests').doc()
  : requestRef;
const finalBatch = db.batch();
finalBatch.set(proofRef, proof);
if (proofRef.path !== requestRef.path) finalBatch.delete(requestRef);
await finalBatch.commit();
console.log(JSON.stringify({
  success: true,
  requestId: proofRef.id,
  deletedSubjects: subjectIds.length,
  pseudonymisedProof: true,
}));
