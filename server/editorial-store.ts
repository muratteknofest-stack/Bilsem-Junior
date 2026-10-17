import type { BaseQuestion } from '../src/types';
import { getServiceClient } from './supabase-admin';
import { prepareGeneratedQuestionDraft } from './editorial-validation';

export { prepareGeneratedQuestionDraft };

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

/** Saves a newly generated AI question through the atomic public.save_question RPC lock. */
export async function saveGeneratedQuestionDraft(
  question: BaseQuestion,
  status: 'draft' | 'review',
  adminId: string,
  now = new Date().toISOString(),
): Promise<BaseQuestion> {
  const draft = prepareGeneratedQuestionDraft(question, status, adminId, now);
  return saveQuestionRevision(draft, 0);
}

/** Review requests must use the persisted revision, including newly generated drafts. */
export async function persistGeneratedQuestionResult<T extends { success: boolean; question?: BaseQuestion }>(
  result: T,
  adminId: string,
  saveDraft: typeof saveGeneratedQuestionDraft = saveGeneratedQuestionDraft,
): Promise<T> {
  if (!result.question) return result;
  const question = await saveDraft(result.question, result.success ? 'draft' : 'review', adminId);
  return { ...result, question };
}

/** Archival is allowed even when damaged content cannot pass a publication audit. */
export function archiveQuestionRevision(question: BaseQuestion, adminId: string, now = new Date().toISOString()): BaseQuestion {
  const next = { ...question, status: 'archived' as const, revision: (question.revision || 0) + 1,
    updatedBy: adminId, updatedAt: now };
  delete next.reviewedBy;
  return next;
}
