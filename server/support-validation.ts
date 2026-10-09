import { createHash } from 'node:crypto';
import { z } from 'zod';
import { auditQuestion } from '../src/features/questions/quality';

export const questionReportSchema = z.object({
  reason: z.enum(['answer', 'unclear', 'visual', 'level']),
  question: z.record(z.string(), z.unknown()),
}).strict();
export function prepareQuestionReport(value: unknown) {
  const { question, reason } = questionReportSchema.parse(value);
  if (JSON.stringify(question).length > 100_000) throw new Error('Soru verisi çok büyük.');
  if (typeof question.id !== 'string' || question.id.length > 200 || typeof question.type !== 'string') throw new Error('Soru kimliği eksik.');
  // Persist an allowlist, excluding unrelated top-level client fields. Free text still requires privacy review.
  const fields = ['id','type','category','difficulty','seed','version','prompt','secondaryPrompt','options','correctOptionId','explanation','visualConfig','targetGrade','targetGrades','targetAge','ageGroup','estimatedSeconds','skills','authoring'];
  const snapshot = Object.fromEntries(fields.filter(key => question[key] !== undefined).map(key => [key, question[key]]));
  const key = createHash('sha256').update(JSON.stringify({ reason, question: snapshot })).digest('hex');
  return { key, payload: { reason, question: snapshot, audit: auditQuestion(snapshot) } };
}
export const reviewRequestSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolution: z.string().trim().min(10).max(2000),
}).strict();
export function mayReviewRequest(kind: string, status: string) {
  // A review status must never pretend that a deletion actually took place.
  return kind !== 'deletion' || status === 'reviewing';
}
