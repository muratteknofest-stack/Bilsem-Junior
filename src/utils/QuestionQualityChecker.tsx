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
  FileCheck2,
  CopyX,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';
import {
  BaseQuestion,
  CognitiveCategory,
  QuestionType,
  ALL_COGNITIVE_CATEGORIES,
  COGNITIVE_CATEGORY_LABELS,
} from '../types';
import { questionBankService } from '../services/question-bank-service';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

export interface QualityValidationIssue {
  id: string;
  field: 'id' | 'category' | 'type' | 'prompt' | 'options' | 'correctAnswer' | 'content' | 'general';
  severity: 'error' | 'warning';
  title: string;
  message: string;
}

export interface QuestionQualityValidationResult {
  isValid: boolean;
  canSubmit: boolean;
  score: number; // 0 - 100
  issues: QualityValidationIssue[];
  metrics: {
    hasMandatoryFields: boolean;
    hasMinimumFourOptions: boolean;
    hasNonEmptyText: boolean;
    hasValidCorrectAnswer: boolean;
    hasNoDuplicateIds: boolean;
    hasNoRedundantContent: boolean;
  };
}

export interface QuestionQualityCheckerProps {
  question: Partial<BaseQuestion> | any;
  existingQuestions?: (BaseQuestion | any)[];
  onPreSubmitValid?: (validatedQuestion: any) => Promise<void> | void;
  onValidationChange?: (result: QuestionQualityValidationResult) => void;
  autoSubmitOnValid?: boolean;
  showDetails?: boolean;
  className?: string;
}

// ============================================================================
// PURE UTILITY VALIDATION LOGIC
// ============================================================================

/**
 * Validates a question object against core data service rules:
 * 1. Mandatory fields (ID, category, type)
 * 2. At least 4 options
 * 3. Non-empty text (prompt and options)
 * 4. Valid 'correctAnswer' (index or option ID)
 * 5. Duplicate IDs or redundant content detection
 */
export function validateQuestionForSubmission(
  question: any,
  existingQuestions: any[] = []
): QuestionQualityValidationResult {
  const issues: QualityValidationIssue[] = [];

  let hasMandatoryFields = true;
  let hasMinimumFourOptions = true;
  let hasNonEmptyText = true;
  let hasValidCorrectAnswer = true;
  let hasNoDuplicateIds = true;
  let hasNoRedundantContent = true;

  if (!question || typeof question !== 'object') {
    return {
      isValid: false,
      canSubmit: false,
      score: 0,
      issues: [
        {
          id: 'null-object',
          field: 'general',
          severity: 'error',
          title: 'Geçersiz Soru Nesnesi',
          message: 'Soru nesnesi tanımlanmamış veya boş.',
        },
      ],
      metrics: {
        hasMandatoryFields: false,
        hasMinimumFourOptions: false,
        hasNonEmptyText: false,
        hasValidCorrectAnswer: false,
        hasNoDuplicateIds: false,
        hasNoRedundantContent: false,
      },
    };
  }

  // -------------------------------------------------------------
  // 1. MANDATORY FIELDS (ID, CATEGORY, TYPE)
  // -------------------------------------------------------------
  // ID Check
  if (!question.id || typeof question.id !== 'string' || question.id.trim() === '') {
    hasMandatoryFields = false;
    hasNoDuplicateIds = false;
    issues.push({
      id: 'missing-id',
      field: 'id',
      severity: 'error',
      title: 'Zorunlu Alan Eksik: ID',
      message: 'Soru için benzersiz bir kimlik (ID) belirlenmelidir.',
    });
  }

  // Category Check
  if (!question.category || typeof question.category !== 'string' || question.category.trim() === '') {
    hasMandatoryFields = false;
    issues.push({
      id: 'missing-category',
      field: 'category',
      severity: 'error',
      title: 'Zorunlu Alan Eksik: Kategori',
      message: 'Sorunun ait olduğu bilişsel kategori seçilmelidir.',
    });
  } else if (!ALL_COGNITIVE_CATEGORIES.includes(question.category as CognitiveCategory)) {
    hasMandatoryFields = false;
    issues.push({
      id: 'invalid-category',
      field: 'category',
      severity: 'error',
      title: 'Geçersiz Kategori',
      message: `"${question.category}" geçerli bir bilişsel kategori değil. Sabitler: ${ALL_COGNITIVE_CATEGORIES.join(', ')}`,
    });
  }

  // Type Check
  if (!question.type || typeof question.type !== 'string' || question.type.trim() === '') {
    hasMandatoryFields = false;
    issues.push({
      id: 'missing-type',
      field: 'type',
      severity: 'error',
      title: 'Zorunlu Alan Eksik: Tür (Type)',
      message: 'Soru motoru tipi (örn: odd_one_out, visual_sequence) belirtilmelidir.',
    });
  }

  // -------------------------------------------------------------
  // 2. AT LEAST 4 OPTIONS
  // -------------------------------------------------------------
  const options = question.options;
  if (!Array.isArray(options)) {
    hasMinimumFourOptions = false;
    issues.push({
      id: 'missing-options-array',
      field: 'options',
      severity: 'error',
      title: 'Seçenekler Eksik',
      message: 'Soru için seçenekler dizisi (options) tanımlanmalıdır.',
    });
  } else if (options.length < 4) {
    hasMinimumFourOptions = false;
    issues.push({
      id: 'insufficient-options',
      field: 'options',
      severity: 'error',
      title: 'Yetersiz Seçenek Sayısı',
      message: `Soru ${options.length} seçenek içeriyor. Veri servisi standartları gereği en az 4 seçenek zorunludur.`,
    });
  }

  // -------------------------------------------------------------
  // 3. NON-EMPTY TEXT (PROMPT & OPTIONS CONTENT)
  // -------------------------------------------------------------
  const promptText = question.prompt || question.text || question.questionText || '';
  if (typeof promptText !== 'string' || promptText.trim().length === 0) {
    hasNonEmptyText = false;
    issues.push({
      id: 'empty-prompt-text',
      field: 'prompt',
      severity: 'error',
      title: 'Soru Metni Boş',
      message: 'Soru yönergesi veya metni (prompt/text) boş bırakılamaz.',
    });
  }

  if (Array.isArray(options)) {
    options.forEach((opt: any, idx: number) => {
      const hasLabelOrText =
        Boolean(opt?.label && String(opt.label).trim().length > 0) ||
        Boolean(opt?.text && String(opt.text).trim().length > 0) ||
        Boolean(opt?.textNumber !== undefined) ||
        Boolean(opt?.visualData && (
          opt.visualData.kind ||
          opt.visualData.textNumber !== undefined ||
          opt.visualData.textOnly ||
          opt.visualData.stack ||
          opt.visualData.fillPercent !== undefined ||
          opt.visualData.paperPattern ||
          opt.visualData.grid2D ||
          opt.visualData.fill
        ));

      if (!hasLabelOrText) {
        hasNonEmptyText = false;
        issues.push({
          id: `empty-option-${idx}`,
          field: 'options',
          severity: 'error',
          title: `Boş Seçenek İçeriği (${idx + 1}. Seçenek)`,
          message: `${idx + 1}. seçenekte hiçbir metin veya görsel içerik bulunmuyor.`,
        });
      }
    });
  }

  // -------------------------------------------------------------
  // 4. VALID 'CORRECTANSWER' INDEX OR ID
  // -------------------------------------------------------------
  const rawAnswer = question.correctAnswer ?? question.correctOptionId ?? question.correctOptionIndex;
  
  if (rawAnswer === undefined || rawAnswer === null || (typeof rawAnswer === 'string' && rawAnswer.trim() === '')) {
    hasValidCorrectAnswer = false;
    issues.push({
      id: 'missing-correct-answer',
      field: 'correctAnswer',
      severity: 'error',
      title: 'Doğru Cevap Belirtilmemiş',
      message: 'Sorunun doğru cevabı (correctAnswer / correctOptionId) belirtilmelidir.',
    });
  } else if (Array.isArray(options) && options.length > 0) {
    let isValidAnswer = false;

    // Case A: numeric index (e.g. 0, 1, 2, 3)
    if (typeof rawAnswer === 'number') {
      if (rawAnswer >= 0 && rawAnswer < options.length) {
        isValidAnswer = true;
      } else {
        issues.push({
          id: 'invalid-correct-index',
          field: 'correctAnswer',
          severity: 'error',
          title: 'Geçersiz Doğru Cevap İndeksi',
          message: `Doğru cevap indeksi [${rawAnswer}], 0 ile ${options.length - 1} aralığında olmalıdır.`,
        });
      }
    }
    // Case B: string ID (e.g. 'A', 'B', 'C', 'D' or numeric string '0')
    else if (typeof rawAnswer === 'string') {
      const trimmed = rawAnswer.trim();
      const matchIndex = options.findIndex((opt: any) => String(opt?.id || '').trim() === trimmed);
      const isNumericString = !isNaN(Number(trimmed)) && Number(trimmed) >= 0 && Number(trimmed) < options.length;

      if (matchIndex !== -1 || isNumericString) {
        isValidAnswer = true;
      } else {
        issues.push({
          id: 'unmatched-correct-answer',
          field: 'correctAnswer',
          severity: 'error',
          title: 'Eşleşmeyen Doğru Cevap',
          message: `"${trimmed}" doğru cevabı, seçenek kimlikleri [${options.map((o: any) => o?.id || '?').join(', ')}] arasında bulunamadı.`,
        });
      }
    }

    if (!isValidAnswer) {
      hasValidCorrectAnswer = false;
    }
  }

  // -------------------------------------------------------------
  // 5. DUPLICATE IDS & REDUNDANT CONTENT DETECTION
  // -------------------------------------------------------------
  // Duplicate Question ID in existing database
  if (question.id && existingQuestions && existingQuestions.length > 0) {
    const isDup = existingQuestions.some(
      (q) => q && q.id === question.id && q !== question
    );
    if (isDup) {
      hasNoDuplicateIds = false;
      issues.push({
        id: 'duplicate-question-id-db',
        field: 'id',
        severity: 'error',
        title: 'Mükerrer Soru ID',
        message: `"${question.id}" kimliği veri tabanında zaten kayıtlı.`,
      });
    }
  }

  // Duplicate Option IDs and Redundant Option Content
  if (Array.isArray(options)) {
    const seenOptionIds = new Set<string>();
    const seenOptionContents = new Set<string>();

    options.forEach((opt: any, idx: number) => {
      const optId = String(opt?.id || idx).trim();
      if (seenOptionIds.has(optId)) {
        hasNoDuplicateIds = false;
        issues.push({
          id: `duplicate-option-id-${optId}`,
          field: 'options',
          severity: 'error',
          title: `Mükerrer Seçenek Harfi: ${optId}`,
          message: `Birden fazla seçenekte "${optId}" harfi kullanılmış.`,
        });
      } else {
        seenOptionIds.add(optId);
      }

      // Fingerprint / content redundancy
      const contentSignature = opt?.fingerprint
        ? String(opt.fingerprint)
        : JSON.stringify(opt?.visualData || opt?.label || opt?.text || idx);

      if (seenOptionContents.has(contentSignature)) {
        hasNoRedundantContent = false;
        issues.push({
          id: `redundant-option-content-${idx}`,
          field: 'content',
          severity: 'error',
          title: `Tekrarlayan (Mükerrer) Seçenek İçeriği: Seçenek ${optId}`,
          message: `${optId} seçeneği başka bir seçenekle birebir aynı görsel veya metinsel içeriğe sahip.`,
        });
      } else {
        seenOptionContents.add(contentSignature);
      }
    });
  }

  // Redundant Prompt against Existing Questions
  if (promptText && existingQuestions && existingQuestions.length > 0) {
    const normalizedPrompt = promptText.trim().toLowerCase();
    const hasIdentical = existingQuestions.some(
      (q) => q && q.id !== question.id && (q.prompt || q.text || '').trim().toLowerCase() === normalizedPrompt && q.type === question.type
    );
    if (hasIdentical) {
      issues.push({
        id: 'redundant-prompt-warning',
        field: 'content',
        severity: 'warning',
        title: 'Benzer Soru Yönergesi',
        message: 'Veri tabanında aynı soru türüne ve birebir aynı yönergeye sahip başka bir soru bulundu.',
      });
    }
  }

  // -------------------------------------------------------------
  // SCORE & VERDICT CALCULATION
  // -------------------------------------------------------------
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  let score = 100 - errors.length * 25 - warnings.length * 10;
  if (score < 0) score = 0;
  if (errors.length > 0 && score > 60) score = 60;

  const isValid = errors.length === 0;
  const canSubmit = isValid;

  return {
    isValid,
    canSubmit,
    score,
    issues,
    metrics: {
      hasMandatoryFields,
      hasMinimumFourOptions,
      hasNonEmptyText,
      hasValidCorrectAnswer,
      hasNoDuplicateIds,
      hasNoRedundantContent,
    },
  };
}

// ============================================================================
// REACT COMPONENT: QuestionQualityChecker
// ============================================================================

export const QuestionQualityChecker: React.FC<QuestionQualityCheckerProps> = ({
  question,
  existingQuestions,
  onPreSubmitValid,
  onValidationChange,
  autoSubmitOnValid = false,
  showDetails = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Derive existing questions if not passed
  const dbQuestions = useMemo(() => {
    if (existingQuestions) return existingQuestions;
    return questionBankService.getAllQuestions();
  }, [existingQuestions]);

  // Run validation
  const result = useMemo(() => {
    const res = validateQuestionForSubmission(question, dbQuestions);
    if (onValidationChange) {
      onValidationChange(res);
    }
    return res;
  }, [question, dbQuestions, onValidationChange]);

  // Pre-submission handler
  const handlePreSubmit = async () => {
    if (!result.canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (onPreSubmitValid) {
        await onPreSubmitValid(question);
      } else {
        // Default: save into questionBankService
        questionBankService.createCustomQuestion(question);
      }
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="question-quality-checker"
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        result.canSubmit
          ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800/40'
          : 'border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800/40'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl border ${
              result.canSubmit
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700'
            }`}
          >
            {result.canSubmit ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Soru Kalite & Veri Servisi Uyumluluk Denetleyicisi
              </h4>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  result.canSubmit
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200'
                }`}
              >
                {result.canSubmit ? 'Doğrulandı • Gönderime Hazır' : 'Kritik Eksikler Var'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Zorunlu alanlar, 4 seçenek kuralı, doğru cevap eşleşmesi ve mükerrerlik denetimi
            </p>
          </div>
        </div>

        {/* Action Controls & Score */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kalite Skoru:</span>
            <span
              className={`text-xs font-bold ${
                result.score >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : result.score >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              %{result.score}
            </span>
          </div>

          <button
            type="button"
            id="btn-toggle-quality-panel"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Rule Checklist & Issues List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-3"
          >
            {/* Checklist Matrix (5 Core Rules) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              {/* Rule 1: Mandatory Fields */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white dark:bg-slate-800/80 ${
                  result.metrics.hasMandatoryFields
                    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-800 dark:border-rose-800/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">1. Zorunlu Alanlar</span>
                  {result.metrics.hasMandatoryFields ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  ID, Kategori, Tür
                </span>
              </div>

              {/* Rule 2: At least 4 options */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white dark:bg-slate-800/80 ${
                  result.metrics.hasMinimumFourOptions
                    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-800 dark:border-rose-800/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">2. En Az 4 Seçenek</span>
                  {result.metrics.hasMinimumFourOptions ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {Array.isArray(question?.options) ? `${question.options.length} Seçenek` : '0 Seçenek'}
                </span>
              </div>

              {/* Rule 3: Non-empty Text */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white dark:bg-slate-800/80 ${
                  result.metrics.hasNonEmptyText
                    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-800 dark:border-rose-800/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">3. Dolu Metin/Görsel</span>
                  {result.metrics.hasNonEmptyText ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Yönerge & Şıklar
                </span>
              </div>

              {/* Rule 4: Valid Correct Answer */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white dark:bg-slate-800/80 ${
                  result.metrics.hasValidCorrectAnswer
                    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-800 dark:border-rose-800/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">4. Doğru Cevap</span>
                  {result.metrics.hasValidCorrectAnswer ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {String(question?.correctAnswer ?? question?.correctOptionId ?? 'Tanımsız')}
                </span>
              </div>

              {/* Rule 5: No Duplicate IDs / Redundant */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-1 bg-white dark:bg-slate-800/80 ${
                  result.metrics.hasNoDuplicateIds && result.metrics.hasNoRedundantContent
                    ? 'border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300'
                    : 'border-rose-200 text-rose-800 dark:border-rose-800/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">5. Mükerrerlik Yok</span>
                  {result.metrics.hasNoDuplicateIds && result.metrics.hasNoRedundantContent ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Tekil ID & İçerik
                </span>
              </div>
            </div>

            {/* Detailed Issues List */}
            {result.issues.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tespit Edilen Maddeler ({result.issues.length}):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {result.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs border ${
                        issue.severity === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-200'
                          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {issue.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold flex items-center gap-2">
                          <span>{issue.title}</span>
                          <code className="text-[10px] px-1.5 py-0.2 rounded bg-white/70 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                            {issue.field}
                          </code>
                        </div>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {issue.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-Submission Gate Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {submitSuccess
                  ? '✅ Soru başarıyla veri servisine kaydedildi!'
                  : result.canSubmit
                  ? 'Tüm kalite denetimleri geçti. Veri servisine gönderilebilir.'
                  : 'Lütfen yukarıdaki kırmızı hataları giderin.'}
              </span>

              <button
                type="button"
                id="btn-presubmit-to-dataservice"
                onClick={handlePreSubmit}
                disabled={!result.canSubmit || isSubmitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5  transition-colors cursor-pointer ${
                  result.canSubmit
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white  dark:'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>{isSubmitting ? 'Kaydediliyor...' : 'Veri Servisine Gönder'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionQualityChecker;
