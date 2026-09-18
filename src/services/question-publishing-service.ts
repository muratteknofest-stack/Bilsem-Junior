import { collection, doc, getDocs, query, where, runTransaction, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { BaseQuestion } from '../types';
import { auditQuestion } from '../features/questions/quality';
export { parseQuestionImport, selectPublishedPool } from '../features/questions/editorial-data';

export interface StoredQuestion extends BaseQuestion {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  reviewedBy?: string;
}
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export async function loadQuestionLibrary(): Promise<StoredQuestion[]> {
  if (!auth.currentUser) throw new Error('Soru kütüphanesi için yönetici girişi gerekli.');
  const snapshot = await getDocs(collection(db, 'questions'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as StoredQuestion)
    .filter(q => auditQuestion(q).errors.length === 0)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

// A single record transaction prevents one editor silently overwriting another.
// Firestore's deployed isAdmin rule remains the authoritative permission check.
export async function saveEditorialQuestion(
  question: BaseQuestion,
  status: NonNullable<BaseQuestion['status']>,
  expectedRevision: number,
  confirmedReview: boolean,
): Promise<StoredQuestion> {
  const user = auth.currentUser;
  if (!user) throw new Error('Yönetici oturumu gerekli.');
  const report = auditQuestion(question);
  if (report.errors.length) throw new Error(report.errors.join(' '));
  if (status === 'published' && !confirmedReview) throw new Error('Yayımlamadan önce yönerge, cevap ve görselleri inceleyip onaylayın.');
  const ref = doc(db, 'questions', question.id);
  return runTransaction(db, async tx => {
    const current = await tx.get(ref);
    const revision = current.exists() ? current.data().revision || 0 : 0;
    if (revision !== expectedRevision) throw new Error('Bu soru başka bir oturumda değişti. Kütüphaneyi yenileyip tekrar açın.');
    const stored: StoredQuestion = clean({ ...question, status, revision: revision + 1,
      isCustom: true, createdAt: current.data()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), updatedBy: user.uid,
      ...(status === 'published' ? { reviewedBy: user.uid } : {}),
    });
    // Do not carry stale approval across edits.
    if (status !== 'published') delete stored.reviewedBy;
    tx.set(ref, stored);
    return stored;
  });
}

export async function loadPublishedQuestions(): Promise<BaseQuestion[]> {
  if (!auth.currentUser) return [];
  const snapshot = await getDocs(query(collection(db, 'questions'), where('status', '==', 'published'), limit(200)));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as BaseQuestion).filter(q => auditQuestion(q).errors.length === 0);
}

import { writeBatch } from 'firebase/firestore';

export async function clearAllFirestoreQuestions(): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error('Bu işlem için yönetici oturumu gerekli.');
  
  const snapshot = await getDocs(collection(db, 'questions'));
  if (snapshot.empty) return 0;

  // Firestore batch delete
  const batch = writeBatch(db);
  let count = 0;
  snapshot.docs.forEach((document) => {
    batch.delete(doc(db, 'questions', document.id));
    count++;
  });
  
  await batch.commit();
  return count;
}
