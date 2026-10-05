import { collection, doc, getDocs, setDoc, query, where, limit, writeBatch } from '../lib/supabase-data';
import { auth, db } from '../lib/platform';
import { supabase } from '../lib/supabase';
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

async function requireAdminUser() {
  if (typeof auth.authStateReady === 'function') await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Yönetici oturumu gerekli.');
  const token = await user.getIdTokenResult(true);
  if (token.claims.role !== 'admin') throw new Error('Yönetici yetkisi gerekli.');
  return user;
}

export async function loadQuestionLibrary(): Promise<StoredQuestion[]> {
  await requireAdminUser();

  try {
    const snapshot = await getDocs(collection(db, 'questions'));
    if (!snapshot.empty) {
      const liveDocs = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id }) as StoredQuestion)
        .filter(q => auditQuestion(q).errors.length === 0)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return liveDocs;
    }
  } catch (err) {
    console.warn('Firestore library load notice:', err);
  }

  // Fallback to local question bank so editor never blocks
  return questionBankService.getAll() as StoredQuestion[];
}

export async function saveEditorialQuestion(
  question: BaseQuestion,
  status: NonNullable<BaseQuestion['status']>,
  expectedRevision: number,
  confirmedReview: boolean,
): Promise<StoredQuestion> {
  const user = await requireAdminUser();
  const uid = user.uid;
  const report = auditQuestion(question);
  if (report.errors.length) throw new Error(report.errors.join(' '));
  if (status === 'published' && !confirmedReview) throw new Error('Yayımlamadan önce yönerge, cevap ve görselleri inceleyip onaylayın.');

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

  // Confirm the remote write before updating the local editor cache.
  const { data: confirmed, error } = await supabase.rpc('save_question', {
    payload: stored, p_expected_revision: expectedRevision,
  });
  if (error) {
    if (error.code === '40001') throw new Error('Soru başka bir oturumda değişti. Yeniden yükleyin.');
    throw error;
  }

  // Keep admin panels synchronized after the confirmed remote write.
  questionBankService.createCustomQuestion(confirmed as StoredQuestion, false);

  return confirmed as StoredQuestion;
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
  return questionBankService.getAll().filter(q => q.status === 'published' || (!q.isCustom && !q.status));
}

export async function clearAllFirestoreQuestions(): Promise<number> {
  await requireAdminUser();
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
