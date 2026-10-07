import type { BaseQuestion, DifficultyLevel } from '../../types';
import type { Board } from './professional-engine';
import { generateVisualFingerprint } from './fingerprint';

export const QUALITY_POLICY_VERSION = 'education-1';
export type SchoolGrade = 1 | 2 | 3 | 4;
/** Product editorial limits, not a clinical age test or a claim of curriculum accreditation. */
export const EDUCATION_PROFILES = {
  1: { ages: [6, 8], maxDifficulty: 2, maxNumber: 30, maxItems: 16, maxSymbols: 3, maxPeople: 4, maxGrid: 3, maxWords: 30 },
  2: { ages: [7, 9], maxDifficulty: 3, maxNumber: 100, maxItems: 24, maxSymbols: 5, maxPeople: 5, maxGrid: 3, maxWords: 35 },
  3: { ages: [8, 10], maxDifficulty: 4, maxNumber: 250, maxItems: 30, maxSymbols: 5, maxPeople: 5, maxGrid: 4, maxWords: 45 },
  4: { ages: [9, 11], maxDifficulty: 6, maxNumber: 1000, maxItems: 36, maxSymbols: 6, maxPeople: 6, maxGrid: 4, maxWords: 55 },
} as const;
export function isSchoolGrade(value: unknown): value is SchoolGrade { return [1, 2, 3, 4].includes(value as number); }
export function gradeDifficulty(grade: SchoolGrade, difficulty: number): DifficultyLevel {
  return Math.max(1, Math.min(EDUCATION_PROFILES[grade].maxDifficulty, difficulty)) as DifficultyLevel;
}
export type QualityStageId = 'structure' | 'answer' | 'content' | 'audience' | 'difficulty' | 'visual' | 'novelty' | 'blind' | 'editorial';
export const QUALITY_STAGES: { id: QualityStageId; label: string; weight: number }[] = [
  { id: 'structure', label: 'Veri ve seçenek yapısı', weight: 10 },
  { id: 'answer', label: 'İki bağımsız çözüm ve tek doğru cevap', weight: 25 },
  { id: 'content', label: 'Yönerge, açıklama ve çeldirici tutarlılığı', weight: 15 },
  { id: 'audience', label: 'Yaş ve sınıf profili', weight: 15 },
  { id: 'difficulty', label: 'Zorluk ve işlem yükü', weight: 10 },
  { id: 'visual', label: 'Görsel yoğunluk ve çizim verisi', weight: 10 },
  { id: 'novelty', label: 'Karşılaştırılan havuzda tekrar kontrolü', weight: 5 },
  { id: 'blind', label: 'Cevabı görmeden AI çözümü', weight: 5 },
  { id: 'editorial', label: 'Bağımsız AI editör incelemesi', weight: 5 },
];
export interface QualityStage {
  id: QualityStageId; label: string; weight: number; status: 'passed' | 'failed' | 'pending'; reasons: string[];
}
export interface QuestionQualityReport {
  policyVersion: string; contentKey: string; evaluatedAt: string; score: number; eligible: boolean;
  target: { grade: SchoolGrade; age?: number; difficulty: number };
  metrics: { maxNumber: number; itemCount: number; symbolCount: number; peopleCount: number; gridSize: number; promptWords: number; comparedQuestions: number };
  stages: QualityStage[];
}
export interface GenerationAttempt {
  attempt: number; seed: number; type: string; questionId?: string; durationMs: number;
  outcome: 'accepted' | 'rejected' | 'unavailable'; action: string; reasons: string[]; report?: QuestionQualityReport;
}
export function assessmentContentKey(q: BaseQuestion): string {
  return generateVisualFingerprint({ type: q.type, category: q.category, seed: q.seed, version: q.version, engine: q.authoring?.engine,
    prompt: q.prompt, secondaryPrompt: q.secondaryPrompt, board: q.visualConfig, options: q.options, answer: q.correctOptionId,
    explanation: q.explanation, notes: q.authoring?.distractorNotes, grade: q.targetGrade, grades: q.targetGrades,
    age: q.targetAge, ageGroup: q.ageGroup, difficulty: q.difficulty, seconds: q.estimatedSeconds });
}
export function inspectEducation(q: BaseQuestion, grade: SchoolGrade, age?: number) {
  const p = EDUCATION_PROFILES[grade], b = q.visualConfig as Board;
  if (!p) throw new Error('Hedef sınıf 1–4 olmalı.');
  const numeric = [ ...(b.values || []), ...(b.examples || []).flat(), b.input,
    ...(b.base || []),
    ...(b.key || []).map(k => k.value), ...q.options.map(o => (o.visualData as { textNumber?: unknown })?.textNumber),
  ].filter((v): v is number => typeof v === 'number');
  const metrics = { maxNumber: Math.max(0, ...numeric.map(Math.abs)), itemCount: b.items?.length || 0,
    symbolCount: b.symbols?.length || b.moves?.length || 0, peopleCount: b.names?.length || 0,
    gridSize: Math.max(b.gridSize || 0, ...(b.tiles || []).filter(Boolean).map(t => t!.size)), promptWords: q.prompt.trim().split(/\s+/u).length };
  const audience: string[] = [], difficulty: string[] = [], visual: string[] = [];
  if (age !== undefined && (!Number.isInteger(age) || age < p.ages[0] || age > p.ages[1])) audience.push('AGE_PROFILE: Yaş seçilen sınıfın içerik profili dışında.');
  if (q.targetGrade !== undefined && q.targetGrade !== grade) audience.push('GRADE_MISMATCH: Soru sınıfı istekle uyuşmuyor.');
  if (q.ageGroup !== 'all' && q.ageGroup !== (grade <= 2 ? '1-2' : '3-4')) audience.push('AGE_GROUP: Sınıf grubu etiketi uyuşmuyor.');
  if (metrics.promptWords > p.maxWords) audience.push('READING_LOAD: Yönergenin okuma yükü fazla.');
  if (grade === 1 && (b.kind === 'machine' || b.kind === 'matrix')) audience.push('PREREQUISITE: Bu çok adımlı kural 1. sınıf profilinde desteklenmiyor.');
  if (q.difficulty > p.maxDifficulty) difficulty.push('DIFFICULTY_LIMIT: Seviye sınıf sınırının üzerinde.');
  if (numeric.some(v => !Number.isSafeInteger(v) || v < 0) || metrics.maxNumber > p.maxNumber) difficulty.push('NUMBER_LOAD: Verilen veya seçenek sayısı profil sınırını aşıyor.');
  if ((b.kind === 'path' ? metrics.symbolCount > grade + 4 : metrics.symbolCount > p.maxSymbols) || metrics.peopleCount > p.maxPeople) difficulty.push('WORKING_MEMORY: Sembol veya sıralama yükü fazla.');
  if (metrics.itemCount > p.maxItems || metrics.gridSize > (b.kind === 'path' && grade === 4 ? 5 : p.maxGrid)) visual.push('VISUAL_LOAD: Görsel yoğunluk sınıf sınırını aşıyor.');
  if (b.kind === 'symbols' && (b.key || []).some(k => !['●', '▲', '■', '◆'].includes(k.symbol))) visual.push('SYMBOL_RENDERING: Sembol çizimi tanımlı değil.');
  if (b.kind === 'count' && (b.items || []).some(s => !['●', '▲', '■', '◆'].includes(s))) visual.push('SYMBOL_RENDERING: Sayılacak şeklin çizimi tanımlı değil.');
  return { audience, difficulty, visual, metrics };
}
export function hasCompleteQualityReport(q: BaseQuestion): boolean {
  const r = q.qualityReport;
  return !!r && r.policyVersion === QUALITY_POLICY_VERSION && r.contentKey === assessmentContentKey(q) && r.eligible === true &&
    r.target.grade === q.targetGrade && r.target.age === q.targetAge && r.target.difficulty === q.difficulty &&
    r.stages.length === QUALITY_STAGES.length && QUALITY_STAGES.every(s => r.stages.filter(t => t.id === s.id && t.status === 'passed' && t.reasons.length === 0 && t.weight === s.weight).length === 1) && r.score === 100;
}
