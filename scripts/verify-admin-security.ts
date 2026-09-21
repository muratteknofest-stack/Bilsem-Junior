import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
const adminUid = process.env.ADMIN_UID?.trim();
const expectedProjectId = 'gen-lang-client-0426617456';
const expectedDatabaseId = 'ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f';
const maxAgeHours = Number(process.env.MAX_ADMIN_ROTATION_AGE_HOURS || 24);

if (projectId !== expectedProjectId || databaseId !== expectedDatabaseId) {
  throw new Error('Yönetici doğrulaması beklenen üretim proje/veritabanı hedefiyle eşleşmiyor.');
}
if (!adminUid || !/^[A-Za-z0-9_-]{1,128}$/.test(adminUid)) throw new Error('Geçerli ADMIN_UID zorunludur.');
if (process.env.CONFIRM_ADMIN_SECURITY_VERIFICATION !== `${projectId}:${adminUid}`) {
  throw new Error('CONFIRM_ADMIN_SECURITY_VERIFICATION PROJECT_ID:ADMIN_UID biçiminde eşleşmelidir.');
}
if (!Number.isFinite(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 168) {
  throw new Error('MAX_ADMIN_ROTATION_AGE_HOURS 1–168 arasında olmalıdır.');
}

const app = getApps()[0] || initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, databaseId);
const [user, profile, auditSnapshot] = await Promise.all([
  auth.getUser(adminUid),
  db.doc(`users/${adminUid}`).get(),
  db.collection('adminAuditLogs').where('targetUid', '==', adminUid).limit(50).get(),
]);

if (!user.emailVerified) throw new Error('Yönetici e-postası doğrulanmamış.');
if (user.customClaims?.role !== 'admin') throw new Error('Firebase role=admin claim doğrulanamadı.');
if (profile.data()?.id !== adminUid || profile.data()?.role !== 'admin') {
  throw new Error('Firestore yönetici profili UID/rol kontrolünü geçemedi.');
}
const totpEnrolled = user.multiFactor?.enrolledFactors?.some((factor) => factor.factorId === 'totp') || false;
if (!totpEnrolled) throw new Error('Yönetici hesabında TOTP ikinci faktörü kayıtlı değil.');

const rotationEvents = auditSnapshot.docs
  .map((snapshot) => snapshot.data())
  .filter((event) => event.action === 'admin_credentials_rotated')
  .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
const rotationAt = Number(rotationEvents[0]?.createdAt || 0);
if (!rotationAt || Date.now() - rotationAt > maxAgeHours * 60 * 60_000) {
  throw new Error(`Son ${maxAgeHours} saat içinde yönetici parola/token döndürme kanıtı bulunamadı.`);
}
const tokensValidAfter = Date.parse(user.tokensValidAfterTime || '');
if (!Number.isFinite(tokensValidAfter) || tokensValidAfter + 5_000 < rotationAt) {
  throw new Error('Yenileme tokenı iptal zamanı parola döndürme olayıyla eşleşmiyor.');
}

console.log(JSON.stringify({
  success: true,
  projectId,
  databaseId,
  adminUid,
  role: user.customClaims.role,
  emailVerified: true,
  totpEnrolled: true,
  passwordRotatedAt: new Date(rotationAt).toISOString(),
  sessionsRevokedAt: new Date(tokensValidAfter).toISOString(),
}));
