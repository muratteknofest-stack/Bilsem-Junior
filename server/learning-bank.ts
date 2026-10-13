import { createHash } from 'node:crypto';
import type { BaseQuestion } from '../src/types';
import type { LearningSelection } from '../src/features/student/learning-selection';
import { LEARNING_BANK_POLICY } from '../src/features/student/learning-selection';
import { generateVisualFingerprint } from '../src/features/questions/fingerprint';
import { getServiceClient } from './supabase-admin';
import { readQuestionPages } from './question-pages';

/** The session version identifies content actually read, including editorial revisions. */
export function publishedBankVersion(questions: BaseQuestion[]) {
  const hash = createHash('sha256');
  for (const question of [...questions].sort((a, b) => a.id.localeCompare(b.id))) {
    hash.update(generateVisualFingerprint(question));
    hash.update('\n');
  }
  return `${LEARNING_BANK_POLICY}:${questions.length ? 'published' : 'generated'}:${hash.digest('hex')}`;
}

export async function loadPublishedLearningBank(selection: Pick<LearningSelection, 'grade' | 'category' | 'difficulty'>) {
  const client = getServiceClient();
  const rows = await readQuestionPages<{ id: string; data: BaseQuestion }>((afterId, pageSize) => {
    let query = client.from('questions').select('id,data').eq('status', 'published').eq('target_grade', selection.grade);
    if (selection.category !== 'mixed') query = query.eq('category', selection.category);
    if (selection.difficulty !== 'mixed') query = query.eq('difficulty', selection.difficulty);
    if (afterId) query = query.gt('id', afterId);
    return query.order('id').range(0, pageSize - 1);
  }, 'Yayımlanmış soru havuzu okunamadı. Yeniden dene.');
  // Do not silently give a malformed row the identity of a legitimate published bank.
  if (rows.some(row => !row.data || row.data.id !== row.id || row.data.status !== 'published')) {
    throw new Error('Yayımlanmış soru kaydı doğrulanamadı.');
  }
  const questions = rows.map(row => row.data);
  return { questions, bankVersion: publishedBankVersion(questions) };
}
