import {validateVisualBoard,solveVisualBoard,visualValueKey,visualTopic,type VisualValue} from './visual-reasoning-lab';
import {independentlyMatchesVisual} from './visual-reasoning-solver';
import{solveReference,validateReferenceBoard,independentlyMatchesReference,REFERENCE_TOPICS}from'./reference-lab';
import {solveExam,validateExamBoard,independentlyMatchesExam,examTopic} from './exam-lab';
import {solveCube,validateCubeBoard,CUBE_TOPICS} from './cube-lab';
import {independentlySolveCube} from './cube-solver';
import { solveLab, validateLabBoard, LAB_TOPICS } from './reasoning-lab';
import { solvePerceptual, validatePerceptualBoard, PERCEPTUAL_TOPICS, type PerceptualValue } from './perceptual-engine';
import { independentlyMatchesPerceptual } from './perceptual-solver';
import { independentlySolveLab } from './reasoning-lab-solver';
import {solveSymbolic,independentlySolveSymbolic,symbolicBoardSchema} from './symbolic-v2';
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
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='visual_lab'){
      const b=validateVisualBoard(q.visualConfig);if(visualTopic(b.mechanic,b.grade,b.mechanic==='cube-evidence'?b.cube:undefined)!==q.type||b.grade!==q.targetGrade)return failure('Görsel muhakeme konusu/sınıfı uyuşmuyor.');
      const answer=solveVisualBoard(b,q.options.map(o=>o.visualData as VisualValue));
      const primary=q.options.filter(o=>visualValueKey(o.visualData as VisualValue)===visualValueKey(answer)),independent=q.options.filter(o=>independentlyMatchesVisual(b,o.visualData));
      if(primary.length!==1||independent.length!==1||primary[0].id!==independent[0].id)return failure('Geometri ve bağımsız aday kanıtı uyuşmuyor.',true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(primary[0].visualData),solverMethod:'VisualGeometry-and-InverseCandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünen konum, biçim ve dönüşüm koşulları çözüldü.','Her aday ters dönüşüm, tam kaplama veya iki yönlü ilişkiyle denetlendi.','Tek uygun seçenek: '+primary[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='exam_lab'){
      const b=validateExamBoard(q.visualConfig);if(examTopic(b.mechanic,b.grade)!==q.type||b.grade!==q.targetGrade)return failure('Deneme konusu/sınıfı uyuşmuyor.');
      const answer=solveExam(b),primary=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(answer)),independent=q.options.filter(o=>independentlyMatchesExam(b,o.visualData));
      if(primary.length!==1||independent.length!==1||primary[0].id!==independent[0].id)return failure('Deneme için tek bağımsız çözüm gerekli.',true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(answer),solverMethod:'ExamInference-and-CellProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür örnek ve kenar ilişkileri çözüldü.','Adaylar her hücre ve iki yöndeki koşullarla bağımsız denetlendi.','Tek uygun seçenek: '+primary[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='reference_lab'){
      const b=validateReferenceBoard(q.visualConfig);if(REFERENCE_TOPICS[b.mechanic]!==q.type||b.grade!==q.targetGrade)return failure('Görsel çalışma konusu/sınıfı uyuşmuyor.');
      const answer=solveReference(b),first=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(answer)),second=q.options.filter(o=>independentlyMatchesReference(b,o.visualData));
      if(first.length!==1||second.length!==1||first[0].id!==second[0].id)return failure('Görsel çalışma için tek bağımsız çözüm gerekli.',true);
      return {canSolve:true,isMatch:first[0].id===q.correctOptionId,expectedAnswerId:first[0].id,expectedFingerprint:fingerprint(answer),solverMethod:'ReferenceRule-and-CandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür ilişki, sıra veya yerleşim kuralı çözüldü.','Dört adayın tüm koşulları ayrı ayrı denetlendi.','Tek uygun seçenek: '+first[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='cube_lab') {
      const b=validateCubeBoard(q.visualConfig);if(CUBE_TOPICS[b.mechanic]!==q.type||b.grade!==q.targetGrade)return failure('Küp konusu veya sınıfı uyuşmuyor.');
      const answer=solveCube(b),independent=independentlySolveCube(b);
      if(fingerprint(answer)!==fingerprint(independent))return failure('Küp sütunu ve birim küp çözümleri uyuşmuyor.',true);
      const matching=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(answer));
      if(matching.length!==1)return failure('Tek küp seçeneği gerekli.',true);
      return {canSolve:true,isMatch:matching[0].id===q.correctOptionId,expectedAnswerId:matching[0].id,expectedFingerprint:fingerprint(answer),solverMethod:'CubeHeight-and-VoxelProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür yükseklik planı veya açılım çözüldü.','Birim küp doluluğu / bağımsız vektör dönüşleri aynı sonucu verdi.','Tek uygun seçenek: '+matching[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='perceptual_board') {
      const b=validatePerceptualBoard(q.visualConfig);
      if(PERCEPTUAL_TOPICS[b.mechanic]!==q.type||b.grade!==q.targetGrade)return failure('Görsel ilişki konusu veya sınıfı uyuşmuyor.');
      const answer=solvePerceptual(b,q.options.map(o=>o.visualData as PerceptualValue));
      const primary=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(answer)), independent=q.options.filter(o=>independentlyMatchesPerceptual(b,o.visualData));
      if(primary.length!==1||independent.length!==1||primary[0].id!==independent[0].id)return failure('İki görsel ilişki çözümü tek seçenekte birleşmiyor.',true);
      return {canSolve:true,isMatch:primary[0].id===q.correctOptionId,expectedAnswerId:primary[0].id,expectedFingerprint:fingerprint(answer),solverMethod:'PerceptualInference-and-CandidateProof-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür örneklerden adet, yön ve doluluk ilişkileri çıkarıldı.','Dört aday yerleştirilerek bütün ilişkiler bağımsız olarak denetlendi.','Tek uygun seçenek: '+primary[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='reasoning_lab') {
      const b=validateLabBoard(q.visualConfig);
      if(LAB_TOPICS[b.mechanic]!==q.type||b.grade!==q.targetGrade)return failure('Akıl yürütme konusu veya sınıfı uyuşmuyor.');
      const answer=solveLab(b),independent=independentlySolveLab(b);
      if(answer!==independent)return failure('İki bağımsız çözüm uyuşmuyor.',true);
      const expected={textNumber:answer},matches=q.options.filter(o=>fingerprint(o.visualData)===fingerprint(expected));
      if(matches.length!==1)return failure('Tek doğru seçenek yok.',true);
      return {canSolve:true,isMatch:matches[0].id===q.correctOptionId,expectedAnswerId:matches[0].id,expectedFingerprint:fingerprint(expected),solverMethod:'ReasoningLabIndependent-v1',confidence:1,ambiguityDetected:false,proofSteps:['Görünür verilenlerden iki farklı yöntemle aynı sonuç hesaplandı.','Tek uygun seçenek: '+matches[0].id]};
    }
    if((q.visualConfig as Record<string,unknown>)?.displayMode==='symbolic_v2'){
      const b=symbolicBoardSchema.parse(q.visualConfig);if(q.type!==b.kind||q.targetGrade!==b.grade)return failure('Sembolik sınıf veya konu uyuşmuyor.');
      const answer=solveSymbolic(b),independent=independentlySolveSymbolic(b);if(answer!==independent)return failure('Bağımsız cebirsel çözümler uyuşmuyor.',true);
      const matches=q.options.filter(o=>fingerprint(o.visualData)===fingerprint({textNumber:answer}));if(matches.length!==1)return failure('Tek doğru sembolik seçenek yok.',true);
      return {canSolve:true,isMatch:matches[0].id===q.correctOptionId,expectedAnswerId:matches[0].id,expectedFingerprint:fingerprint({textNumber:answer}),solverMethod:'Gaussian-and-Cramer-v2',confidence:1,ambiguityDetected:false,proofSteps:['Tam rank eşitlikler Gaussian eleme ile çözüldü.','Cramer determinantları bağımsız olarak aynı sonucu verdi.','Dört seçenek arasında tek sonuç: '+matches[0].id]};
    }
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


