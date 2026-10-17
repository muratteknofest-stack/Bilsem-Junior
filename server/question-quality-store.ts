import type { QuestionType } from '../src/types';
import type { QuestionVisualReference } from '../src/features/questions/quality';
import { getServiceClient } from './supabase-admin';
import { readQuestionPages } from './question-pages';

/** Compare every active draft/review/published visual; archived history cannot hide the current bank. */
export async function loadQualityComparisonPool(type?: QuestionType): Promise<QuestionVisualReference[]> {
  const client = getServiceClient();
  const rows = await readQuestionPages<QuestionVisualReference>((afterId, pageSize) => {
    let query = client.from('questions').select('id,type,visualConfig:data->visualConfig,options:data->options')
      .in('status', ['draft', 'review', 'published']);
    if (type) query = query.eq('type', type);
    if (afterId) query = query.gt('id', afterId);
    return query.order('id').range(0, pageSize - 1).overrideTypes<QuestionVisualReference[], { merge: false }>();
  }, 'Tekrar denetimi için soru havuzu okunamadı.');
  if (rows.some(q => !q.type || !q.visualConfig || !Array.isArray(q.options))) {
    throw new Error('Tekrar denetimi için soru kayıtları doğrulanamadı.');
  }
  return rows;
}

