import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
if (!projectId || !databaseId || !databaseId.startsWith('zekapark-restore-drill-')) {
  throw new Error('Yalnızca açıkça adlandırılmış bir geri yükleme prova veritabanı doğrulanabilir.');
}
if (process.env.CONFIRM_RESTORE_VERIFICATION !== `${projectId}:${databaseId}`) {
  throw new Error('CONFIRM_RESTORE_VERIFICATION PROJECT_ID:DATABASE_ID biçiminde eşleşmelidir.');
}

const app = getApps()[0] || initializeApp({ projectId });
const db = getFirestore(app, databaseId);
const collections = await db.listCollections();
const expected = ['users', 'progressEvents', 'testAttempts'];
const counts = Object.fromEntries(await Promise.all(expected.map(async (name) => {
  if (!collections.some((collection) => collection.id === name)) return [name, 0];
  const result = await db.collection(name).count().get();
  return [name, result.data().count];
})));

console.log(JSON.stringify({
  success: true,
  projectId,
  databaseId,
  collectionCount: collections.length,
  recordCounts: counts,
  verifiedAt: new Date().toISOString(),
}));
