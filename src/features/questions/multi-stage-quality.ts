import type { BaseQuestion } from '../../types';
import { auditQuestion, questionVisualKey, type QuestionVisualReference } from './quality';
import { inspectQuestionNovelty } from './novelty';
import { solveQuestion } from './universal-solver';
import { validateQuestion } from './validator';
import { assessmentContentKey, inspectEducation, QUALITY_POLICY_VERSION, QUALITY_STAGES,
  type QuestionQualityReport, type QualityStageId, type SchoolGrade } from './quality-policy';

export function assessCandidate(q: BaseQuestion, target: { grade: SchoolGrade; age?: number; difficulty: number }, existing: QuestionVisualReference[] = []): QuestionQualityReport {
  const audit = auditQuestion(q), solve = solveQuestion(q), education = inspectEducation(q, target.grade, target.age);
  const key = questionVisualKey(q);
  const novelty=inspectQuestionNovelty(q,existing);
  const reasons: Partial<Record<QualityStageId, string[]>> = {
    structure: validateQuestion(q).errors.map(e => e.message),
    answer: solve.canSolve && solve.isMatch && !solve.ambiguityDetected ? [] : ['ANSWER_PROOF: Bağımsız çözümler tek bir doğru cevapta birleşmedi.'],
    content: [...audit.errors, ...audit.reviewRequired].filter(r => !r.startsWith('CONTEXT_REVIEW:') && !r.startsWith('PROFESSIONAL_REVIEW_PENDING:') && ![...education.audience, ...education.difficulty, ...education.visual].includes(r)),
    audience: education.audience, difficulty: [...education.difficulty, ...(q.difficulty === target.difficulty ? [] : ['DIFFICULTY_MISMATCH: Üretilen seviye istekle uyuşmuyor.'])],
    visual: education.visual,
    novelty: novelty.duplicateIds.length ? ['DUPLICATE: Aynı kök veya görsel yeniden kullanılmış.'] : [],
  };
  const report: QuestionQualityReport = { policyVersion: QUALITY_POLICY_VERSION, contentKey: assessmentContentKey(q),
    evaluatedAt: new Date().toISOString(), score: 0, eligible: false, target,
    metrics: { ...education.metrics, comparedQuestions: existing.length }, similarity:novelty,
    stages: QUALITY_STAGES.map(stage => ({ ...stage, status: reasons[stage.id] === undefined ? 'pending' : reasons[stage.id]!.length ? 'failed' : 'passed', reasons: reasons[stage.id] || [] })) };
  return finalizeAssessment(report);
}
export function finalizeAssessment(report: QuestionQualityReport): QuestionQualityReport {
  report.score = report.stages.filter(s => s.status === 'passed').reduce((sum, s) => sum + s.weight, 0);
  report.eligible = report.stages.every(s => s.status === 'passed');
  return report;
}
export function recordReview(report: QuestionQualityReport, id: 'blind' | 'editorial', reasons: string[]) {
  const stage = report.stages.find(s => s.id === id)!;
  stage.status = reasons.length ? 'failed' : 'passed'; stage.reasons = reasons;
  finalizeAssessment(report);
}
