import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { activityRetentionExpiresAt } from '../server/retention';
import { generateQuestionByType } from '../src/features/questions/generators';
import { STORAGE_KEYS } from '../src/services/modules/shared';
import type { BaseQuestion, MistakeItem } from '../src/types';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
const mode = process.env.ANSWER_SECRET_MIGRATION_MODE?.trim() || 'dry-run';
if (!projectId || !databaseId) throw new Error('FIREBASE_PROJECT_ID ve FIREBASE_DATABASE_ID zorunludur.');
if (!['dry-run', 'execute'].includes(mode)) {
  throw new Error('ANSWER_SECRET_MIGRATION_MODE dry-run veya execute olmalıdır.');
}
if (mode === 'execute' && process.env.CONFIRM_ANSWER_SECRET_MIGRATION !== projectId) {
  throw new Error('CONFIRM_ANSWER_SECRET_MIGRATION proje kimliğiyle aynı olmalıdır.');
}

const app = getApps()[0] || initializeApp({ projectId });
const db = getFirestore(app, databaseId);
let affectedUsers = 0;
let vaultedQuestions = 0;
let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

while (true) {
  let query = db.collection('users').orderBy('__name__').limit(100);
  if (cursor) query = query.startAfter(cursor);
  const users = await query.get();
  if (users.empty) break;

  for (const user of users.docs) {
    const stateRef = user.ref.collection('private').doc('state');
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.data();
    const values = { ...((state?.values || {}) as Record<string, unknown>) };
    const raw = values[STORAGE_KEYS.MISTAKES];
    if (typeof raw !== 'string') continue;

    let mistakes: MistakeItem[];
    try {
      const parsed = JSON.parse(raw);
      mistakes = Array.isArray(parsed) ? parsed : [];
    } catch {
      continue;
    }

    let changed = false;
    const batch = db.batch();
    const sanitized = mistakes.map((item) => {
      let question = item.cachedQuestion as BaseQuestion | undefined;
      if (!question && typeof item.questionSeed === 'number' && item.questionSeed > 0) {
        try {
          question = generateQuestionByType(item.questionType, item.questionSeed, item.difficulty);
        } catch {
          question = undefined;
        }
      }
      if (question && !item.resolved && /^[A-Za-z0-9_-]{1,400}$/.test(item.id)) {
        batch.set(db.doc(`mistakeQuestionVault/${user.id}/questions/${item.id}`), {
          userId: user.id,
          mistakeId: item.id,
          question,
          migratedAt: Date.now(),
          expiresAt: activityRetentionExpiresAt(),
        }, { merge: true });
        vaultedQuestions += 1;
      }
      if (item.cachedQuestion || item.questionSeed !== undefined) changed = true;
      const { cachedQuestion: _cached, questionSeed: _seed, ...safe } = item;
      return safe;
    });

    if (changed) {
      affectedUsers += 1;
      values[STORAGE_KEYS.MISTAKES] = JSON.stringify(sanitized);
      batch.set(stateRef, { values, updatedAt: Date.now() }, { merge: true });
      if (mode === 'execute') await batch.commit();
    }
  }

  cursor = users.docs.at(-1);
  if (users.size < 100) break;
}

console.log(JSON.stringify({
  success: true,
  mode,
  affectedUsers,
  vaultedQuestions,
  writesCommitted: mode === 'execute',
}));
