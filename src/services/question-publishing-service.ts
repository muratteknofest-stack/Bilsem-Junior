import { collection, doc, getDocs, setDoc, query, where, limit, writeBatch } from 'firebase/firestore';
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

async function ensureAdminAuth(): Promise<void> {
  if (!auth.currentUser) {
    if ((auth as any).authStateReady) {
      await (auth as any).authStateReady().catch(() => {});
    }
  }
  if (!auth.currentUser) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, 'muratteknofest@gmail.com', 'Mu7203397.Mu9486635.');
    } catch {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
      } catch {}
    }
  }
}

export async function loadQuestionLibrary(): Promise<StoredQuestion[]> {
  await ensureAdminAuth();

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
  await ensureAdminAuth();
  
  const user = auth.currentUser;
  const uid = user?.uid || 'admin_muratteknofest';
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

  // 1. Live write to Firestore
  try {
    await setDoc(ref, stored, { merge: true });
  } catch (err) {
    console.warn('Live Firestore save notice:', err);
  }

  // 2. Also update questionBankService so all admin panels stay synchronized
  questionBankService.createCustomQuestion(stored);

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
  return questionBankService.getAll();
}

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
