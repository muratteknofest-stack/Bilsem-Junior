import { readFile } from 'node:fs/promises';
import { auditQuestion } from '../src/features/questions/quality';
const path = process.argv[2];
if (!path) throw new Error('Kullanım: npm run audit:questions -- export.json');
const data = JSON.parse(await readFile(path, 'utf8'));
const questions = Array.isArray(data) ? data : data.questions;
if (!Array.isArray(questions)) throw new Error('Soru listesi gerekli.');
const reports = questions.map(question => {
  const report = auditQuestion(question);
  return { id: question?.id || null, ready: report.solverVerified,
    errors: report.errors, reviewRequired: report.reviewRequired, warnings: report.warnings };
});
console.log(JSON.stringify({ total: reports.length, ready: reports.filter(r => r.ready).length,
  review: reports.filter(r => !r.ready).length, reports }, null, 2));
if (reports.some(r => !r.ready)) process.exitCode = 1;
