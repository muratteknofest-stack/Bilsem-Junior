import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
const requestId = process.env.PRIVACY_REQUEST_ID?.trim();
const approverUid = process.env.PRIVACY_APPROVER_UID?.trim();

if (!projectId || !databaseId || !requestId || !approverUid) {
  throw new Error('FIREBASE_PROJECT_ID, FIREBASE_DATABASE_ID, PRIVACY_REQUEST_ID ve PRIVACY_APPROVER_UID zorunludur.');
}
if (process.env.CONFIRM_PRIVACY_APPROVAL !== `${projectId}:${requestId}`) {
  throw new Error('CONFIRM_PRIVACY_APPROVAL değeri PROJECT_ID:REQUEST_ID biçiminde eşleşmelidir.');
}

const app = getApps()[0] || initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, databaseId);
const [approver, approverProfile, requestSnapshot] = await Promise.all([
  auth.getUser(approverUid),
  db.doc(`users/${approverUid}`).get(),
  db.doc(`privacyDeletionRequests/${requestId}`).get(),
]);

if (approver.customClaims?.role !== 'admin' || approverProfile.data()?.role !== 'admin') {
  throw new Error('Onaylayan UID hem Auth claim hem Firestore profilinde yönetici olmalıdır.');
}
const request = requestSnapshot.data();
if (!request || request.status !== 'pending') throw new Error('Bekleyen silme talebi bulunamadı.');
if (request.legalHold === true) throw new Error('Talep yasal saklama nedeniyle onaylanamaz.');
const subjectIds = Array.isArray(request.subjectIds) ? request.subjectIds : [];
if (!subjectIds.length || !subjectIds.includes(request.requesterId)) {
  throw new Error('Silme talebi bütünlük kontrolünü geçemedi.');
}

const now = Date.now();
await requestSnapshot.ref.update({
  status: 'approved',
  approvedAt: now,
  approvedBy: approverUid,
  audit: [...(Array.isArray(request.audit) ? request.audit : []), {
    action: 'approved',
    actorId: approverUid,
    at: now,
  }],
});

console.log(JSON.stringify({ success: true, requestId, subjectCount: subjectIds.length, approvedBy: approverUid }));
