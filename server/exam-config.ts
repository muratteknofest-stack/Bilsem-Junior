import type { CognitiveCategory } from '../src/types';

export interface ExamModeConfig {
  id: string;
  title: string;
  questionCount: number;
  durationMinutes: number;
  grade?: 1 | 2 | 3 | 4;
  category?: CognitiveCategory;
}

const modes: ExamModeConfig[] = [
  { id: 'warmup', title: 'Hızlı Isınma', questionCount: 5, durationMinutes: 5 },
  { id: 'grade1_mini', title: '1. Sınıf Keşif (Kısa)', questionCount: 10, durationMinutes: 10, grade: 1 },
  { id: 'grade1_std', title: '1. Sınıf Genel Deneme', questionCount: 20, durationMinutes: 20, grade: 1 },
  { id: 'grade1_pro', title: '1. Sınıf Zor Test', questionCount: 30, durationMinutes: 35, grade: 1 },
  { id: 'grade2_mini', title: '2. Sınıf Isınma', questionCount: 10, durationMinutes: 12, grade: 2 },
  { id: 'grade2_std', title: '2. Sınıf Genel Sınav', questionCount: 25, durationMinutes: 30, grade: 2 },
  { id: 'grade2_pro', title: '2. Sınıf Maraton', questionCount: 40, durationMinutes: 50, grade: 2 },
  { id: 'grade3_mini', title: '3. Sınıf Hızlı Analitik', questionCount: 15, durationMinutes: 15, grade: 3 },
  { id: 'grade3_std', title: '3. Sınıf Odaklanma Testi', questionCount: 30, durationMinutes: 35, grade: 3 },
  { id: 'grade3_pro', title: '3. Sınıf Süper Test', questionCount: 45, durationMinutes: 60, grade: 3 },
  { id: 'grade4_mini', title: '4. Sınıf Ön Test', questionCount: 15, durationMinutes: 15, grade: 4 },
  { id: 'grade4_std', title: '4. Sınıf Şampiyonlar', questionCount: 35, durationMinutes: 45, grade: 4 },
  { id: 'grade4_pro', title: '4. Sınıf Büyük Maraton', questionCount: 50, durationMinutes: 70, grade: 4 },
  { id: 'focus_matrix', title: 'Matris Uzmanı', questionCount: 20, durationMinutes: 20, category: 'matrix' },
  { id: 'focus_spatial', title: 'Uzamsal Algı', questionCount: 20, durationMinutes: 25, category: 'spatial' },
  { id: 'focus_logic', title: 'Şifre ve Mantık', questionCount: 20, durationMinutes: 25, category: 'logic' },
  { id: 'focus_memory', title: 'Görsel Hafıza', questionCount: 15, durationMinutes: 15, category: 'memory' },
  { id: 'focus_pattern', title: 'Örüntü Dedektifi', questionCount: 20, durationMinutes: 20, category: 'pattern' },
  { id: 'focus_attention', title: 'Pür Dikkat', questionCount: 25, durationMinutes: 20, category: 'attention' },
  { id: 'focus_visual', title: 'Görsel Algı', questionCount: 15, durationMinutes: 15, category: 'visual_perception' },
  { id: 'focus_numerical', title: 'Sayısal Zeka', questionCount: 20, durationMinutes: 25, category: 'numerical' },
];

export const EXAM_MODE_CONFIGS = new Map(modes.map((mode) => [mode.id, Object.freeze(mode)]));

export function getExamMode(modeId: string): ExamModeConfig | null {
  return EXAM_MODE_CONFIGS.get(modeId) || null;
}
