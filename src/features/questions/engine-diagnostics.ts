import type { DifficultyLevel, QuestionType } from '../../types';
import { ALL_QUESTION_TYPES, generateQuestionByType } from './generators';
import { STUDENT_TYPES } from './professional-engine';
import { auditQuestion } from './quality';
import { runMultiPassQuestionTests } from './verifier';

export interface DiagnosticCase { type: QuestionType; seed: number; difficulty: DifficultyLevel }
export interface DiagnosticSample extends DiagnosticCase {
  status: 'passed' | 'review' | 'failed'; reasons: string[]; durationMs: number;
}
export interface EngineDiagnostic {
  type: QuestionType; samples: DiagnosticSample[]; status: DiagnosticSample['status'] | 'untested';
  passed: number; failed: number; review: number; avgMs: number;
}
// Cross product, not i % 44 paired with i % 6 (which only covers half the levels).
export function diagnosticCases(rounds = 1, types = ALL_QUESTION_TYPES): DiagnosticCase[] {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10) throw new Error('Test turu 1–10 olmalı.');
  return types.flatMap((type, t) => Array.from({ length: 6 * rounds }, (_, i) => ({
    type, difficulty: (i % 6 + 1) as DifficultyLevel, seed: 300000 + t * 100003 + i * 4919,
  })));
}
export function diagnoseSample(sample: DiagnosticCase): DiagnosticSample {
  const start = performance.now();
  try {
    const q = generateQuestionByType(sample.type, sample.seed, sample.difficulty);
    const audit = auditQuestion(q), report = runMultiPassQuestionTests(q);
    const status = report.isVerified ? 'passed' : audit.errors.length || STUDENT_TYPES.includes(sample.type) ? 'failed' : 'review';
    return { ...sample, status, reasons: [...new Set(report.errors)], durationMs: performance.now() - start };
  } catch (error) {
    return { ...sample, status: 'failed', reasons: [error instanceof Error ? error.message : 'Motor çalıştırılamadı.'], durationMs: performance.now() - start };
  }
}
export function summarizeDiagnostics(samples: DiagnosticSample[], types = ALL_QUESTION_TYPES): EngineDiagnostic[] {
  return types.map(type => {
    const tested = samples.filter(s => s.type === type);
    const count = (status: DiagnosticSample['status']) => tested.filter(s => s.status === status).length;
    const failed = count('failed'), review = count('review'), passed = count('passed');
    return { type, samples: tested, passed, failed, review,
      status: !tested.length ? 'untested' : failed ? 'failed' : review ? 'review' : 'passed',
      avgMs: tested.length ? tested.reduce((sum, s) => sum + s.durationMs, 0) / tested.length : 0 };
  });
}
export async function runEngineDiagnostics(rounds: number, onProgress: (done: number, total: number) => void, signal: AbortSignal) {
  const cases = diagnosticCases(rounds), samples: DiagnosticSample[] = [];
  for (const item of cases) {
    if (signal.aborted) return null;
    samples.push(diagnoseSample(item));
    if (samples.length % 6 === 0) {
      onProgress(samples.length, cases.length);
      // Give input, painting and unmount cancellation a turn between engines.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return signal.aborted ? null : summarizeDiagnostics(samples);
}
