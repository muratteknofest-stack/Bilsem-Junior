import type { CognitiveCategory } from '../../types';

export type TimerPreset = '5m' | '10m' | '15m' | 'untimed';

export const PRACTICE_CATEGORY_OPTIONS: { id: CognitiveCategory | 'mixed'; label: string }[] = [
  { id: 'mixed', label: '🎲 Karışık (Tüm Konular)' },
  { id: 'pattern', label: '🔄 Görsel Örüntü' },
  { id: 'matrix', label: '▦ Matris Tamamlama' },
  { id: 'spatial', label: '🧭 Uzamsal Zeka' },
  { id: 'logic', label: '💡 Mantık & Analoji' },
  { id: 'attention', label: '🎯 Görsel Dikkat' },
  { id: 'visual_perception', label: '👁️ Görsel Algı' },
  { id: 'numerical', label: '🔢 Sayısal Muhakeme' },
  { id: 'memory', label: '🧠 Görsel Bellek' },
];

export function resolveTimerPresetSeconds(preset: TimerPreset): number {
  switch (preset) {
    case '5m':
      return 5 * 60;
    case '10m':
      return 10 * 60;
    case '15m':
      return 15 * 60;
    case 'untimed':
    default:
      return 0;
  }
}

export function matchesExamModeFilter(
  mode: { id: string; grade?: 1 | 2 | 3 | 4; category?: CognitiveCategory },
  activeFilter: string,
): boolean {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'focus') return !!mode.category;
  if (activeFilter === 'grade1') return mode.grade === 1 || mode.id === 'warmup';
  if (activeFilter === 'grade2') return mode.grade === 2 || mode.id === 'warmup';
  if (activeFilter === 'grade3') return mode.grade === 3 || mode.id === 'warmup';
  if (activeFilter === 'grade4') return mode.grade === 4 || mode.id === 'warmup';
  return true;
}

export function calculateSessionAccuracy(correctCount: number, totalQuestions: number): number {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return 0;
  const clamped = Math.max(0, Math.min(correctCount, totalQuestions));
  return Math.round((clamped / totalQuestions) * 100);
}
