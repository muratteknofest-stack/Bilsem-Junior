/**
 * Measures how different the "mixed" practice pools are across grades 1-4.
 * Usage: node --import tsx scripts/measure-grade-mix.ts [samplesPerGrade]
 * Offline: uses the same generator path as /learning/start, without a database.
 */
import { generateVariedLearningQuestion, pickGradeChallenge, balancedCategoryPlan } from '../server/learning-question-selection';
import type { SchoolGrade } from '../src/features/questions/quality-policy';
import { professionalGradeTypes } from '../src/features/questions/reasoning-profile';

const samples = Number(process.argv[2] || 200);
const grades: SchoolGrade[] = [1, 2, 3, 4];
const typeCounts = new Map<SchoolGrade, Map<string, number>>();
const difficultyCounts = new Map<SchoolGrade, Map<number, number>>();
let seed = 1;

for (const grade of grades) {
  const types = new Map<string, number>(), diffs = new Map<number, number>();
  const plan = balancedCategoryPlan(samples, 'mixed');
  const running = new Map<any, number>();
  let failures = 0;
  for (const category of plan) {
    try {
      const q = generateVariedLearningQuestion({ grade, category, difficulty: pickGradeChallenge(grade), seed: seed++, typeCounts: running });
      running.set(q.type, (running.get(q.type) || 0) + 1);
      types.set(q.type, (types.get(q.type) || 0) + 1);
      diffs.set(q.difficulty, (diffs.get(q.difficulty) || 0) + 1);
    } catch { failures++; }
  }
  typeCounts.set(grade, types); difficultyCounts.set(grade, diffs);
  console.log(`\n=== Grade ${grade}: ${samples - failures} questions (${failures} failed), ${professionalGradeTypes(grade).length} eligible types, ${types.size} used`);
  console.log(' difficulty:', JSON.stringify([...diffs.entries()].sort((a, b) => a[0] - b[0])));
}

console.log('\n=== Type-set overlap between grades (Jaccard of used types / share of 4th-grade volume that also appears in grade g)');
for (let a = 0; a < grades.length; a++) for (let b = a + 1; b < grades.length; b++) {
  const A = new Set(typeCounts.get(grades[a])!.keys()), B = new Set(typeCounts.get(grades[b])!.keys());
  const inter = [...A].filter(t => B.has(t)).length, union = new Set([...A, ...B]).size;
  console.log(` grade ${grades[a]} vs ${grades[b]}: Jaccard=${(inter / union).toFixed(2)} (${inter}/${union})`);
}
const only: Record<number, string[]> = {};
for (const g of grades) {
  const others = new Set(grades.filter(x => x !== g).flatMap(x => [...typeCounts.get(x)!.keys()]));
  only[g] = [...typeCounts.get(g)!.keys()].filter(t => !others.has(t));
}
console.log('\n types used ONLY by one grade:', JSON.stringify(only));
