import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath, Timestamp, GeoPoint } from 'firebase-admin/firestore';

const outputDirectory = process.argv[2];
if (!outputDirectory || !process.env.FIREBASE_PROJECT_ID) {
  console.error('Usage: FIREBASE_PROJECT_ID=... [FIREBASE_DATABASE_ID=...] node scripts/export-firebase-for-supabase.mjs OUTPUT_DIRECTORY');
  process.exit(2);
}
const root = resolve(outputDirectory);
await mkdir(root, { recursive: true, mode: 0o700 });
await chmod(root, 0o700);
const app = initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
const db = process.env.FIREBASE_DATABASE_ID
  ? getFirestore(app, process.env.FIREBASE_DATABASE_ID)
  : getFirestore(app);

function jsonValue(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return Array.from(value);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]));
  }
  return value;
}
async function savePrivate(name, data) {
  const path = join(root, name);
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await chmod(path, 0o600);
  console.log(`${name}: ${Object.keys(data).length} records`);
}
async function exportCollection(name) {
  const data = {};
  let last = null;
  for (;;) {
    let query = db.collection(name).orderBy(FieldPath.documentId()).limit(500);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    for (const doc of snapshot.docs) data[doc.id] = jsonValue(doc.data());
    if (snapshot.size < 500) break;
    last = snapshot.docs.at(-1);
  }
  return data;
}

const users = await exportCollection('users');
const privateStates = {};
for (const uid of Object.keys(users)) {
  const snapshot = await db.doc(`users/${uid}/private/state`).get();
  if (snapshot.exists) privateStates[uid] = jsonValue(snapshot.data());
}
const source = { users, privateStates };
for (const name of [
  'questions', 'practiceSessions', 'testAttempts',
  'ai_generation_jobs', 'ai_generation_logs', 'securityEvents',
]) source[name] = await exportCollection(name);
await savePrivate('firestore-export.json', source);

const authUsers = {};
let nextPageToken;
do {
  const page = await getAuth(app).listUsers(1000, nextPageToken);
  for (const user of page.users) {
    authUsers[user.uid] = {
      email: user.email ?? null,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      displayName: user.displayName ?? null,
    };
  }
  nextPageToken = page.pageToken;
} while (nextPageToken);
await savePrivate('auth-users.json', authUsers);
console.log('Export complete. Keep these files private; they contain personal data.');
