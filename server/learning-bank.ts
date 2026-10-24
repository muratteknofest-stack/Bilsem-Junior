import { createHash } from 'node:crypto';
import type { BaseQuestion, QuestionType, DifficultyLevel } from '../src/types';
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

export async function loadPublishedLearningBank(selection: Pick<LearningSelection, 'grade' | 'category' | 'difficulty' | 'topic'>,
  filter: { types?: readonly QuestionType[]; engines?: readonly string[]; minDifficulty?: DifficultyLevel } = {}) {
  const client = getServiceClient();
  const rows = await readQuestionPages<{ id: string; data: BaseQuestion }>((afterId, pageSize) => {
    let query = client.from('questions').select('id,data', { count: 'exact' }).eq('status', 'published').eq('target_grade', selection.grade);
    if (selection.topic && selection.topic !== 'mixed') query = query.eq('type', selection.topic);
    if (selection.category !== 'mixed') query = query.eq('category', selection.category);
    if (selection.difficulty !== 'mixed') query = query.eq('difficulty', selection.difficulty);
    if (filter.types) query = query.in('type', [...filter.types]);
    if (filter.engines) query = query.in('data->authoring->>engine', [...filter.engines]);
    if (filter.minDifficulty !== undefined) query = query.gte('difficulty', filter.minDifficulty);
    if (afterId) query = query.gt('id', afterId);
    return query.order('id').range(0, pageSize - 1);
  }, 'Yayımlanmış soru havuzu okunamadı. Yeniden dene.', 1000);
  // Do not silently give a malformed row the identity of a legitimate published bank.
  if (rows.some(row => !row.data || row.data.id !== row.id || row.data.status !== 'published')) {
    throw new Error('Yayımlanmış soru kaydı doğrulanamadı.');
  }
  const questions = rows.map(row => row.data);
  return { questions, bankVersion: publishedBankVersion(questions) };
}

