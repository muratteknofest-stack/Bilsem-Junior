import type { BaseQuestion } from '../src/types';
import { getServiceClient } from './supabase-admin';

/** Explicit bounded comparison scope; a read failure must not masquerade as an empty bank. */
export async function loadQualityComparisonPool(): Promise<BaseQuestion[]> {
  const { data, error } = await getServiceClient().from('questions').select('data').order('id').limit(500);
  if (error) throw new Error('Tekrar denetimi için soru havuzu okunamadı.');
  return (data || []).map(row => row.data as BaseQuestion).filter(q => q && q.type && q.visualConfig && Array.isArray(q.options));
}
