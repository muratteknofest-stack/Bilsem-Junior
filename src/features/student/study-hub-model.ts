import { COGNITIVE_CATEGORY_LABELS, type CognitiveCategory, type SkillMastery } from '../../types';

export function levelProgress(value: number) {
  const xp = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return { xp, level: Math.floor(xp / 250) + 1, earned: xp % 250,
    remaining: 250 - xp % 250, percent: (xp % 250) / 250 * 100 };
}

export function readFavoriteCategories(raw: string | null): CognitiveCategory[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is CognitiveCategory =>
      typeof item === 'string' && Object.hasOwn(COGNITIVE_CATEGORY_LABELS, item)))].slice(0, 3);
  } catch { return []; }
}

export function resumableExam(value: unknown): { answered: number; total: number } | null {
  if (!value || typeof value !== 'object') return null;
  const exam = value as Record<string, unknown>;
  if (exam.status !== 'in_progress' || !Array.isArray(exam.questions) || !exam.questions.length) return null;
  const ids = exam.questions.flatMap(q => q && typeof q.id === 'string' ? [q.id] : []);
  if (ids.length !== exam.questions.length) return null;
  const answers = exam.answers && typeof exam.answers === 'object'
    ? exam.answers as Record<string, unknown> : {};
  return { total: ids.length, answered: ids.filter(id => typeof answers[id] === 'string' && answers[id]).length };
}

export interface StudyRecommendation {
  kind: 'mistakes' | 'practice';
  title: string;
  reason: string;
  action: string;
  category?: CognitiveCategory;
}

export function recommendStudy(masteries: SkillMastery[], unresolved: number): StudyRecommendation {
  if (unresolved > 0) return { kind: 'mistakes', title: 'Bir soruya yeniden şans ver',
    reason: `Defterinde tekrar edebileceğin ${unresolved} soru var. İpuçlarıyla adım adım yeniden deneyebilirsin.`,
    action: 'Tekrar defterimi aç' };
  const practiced = masteries.filter(m => m.attemptCount > 0 && Number.isFinite(m.mastery));
  const weakest = [...practiced].sort((a, b) => a.mastery - b.mastery)[0];
  if (weakest && weakest.mastery < 80) return { kind: 'practice', category: weakest.category,
    title: `${weakest.categoryName} ile devam et`,
    reason: `${weakest.attemptCount} soruluk çalışmana göre bu alanı tekrar edebilirsin. Kendi hızında ilerle.`,
    action: 'Bu alanda çalış' };
  const unexplored = masteries.find(m => !m.attemptCount);
  if (unexplored) return { kind: 'practice', category: unexplored.category,
    title: `${unexplored.categoryName} alanını keşfet`,
    reason: 'Bu alanda henüz çalışma kaydın yok. İlk sorularını çözerek başlayabilirsin.',
    action: 'Keşfetmeye başla' };
  return { kind: 'practice', title: 'Bugün farklı sorular keşfet',
    reason: 'Karışık pratikle farklı alanları deneyebilir, kendi hızında ilerleyebilirsin.',
    action: 'Karışık pratiğe başla' };
}
