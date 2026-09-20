import { collection, doc, getDocs, query, where, limit, runTransaction, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { BaseQuestion } from '../types';
import { auditQuestion } from '../features/questions/quality';
import { questionBankService } from './question-bank-service';
export { parseQuestionImport, selectPublishedPool } from '../features/questions/editorial-data';

export interface StoredQuestion extends BaseQuestion {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  reviewedBy?: string;
}
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

async function requireAdminAuth() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için yönetici oturumu gerekli.');

  const token = await user.getIdTokenResult();
  if (token.claims.role !== 'admin') {
    throw new Error('Bu işlem için doğrulanmış yönetici yetkisi gerekli.');
  }
  return user;
}

export async function loadQuestionLibrary(): Promise<StoredQuestion[]> {
  await requireAdminAuth();
  const snapshot = await getDocs(collection(db, 'questions'));
  return snapshot.docs
    .map(d => ({ ...d.data(), id: d.id }) as StoredQuestion)
    .filter(q => auditQuestion(q).errors.length === 0)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function saveEditorialQuestion(
  question: BaseQuestion,
  status: NonNullable<BaseQuestion['status']>,
  expectedRevision: number,
  confirmedReview: boolean,
): Promise<StoredQuestion> {
  const user = await requireAdminAuth();
  const uid = user.uid;
  const report = auditQuestion(question);
  if (report.errors.length) throw new Error(report.errors.join(' '));
  if (status === 'published' && !confirmedReview) throw new Error('Yayımlamadan önce yönerge, cevap ve görselleri inceleyip onaylayın.');

  const ref = doc(db, 'questions', question.id);
  const now = new Date().toISOString();
  const stored: StoredQuestion = clean({
    ...question,
    status,
    revision: (expectedRevision || 0) + 1,
    isCustom: true,
    createdAt: question.createdAt || now,
    updatedAt: now,
    updatedBy: uid,
    ...(status === 'published' ? { reviewedBy: uid } : {}),
  });

  if (status !== 'published') delete stored.reviewedBy;

  // Optimistic concurrency prevents two editors from silently overwriting
  // one another. Firestore remains the source of truth.
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const liveRevision = snapshot.exists() ? Number(snapshot.data().revision || 0) : 0;
    if (liveRevision !== expectedRevision) {
      throw new Error('EDIT_CONFLICT');
    }
    transaction.set(ref, stored, { merge: true });
  });

  // Keep in-memory admin panels synchronized only after the durable write.
  questionBankService.cacheQuestion(stored);

  return stored;
}

export async function loadPublishedQuestions(): Promise<BaseQuestion[]> {
  try {
    const snapshot = await getDocs(query(collection(db, 'questions'), where('status', '==', 'published'), limit(200)));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as BaseQuestion).filter(q => auditQuestion(q).errors.length === 0);
    }
  } catch (err) {
    console.warn('Firestore published load notice:', err);
  }
  return questionBankService.getAll().filter(q => q.status === 'published');
}

export async function clearAllFirestoreQuestions(): Promise<number> {
  await requireAdminAuth();
  
  const snapshot = await getDocs(collection(db, 'questions'));
  if (snapshot.empty) return 0;

  // Firestore batches are capped at 500 operations. Keep headroom for future
  // audit writes and process large libraries safely.
  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(offset, offset + 450).forEach((document) => {
      batch.delete(doc(db, 'questions', document.id));
    });
    await batch.commit();
  }

  return snapshot.size;
}
