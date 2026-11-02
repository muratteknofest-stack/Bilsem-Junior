import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { generateCubeQuestion, CUBE_MECHANICS, cubeAllowed, type CubeBoard } from '../src/features/questions/cube-lab';
import { EDUCATION_PROFILES, type SchoolGrade } from '../src/features/questions/quality-policy';
import { auditQuestion, questionStimulusKey, questionVisualKey } from '../src/features/questions/quality';
import { runMultiPassQuestionTests, stampQuestionVerification } from '../src/features/questions/verifier';
import type { BaseQuestion, DifficultyLevel } from '../src/types';

const POLICY = 'cube-bank-1';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
export type CubeBankQuestion = BaseQuestion & { revision: number; sourceBatch: string; createdAt: string; updatedAt: string; updatedBy: string; batchValidation: { policy: string; automaticChecks: 'passed'; editorReview: 'pending'; individualHumanReview: false; stimulusSha256: string; visualKeySha256: string } };
export function generateCubeBank(options: { perCell: number; seed: number; batchId: string; generatedAt: string }) {
  if (!Number.isInteger(options.perCell) || options.perCell < 1 || options.perCell > 40 || !Number.isSafeInteger(options.seed) || options.seed < 1 || !/^[a-z0-9-]{1,70}$/.test(options.batchId) || !Number.isFinite(Date.parse(options.generatedAt))) throw Error('INVALID_BANK_CONFIGURATION');
  const questions: CubeBankQuestion[] = [], seen = new Set<string>();
  const cells: Record<string, number> = {}, rejections = { duplicate: 0, generation: 0 }; let attempts = 0;
  for (const grade of [1, 2, 3, 4] as SchoolGrade[]) for (let level = 1; level <= EDUCATION_PROFILES[grade].maxDifficulty; level++) for (const mechanic of CUBE_MECHANICS) {
    if (!cubeAllowed(mechanic, grade, level)) continue;
    const key = `${grade}:${level}:${mechanic}`; cells[key] = 0;
    for (let i = 0; i < options.perCell; i++) {
      let accepted: BaseQuestion | undefined, stimulusSha256 = '';
      for (let retry = 0; retry < 4000; retry++) {
        const seed = (options.seed + ++attempts * 104729) % 2147483647 || 1;
        let q: BaseQuestion;
        try { q = generateCubeQuestion(mechanic, seed, level as DifficultyLevel, grade); } catch { rejections.generation++; continue; }
        stimulusSha256 = sha(questionStimulusKey(q));
        if (seen.has(stimulusSha256)) { rejections.duplicate++; continue; }
        const proof = runMultiPassQuestionTests(q);
        if (!proof.isVerified) throw Error(`QUALITY_FAILURE:${q.id}:${proof.errors.join(';')}`);
        proof.testedAt = options.generatedAt; accepted = stampQuestionVerification(q, proof); break;
      }
      if (!accepted) throw Error(`UNFILLED_CELL:${key}`);
      seen.add(stimulusSha256); cells[key]++;
      questions.push({ ...accepted, id: `${options.batchId}-${String(questions.length + 1).padStart(5, '0')}`, revision: 1, status: 'review', isCustom: true, sourceBatch: options.batchId, createdAt: options.generatedAt, updatedAt: options.generatedAt, updatedBy: 'canonical-question-engine', batchValidation: { policy: POLICY, automaticChecks: 'passed', editorReview: 'pending', individualHumanReview: false, stimulusSha256, stemKeySha256: stimulusSha256, visualKeySha256: sha(questionVisualKey(accepted)) } });
    }
  }
  return { policy: POLICY, ...options, summary: { total: questions.length, uniqueVisibleGivens: seen.size, cells, attempts, rejections, individualHumanReview: false }, questions };
}
export function verifyCubeBank(bank: ReturnType<typeof generateCubeBank>) {
  const seen = new Set<string>(), cells: Record<string, number> = {};
  const expected: string[] = [];
  for (const grade of [1, 2, 3, 4] as SchoolGrade[]) for (let d = 1; d <= EDUCATION_PROFILES[grade].maxDifficulty; d++) for (const m of CUBE_MECHANICS) if (cubeAllowed(m, grade, d)) expected.push(`${grade}:${d}:${m}`);
  if (bank.policy !== POLICY || !Number.isInteger(bank.perCell) || bank.perCell < 1 || bank.perCell > 40 || bank.questions.length !== expected.length * bank.perCell || new Set(bank.questions.map(q => q.id)).size !== bank.questions.length) throw Error('INVALID_BATCH');
  for (const q of bank.questions) {
    const report = auditQuestion(q), stimulus = sha(questionStimulusKey(q)), board = q.visualConfig as CubeBoard;
    if (!report.solverVerified || report.errors.length || report.reviewRequired.length || seen.has(stimulus) || q.sourceBatch !== bank.batchId || !['review','published'].includes(q.status||'') || q.batchValidation.policy !== POLICY || q.batchValidation.automaticChecks !== 'passed' || q.batchValidation.stimulusSha256 !== stimulus || q.batchValidation.stemKeySha256 !== stimulus || q.batchValidation.visualKeySha256 !== sha(questionVisualKey(q)) || q.batchValidation.individualHumanReview !== false || q.batchValidation.editorReview !== 'pending') throw Error(`INVALID_QUESTION:${q.id}`);
    seen.add(stimulus); const cell = `${q.targetGrade}:${q.difficulty}:${board.mechanic}`; cells[cell] = (cells[cell] || 0) + 1;
  }
  if (Object.keys(cells).length !== expected.length || expected.some(k => cells[k] !== bank.perCell || bank.summary.cells[k] !== bank.perCell) || Object.keys(bank.summary.cells).length !== expected.length || bank.summary.total !== bank.questions.length || bank.summary.uniqueVisibleGivens !== seen.size) throw Error('INVALID_DISTRIBUTION');
  return { batchId: bank.batchId, total: bank.questions.length, uniqueVisibleGivens: seen.size, independentAnswerChecks: 'passed', cells, individualHumanReview: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
  if (args.verify) { const bytes = await readFile(args.verify); const result = verifyCubeBank(JSON.parse(bytes.toString())); console.log(JSON.stringify({ ...result, sourceFileSha256: sha(bytes.toString()) })); }
  else {
    if (!args.output || !args.batch) throw Error('Usage: --output private-bank.json --batch cube-YYYYMMDD --per-cell 40');
    const bank = generateCubeBank({ perCell: Number(args['per-cell'] || 40), seed: Number(args.seed || 20261102), batchId: args.batch, generatedAt: args.at || new Date().toISOString() });
    verifyCubeBank(bank); await writeFile(args.output, JSON.stringify(bank)); console.log(JSON.stringify(bank.summary));
  }
}
