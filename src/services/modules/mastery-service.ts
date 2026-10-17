import { CognitiveCategory, DifficultyLevel, SkillMastery } from '../../types';
import { STORAGE_KEYS, createEmptyMasteries } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem } from './persistence-service';

export function getSkillMasteries(): SkillMastery[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.MASTERY);
  if (raw) {
    try {
      let parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : createEmptyMasteries();
    } catch {}
  }
  const initial = createEmptyMasteries();
  setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(initial));
  return initial;
}

export function updateSkillMastery(category: CognitiveCategory, isCorrect: boolean, difficulty: DifficultyLevel) {
  const masteries = getSkillMasteries();
  const idx = masteries.findIndex((m) => m.category === category);
  if (idx !== -1) {
    const item = masteries[idx];
    item.attemptCount += 1;
    const delta = isCorrect ? Math.max(1, Math.round(difficulty * 0.8)) : -Math.max(1, Math.round(difficulty * 0.4));
    item.mastery = Math.min(100, Math.max(10, item.mastery + delta));
    item.recentTrend = isCorrect ? 'up' : 'down';
    masteries[idx] = item;
    setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(masteries));
  }
}
