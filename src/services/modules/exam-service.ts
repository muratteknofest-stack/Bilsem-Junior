import { ExamResult } from '../../types';
import { STORAGE_KEYS } from './shared';
import { safeStorage } from '../../lib/storage';
import { setProgressItem, removeProgressItem } from './persistence-service';
import { unlockAchievement } from './achievement-service';

export function getExamResults(): ExamResult[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.EXAM_RESULTS);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  setProgressItem(STORAGE_KEYS.EXAM_RESULTS, JSON.stringify([]));
  return [];
}

export function saveExamResult(result: ExamResult) {
  const list = getExamResults();
  list.unshift(result);
  setProgressItem(STORAGE_KEYS.EXAM_RESULTS, JSON.stringify(list));
  unlockAchievement('exam_finisher');
}

export function getActiveExam() {
  const raw = safeStorage.getItem(STORAGE_KEYS.ACTIVE_EXAM);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveActiveExam(state: any) {
  setProgressItem(STORAGE_KEYS.ACTIVE_EXAM, JSON.stringify(state));
}

export function clearActiveExam() {
  removeProgressItem(STORAGE_KEYS.ACTIVE_EXAM);
}
