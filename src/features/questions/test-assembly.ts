import type { BaseQuestion, DifficultyLevel } from '../../types';
import { questionReasoningKey } from './reasoning-identity';

export const TEST_ASSEMBLY_VERSION = 'balanced-reasoning-1';

/** Keep exact grade quotas, with a short introduction and consolidation item. */
export function scaffoldDifficultyPlan(plan: readonly DifficultyLevel[]): DifficultyLevel[] {
  if (plan.length < 5) return [...plan];
  const remaining = [...plan].sort((a, b) => a - b);
  const introduction = remaining.splice(0, Math.max(1, Math.floor(plan.length / 5)));
  const consolidation = remaining.splice(Math.floor((remaining.length - 1) / 2), 1);
  // Preserve the original random order within the main section, including quotas.
  const counts = new Map<DifficultyLevel, number>();
  for (const level of remaining) counts.set(level, (counts.get(level) || 0) + 1);
  const main = plan.filter(level => {
    const available = counts.get(level) || 0;
    if (!available) return false;
    counts.set(level, available - 1);
    return true;
  });
  return [...introduction, ...main, ...consolidation];
}

/** Interleave mechanics without moving an item out of its prescribed difficulty slot. */
export function orderTestQuestions(
  questions: readonly BaseQuestion[],
  difficultyPlan?: readonly DifficultyLevel[],
): BaseQuestion[] {
  if (difficultyPlan && difficultyPlan.length !== questions.length) throw Error('TEST_PLAN_LENGTH');
  const pending = [...questions], ordered: BaseQuestion[] = [];
  const reasoning = new Map(questions.map(q => [q, questionReasoningKey(q)]));
  for (let slot = 0; slot < questions.length; slot++) {
    const eligible = pending.filter(q => !difficultyPlan || q.difficulty === difficultyPlan[slot]);
    if (!eligible.length) throw Error('TEST_PLAN_DIFFICULTY');
    const last = ordered.at(-1), window = ordered.slice(-5);
    const rank = (q: BaseQuestion) => [
      Number(!!last && reasoning.get(q) === reasoning.get(last)),
      Number(q.type === last?.type),
      Number(q.category === last?.category),
      window.filter(item => reasoning.get(item) === reasoning.get(q)).length,
      window.filter(item => item.category === q.category).length,
      window.filter(item => item.type === q.type).length,
    ];
    const chosen = eligible.reduce((best, next) => {
      const a = rank(next), b = rank(best), differing = a.findIndex((value, index) => value !== b[index]);
      return differing >= 0 && a[differing] < b[differing] ? next : best;
    });
    ordered.push(chosen);
    pending.splice(pending.indexOf(chosen), 1);
  }
  return ordered;
}

/** Operational coverage, not a psychometric score or evidence of learning success. */
export function describeTestAssembly(questions: readonly BaseQuestion[]) {
  const frequencies = (values: readonly (string | number)[]) => {
    const counts: Record<string, number> = {};
    for (const value of values) counts[value] = (counts[value] || 0) + 1;
    return counts;
  };
  return {
    policy: TEST_ASSEMBLY_VERSION,
    count: questions.length,
    categories: frequencies(questions.map(q => q.category)),
    difficulties: frequencies(questions.map(q => q.difficulty)),
    types: frequencies(questions.map(q => q.type)),
    reasoningFamilies: new Set(questions.map(questionReasoningKey)).size,
    skills: [...new Set(questions.flatMap(q => q.skills))].sort(),
    estimatedSeconds: questions.reduce((sum, q) => sum + q.estimatedSeconds, 0),
    difficultySequence: questions.map(q => q.difficulty),
  };
}
