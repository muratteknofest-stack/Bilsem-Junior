import type { BaseQuestion } from '../../types';
import { auditQuestion, questionVisualKey, isQuestionReadyForStudents, assertQuestionReadyForStudents } from './quality';
import { chooseDiverseCandidate } from './novelty';

export function selectPublishedPool(generated: BaseQuestion[], published: BaseQuestion[]): BaseQuestion[] {
  const used = new Set<string>();
  const usedVisuals = new Set<string>();
  const selected: BaseQuestion[] = [];
  published = published.filter(q => q.status === 'published' && isQuestionReadyForStudents(q));
  return generated.map((fallback, index) => {
    assertQuestionReadyForStudents(fallback);
    const candidates = published.filter(q => !used.has(q.id) && !usedVisuals.has(questionVisualKey(q)) && q.category === fallback.category &&
      q.difficulty === fallback.difficulty &&
      (!fallback.targetGrade || q.targetGrade === fallback.targetGrade || q.targetGrades?.includes(fallback.targetGrade)));
    if (!candidates.length) {
      usedVisuals.add(questionVisualKey(fallback));
      selected.push(fallback);
      return fallback;
    }
    // Generated seeds vary by session; rotate through the approved bank rather
    // than giving every student the first matching question on every attempt.
    const offset = ((fallback.seed ?? index) + index * 101) >>> 0;
    const matching = chooseDiverseCandidate([...candidates.slice(offset % candidates.length),...candidates.slice(0,offset % candidates.length)],selected);
    used.add(matching.id);
    usedVisuals.add(questionVisualKey(matching));
    selected.push(matching);
    return JSON.parse(JSON.stringify(matching));
  });
}

export function parseQuestionImport(json: string, existing: BaseQuestion[]): BaseQuestion[] {
  if (json.length > 3_000_000) throw new Error('Dosya 3 MB sınırını aşıyor.');
  const parsed = JSON.parse(json);
  const list: unknown[] = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(list) || list.length < 1 || list.length > 100) throw new Error('1–100 soru içeren bir JSON paketi gerekli.');
  const keys = new Set(existing.map(questionVisualKey));
  const accepted: BaseQuestion[] = [];
  for (const [i, value] of list.entries()) {
    const report = auditQuestion(value);
    if (report.errors.length) throw new Error((i + 1) + '. soru: ' + report.errors.join(' '));
    const q = value as BaseQuestion;
    const key = questionVisualKey(q);
    if (keys.has(key)) continue;
    keys.add(key);
    // Imported revisions, authors and publication approvals must not be trusted.
    const { revision, reviewedBy, updatedBy, updatedAt, ...content } = q as BaseQuestion & Record<string, unknown>;
    accepted.push(JSON.parse(JSON.stringify({ ...content, id: crypto.randomUUID(), status: 'draft', isCustom: true })));
  }
  return accepted;
}

