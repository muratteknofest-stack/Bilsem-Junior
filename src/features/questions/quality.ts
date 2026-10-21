import {generateSymbolicQuestion} from './symbolic-v2';
import { COLORFUL_TYPES, generateColorfulQuestion } from './colorful-engine';
import { generateWorkshopQuestion as generateWorkshopV2 } from './workshop-engine-v2';
import { inspectEducation, isSchoolGrade, hasCompleteQualityReport } from './quality-policy';
import { BaseQuestion, QUESTION_TYPE_LABELS, ALL_COGNITIVE_CATEGORIES } from '../../types';
import { generateVisualFingerprint as fingerprint } from './fingerprint';
import { validateQuestion } from './validator';
import { Board, ENGINE_VERSION, solveBoard, VERIFIED_TYPES, RECOVERED_TYPES, STUDENT_TYPES, generateProfessionalQuestion } from './professional-engine';
import { generateRecoveredQuestion } from './recovered-engine';
import { generateProfessionalQuestion as generateV2 } from './professional-engine-v2';
import { generateProfessionalQuestion as generateV5 } from './professional-engine-v5';
import { generateProfessionalQuestion as generateV6 } from './professional-engine-v6';
import { generateProfessionalQuestion as generateV7 } from './professional-engine-v7';
import { generateColorfulQuestion as generateColorfulV2 } from './colorful-engine-v2';
import { publicVisualConfig } from './public-visual';
import { checkArithmeticExplanations } from './explanation-arithmetic';
import { solveQuestion } from './universal-solver';
import { generateWorkshopQuestion } from './workshop-engine';
import { generateWorkshopQuestion as generateWorkshopV1 } from './workshop-engine-v1';
import { WORKSHOP_ENGINE_VERSION } from './workshop-mechanics';
import { WORKSHOP_TYPES } from './topic-catalog';
import { analyzeQuestionMechanics, visibleOptionKey, type MechanicalReport } from './mechanical-quality';
import { COMPLETE_ENGINE, generateCompleteCurriculum } from './complete-curriculum';

export interface QualityReport {
  errors: string[];
  warnings: string[];
  solverVerified: boolean;
  fingerprint: string;
  reviewRequired: string[];
  mechanics?: MechanicalReport;
  /** AI quality score (0–100), only set for AI-generated questions */
  aiQualityScore?: number;
}

// The seed, IDs, answer position and cosmetic metadata do not establish novelty.
export function questionContentKey(q: BaseQuestion): string {
  return fingerprint({ type: q.type, prompt: q.prompt?.trim(), secondaryPrompt: q.secondaryPrompt,
    explanation: q.explanation, correctOptionId: q.correctOptionId, estimatedSeconds: q.estimatedSeconds,
    targetGrade: q.targetGrade, skills: q.skills, board: q.visualConfig,
    choices: q.options?.map(o => ({id:o.id,label:o.label,visual:visibleOptionKey(o.visualData)})).sort((a,b)=>a.id.localeCompare(b.id)), notes:q.authoring?.distractorNotes });
}
export type QuestionVisualReference = Pick<BaseQuestion, 'id' | 'type' | 'visualConfig'> & {
  options: Array<Pick<BaseQuestion['options'][number], 'visualData'>>;
};
export function questionVisualKey(q: QuestionVisualReference): string {
  const board=(q.visualConfig as Record<string,unknown>)?.displayMode==='curriculum_board'?Object.fromEntries(Object.entries(q.visualConfig as Record<string,unknown>).filter(([k])=>k!=='grade')):q.visualConfig;
  return fingerprint({ type: q.type, board, choices: q.options?.map(o => visibleOptionKey(o.visualData)).sort() });
}
/** A changed wrong answer is not a new exercise. Hidden cells cannot create novelty. */
export function questionStimulusKey(q: Pick<BaseQuestion, 'type' | 'visualConfig'>): string {
  const visual = publicVisualConfig(q);
  const board = visual && typeof visual === 'object' ? Object.fromEntries(Object.entries(visual).filter(([name]) => name !== 'grade' && !(name === 'turns' && 'operation' in visual && visual.operation !== 'rotate'))) : visual;
  return fingerprint({ type: q.type, board });
}
export function auditQuestion(value: unknown, existing: QuestionVisualReference[] = []): QualityReport {
  const result: QualityReport = { errors: [], warnings: [], solverVerified: false, fingerprint: '', reviewRequired: [] };
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçerli bir soru nesnesi gerekli.');
    const q = value as BaseQuestion;
    const cfg = q.visualConfig as Record<string, unknown> | null;
    if (JSON.stringify(q).length > 100_000) throw new Error('Soru verisi 100 KB sınırını aşıyor.');
    if (!(q.type in QUESTION_TYPE_LABELS) || !ALL_COGNITIVE_CATEGORIES.includes(q.category)) throw new Error('Soru tipi veya kategori desteklenmiyor.');
    if (!Array.isArray(q.options) || q.options.some(o => !o || typeof o !== 'object')) throw new Error('Seçenekler geçersiz.');
    if (typeof q.prompt !== 'string' || !q.explanation || typeof q.explanation.summary !== 'string') throw new Error('Yönerge veya açıklama eksik.');
    result.errors.push(...validateQuestion(q).errors.map(e => e.message));
    result.errors.push(...checkArithmeticExplanations(q).errors.map(e=>'Çözümde işlem hatası: '+e));
    result.mechanics = analyzeQuestionMechanics(q);
    result.errors.push(...result.mechanics.errors);
    if (q.options.length !== 4) result.errors.push('Dört seçenek gerekli.');
    if (!Number.isSafeInteger(q.seed) || q.seed < 1 || !Number.isInteger(q.difficulty)) result.errors.push('Varyasyon ve zorluk tam sayı olmalı.');
    if (q.prompt.trim().length < 12 || q.prompt.length > 700) result.errors.push('Yönerge 12–700 karakter arasında olmalı.');
    if (!Array.isArray(q.explanation.steps) || q.explanation.steps.filter(s => typeof s === 'string' && s.trim().length >= 8).length < 2) result.errors.push('En az iki anlamlı çözüm adımı gerekli.');
    if (!Number.isFinite(q.estimatedSeconds) || q.estimatedSeconds < 10 || q.estimatedSeconds > 600) result.errors.push('Tahmini süre 10–600 saniye arasında olmalı.');
    if (!q.visualConfig || typeof cfg?.displayMode !== 'string') result.errors.push('Görsel gösterim yapılandırması eksik.');
    if (!Array.isArray(q.skills) || q.skills.length === 0) result.warnings.push('Ölçülen beceriyi belirtin.');
    if(cfg?.displayMode==='symbolic_v2'){
      if(q.authoring?.engine!=='symbolic-v2'||!isSchoolGrade(q.targetGrade))result.errors.push('Sembolik motor sürümü veya sınıfı tanınmıyor.');
      else {const reference=generateSymbolicQuestion(q.seed,q.difficulty,q.targetGrade);for(const field of ['prompt','explanation','visualConfig','options','authoring','category'] as const)if(fingerprint(q[field])!==fingerprint(reference[field]))result.reviewRequired.push('Sembolik kanıt şablonu değişmiş: '+field);}
    }
    if(cfg?.displayMode==='curriculum_board') {
      if(q.authoring?.engine!==COMPLETE_ENGINE||!isSchoolGrade(q.targetGrade))result.errors.push('Müfredat sürümü veya hedef sınıf tanınmıyor.');
      else {
        const reference=generateCompleteCurriculum(q.type,q.seed,q.difficulty,q.targetGrade);
        for(const field of ['prompt','secondaryPrompt','explanation','visualConfig','category','authoring'] as const)if(fingerprint(q[field])!==fingerprint(reference[field]))result.reviewRequired.push('Müfredat şablonu değişmiş: '+field);
        const options=(x:BaseQuestion)=>x.options.map(({id,label,visualData})=>({id,label,visualData})).sort((a,b)=>a.id.localeCompare(b.id));
        if(fingerprint(options(q))!==fingerprint(options(reference)))result.reviewRequired.push('Müfredat seçenekleri değiştirilmiş.');
      }
    }
    const actual = q.options.map(o => fingerprint(o.visualData));
    if (new Set(actual).size !== q.options.length) result.errors.push('Görünür içerikleri aynı olan seçenekler var.');
    if (q.options.some(o => o.visualData === undefined || o.visualData === null)) result.errors.push('Boş seçenek içeriği var.');
    if (q.options.some(o => (o.visualData as Record<string, unknown>)?.textNumber !== undefined && !['string', 'number'].includes(typeof (o.visualData as Record<string, unknown>).textNumber))) result.errors.push('Metin veya sayı seçeneği geçersiz.');
    result.fingerprint = questionContentKey(q);
    const duplicate = existing.find(other => other.id !== q.id && questionVisualKey(other) === questionVisualKey(q));
    if (duplicate) result.errors.push('Aynı görsel ve seçeneklerle bir soru zaten var: ' + duplicate.id);
    if (cfg?.displayMode === 'verified_board') {
      const expectedKind: Record<string, string> = { symmetry_completion: 'symmetry', shape_combination: 'overlay', direction_path: 'path', number_pyramid: 'pyramid', matrix_2x2: 'transform', matrix_3x3: 'matrix', raven_matrix: 'matrix', figure_rotation: 'transform', mirror_reflection: 'transform', visual_sequence: 'transform', number_pattern: 'numbers', operation_machine: 'machine', symbol_coding: 'symbols', shape_counting: 'count', logic_grid: 'order' };
      if (cfg?.kind !== expectedKind[q.type]) result.errors.push('Soru tipi ile görsel kuralı eşleşmiyor.');
      if (q.options.some(o => {
        const v = o.visualData as Record<string, unknown>;
        return v?.cells !== undefined && (!Array.isArray(v.cells) || typeof v.size !== 'number' || ![3, 4].includes(v.size) || v.cells.length !== Number(v.size) ** 2 || v.cells.some((c: unknown) => c !== 0 && c !== 1));
      })) result.errors.push('Seçenek ızgarası geçersiz.');
      const knownVersion = RECOVERED_TYPES.includes(q.type) ? q.authoring?.engine === 'verified-4' : VERIFIED_TYPES.includes(q.type) && [ENGINE_VERSION, 'verified-7', 'verified-6', 'verified-5', 'verified-3', 'verified-2'].includes(q.authoring?.engine || '');
      if (!knownVersion) result.errors.push('Soru motoru sürümü tanınmıyor.');
      const expected = fingerprint(solveBoard(q.visualConfig as Board));
      const matches = q.options.filter(o => fingerprint(o.visualData) === expected);
      if (matches.length !== 1 || matches[0].id !== q.correctOptionId) result.errors.push('Bağımsız çözüm ile cevap anahtarı uyuşmuyor.');
    }
    if(cfg?.displayMode==='colorful_board') {
      if(!COLORFUL_TYPES.includes(q.type)||!['colorful-1','colorful-2','colorful-3'].includes(q.authoring?.engine||''))result.errors.push('Renkli motor sürümü tanınmıyor.');
      else {
        const reference=q.authoring?.engine==='colorful-2'?generateColorfulV2(q.type,q.seed,q.difficulty):generateColorfulQuestion(q.type,q.seed,q.difficulty,q.authoring?.engine==='colorful-1');
        for(const field of ['prompt','secondaryPrompt','explanation','visualConfig','category','authoring'] as const)if(fingerprint(q[field])!==fingerprint(reference[field]))result.reviewRequired.push('Renkli soru şablonu değişmiş: '+field);
        const normalize=(question:BaseQuestion)=>question.options.map(({id,label,visualData})=>({id,label,visualData})).sort((a,b)=>a.id.localeCompare(b.id));
        if(fingerprint(normalize(q))!==fingerprint(normalize(reference)))result.reviewRequired.push('Renkli seçenekler doğrulanmış şablonla uyuşmuyor.');
      }
    }
    const solved = solveQuestion(q);
    if (solved.canSolve && !solved.isMatch) result.errors.push('Bağımsız çözüm ile cevap anahtarı uyuşmuyor. ' + solved.proofSteps.join(' '));
    if (!solved.canSolve || solved.ambiguityDetected) result.reviewRequired.push(...solved.proofSteps);
    if (cfg?.displayMode === 'workshop_board') {
      if (!WORKSHOP_TYPES.includes(q.type) || ![WORKSHOP_ENGINE_VERSION, 'workshop-2', 'workshop-1'].includes(q.authoring?.engine || '')) result.errors.push('Atölye motoru konusu veya sürümü tanınmıyor.');
      else {
        const reference=(q.authoring?.engine === 'workshop-1' ? generateWorkshopV1 : q.authoring?.engine === 'workshop-2' ? generateWorkshopV2 : generateWorkshopQuestion)(q.type,q.seed,q.difficulty);
        for(const field of ['prompt','secondaryPrompt','explanation','visualConfig','category','options','authoring'] as const) {
          const normalize=(question:BaseQuestion)=>field==='options'?question.options.map(({id,label,visualData})=>({id,label,visualData})).sort((a,b)=>a.id.localeCompare(b.id)):question[field];
          if(fingerprint(normalize(q))!==fingerprint(normalize(reference)))result.reviewRequired.push('Atölye kuralı, soru metni, şık veya çözüm doğrulanmış şablonla eşleşmiyor: '+field);
        }
      }
    }
    // Certification covers the displayed instructions and explanation too. Arbitrary
    // edited/AI prose cannot inherit an old stamp or a template's mathematical proof.
    if (cfg?.displayMode === 'verified_board' && STUDENT_TYPES.includes(q.type)) {
      const reference = RECOVERED_TYPES.includes(q.type) ? generateRecoveredQuestion(q.type, q.seed, q.difficulty) : q.authoring?.engine === 'verified-2' ? generateV2(q.type, q.seed, q.difficulty) : q.authoring?.engine === 'verified-7' ? generateV7(q.type,q.seed,q.difficulty) : q.authoring?.engine === 'verified-6' ? generateV6(q.type,q.seed,q.difficulty) : ['verified-3','verified-5'].includes(q.authoring?.engine||'') ? generateV5(q.type,q.seed,q.difficulty,q.authoring?.engine==='verified-3') : generateProfessionalQuestion(q.type, q.seed, q.difficulty);
      for (const field of ['prompt', 'secondaryPrompt', 'explanation', 'visualConfig'] as const) {
        if (fingerprint(q[field]) !== fingerprint(reference[field])) {
          result.reviewRequired.push('Soru metni, görsel veya açıklama doğrulanmış şablonla eşleşmiyor: ' + field);
        }
      }
      const normalizedOptions = (question: BaseQuestion) => question.options.map(({ id, label, visualData }) => ({ id, label, visualData })).sort((a, b) => a.id.localeCompare(b.id));
      if (fingerprint(normalizedOptions(q)) !== fingerprint(normalizedOptions(reference))) result.reviewRequired.push('Seçenek içerikleri doğrulanmış şablonla eşleşmiyor.');
      if (q.category !== reference.category) result.reviewRequired.push('Kategori doğrulanmış içerikle eşleşmiyor.');
      if (['verified-3', 'verified-4', 'verified-5', 'verified-6', 'verified-7', ENGINE_VERSION].includes(q.authoring?.engine || '') && fingerprint(q.authoring?.distractorNotes) !== fingerprint(reference.authoring?.distractorNotes)) result.reviewRequired.push('Çeldirici gerekçeleri doğrulanmış içerikle eşleşmiyor.');
    }
    result.solverVerified = solved.canSolve && solved.isMatch && !solved.ambiguityDetected && result.reviewRequired.length === 0;
    if (q.targetGrade !== undefined && (q.targetGrade < 1 || q.targetGrade > 4 || !Number.isInteger(q.targetGrade))) result.errors.push('Hedef sınıf 1–4 olmalı.');
    if (q.targetGrades !== undefined && (!Array.isArray(q.targetGrades) || !q.targetGrades.length || q.targetGrades.some(grade => !Number.isInteger(grade) || grade < 1 || grade > 4))) result.errors.push('Hedef sınıf listesi geçersiz.');
    if (q.targetGrade && q.difficulty > q.targetGrade + 2) result.warnings.push('Zorluk bu sınıf için yüksek; öğrenci grubuna uygunluğunu inceleyin.');
    const grades = [...new Set([q.targetGrade, ...(q.targetGrades || [])].filter(isSchoolGrade))];
    for (const grade of grades) {
      const education = inspectEducation(q, grade, q.targetAge);
      result.reviewRequired.push(...education.audience, ...education.difficulty, ...education.visual);
    }
    if (q.targetAge !== undefined && !grades.length) result.reviewRequired.push('Yaş denetimi için hedef sınıf gerekli.');
    if((q.reviewPolicy==='professional-v2'||q.authoring?.engine==='symbolic-v2')&&!hasCompleteQualityReport(q))result.reviewRequired.push('PROFESSIONAL_REVIEW_PENDING: Dokuz aşamalı rapor eksik veya içerik değişmiş.');
    if(q.context&&!hasCompleteQualityReport(q))result.reviewRequired.push('CONTEXT_REVIEW: Soru bağlamının bağımsız incelemesi tamamlanmadı.');
    if (q.aiMeta?.promptVersion === '3.0-profile-gated' && !hasCompleteQualityReport(q)) result.reviewRequired.push('Çok aşamalı kalite raporu eksik, başarısız veya içerik değişmiş.');
    // --- AI-specific validations ---
    if (q.authoring?.engine?.startsWith('ai-')) {
      if (!q.authoring.distractorNotes || Object.keys(q.authoring.distractorNotes).length < 3) {
        result.warnings.push('AI çeldirici açıklamaları (distractorNotes) eksik veya yetersiz.');
      }
      if (q.aiMeta) {
        if (!q.aiMeta.solverVerified) result.warnings.push('AI bağımsız çözücü doğrulaması başarısız.');
        if (q.aiMeta.solverAnswer && q.aiMeta.solverAnswer !== q.correctOptionId) {
          result.errors.push('AI bağımsız çözücü cevabı ile belirlenen doğru cevap uyuşmuyor (AI_SOLVER_MISMATCH).');
        }
        if (typeof q.aiMeta.qualityScore === 'number' && q.aiMeta.qualityScore < 70) {
          result.warnings.push('AI kalite puanı düşük (' + q.aiMeta.qualityScore + '/100).');
        }
      }
      if (q.seed === 0) result.warnings.push('AI soruları deterministik değildir; seed 0 olarak işaretlenmiştir.');
    }
    if (q.aiMeta && (!['2.0-proof-gated', '3.0-profile-gated','v2-constrained-roles-1'].includes(q.aiMeta.promptVersion) || q.aiMeta.solverVerified !== true || q.aiMeta.solverAnswer !== q.correctOptionId)) {
      result.reviewRequired.push('AI kör çözüm ve editör incelemesi tamamlanmamış veya eski sürüm.');
    }
    if (cfg?.displayMode === 'verified_board') {
      for (const option of q.options) {
        const data = option.visualData as Record<string, unknown>;
        const allowed = data?.cells ? ['size', 'cells'] : ['textNumber'];
        if (!data || !Object.keys(data).length || Object.keys(data).some(k => !allowed.includes(k))) result.errors.push('Seçeneğin görünür içeriği desteklenen şemayla eşleşmiyor.');
      }
    }
    result.warnings.push('Otomatik denetim pedagojik uygunluk veya sınav geçerliliği onayı değildir.');
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Soru verisi okunamadı.');
  }
  result.solverVerified = result.solverVerified && result.errors.length === 0 && result.reviewRequired.length === 0;
  return result;
}

/** Quality score breakdown for AI-generated questions (0–100). */
export interface AiQualityBreakdown {
  solverMatch: number;       // 30
  singleCorrect: number;     // 20
  structuralValid: number;   // 15
  gradeAppropriateness: number; // 10
  distractorQuality: number; // 10
  uniqueness: number;        // 10
  languageQuality: number;   // 5
  total: number;
}

export function calculateAiQualityScore(opts: {
  solverMatches: boolean;
  noAmbiguousOptions: boolean;
  auditErrors: number;
  isGradeAppropriate: boolean;
  distractorNotesCount: number;
  isDuplicate: boolean;
  promptLength: number;
  explanationStepCount: number;
}): AiQualityBreakdown {
  const solverMatch = opts.solverMatches ? 30 : 0;
  const singleCorrect = opts.noAmbiguousOptions ? 20 : 0;
  const structuralValid = opts.auditErrors === 0 ? 15 : Math.max(0, 15 - opts.auditErrors * 3);
  const gradeAppropriateness = opts.isGradeAppropriate ? 10 : 3;
  const distractorQuality = Math.min(10, Math.floor(opts.distractorNotesCount / 3 * 10));
  const uniqueness = opts.isDuplicate ? 0 : 10;
  const langPrompt = opts.promptLength >= 20 && opts.promptLength <= 500 ? 3 : 1;
  const langExplanation = opts.explanationStepCount >= 2 ? 2 : 0;
  const languageQuality = langPrompt + langExplanation;
  const total = solverMatch + singleCorrect + structuralValid + gradeAppropriateness + distractorQuality + uniqueness + languageQuality;
  return { solverMatch, singleCorrect, structuralValid, gradeAppropriateness, distractorQuality, uniqueness, languageQuality, total };
}


/** Recomputed at every publication and student delivery boundary; metadata is never authority. */
export function isQuestionReadyForStudents(value: unknown): value is BaseQuestion {
  const report = auditQuestion(value);
  return report.errors.length === 0 && report.solverVerified && report.reviewRequired.length === 0;
}

export function assertQuestionReadyForStudents(value: unknown): asserts value is BaseQuestion {
  const report = auditQuestion(value);
  if (report.errors.length || !report.solverVerified || report.reviewRequired.length) {
    throw new Error(['QUESTION_REVIEW_REQUIRED', ...report.errors, ...report.reviewRequired].join(' | '));
  }
}


