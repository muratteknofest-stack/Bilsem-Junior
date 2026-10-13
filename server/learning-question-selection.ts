import { randomInt } from 'node:crypto';
import type { BaseQuestion, CognitiveCategory } from '../src/types';
import { questionVisualKey } from '../src/features/questions/quality';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { getServiceClient } from './supabase-admin';
import { LearningError } from './learning-model';

export const RECENT_SESSION_LIMIT = 30;
export const RECENT_HISTORY_DAYS = 30;
type RecentSession = { questions: BaseQuestion[]; created_at: string };

/** Server snapshots retain visual content even though their question IDs are opaque. */
export function recentQuestionExposure(sessions: RecentSession[]) {
  const exposure = new Map<string, number>();
  for (const session of sessions) {
    const assignedAt = Date.parse(session.created_at);
    if (!Number.isFinite(assignedAt) || !Array.isArray(session.questions)) continue;
    for (const question of session.questions) {
      try {
        if (!question?.type || !question.visualConfig || !Array.isArray(question.options)) continue;
        const key = questionVisualKey(question);
        exposure.set(key, Math.max(exposure.get(key) || 0, assignedAt));
      } catch { /* A damaged historical snapshot cannot establish exposure. */ }
    }
  }
  return exposure;
}

export async function loadRecentQuestionExposure(studentId: string, now = Date.now()) {
  const { data, error } = await getServiceClient().from('learning_sessions').select('questions,created_at')
    .eq('student_id', studentId).gte('created_at', new Date(now - RECENT_HISTORY_DAYS * 86400_000).toISOString())
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(RECENT_SESSION_LIMIT);
  if (error || !data) throw new LearningError('Çalışma geçmişin okunamadı. Soruları hazırlamak için yeniden dene.', 503);
  return recentQuestionExposure(data as RecentSession[]);
}

function shuffle<T>(items: T[], randomIndex: (max: number) => number) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Equal category quotas avoid inheriting the bank's 25% spatial / 3% verbal bias. */
export function balancedCategoryPlan(count: number, category: CognitiveCategory | 'mixed', randomIndex = randomInt) {
  const categories = shuffle<CognitiveCategory>(category === 'mixed' ? [...AVAILABLE_CATEGORIES] : [category], randomIndex);
  return Array.from({ length: count }, (_, index) => categories[index % categories.length]);
}

export function selectLearningQuestions(options: {
  count: number; category: CognitiveCategory | 'mixed'; candidates: BaseQuestion[];
  exposure: ReadonlyMap<string, number>; canUse: (question: BaseQuestion) => boolean;
  generate: (category: CognitiveCategory) => BaseQuestion; randomIndex?: (max: number) => number;
}) {
  const randomIndex = options.randomIndex || randomInt;
  const plan = balancedCategoryPlan(options.count, options.category, randomIndex);
  const groups = new Map<CognitiveCategory, Array<{ question: BaseQuestion; key: string; lastAssigned: number }>>();
  for (const question of shuffle(options.candidates, randomIndex)) {
    try {
      const key = questionVisualKey(question), group = groups.get(question.category) || [];
      group.push({ question, key, lastAssigned: options.exposure.get(key) || 0 });
      groups.set(question.category, group);
    } catch { /* Invalid candidates still cannot bypass canUse during selection. */ }
  }
  for (const group of groups.values()) group.sort((a, b) => a.lastAssigned - b.lastAssigned);
  const seen = new Set<string>(), selected: BaseQuestion[] = [];
  const take = (category: CognitiveCategory, allowRecent: boolean) => {
    const group = groups.get(category) || [];
    while (group.length) {
      if (!allowRecent && group[0].lastAssigned) return undefined;
      const item = group.shift()!;
      if (seen.has(item.key) || !options.canUse(item.question)) continue;
      seen.add(item.key);
      return item.question;
    }
    return undefined;
  };
  for (const category of plan) {
    let chosen = take(category, false);
    // Prefer a new proven variant before reusing a recently assigned bank question.
    for (let attempt = 0; !chosen && attempt < 50; attempt++) {
      try {
        const question = options.generate(category);
        if (question.category !== category || !options.canUse(question)) continue;
        const key = questionVisualKey(question);
        if (seen.has(key) || options.exposure.has(key)) continue;
        seen.add(key); chosen = question;
      } catch { /* Try another seed; no answer correction or quality gate relaxation. */ }
    }
    chosen ||= take(category, true);
    if (!chosen) throw new LearningError('Bu çalışma için yeterli farklı ve doğrulanmış soru hazır değil.');
    selected.push(chosen);
  }
  return shuffle(selected, randomIndex);
}
