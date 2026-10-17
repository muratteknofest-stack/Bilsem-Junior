import type { BaseQuestion } from '../src/types';
import { getServiceClient } from './supabase-admin';

export class EditorialConflictError extends Error {
  constructor() { super('Soru başka bir oturumda değişti. Yeniden yükleyip inceleyin.'); }
}
export function assertQuestionRevision(question: BaseQuestion, expectedRevision: number) {
  if ((question.revision ?? 0) !== expectedRevision) throw new EditorialConflictError();
}

/** All editorial mutations share the database lock and revision lease. */
export async function saveQuestionRevision(question: BaseQuestion, expectedRevision: number) {
  const { data, error } = await getServiceClient().rpc('save_question', {
    payload: question, p_expected_revision: expectedRevision,
  });
  if (error?.code === '40001') throw new EditorialConflictError();
  if (error) throw error;
  if (!data || data.id !== question.id || data.revision !== expectedRevision + 1) {
    throw new Error('Soru kayıt sonucu doğrulanamadı.');
  }
  return data as BaseQuestion;
}

/** Archival is allowed even when damaged content cannot pass a publication audit. */
export function archiveQuestionRevision(question: BaseQuestion, adminId: string, now = new Date().toISOString()): BaseQuestion {
  const next = { ...question, status: 'archived' as const, revision: (question.revision || 0) + 1,
    updatedBy: adminId, updatedAt: now };
  delete next.reviewedBy;
  return next;
}
