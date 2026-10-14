import type { BaseQuestion } from '../../types';
import { auditQuestion, questionVisualKey, type QualityReport, type QuestionVisualReference } from './quality';

/** Build once per loaded bank; editing one prompt must not rescan 8,000 diagrams. */
export function indexQuestionVisuals(questions: QuestionVisualReference[]) {
  const index = new Map<string, QuestionVisualReference[]>();
  for (const question of questions) {
    try {
      const key = questionVisualKey(question), group = index.get(key) || [];
      group.push(question); index.set(key, group);
    } catch { /* Invalid rows remain visible and are audited separately. */ }
  }
  return index;
}
export function indexedDuplicates(question: BaseQuestion, index: ReturnType<typeof indexQuestionVisuals>) {
  try { return (index.get(questionVisualKey(question)) || []).filter(other => other.id !== question.id); }
  catch { return []; }
}

/** Yield before the first group and between groups so navigation stays responsive. */
export async function auditEditorialLibrary(questions: BaseQuestion[], options: {
  signal: AbortSignal;
  onProgress: (reports: ReadonlyMap<string, QualityReport>, completed: number) => void;
  batchSize?: number;
  audit?: (question: BaseQuestion) => QualityReport;
  yieldToUI?: () => Promise<void>;
}) {
  const batchSize = Math.min(40, Math.max(1, Math.floor(options.batchSize || 20)));
  const reports = new Map<string, QualityReport>();
  const yieldToUI = options.yieldToUI || (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  const audit = options.audit || auditQuestion;
  for (let offset = 0; offset < questions.length; offset += batchSize) {
    await yieldToUI();
    if (options.signal.aborted) return;
    for (const question of questions.slice(offset, offset + batchSize)) {
      if (options.signal.aborted) return;
      reports.set(question.id, audit(question));
    }
    if (options.signal.aborted) return;
    options.onProgress(new Map(reports), Math.min(offset + batchSize, questions.length));
  }
  return reports;
}
