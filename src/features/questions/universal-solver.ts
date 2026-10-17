import { solveColorful, independentlyMatchesColorful, type ColorfulBoard, type ColorfulValue } from './colorful-engine';
import type { BaseQuestion } from '../../types';
import { solveBoard, type Board, STUDENT_TYPES } from './professional-engine';
import { independentlySolveBoard } from './independent-board-solver';
import { generateVisualFingerprint as fingerprint } from './fingerprint';
import { solveWorkshopBoard, type WorkshopBoard, type WorkshopValue } from './workshop-mechanics';
import { independentlyMatchesWorkshop } from './workshop-independent-solver';
import { WORKSHOP_TYPES } from './topic-catalog';
import { solveComplete, independentlyMatchesComplete, type CompleteBoard, type CompleteValue } from './complete-curriculum';

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
    if ((q.visualConfig as Record<string, unknown>)?.displayMode === 'curriculum_board') {
      const b=q.visualConfig as unknown as CompleteBoard;
      if(b.kind!==q.type||b.grade!==q.targetGrade)return failure('Müfredat konusu veya sınıfı uyuşmuyor.');
      const independent=q.options.filter(o=>independentlyMatchesComplete(b,o.visualData as CompleteValue));
      const expected=solveComplete(b,q.options.map(o=>o.visualData as CompleteValue));
      const primary=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(expected));
      if(primary.length!==1||independent.length!==1||primary[0].id!==independent[0].id)return failure('Müfredat için tek doğru aday kanıtlanamadı.',true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(expected),solverMethod:'CurriculumCandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür verilenler ve aday koşulları bağımsız denetlendi.','Tek uygun seçenek: '+primary[0].id]};
    }
    if ((q.visualConfig as Record<string, unknown>)?.displayMode === 'colorful_board') {
      const b=q.visualConfig as unknown as ColorfulBoard;
      if(b.kind!==q.type)return failure('Konu ile çizim uyuşmuyor.');
      const expected=solveColorful(b),primary=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(expected));
      const independent=q.options.filter(o=>independentlyMatchesColorful(b,o.visualData as ColorfulValue));
      if(primary.length!==1||independent.length!==1||primary[0].id!==independent[0].id)return failure('Tek görsel cevap kanıtlanamadı.',true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(expected),solverMethod:'ColorfulCandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Koordinatlar ve görünür özellikler ayrı ayrı karşılaştırıldı.','Tek uygun seçenek: '+primary[0].id]};
    }
    if ((q.visualConfig as Record<string, unknown>)?.displayMode === 'workshop_board') {
      const board = q.visualConfig as unknown as WorkshopBoard;
      if (!WORKSHOP_TYPES.includes(q.type) || board.kind !== q.type) return failure('Atölye konusu ile görsel kuralı uyuşmuyor.');
      const expected = solveWorkshopBoard(board, q.options.map(o=>o.visualData as WorkshopValue));
      const primary = q.options.filter(o=>fingerprint(o.visualData)===fingerprint(expected));
      const independent = q.options.filter(o=>independentlyMatchesWorkshop(board,o.visualData as WorkshopValue));
      if (primary.length !== 1 || independent.length !== 1 || primary[0].id !== independent[0].id) return failure('İki mekanik denetim tek bir doğru şıkta birleşmedi.', true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(expected),solverMethod:'WorkshopCandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:[`Konu kuralı: ${board.kind}`,`Cevap anahtarı kullanılmadan dört aday ayrı değerlendirildi.`,`Tek uygun aday: ${primary[0].id}.`]};
    }
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


