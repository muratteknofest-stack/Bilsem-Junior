import type { BaseQuestion, VisualOption } from '../../types';
import { generateVisualFingerprint } from './fingerprint';
import { auditQuestion } from './quality';
import { solveQuestion } from './universal-solver';

export interface VerificationStageResult { stageNumber: number; name: string; passed: boolean; message: string; details?: Record<string, unknown> }
export interface QuestionVerificationReport {
  isVerified: boolean; confidenceScore: number; passCount: number;
  stages: VerificationStageResult[]; errors: string[]; warnings: string[];
  solverChecked: boolean; testedAt: string; repaired: boolean;
}

// Recompute from content; IDs and client-provided fingerprints never prove uniqueness.
export function computeOptionFingerprint(opt: VisualOption): string {
  return generateVisualFingerprint(opt?.visualData);
}

export function runMultiPassQuestionTests(question: BaseQuestion): QuestionVerificationReport {
  const audit = auditQuestion(question);
  const solver = solveQuestion(question);
  const options = Array.isArray(question?.options) ? question.options : [];
  const contentUnique = options.length === 4 && new Set(options.map(computeOptionFingerprint)).size === 4;
  const keyUnique = options.length === 4 && options.every(o => typeof o?.id === 'string' && o.id.trim()) &&
    new Set(options.map(o => o.id)).size === 4 && options.filter(o => o.id === question.correctOptionId).length === 1;
  const checks = [
    { name: 'Yapı ve görsel veri', passed: audit.errors.length === 0, message: audit.errors.join(' ') || 'Yapısal kontroller geçti.' },
    { name: 'Dört farklı seçenek', passed: contentUnique && keyUnique, message: 'Kimlikler ve görünür içerikler karşılaştırıldı.' },
    { name: 'Bağımsız hesaplama', passed: solver.canSolve && solver.isMatch && !solver.ambiguityDetected, message: solver.proofSteps.join(' ') },
    { name: 'Yönerge ve açıklama tutarlılığı', passed: audit.reviewRequired.length === 0 && audit.solverVerified, message: audit.reviewRequired.join(' ') || 'Şablonun metin, görsel ve açıklama eşleşmesi denetlendi.' },
  ];
  const isVerified = checks.every(c => c.passed);
  checks.push({ name: 'Öğrenciye sunma kararı', passed: isVerified, message: isVerified ? 'Desteklenen kurallar kapsamındaki kontroller geçti.' : 'İnceleme gerekli; öğrenciye sunulamaz.' });
  return { isVerified, confidenceScore: isVerified ? 1 : 0, passCount: checks.filter(c => c.passed).length,
    stages: checks.map((c, i) => ({ ...c, stageNumber: i + 1 })),
    errors: [...audit.errors, ...audit.reviewRequired], warnings: audit.warnings,
    solverChecked: solver.canSolve, testedAt: new Date().toISOString(), repaired: false };
}

export function stampQuestionVerification(question: BaseQuestion, report: QuestionVerificationReport): BaseQuestion {
  return { ...question, verificationStatus: {
    isVerified: report.isVerified, passCount: report.passCount,
    stages: report.stages.map(s => `${s.stageNumber}. ${s.name}: ${s.passed ? 'BAŞARILI' : 'İNCELEME GEREKLİ'}`),
    testedAt: report.testedAt, confidenceScore: report.confidenceScore, solverChecked: report.solverChecked,
    auditLog: ['Kontrol kapsamı: bağımsız çözüm + şablon tutarlılığı; kesinlik olasılığı değildir.', ...report.errors],
  } };
}

export function verifyAndAutoHealQuestion(generatorFn: (seed: number) => BaseQuestion, initialSeed: number, maxRetries = 8): BaseQuestion {
  let seed = initialSeed;
  for (let attempt = 0; attempt < Math.min(20, Math.max(0, maxRetries)); attempt++) {
    try {
      const q = generatorFn(seed), report = runMultiPassQuestionTests(q);
      if (report.isVerified) return stampQuestionVerification(q, report);
    } catch { /* Reject this candidate; never alter its answer to make it pass. */ }
    seed = (seed + 10007 + attempt * 7919) % 1000000 || 1;
  }
  throw new Error('QUESTION_REVIEW_REQUIRED: Denemeler tükendi; doğrulanmamış soru döndürülmedi.');
}
