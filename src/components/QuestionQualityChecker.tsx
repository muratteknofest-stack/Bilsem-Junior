import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Layers,
  HelpCircle,
  Tag,
  Hash,
  ListChecks,
} from 'lucide-react';
import {
  BaseQuestion,
  CognitiveCategory,
  QuestionType,
  DifficultyLevel,
  ALL_COGNITIVE_CATEGORIES,
  COGNITIVE_CATEGORY_LABELS,
} from '../types';

// ==========================================
// PREDEFINED CONSTANTS & TYPE DEFINITIONS
// ==========================================

export const VALID_QUESTION_TYPES: QuestionType[] = [
  'odd_one_out',
  'visual_sequence',
  'matrix_2x2',
  'figure_rotation',
  'mirror_reflection',
  'symmetry_completion',
  'figure_completion',
  'spatial_relationship',
  'visual_analogy',
  'shape_counting',
  'direction_path',
  'visual_memory',
  'symbol_coding',
  'classification',
  'visual_attention',
  'number_pattern',
  'logical_sequence',
  'matrix_3x3',
  'shape_equation',
  'latin_square',
  'shadow_matching',
  'balance_scale',
  'gear_rotation',
  'paper_folding',
  'venn_diagram',
  'cube_counting',
  'dice_unfold',
  'cryptogram',
  'operation_machine',
  'top_view',
  'shape_combination',
  'verbal_analogy',
  'number_pyramid',
  'story_logic',
  'tangram_puzzle',
  'maze_path',
  'logic_grid',
  'punch_folding',
  'detail_detection',
  'weight_comparison',
  'multiview_perspective',
  'raven_matrix',
  'word_scramble_logic',
  'spatial_origami',
];

// Expected category mappings for standard question types
export const TYPE_TO_EXPECTED_CATEGORIES: Partial<Record<QuestionType, CognitiveCategory[]>> = {
  odd_one_out: ['visual_perception', 'attention', 'logic'],
  figure_completion: ['visual_perception'],
  symmetry_completion: ['visual_perception', 'spatial'],
  visual_sequence: ['pattern', 'logic'],
  number_pattern: ['pattern', 'numerical'],
  logical_sequence: ['pattern', 'logic'],
  matrix_2x2: ['matrix', 'logic'],
  matrix_3x3: ['matrix', 'logic'],
  raven_matrix: ['matrix', 'logic', 'pattern'],
  figure_rotation: ['spatial'],
  mirror_reflection: ['spatial', 'visual_perception'],
  spatial_relationship: ['spatial', 'logic'],
  shadow_matching: ['spatial', 'visual_perception'],
  paper_folding: ['spatial'],
  punch_folding: ['spatial'],
  spatial_origami: ['spatial'],
  cube_counting: ['spatial', 'numerical'],
  dice_unfold: ['spatial'],
  top_view: ['spatial'],
  multiview_perspective: ['spatial'],
  gear_rotation: ['spatial', 'logic'],
  shape_combination: ['spatial', 'visual_perception'],
  tangram_puzzle: ['spatial', 'visual_perception'],
  visual_analogy: ['logic', 'visual_perception'],
  verbal_analogy: ['logic'],
  story_logic: ['logic'],
  logic_grid: ['logic'],
  latin_square: ['logic', 'matrix'],
  venn_diagram: ['logic', 'classification' as any],
  balance_scale: ['logic', 'numerical'],
  weight_comparison: ['logic', 'numerical'],
  shape_equation: ['numerical', 'logic'],
  number_pyramid: ['numerical', 'pattern'],
  cryptogram: ['numerical', 'logic'],
  operation_machine: ['numerical', 'logic'],
  visual_attention: ['attention', 'visual_perception'],
  detail_detection: ['attention', 'visual_perception'],
  maze_path: ['attention', 'spatial'],
  direction_path: ['attention', 'spatial'],
  visual_memory: ['memory', 'visual_perception'],
  symbol_coding: ['memory', 'logic'],
  classification: ['logic', 'visual_perception'],
  word_scramble_logic: ['logic'],
};

export type QualityIssueSeverity = 'error' | 'warning' | 'info';

export interface QualityIssue {
  id: string;
  category: 'id_uniqueness' | 'options_integrity' | 'answer_index' | 'category_mapping' | 'prompt_explanation';
  severity: QualityIssueSeverity;
  title: string;
  message: string;
  field?: string;
  details?: any;
  autoFixable?: boolean;
}

export interface QualityCheckReport {
  isValid: boolean;
  canSubmit: boolean;
  score: number; // 0 - 100
  totalChecks: number;
  passedChecks: number;
  errorsCount: number;
  warningsCount: number;
  infosCount: number;
  issues: QualityIssue[];
  metrics: {
    hasValidId: boolean;
    hasUniqueOptionIds: boolean;
    hasNonEmptyOptions: boolean;
    hasValidAnswerIndex: boolean;
    hasValidCategoryMapping: boolean;
    hasCompleteExplanation: boolean;
  };
}

export interface QualityCheckerOptions {
  existingQuestionIds?: string[];
  minOptionCount?: number;
  requireExplanation?: boolean;
  strictCategoryMatching?: boolean;
}

// ==========================================
// CORE QUALITY VERIFICATION LOGIC
// ==========================================

export function checkQuestionQuality(
  question: Partial<BaseQuestion> | any,
  options: QualityCheckerOptions = {}
): QualityCheckReport {
  const {
    existingQuestionIds = [],
    minOptionCount = 4,
    requireExplanation = true,
    strictCategoryMatching = false,
  } = options;

  const issues: QualityIssue[] = [];

  // Metrics trackers
  let hasValidId = true;
  let hasUniqueOptionIds = true;
  let hasNonEmptyOptions = true;
  let hasValidAnswerIndex = true;
  let hasValidCategoryMapping = true;
  let hasCompleteExplanation = true;

  // -------------------------------------------------------------
  // 1. ID UNIQUENESS & STRUCTURE VERIFICATION
  // -------------------------------------------------------------
  if (!question || typeof question !== 'object') {
    return {
      isValid: false,
      canSubmit: false,
      score: 0,
      totalChecks: 6,
      passedChecks: 0,
      errorsCount: 1,
      warningsCount: 0,
      infosCount: 0,
      issues: [
        {
          id: 'null-question',
          category: 'id_uniqueness',
          severity: 'error',
          title: 'Soru Nesnesi Geçersiz',
          message: 'Doğrulanacak soru nesnesi boş veya tanımlanmamış.',
        },
      ],
      metrics: {
        hasValidId: false,
        hasUniqueOptionIds: false,
        hasNonEmptyOptions: false,
        hasValidAnswerIndex: false,
        hasValidCategoryMapping: false,
        hasCompleteExplanation: false,
      },
    };
  }

  // Question ID Check
  if (!question.id || typeof question.id !== 'string' || question.id.trim().length === 0) {
    hasValidId = false;
    issues.push({
      id: 'missing-id',
      category: 'id_uniqueness',
      severity: 'error',
      title: 'Soru ID Eksik',
      message: 'Soru için benzersiz bir kimlik (ID) belirlenmelidir.',
      field: 'id',
      autoFixable: true,
    });
  } else {
    const trimmedId = question.id.trim();
    if (trimmedId.length < 3) {
      issues.push({
        id: 'short-id',
        category: 'id_uniqueness',
        severity: 'warning',
        title: 'Çok Kısa Soru ID',
        message: 'Soru ID en az 3 karakterden oluşmalıdır (örn: q-101 veya seq-884).',
        field: 'id',
      });
    }

    // Existing Collection Duplicate ID Check
    if (existingQuestionIds.length > 0 && existingQuestionIds.includes(trimmedId)) {
      hasValidId = false;
      issues.push({
        id: 'duplicate-question-id',
        category: 'id_uniqueness',
        severity: 'error',
        title: 'Mükerrer Soru ID',
        message: `"${trimmedId}" kimliği sistemdeki başka bir soru tarafından zaten kullanılıyor.`,
        field: 'id',
        autoFixable: true,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. NON-EMPTY OPTIONS & UNIQUENESS VERIFICATION
  // -------------------------------------------------------------
  const qOptions = question.options;

  if (!Array.isArray(qOptions) || qOptions.length === 0) {
    hasNonEmptyOptions = false;
    hasUniqueOptionIds = false;
    hasValidAnswerIndex = false;
    issues.push({
      id: 'no-options',
      category: 'options_integrity',
      severity: 'error',
      title: 'Seçenekler Eksik',
      message: 'Soru en az 3 veya 4 adet seçenek içermelidir.',
      field: 'options',
      autoFixable: true,
    });
  } else {
    if (qOptions.length < minOptionCount) {
      issues.push({
        id: 'insufficient-options-count',
        category: 'options_integrity',
        severity: qOptions.length < 3 ? 'error' : 'warning',
        title: 'Yetersiz Seçenek Sayısı',
        message: `Soru ${qOptions.length} seçenek içeriyor. Standart BİLSEM formatı için en az ${minOptionCount} seçenek önerilir.`,
        field: 'options',
      });
      if (qOptions.length < 3) {
        hasNonEmptyOptions = false;
      }
    }

    // Option IDs & Fingerprint Uniqueness Check
    const seenOptionIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    let hasEmptyOptionContent = false;

    qOptions.forEach((opt: any, index: number) => {
      // Option ID check
      const optId = opt?.id ? String(opt.id).trim() : '';
      if (!optId) {
        hasUniqueOptionIds = false;
        issues.push({
          id: `empty-option-id-${index}`,
          category: 'options_integrity',
          severity: 'error',
          title: `Seçenek ${index + 1} ID Eksik`,
          message: `${index + 1}. seçeneğin tanımlayıcı harfi (A, B, C, D) boş.`,
          field: `options[${index}].id`,
          autoFixable: true,
        });
      } else if (seenOptionIds.has(optId)) {
        hasUniqueOptionIds = false;
        issues.push({
          id: `duplicate-option-id-${optId}`,
          category: 'options_integrity',
          severity: 'error',
          title: `Mükerrer Seçenek ID: ${optId}`,
          message: `Birden fazla seçenekte aynı "${optId}" harfi kullanılmış.`,
          field: `options[${index}].id`,
          autoFixable: true,
        });
      } else {
        seenOptionIds.add(optId);
      }

      // Check option content / visualData
      const hasContent =
        Boolean(opt?.label && opt.label.trim().length > 0) ||
        Boolean(opt?.visualData && (
          opt.visualData.kind ||
          opt.visualData.textNumber !== undefined ||
          opt.visualData.textOnly ||
          opt.visualData.stack ||
          opt.visualData.fillPercent !== undefined ||
          opt.visualData.paperPattern ||
          opt.visualData.grid2D ||
          opt.visualData.fill
        )) ||
        Boolean(opt?.text);

      if (!hasContent) {
        hasEmptyOptionContent = true;
        issues.push({
          id: `empty-option-content-${optId || index}`,
          category: 'options_integrity',
          severity: 'error',
          title: `Boş Seçenek İçeriği (${optId || index + 1})`,
          message: `Seçenek ${optId || index + 1} için ne bir görsel şekil ne de metin içeriği tanımlanmış.`,
          field: `options[${index}]`,
        });
      }

      // Fingerprint uniqueness check (prevent identical distractor figures)
      if (opt?.fingerprint) {
        const fp = String(opt.fingerprint);
        if (seenFingerprints.has(fp)) {
          issues.push({
            id: `duplicate-fingerprint-${optId}`,
            category: 'options_integrity',
            severity: 'warning',
            title: `Aynı Görsel İçerik: ${optId}`,
            message: `${optId} seçeneğindeki görsel parmak izi başka bir seçenekle birebir aynı.`,
            field: `options[${index}].fingerprint`,
          });
        } else {
          seenFingerprints.add(fp);
        }
      }
    });

    if (hasEmptyOptionContent) {
      hasNonEmptyOptions = false;
    }
  }

  // -------------------------------------------------------------
  // 3. VALID ANSWER INDEX & CORRECT OPTION MAPPING
  // -------------------------------------------------------------
  const correctOptionId = question.correctOptionId;
  if (!correctOptionId || typeof correctOptionId !== 'string' || correctOptionId.trim().length === 0) {
    hasValidAnswerIndex = false;
    issues.push({
      id: 'missing-correct-option',
      category: 'answer_index',
      severity: 'error',
      title: 'Doğru Cevap Tanımlanmamış',
      message: 'Sorunun doğru cevabını belirten "correctOptionId" (örn: "A", "B", "C", "D") eksik.',
      field: 'correctOptionId',
      autoFixable: true,
    });
  } else if (Array.isArray(qOptions) && qOptions.length > 0) {
    const trimmedAnswerId = correctOptionId.trim();
    const answerIndex = qOptions.findIndex((opt: any) => String(opt?.id).trim() === trimmedAnswerId);

    if (answerIndex === -1) {
      hasValidAnswerIndex = false;
      issues.push({
        id: 'answer-id-not-in-options',
        category: 'answer_index',
        severity: 'error',
        title: 'Geçersiz Doğru Cevap Eşleşmesi',
        message: `Belirtilen doğru cevap "${trimmedAnswerId}", soru seçenekleri [${qOptions.map((o: any) => o?.id).join(', ')}] arasında bulunamadı.`,
        field: 'correctOptionId',
        details: { correctOptionId: trimmedAnswerId, availableOptionIds: qOptions.map((o: any) => o?.id) },
        autoFixable: true,
      });
    } else {
      // Check if multiple options claim to be the correct answer
      const matchingCount = qOptions.filter((opt: any) => String(opt?.id).trim() === trimmedAnswerId).length;
      if (matchingCount > 1) {
        hasValidAnswerIndex = false;
        issues.push({
          id: 'multiple-correct-matches',
          category: 'answer_index',
          severity: 'error',
          title: 'Çoklu Doğru Cevap Eşleşmesi',
          message: `Doğru cevap ID'si (${trimmedAnswerId}) birden fazla seçenekle eşleşiyor.`,
          field: 'correctOptionId',
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 4. CATEGORY MAPPING & CONSTANTS VALIDATION
  // -------------------------------------------------------------
  const category = question.category as CognitiveCategory;
  const qType = question.type as QuestionType;

  // Check Category against Predefined Constants
  if (!category || !ALL_COGNITIVE_CATEGORIES.includes(category)) {
    hasValidCategoryMapping = false;
    issues.push({
      id: 'invalid-category',
      category: 'category_mapping',
      severity: 'error',
      title: 'Geçersiz Bilişsel Kategori',
      message: `"${category}" geçerli bir kategori değil. İzin verilen sabitler: ${ALL_COGNITIVE_CATEGORIES.join(', ')}`,
      field: 'category',
      autoFixable: true,
    });
  }

  // Check Question Type against Predefined Constants
  if (qType && !VALID_QUESTION_TYPES.includes(qType)) {
    issues.push({
      id: 'invalid-question-type',
      category: 'category_mapping',
      severity: 'warning',
      title: 'Bilinmeyen Soru Türü',
      message: `"${qType}" tanımlı 44 resmi soru motoru listesinde bulunamadı.`,
      field: 'type',
    });
  }

  // Cross-Validate Category against Question Type Expectation
  if (category && qType && TYPE_TO_EXPECTED_CATEGORIES[qType]) {
    const expected = TYPE_TO_EXPECTED_CATEGORIES[qType]!;
    if (!expected.includes(category)) {
      if (strictCategoryMatching) {
        hasValidCategoryMapping = false;
        issues.push({
          id: 'category-type-mismatch-strict',
          category: 'category_mapping',
          severity: 'error',
          title: 'Kategori-Tür Uyuşmazlığı',
          message: `"${qType}" soru türü genellikle [${expected.map((c) => COGNITIVE_CATEGORY_LABELS[c] || c).join(', ')}] kategorisinde olmalıdır. Mevcut: ${COGNITIVE_CATEGORY_LABELS[category] || category}`,
          field: 'category',
          autoFixable: true,
        });
      } else {
        issues.push({
          id: 'category-type-mismatch-info',
          category: 'category_mapping',
          severity: 'info',
          title: 'Kategori Eşleme Önerisi',
          message: `"${qType}" soru türü çoğunlukla "${expected[0]}" kategorisi ile eşleştirilir.`,
          field: 'category',
        });
      }
    }
  }

  // Difficulty Range Check
  if (question.difficulty !== undefined) {
    const diff = Number(question.difficulty);
    if (isNaN(diff) || diff < 1 || diff > 6) {
      issues.push({
        id: 'invalid-difficulty-range',
        category: 'category_mapping',
        severity: 'error',
        title: 'Geçersiz Zorluk Seviyesi',
        message: 'Zorluk seviyesi 1 (Çok Kolay) ile 6 (Uzman) arasında bir tamsayı olmalıdır.',
        field: 'difficulty',
        autoFixable: true,
      });
    }
  }

  // -------------------------------------------------------------
  // 5. PROMPT & EXPLANATION COMPLETENESS
  // -------------------------------------------------------------
  if (!question.prompt || typeof question.prompt !== 'string' || question.prompt.trim().length === 0) {
    issues.push({
      id: 'missing-prompt',
      category: 'prompt_explanation',
      severity: 'error',
      title: 'Soru Yönergesi Boş',
      message: 'Öğrenciye gösterilecek soru kökü/yönergesi (prompt) boş bırakılamaz.',
      field: 'prompt',
    });
  }

  if (requireExplanation) {
    const expl = question.explanation;
    if (!expl || typeof expl !== 'object') {
      hasCompleteExplanation = false;
      issues.push({
        id: 'missing-explanation',
        category: 'prompt_explanation',
        severity: 'warning',
        title: 'Çözüm Açıklaması Eksik',
        message: 'Öğrencinin geri bildirim alabilmesi için pedagojik çözüm açıklaması eklenmesi önerilir.',
        field: 'explanation',
      });
    } else if (!expl.summary || expl.summary.trim().length === 0) {
      hasCompleteExplanation = false;
      issues.push({
        id: 'empty-explanation-summary',
        category: 'prompt_explanation',
        severity: 'warning',
        title: 'Açıklama Özeti Boş',
        message: 'Çözüm açıklamasının özet cümlesi (summary) bulunmuyor.',
        field: 'explanation.summary',
      });
    }
  }

  // -------------------------------------------------------------
  // REPORT AGGREGATION & SCORE CALCULATION
  // -------------------------------------------------------------
  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infosCount = issues.filter((i) => i.severity === 'info').length;

  const totalChecks = 6;
  let passedChecks = 0;
  if (hasValidId) passedChecks++;
  if (hasUniqueOptionIds) passedChecks++;
  if (hasNonEmptyOptions) passedChecks++;
  if (hasValidAnswerIndex) passedChecks++;
  if (hasValidCategoryMapping) passedChecks++;
  if (hasCompleteExplanation) passedChecks++;

  // Score calculation
  let score = 100 - errorsCount * 25 - warningsCount * 8 - infosCount * 2;
  if (score < 0) score = 0;
  if (errorsCount > 0 && score > 60) score = 60;

  const isValid = errorsCount === 0;
  const canSubmit = errorsCount === 0;

  return {
    isValid,
    canSubmit,
    score,
    totalChecks,
    passedChecks,
    errorsCount,
    warningsCount,
    infosCount,
    issues,
    metrics: {
      hasValidId,
      hasUniqueOptionIds,
      hasNonEmptyOptions,
      hasValidAnswerIndex,
      hasValidCategoryMapping,
      hasCompleteExplanation,
    },
  };
}

// ==========================================
// AUTO-FIX HELPER FOR PRE-SUBMISSION
// ==========================================

export function autoFixQuestion(question: any): any {
  if (!question) return question;
  const fixed = { ...question };

  // 1. Fix ID if missing
  if (!fixed.id || typeof fixed.id !== 'string' || fixed.id.trim() === '') {
    fixed.id = `q-${fixed.type || 'item'}-${Date.now()}`;
  }

  // 2. Fix Category if invalid
  if (!fixed.category || !ALL_COGNITIVE_CATEGORIES.includes(fixed.category)) {
    if (fixed.type && TYPE_TO_EXPECTED_CATEGORIES[fixed.type as QuestionType]) {
      fixed.category = TYPE_TO_EXPECTED_CATEGORIES[fixed.type as QuestionType]![0];
    } else {
      fixed.category = 'visual_perception';
    }
  }

  // 3. Fix Options IDs if duplicate or missing
  if (Array.isArray(fixed.options)) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    fixed.options = fixed.options.map((opt: any, idx: number) => ({
      ...opt,
      id: letters[idx] || `OPT_${idx + 1}`,
      label: opt.label || `Seçenek ${letters[idx] || idx + 1}`,
      fingerprint: opt.fingerprint || `fp-${letters[idx] || idx}-${Date.now()}`,
    }));

    // 4. Fix correctOptionId if not matching
    const optionIds = fixed.options.map((o: any) => o.id);
    if (!fixed.correctOptionId || !optionIds.includes(fixed.correctOptionId)) {
      fixed.correctOptionId = optionIds[0] || 'A';
    }
  }

  // 5. Fix Difficulty
  if (!fixed.difficulty || fixed.difficulty < 1 || fixed.difficulty > 6) {
    fixed.difficulty = 3;
  }

  return fixed;
}

// ==========================================
// REACT UI COMPONENT PROPS & IMPLEMENTATION
// ==========================================

export interface QuestionQualityCheckerProps {
  question: Partial<BaseQuestion> | any;
  existingQuestionIds?: string[];
  minOptionCount?: number;
  requireExplanation?: boolean;
  strictCategoryMatching?: boolean;
  compact?: boolean;
  showAutoFixButton?: boolean;
  onAutoFixApplied?: (fixedQuestion: any) => void;
  onSubmitAttempt?: () => void;
  canSubmitCallback?: (canSubmit: boolean) => void;
  className?: string;
}

export const QuestionQualityChecker: React.FC<QuestionQualityCheckerProps> = ({
  question,
  existingQuestionIds = [],
  minOptionCount = 4,
  requireExplanation = true,
  strictCategoryMatching = false,
  compact = false,
  showAutoFixButton = true,
  onAutoFixApplied,
  onSubmitAttempt,
  canSubmitCallback,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Compute Quality Report
  const report = useMemo(() => {
    const rep = checkQuestionQuality(question, {
      existingQuestionIds,
      minOptionCount,
      requireExplanation,
      strictCategoryMatching,
    });
    if (canSubmitCallback) {
      canSubmitCallback(rep.canSubmit);
    }
    return rep;
  }, [
    question,
    existingQuestionIds,
    minOptionCount,
    requireExplanation,
    strictCategoryMatching,
    canSubmitCallback,
  ]);

  const handleApplyAutoFix = () => {
    const fixed = autoFixQuestion(question);
    if (onAutoFixApplied) {
      onAutoFixApplied(fixed);
    }
  };

  // Status Badge Colors
  const statusColor = report.canSubmit
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div
      id="question-quality-checker-panel"
      className={`rounded-xl border transition-all duration-200 ${
        report.canSubmit
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-rose-200 bg-rose-50/30'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl border ${
              report.canSubmit
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-rose-100 text-rose-700 border-rose-300'
            }`}
          >
            {report.canSubmit ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800">
                Soru Kalite & Gönderim Öncesi Doğrulama
              </h4>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}
              >
                {report.canSubmit ? 'Gönderime Uygun' : 'Düzeltme Gerekiyor'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ID tekilliği, seçenek doluluğu, cevap indeksi ve kategori eşlemesi denetimi
            </p>
          </div>
        </div>

        {/* Action & Metric Counters */}
        <div className="flex items-center gap-2">
          {/* Quality Score Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white ">
            <span className="text-xs font-semibold text-slate-500">Kalite Skoru:</span>
            <span
              className={`text-xs font-bold ${
                report.score >= 85
                  ? 'text-emerald-600'
                  : report.score >= 60
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              %{report.score}
            </span>
          </div>

          {/* Auto Fix Button */}
          {showAutoFixButton && !report.canSubmit && onAutoFixApplied && (
            <button
              type="button"
              id="btn-quality-autofix"
              onClick={handleApplyAutoFix}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Otomatik Onar</span>
            </button>
          )}

          {/* Toggle Expand */}
          <button
            type="button"
            id="btn-toggle-quality-details"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Detayları Daralt' : 'Detayları Genişlet'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Verification Checklist & Issues List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-3"
          >
            {/* Checklist Matrix (4 Core Mandates) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-200/60">
              {/* Check 1: ID Uniqueness */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white ${
                  report.metrics.hasValidId && report.metrics.hasUniqueOptionIds
                    ? 'border-emerald-200 text-emerald-800'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> ID Tekilliği
                  </span>
                  {report.metrics.hasValidId && report.metrics.hasUniqueOptionIds ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  {report.metrics.hasValidId ? `ID: ${question?.id || 'Geçerli'}` : 'Geçersiz ID'}
                </span>
              </div>

              {/* Check 2: Non-empty Options */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white ${
                  report.metrics.hasNonEmptyOptions
                    ? 'border-emerald-200 text-emerald-800'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" /> Seçenek Doluluğu
                  </span>
                  {report.metrics.hasNonEmptyOptions ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  {Array.isArray(question?.options)
                    ? `${question.options.length} Seçenek Mevcut`
                    : 'Seçenek Yok'}
                </span>
              </div>

              {/* Check 3: Valid Answer Index */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white ${
                  report.metrics.hasValidAnswerIndex
                    ? 'border-emerald-200 text-emerald-800'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Cevap İndeksi
                  </span>
                  {report.metrics.hasValidAnswerIndex ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  {question?.correctOptionId
                    ? `Doğru: ${question.correctOptionId}`
                    : 'Eşleşme Yok'}
                </span>
              </div>

              {/* Check 4: Category Mapping */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white ${
                  report.metrics.hasValidCategoryMapping
                    ? 'border-emerald-200 text-emerald-800'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Kategori Eşleme
                  </span>
                  {report.metrics.hasValidCategoryMapping ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 truncate">
                  {question?.category
                    ? COGNITIVE_CATEGORY_LABELS[question.category as CognitiveCategory] || question.category
                    : 'Kategori Yok'}
                </span>
              </div>
            </div>

            {/* Issues Breakdown List */}
            {report.issues.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-slate-700">
                  Tespit Edilen Maddeler ({report.issues.length}):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {report.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs border ${
                        issue.severity === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : issue.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {issue.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold flex items-center gap-2">
                          <span>{issue.title}</span>
                          {issue.field && (
                            <code className="text-[10px] px-1.5 py-0.2 rounded bg-white/70 font-mono text-slate-600">
                              {issue.field}
                            </code>
                          )}
                        </div>
                        <p className="mt-0.5 text-slate-600 leading-relaxed">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-submission Gate Trigger button */}
            {onSubmitAttempt && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  id="btn-presubmission-action"
                  onClick={onSubmitAttempt}
                  disabled={!report.canSubmit}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5  transition-colors cursor-pointer ${
                    report.canSubmit
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Doğrula ve Gönder</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
