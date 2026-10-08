import { collection, doc, getDocs, setDoc, query, where, limit, writeBatch } from '../lib/supabase-data';
import { auth, db } from '../lib/platform';
import { authenticatedFetch } from '../lib/api-client';
import type { BaseQuestion } from '../types';
import { auditQuestion, isQuestionReadyForStudents, assertQuestionReadyForStudents } from '../features/questions/quality';
import { questionBankService } from './question-bank-service';
export { parseQuestionImport, selectPublishedPool } from '../features/questions/editorial-data';

export interface StoredQuestion extends BaseQuestion {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  reviewedBy?: string;
}

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
    console.warn('Supabase library load notice:', err);
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
  await requireAdminUser();
  const report = auditQuestion(question);
  if (report.errors.length) throw new Error(report.errors.join(' '));
  if (status === 'published') assertQuestionReadyForStudents(question);
  if (status === 'published' && !confirmedReview) throw new Error('Yayımlamadan önce yönerge, cevap ve görselleri inceleyip onaylayın.');

  // Confirm the remote write before updating the local editor cache.
  const response = await authenticatedFetch('/api/admin/questions/save', {
    method: 'POST',
    body: JSON.stringify({ question, status, expectedRevision, confirmedReview }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error([result.error || 'Soru kaydedilemedi.', ...(result.details || [])].join(' '));
  const confirmed = result.question;

  // Keep admin panels synchronized after the confirmed remote write.
  questionBankService.createCustomQuestion(confirmed as StoredQuestion, false);

  return confirmed as StoredQuestion;
}

export async function loadPublishedQuestions(): Promise<BaseQuestion[]> {
  try {
    const snapshot = await getDocs(query(collection(db, 'questions'), where('status', '==', 'published'), limit(200)));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as BaseQuestion).filter(isQuestionReadyForStudents);
    }
  } catch (err) {
    console.warn('Supabase published load notice:', err);
  }
  return questionBankService.getAll().filter(q => q.status === 'published' && isQuestionReadyForStudents(q));
}

export async function clearAllSupabaseQuestions(): Promise<number> {
  await requireAdminUser();
  const snapshot = await getDocs(collection(db, 'questions'));
  if (snapshot.empty) return 0;

  // Supabase batch delete
  const batch = writeBatch(db);
  let count = 0;
  snapshot.docs.forEach((document) => {
    batch.delete(doc(db, 'questions', document.id));
    count++;
  });
  
  await batch.commit();
  return count;
}

