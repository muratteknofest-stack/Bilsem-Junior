import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { selectLearningQuestions, recentQuestionExposure, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { reasoningDifficultyPlan } from '../src/features/questions/reasoning-profile';
import { scaffoldDifficultyPlan, describeTestAssembly } from '../src/features/questions/test-assembly';
import { isQuestionReadyForStudents, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { solveQuestion } from '../src/features/questions/universal-solver';

const cases: ReturnType<typeof describeTestAssembly>[] = [], failures: string[] = [];
for (const grade of [1, 2, 3, 4] as const) {
  const exposure = new Map<string, number>();
  let seed = grade * 700001, randomState = grade * 429;
  const randomIndex = (maximum: number) => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return Math.floor(randomState / 4294967296 * maximum);
  };
  for (let session = 0; session < 3; session++) {
    const plan = scaffoldDifficultyPlan(reasoningDifficultyPlan(grade, 20, randomIndex));
    const questions = selectLearningQuestions({
      count: 20, category: 'mixed', candidates: [], exposure, difficultyPlan: plan,
      preferDiverseTypes: true, randomIndex,
      canUse: q => q.targetGrade === grade && isQuestionReadyForStudents(q),
      generate: (category, typeCounts, difficulty, reasoningCounts) => generateVariedLearningQuestion({
        grade, category, difficulty: difficulty!, seed: ++seed, typeCounts, reasoningCounts, exposure, randomIndex,
      }),
    });
    const report = describeTestAssembly(questions);
    if (Object.values(report.categories).some(count => count !== 2)) failures.push(`${grade}/${session}: category balance`);
    if (JSON.stringify(report.difficultySequence) !== JSON.stringify(plan)) failures.push(`${grade}/${session}: difficulty order`);
    if (new Set(questions.map(questionStimulusKey)).size !== 20) failures.push(`${grade}/${session}: duplicate stimulus`);
    for (const q of questions) {
      const proof = solveQuestion(q);
      if (!proof.canSolve || !proof.isMatch || proof.ambiguityDetected) failures.push(`${q.id}: proof`);
      if (exposure.has(questionStimulusKey(q)) || exposure.has(questionVisualKey(q))) failures.push(`${q.id}: repeated history`);
    }
    cases.push(report);
    const nextExposure = recentQuestionExposure([{questions, created_at: new Date(1792530000000 + session * 3600000).toISOString()}], true);
    for (const [key, value] of nextExposure) exposure.set(key, value);
  }
}
const report = {
  runId: randomUUID(), checkedAt: new Date().toISOString(), classes: 4, sessions: cases.length,
  questions: cases.reduce((sum, item) => sum + item.count, 0), failures, cases,
  scope: 'Algorithmic QA only; no database writes, provider approvals or expert review inferred.',
};
await writeFile('docs/question-engine-v2/test-assembly-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({sessions: report.sessions, questions: report.questions, failures}));
if (failures.length) process.exitCode = 1;
