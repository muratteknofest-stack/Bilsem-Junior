import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { CATEGORY_TYPES_MAP, generateQuestionByType } from './generators';
import { GRADE_CONFIGS } from './grade-config';
import { questionContentKey } from './quality';

export interface BatchConfig {
  count: number;
  grade: 'balanced' | 1 | 2 | 3 | 4;
  categories: CognitiveCategory[];
  strategy: 'gauss' | 'easy' | 'medium' | 'hard' | 'equal';
  seed: number;
}
export interface BatchReport { questions: BaseQuestion[]; attempted: number; duplicates: number; rejected: number; reasons: string[]; cancelled: boolean; }
export async function generateQuestionBatch(config: BatchConfig, existing: BaseQuestion[] = [], onProgress?: (report: BatchReport) => void, signal?: AbortSignal): Promise<BatchReport> {
  if (!Number.isInteger(config.count) || config.count < 1 || config.count > 1000) throw new Error('Soru sayısı 1–1000 arasında olmalıdır.');
  if (!Number.isSafeInteger(config.seed) || config.seed < 0) throw new Error('Geçerli bir tohum girin.');
  if (!config.categories.length) throw new Error('En az bir kategori seçin.');
  const rng = new SeededRNG(config.seed);
  const grades = config.grade === 'balanced' ? [1,2,3,4] as const : [config.grade];
  const slots = grades.flatMap(grade => config.categories.flatMap(category => {
    const cfg = GRADE_CONFIGS[grade];
    if (!cfg || !CATEGORY_TYPES_MAP[category]) throw new Error('Sınıf veya kategori geçersiz.');
    return CATEGORY_TYPES_MAP[category].filter(type => cfg.recommendedTypes.includes(type)).map(type => ({grade, category, type}));
  }));
  if (!slots.length) throw new Error('Seçilen sınıf ve kategoriler için uygun soru tipi yok. Başka kategori seçin.');
  const seen = new Set(existing.map(questionContentKey));
  const report: BatchReport = { questions: [], attempted: 0, duplicates: 0, rejected: 0, reasons: [], cancelled: false };
  const pools = grades.map(grade => rng.shuffle(slots.filter(s => s.grade === grade))).filter(p => p.length);
  const offsets = pools.map(() => 0);
  const maxAttempts = config.count * 20;
  while (report.questions.length < config.count && report.attempted < maxAttempts) {
    if (signal?.aborted) { report.cancelled = true; break; }
    const poolIndex = report.questions.length % pools.length;
    const pool = pools[poolIndex];
    const slot = pool[offsets[poolIndex]++ % pool.length];
    const range = GRADE_CONFIGS[slot.grade].difficultyRange;
    const position = config.strategy === 'easy' ? 0 : config.strategy === 'hard' ? range.length-1 : config.strategy === 'medium' ? Math.floor(range.length/2) : config.strategy === 'equal' ? Math.floor(report.questions.length/pools.length)%range.length : Math.floor((rng.next()+rng.next())/2*range.length);
    const difficulty = range[position] as DifficultyLevel;
    report.attempted++;
    try {
      const q = generateQuestionByType(slot.type as QuestionType, rng.nextInt(1, 2_000_000_000), difficulty);
      q.targetGrade = slot.grade;
      q.targetGrades = [slot.grade];
      q.category = slot.category;
      q.ageGroup = slot.grade <= 2 ? '1-2' : '3-4';
      q.isCustom = true;
      const key = questionContentKey(q);
      if (seen.has(key)) report.duplicates++;
      else { seen.add(key); report.questions.push(q); }
    } catch (error) {
      report.rejected++;
      const reason = error instanceof Error ? error.message : 'Üretim hatası';
      if (!report.reasons.includes(reason) && report.reasons.length < 8) report.reasons.push(reason);
    }
    if (report.attempted % 5 === 0) {
      onProgress?.({ ...report, questions: [...report.questions] });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  onProgress?.(report);
  return report;
}
