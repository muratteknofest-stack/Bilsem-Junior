import type { BaseQuestion } from '../../types';
import { solveBoard, type Board, STUDENT_TYPES } from './professional-engine';
import { independentlySolveBoard } from './independent-board-solver';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export interface UniversalSolverResult {
  canSolve: boolean;
  isMatch: boolean;
  expectedAnswerId?: string;
  expectedFingerprint?: string;
  solverMethod: string;
  proofSteps: string[];
  confidence: number;
  ambiguityDetected: boolean;
}

/** No answer-key fallback: unsupported and malformed questions stay unverified. */
export function solveQuestion(q: BaseQuestion): UniversalSolverResult {
  const failure = (message: string, canSolve = false): UniversalSolverResult => ({
    canSolve, isMatch: false, solverMethod: 'IndependentBoardSolver-v1',
    proofSteps: [message], confidence: 0, ambiguityDetected: true,
  });
  try {
    if (!q || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !o)) return failure('Dört geçerli seçenek gerekli.');
    if ((q.visualConfig as Record<string, unknown> | null)?.displayMode !== 'verified_board' || !STUDENT_TYPES.includes(q.type)) return failure('Bu gösterim için bağımsız kanıtlayıcı yok; inceleme gerekli.');
    const board = q.visualConfig as Board;
    const expected = solveBoard(board);
    const independent = independentlySolveBoard(board);
    if (fingerprint(expected) !== fingerprint(independent)) return failure('İki bağımsız çözüm uyuşmuyor.', true);
    const expectedFingerprint = fingerprint(expected);
    const matches = q.options.filter(o => fingerprint(o.visualData) === expectedFingerprint);
    if (matches.length !== 1) return failure(`Tam olarak bir doğru seçenek gerekli; eşleşen: ${matches.length}.`, true);
    return {
      canSolve: true, isMatch: matches[0].id === q.correctOptionId,
      expectedAnswerId: matches[0].id, expectedFingerprint,
      solverMethod: 'IndependentBoardSolver-v1', confidence: 1,
      ambiguityDetected: false,
      proofSteps: [`Kural: ${board.kind}`, `Bağımsız hesaplanan sonuç: ${expectedFingerprint}`,
        `Dört seçenek karşılaştırıldı; tek eşleşme: ${matches[0].id}.`],
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Soru çözülemedi.');
  }
}

export function runQuestionBenchmark(questions: BaseQuestion[]) {
  const results = questions.map(q => ({ q, result: solveQuestion(q) }));
  const reports = results.map(({ q, result }) => ({ id: q.id, type: q.type,
    isCorrect: result.canSolve && result.isMatch && !result.ambiguityDetected, solverMethod: result.solverMethod }));
  const passedCount = reports.filter(r => r.isCorrect).length;
  return { total: questions.length, passedCount, failedCount: questions.length - passedCount,
    solverMatchRate: questions.length ? Number((passedCount / questions.length * 100).toFixed(1)) : 0,
    averageConfidence: questions.length ? Number((results.reduce((s, r) => s + r.result.confidence, 0) / questions.length).toFixed(2)) : 0, reports };
}
