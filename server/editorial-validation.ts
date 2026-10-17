import type { BaseQuestion } from '../src/types';
import { auditQuestion, isQuestionReadyForStudents, type QuestionVisualReference } from '../src/features/questions/quality';

export type EditorialStatus = 'draft' | 'review' | 'published' | 'archived';

export class EditorialValidationError extends Error {
  constructor(public readonly details: string[]) {
    super(details.join(' ') || 'Soru doğrulanamadı.');
  }
}

export function prepareEditorialQuestion(
  question: BaseQuestion,
  status: EditorialStatus,
  expectedRevision: number,
  confirmedReview: boolean,
  adminId: string,
  existingQuestions: QuestionVisualReference[] = [],
  now = new Date().toISOString(),
) {
  const report = auditQuestion(question, existingQuestions);
  const errors = [...report.errors];
  if (status === 'published') {
    if (!confirmedReview) errors.push('Yönerge, cevap ve görseller için editör onayı gerekli.');
    if (!isQuestionReadyForStudents(question)) {
      errors.push('Bağımsız çözüm ve kalite denetimi yayıma uygun değil.');
      errors.push(...report.reviewRequired);
    }
  }
  if (errors.length) throw new EditorialValidationError([...new Set(errors)]);

  const stored = JSON.parse(JSON.stringify({
    ...question,
    status,
    revision: expectedRevision + 1,
    isCustom: true,
    createdAt: question.createdAt || now,
    updatedAt: now,
    updatedBy: adminId,
    ...(status === 'published' ? { reviewedBy: adminId } : {}),
    ...(question.batchValidation ? { batchValidation: {
      ...question.batchValidation, editorReview: status === 'published' ? 'completed' : 'pending',
    } } : {}),
    ...(status === 'published' && question.releaseAuthorization ? {
      releaseAuthorization: { ...question.releaseAuthorization, individualHumanReview: true, humanReviewedAt: now },
    } : {}),
  })) as BaseQuestion & { revision: number; updatedBy: string; reviewedBy?: string };
  if (status !== 'published') {
    delete stored.reviewedBy;
    if (stored.releaseAuthorization) {
      stored.releaseAuthorization.individualHumanReview = false;
      delete stored.releaseAuthorization.humanReviewedAt;
    }
  }
  return stored;
}


/** Formats a newly generated AI question for initial revision-locked storage (expectedRevision = 0 -> revision = 1). */
export function prepareGeneratedQuestionDraft(
  question: BaseQuestion,
  status: 'draft' | 'review',
  adminId: string,
  now = new Date().toISOString(),
): BaseQuestion {
  return {
    ...question,
    status,
    revision: 1,
    createdAt: question.createdAt || now,
    updatedAt: now,
    updatedBy: adminId,
  };
}
