import type { CognitiveCategory } from '../types';
import { safeStorage } from '../lib/storage';
import { readFavoriteCategories } from '../features/student/study-hub-model';
import { STORAGE_KEYS } from './modules/shared';
import { setProgressItem } from './modules/persistence-service';

export function getStudyFavorites(): CognitiveCategory[] {
  return readFavoriteCategories(safeStorage.getItem(STORAGE_KEYS.STUDY_FAVORITES));
}

export function saveStudyFavorites(value: CognitiveCategory[]): CognitiveCategory[] {
  const favorites = readFavoriteCategories(JSON.stringify(value));
  // Uses the same private state hydration, sync and logout cleanup as progress.
  setProgressItem(STORAGE_KEYS.STUDY_FAVORITES, JSON.stringify(favorites));
  return favorites;
}
