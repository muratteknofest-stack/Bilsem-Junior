import { CognitiveCategory, DifficultyLevel, SkillMastery } from '../../types';
import { STORAGE_KEYS, createEmptyMasteries } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem } from './persistence-service';
import { calculateMasteryUpdate, normalizeSkillMastery } from '../../features/adaptive/adaptive-engine';

export function getSkillMasteries(): SkillMastery[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.MASTERY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const defaults = createEmptyMasteries();
        return defaults.map((fallback) => {
          const stored = parsed.find((item) => item?.category === fallback.category);
          return normalizeSkillMastery(stored ? { ...fallback, ...stored } : fallback);
        });
      }
      return createEmptyMasteries();
    } catch {}
  }
  const initial = createEmptyMasteries();
  setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(initial));
  return initial;
}

export function updateSkillMastery(category: CognitiveCategory, isCorrect: boolean, difficulty: DifficultyLevel): SkillMastery | null {
  const masteries = getSkillMasteries();
  const idx = masteries.findIndex((m) => m.category === category);
  if (idx !== -1) {
    masteries[idx] = calculateMasteryUpdate(masteries[idx], isCorrect, difficulty);
    setProgressItem(STORAGE_KEYS.MASTERY, JSON.stringify(masteries));
    return masteries[idx];
  }
  return null;
}
