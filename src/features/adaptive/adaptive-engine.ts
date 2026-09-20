import type { CognitiveCategory, DifficultyLevel, SkillMastery } from '../../types';

const QUESTION_ABILITY: Record<DifficultyLevel, number> = {
  1: 10,
  2: 28,
  3: 45,
  4: 62,
  5: 79,
  6: 92,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface AdaptiveTarget {
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  reason: 'new-skill' | 'review-due' | 'needs-practice' | 'next-challenge';
  priority: number;
}

export function normalizeSkillMastery(item: SkillMastery): SkillMastery {
  const attemptCount = Math.max(0, Math.trunc(Number(item.attemptCount) || 0));
  const accuracy = clamp(Number(item.accuracy) || 0, 0, 100);
  const correctCount = clamp(
    Number.isInteger(item.correctCount)
      ? Number(item.correctCount)
      : Math.round((attemptCount * accuracy) / 100),
    0,
    attemptCount,
  );
  return {
    ...item,
    mastery: clamp(Number(item.mastery) || 0, 0, 100),
    attemptCount,
    correctCount,
    accuracy: attemptCount ? Math.round((correctCount / attemptCount) * 100) : 0,
    recentResults: Array.isArray(item.recentResults)
      ? item.recentResults.filter((value): value is boolean => typeof value === 'boolean').slice(-10)
      : [],
    stabilityDays: clamp(Number(item.stabilityDays) || 1, 0.25, 45),
  };
}

function trendFor(results: boolean[]): SkillMastery['recentTrend'] {
  if (results.length < 4) return results.at(-1) ? 'up' : results.length ? 'down' : 'neutral';
  const midpoint = Math.floor(results.length / 2);
  const first = results.slice(0, midpoint).filter(Boolean).length / midpoint;
  const secondItems = results.slice(midpoint);
  const second = secondItems.filter(Boolean).length / secondItems.length;
  if (second - first >= 0.2) return 'up';
  if (first - second >= 0.2) return 'down';
  return 'neutral';
}

/** Elo-style knowledge update plus a small spaced-repetition schedule. */
export function calculateMasteryUpdate(
  current: SkillMastery,
  isCorrect: boolean,
  difficulty: DifficultyLevel,
  now = Date.now(),
): SkillMastery {
  const item = normalizeSkillMastery(current);
  const expected = 1 / (1 + 10 ** ((QUESTION_ABILITY[difficulty] - item.mastery) / 32));
  const learningRate = item.attemptCount < 8 ? 20 : item.attemptCount < 30 ? 12 : 8;
  const mastery = clamp(
    Math.round((item.mastery + learningRate * ((isCorrect ? 1 : 0) - expected)) * 10) / 10,
    0,
    100,
  );

  const attemptCount = item.attemptCount + 1;
  const correctCount = (item.correctCount || 0) + (isCorrect ? 1 : 0);
  const recentResults = [...(item.recentResults || []), isCorrect].slice(-10);
  const previousStability = item.stabilityDays || 1;
  const stabilityDays = isCorrect
    ? clamp(previousStability * (1.25 + difficulty * 0.08), 1, 45)
    : clamp(previousStability * 0.45, 0.25, 45);
  const intervalDays = isCorrect ? stabilityDays : 0.25;

  return {
    ...item,
    mastery,
    attemptCount,
    correctCount,
    accuracy: Math.round((correctCount / attemptCount) * 100),
    recentResults,
    recentTrend: trendFor(recentResults),
    lastPracticedAt: now,
    nextReviewAt: now + intervalDays * 24 * 60 * 60 * 1000,
    stabilityDays: Math.round(stabilityDays * 100) / 100,
  };
}

export function recommendDifficulty(item: SkillMastery): DifficultyLevel {
  const mastery = normalizeSkillMastery(item);
  const targetAbility = mastery.mastery + 5;
  let difficulty = (Object.entries(QUESTION_ABILITY) as [string, number][])
    .reduce((best, [level, ability]) => (
      Math.abs(ability - targetAbility) < Math.abs(QUESTION_ABILITY[best] - targetAbility)
        ? Number(level) as DifficultyLevel
        : best
    ), 1 as DifficultyLevel);

  const recent = mastery.recentResults || [];
  if (recent.length >= 3 && recent.slice(-3).every(Boolean)) {
    difficulty = Math.min(6, difficulty + 1) as DifficultyLevel;
  } else if (recent.length >= 2 && recent.slice(-2).every((result) => !result)) {
    difficulty = Math.max(1, difficulty - 1) as DifficultyLevel;
  }
  return difficulty;
}

export function adaptivePriority(item: SkillMastery, now = Date.now()): number {
  const mastery = normalizeSkillMastery(item);
  const knowledgeGap = 100 - mastery.mastery;
  const uncertainty = Math.max(0, 12 - mastery.attemptCount) * 3;
  const recent = mastery.recentResults || [];
  const recentErrorRate = recent.length
    ? 1 - recent.filter(Boolean).length / recent.length
    : 0.5;
  const overdueHours = mastery.nextReviewAt
    ? clamp((now - mastery.nextReviewAt) / 3_600_000, 0, 72)
    : 12;
  return Math.max(1, knowledgeGap * 0.55 + uncertainty + recentErrorRate * 25 + overdueHours * 0.35);
}

/** Weighted selection keeps focus on weak/due skills while preserving variety. */
export function selectAdaptiveTarget(
  masteries: SkillMastery[],
  random: () => number = Math.random,
  now = Date.now(),
): AdaptiveTarget {
  if (!masteries.length) {
    return { category: 'matrix', difficulty: 1, reason: 'new-skill', priority: 1 };
  }

  const candidates = masteries.map((raw) => {
    const item = normalizeSkillMastery(raw);
    return { item, priority: adaptivePriority(item, now) };
  });
  const total = candidates.reduce((sum, candidate) => sum + candidate.priority, 0);
  let cursor = clamp(random(), 0, 0.999999) * total;
  let selected = candidates.at(-1)!;
  for (const candidate of candidates) {
    cursor -= candidate.priority;
    if (cursor <= 0) {
      selected = candidate;
      break;
    }
  }

  const item = selected.item;
  const reason: AdaptiveTarget['reason'] = item.attemptCount === 0
    ? 'new-skill'
    : item.nextReviewAt && item.nextReviewAt <= now
      ? 'review-due'
      : item.mastery < 60 || item.recentTrend === 'down'
        ? 'needs-practice'
        : 'next-challenge';

  return {
    category: item.category,
    difficulty: recommendDifficulty(item),
    reason,
    priority: Math.round(selected.priority * 10) / 10,
  };
}
