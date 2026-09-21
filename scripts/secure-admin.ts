import { readFile, stat } from 'node:fs/promises';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
const uidInput = process.env.ADMIN_UID?.trim();
const passwordFile = process.env.ADMIN_NEW_PASSWORD_FILE?.trim();
const expectedProjectId = 'gen-lang-client-0426617456';
const expectedDatabaseId = 'ai-studio-zekapark-489c8194-ad28-4376-a397-80680e12a58f';

if (!projectId || !databaseId) {
  throw new Error('FIREBASE_PROJECT_ID ve FIREBASE_DATABASE_ID zorunludur.');
}
if (projectId !== expectedProjectId || databaseId !== expectedDatabaseId) {
  throw new Error('Yönetici güvenlik işlemi beklenen üretim proje/veritabanı hedefiyle eşleşmiyor.');
}
if (!uidInput || !/^[A-Za-z0-9_-]{1,128}$/.test(uidInput)) {
  throw new Error('Doğrulanmış Firebase ADMIN_UID zorunludur. E-posta adresinden yönetici seçilmez.');
}
if (!passwordFile) {
  throw new Error('Yeni parola yalnızca ADMIN_NEW_PASSWORD_FILE ile okunmalıdır.');
}
if (process.env.CONFIRM_ADMIN_SECURITY_ROTATION !== projectId) {
  throw new Error('CONFIRM_ADMIN_SECURITY_ROTATION proje kimliğiyle aynı olmalıdır.');
}

const passwordFileStat = await stat(passwordFile);
if (!passwordFileStat.isFile() || (passwordFileStat.mode & 0o077) !== 0) {
  throw new Error('Parola dosyası normal bir dosya olmalı ve yalnızca sahibi tarafından okunabilmelidir (chmod 600).');
}
const password = (await readFile(passwordFile, 'utf8')).trim();
if (
  password.length < 16
  || password.length > 128
  || !/[a-z]/.test(password)
  || !/[A-Z]/.test(password)
  || !/\d/.test(password)
  || !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error('Yeni parola 16–128 karakter ve büyük/küçük harf, sayı, sembol içermelidir.');
}

const app = getApps()[0] || initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, databaseId);
const user = await auth.getUser(uidInput);

if (!user.emailVerified) {
  throw new Error('Yönetici e-posta adresi doğrulanmadan ayrıcalık verilemez.');
}

await auth.updateUser(user.uid, { password });
// Do not preserve unknown historical claims from a previously exposed account.
await auth.setCustomUserClaims(user.uid, { role: 'admin' });
await db.doc(`users/${user.uid}`).set({
  id: user.uid,
  email: user.email,
  role: 'admin',
  securityUpdatedAt: Date.now(),
}, { merge: true });
await auth.revokeRefreshTokens(user.uid);
await db.collection('adminAuditLogs').add({
  action: 'admin_credentials_rotated',
  actorId: 'secure-admin-script',
  targetUid: user.uid,
  claimsReplaced: true,
  sessionsRevoked: true,
  createdAt: Date.now(),
});

const refreshed = await auth.getUser(user.uid);
if (refreshed.customClaims?.role !== 'admin') {
  throw new Error('Yönetici claim doğrulaması başarısız oldu.');
}

console.log(JSON.stringify({
  success: true,
  uid: user.uid,
  email: user.email,
  role: refreshed.customClaims.role,
  sessionsRevoked: true,
  enrolledFactors: refreshed.multiFactor?.enrolledFactors?.length || 0,
}));
